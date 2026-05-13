-- ============================================================
-- COHETE TERMINAL FEE — Auto-gasto del 14.06% por cobros con Terminal
-- ============================================================
-- Cada cobro con Terminal (anticipo o pago final) genera un cargo
-- de 14.06% por impuestos y fiscal de la empresa Cohete (el
-- procesador de pagos). Este script:
--   1. Vincula gastos a reservas y a un subtipo identificable
--      para poder hacer upsert idempotente.
--   2. Crea/actualiza/borra el gasto automáticamente vía trigger
--      cuando cambia metodo_pago / monto_pagado / fecha_pago o
--      sus equivalentes _final.
--   3. Hace backfill de los Terminal ya existentes en la BD.
-- ============================================================

-- 1. Columnas de vinculación en gastos
alter table gastos
  add column if not exists reserva_id uuid references reservations(id) on delete cascade,
  add column if not exists subtipo    text;

-- Índice único para idempotencia (solo aplica a gastos auto-generados)
create unique index if not exists gastos_cohete_unique
  on gastos(reserva_id, subtipo)
  where reserva_id is not null and subtipo is not null;

-- 2. Función que sincroniza un gasto-cohete para una reserva/subtipo dado
create or replace function sync_gasto_cohete(
  p_reserva_id      uuid,
  p_subtipo         text,
  p_monto_terminal  numeric,
  p_fecha           date,
  p_nombre_cliente  text
) returns void
language plpgsql
as $$
declare
  v_semana_id    uuid;
  v_gasto_monto  numeric;
  v_descripcion  text;
  v_etiqueta     text;
begin
  -- Si no hay cobro Terminal válido → borrar gasto si existe
  if p_monto_terminal is null or p_monto_terminal <= 0 then
    delete from gastos
     where reserva_id = p_reserva_id
       and subtipo    = p_subtipo;
    return;
  end if;

  -- Localizar la semana que contiene la fecha
  select id into v_semana_id
    from semanas
   where p_fecha between fecha_inicio and fecha_fin
   limit 1;

  if v_semana_id is null then
    -- Sin semana correspondiente, no podemos crear el gasto
    return;
  end if;

  v_gasto_monto := round(p_monto_terminal * 0.1406, 2);
  v_etiqueta    := case
                     when p_subtipo = 'cohete_anticipo'   then 'Anticipo'
                     when p_subtipo = 'cohete_pago_final' then 'Pago final'
                     else 'Cobro'
                   end;
  v_descripcion := 'Impuestos y fiscal Cohete — ' || v_etiqueta
                || ' · ' || coalesce(p_nombre_cliente, 'Reserva');

  insert into gastos (
    semana_id, fecha, monto, tipo, pagado_por, origen_dinero,
    descripcion, proveedor, reserva_id, subtipo
  ) values (
    v_semana_id, p_fecha, v_gasto_monto, 'operacion', 'empresa', 'caja_negocio',
    v_descripcion, 'Cohete', p_reserva_id, p_subtipo
  )
  on conflict (reserva_id, subtipo) where reserva_id is not null and subtipo is not null
  do update set
    semana_id   = excluded.semana_id,
    fecha       = excluded.fecha,
    monto       = excluded.monto,
    descripcion = excluded.descripcion;
end;
$$;

-- 3. Trigger en reservations: ejecuta el sync para anticipo y pago final
create or replace function trg_reservation_cohete_gastos() returns trigger
language plpgsql
as $$
begin
  -- Anticipo
  if new.metodo_pago = 'Terminal' and new.monto_pagado is not null and new.monto_pagado > 0 then
    perform sync_gasto_cohete(
      new.id, 'cohete_anticipo', new.monto_pagado,
      coalesce(new.fecha_pago::date, new.fecha), new.nombre_cliente
    );
  else
    perform sync_gasto_cohete(new.id, 'cohete_anticipo', null, new.fecha, new.nombre_cliente);
  end if;

  -- Pago final
  if new.metodo_pago_final = 'Terminal' and new.monto_final_pagado is not null and new.monto_final_pagado > 0 then
    perform sync_gasto_cohete(
      new.id, 'cohete_pago_final', new.monto_final_pagado,
      coalesce(new.fecha_pago_final::date, new.fecha), new.nombre_cliente
    );
  else
    perform sync_gasto_cohete(new.id, 'cohete_pago_final', null, new.fecha, new.nombre_cliente);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reservations_cohete on reservations;
create trigger trg_reservations_cohete
  after insert or update of metodo_pago, monto_pagado, fecha_pago,
                            metodo_pago_final, monto_final_pagado, fecha_pago_final,
                            fecha, nombre_cliente
  on reservations
  for each row execute function trg_reservation_cohete_gastos();

-- 4. Backfill: dispara el trigger sobre filas existentes con Terminal
update reservations
   set updated_at = coalesce(updated_at, now())
 where metodo_pago = 'Terminal'
    or metodo_pago_final = 'Terminal';
