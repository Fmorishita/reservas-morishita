-- ============================================================
-- INGRESOS COMPLETOS — Fix de cálculo de ingresos y métodos de pago
-- ============================================================
-- Problemas que resuelve:
--   1. Anticipos de reservas retroactivas aparecían en la semana del
--      registro (created_at) en lugar de la semana de la reservación.
--      → Fix: la view ahora usa r.fecha para el anticipo también.
--
--   2. Reservas marcadas "Completada" no permitían registrar el pago
--      final por separado (método de pago, monto, fecha).
--      → Fix: nuevos campos monto_final_pagado, metodo_pago_final,
--             fecha_pago_final en reservations.
--
--   3. Historial mostraba todo como "efectivo" porque metodo_pago era
--      uno solo compartido entre anticipo y pago final.
--      → Fix: view usa metodo_pago_final para el pago en sitio.
--
--   4. "Tarjeta" en realidad es la Terminal Cohete.
--      → Fix: renombrado a 'Terminal' y migración de datos existentes.
-- ============================================================

-- 1. Eliminar constraint viejo PRIMERO (antes del UPDATE)
--    El constraint anterior se llamaba 'valid_metodo_pago' y solo aceptaba
--    'Efectivo', 'Tarjeta', 'Transferencia'. Si lo dejamos, el UPDATE de
--    Tarjeta→Terminal falla.
alter table reservations drop constraint if exists valid_metodo_pago;
alter table reservations drop constraint if exists reservations_metodo_pago_check;

-- 2. Agregar columnas para el pago final (restante 50%)
alter table reservations
  add column if not exists monto_final_pagado  numeric,
  add column if not exists metodo_pago_final   text,
  add column if not exists fecha_pago_final    timestamp with time zone;

-- 3. Migrar datos existentes: 'Tarjeta' → 'Terminal'
update reservations set metodo_pago = 'Terminal' where metodo_pago = 'Tarjeta';

-- 4. Recrear CHECK constraints con los nuevos valores válidos
alter table reservations add constraint reservations_metodo_pago_check
  check (metodo_pago is null or metodo_pago in ('Efectivo', 'Transferencia', 'Terminal'));

alter table reservations drop constraint if exists reservations_metodo_pago_final_check;
alter table reservations add constraint reservations_metodo_pago_final_check
  check (metodo_pago_final is null or metodo_pago_final in ('Efectivo', 'Transferencia', 'Terminal'));

-- 4. Recrear v_ingresos_unificados con los fixes
drop view if exists v_depositos_por_semana;
drop view if exists v_ingresos_unificados;

create view v_ingresos_unificados as
-- 1) Anticipo (50%) cuando la reserva está Confirmada o Completada
--    FIX: usa r.fecha (semana de la reservación) en lugar de fecha_pago
select
  ('dep_' || r.id::text)                                                  as id,
  'deposito_reserva'::text                                                as tipo,
  r.id                                                                    as reserva_id,
  null::uuid                                                              as ingreso_sitio_id,
  r.fecha                                                                 as fecha,
  coalesce(r.fecha_pago, r.fecha::timestamptz)                            as fecha_ts,
  coalesce(r.monto_pagado, r.numero_personas * 925)::numeric              as monto,
  coalesce(r.metodo_pago, 'Efectivo')::text                               as metodo,
  r.nombre_cliente                                                        as nombre_cliente,
  r.numero_personas                                                       as numero_personas,
  r.tipo_menu                                                             as tipo_menu,
  r.estado                                                                as estado_reserva,
  ('Anticipo · ' || r.nombre_cliente || ' · ' || r.numero_personas || ' pax')::text as descripcion
from reservations r
where r.estado in ('Confirmada', 'Completada')

union all

-- 2) Pago final (50%) cuando la reserva está Completada
--    FIX: usa metodo_pago_final / monto_final_pagado (nuevos campos)
select
  ('fin_' || r.id::text)                                                  as id,
  'pago_sitio_reserva'::text                                              as tipo,
  r.id                                                                    as reserva_id,
  null::uuid                                                              as ingreso_sitio_id,
  r.fecha                                                                 as fecha,
  coalesce(r.fecha_pago_final, r.fecha::timestamptz)                      as fecha_ts,
  coalesce(r.monto_final_pagado, r.numero_personas * 925)::numeric        as monto,
  coalesce(r.metodo_pago_final, 'Efectivo')::text                         as metodo,
  r.nombre_cliente                                                        as nombre_cliente,
  r.numero_personas                                                       as numero_personas,
  r.tipo_menu                                                             as tipo_menu,
  r.estado                                                                as estado_reserva,
  ('Pago final · ' || r.nombre_cliente || ' · ' || r.numero_personas || ' pax')::text as descripcion
from reservations r
where r.estado = 'Completada'

union all

-- 3) Ingresos manuales (walk-ins, eventos, ajustes) — sin cambios
select
  ('sit_' || i.id::text)                                                  as id,
  'ingreso_sitio'::text                                                   as tipo,
  i.reserva_id                                                            as reserva_id,
  i.id                                                                    as ingreso_sitio_id,
  i.fecha                                                                 as fecha,
  i.creado_en                                                             as fecha_ts,
  i.monto::numeric                                                        as monto,
  i.metodo::text                                                          as metodo,
  null::text                                                              as nombre_cliente,
  null::integer                                                           as numero_personas,
  null::text                                                              as tipo_menu,
  null::text                                                              as estado_reserva,
  coalesce(i.descripcion, 'Ingreso adicional')::text                      as descripcion
from ingresos_sitio i;

-- 5. Recrear v_depositos_por_semana (misma signatura)
create view v_depositos_por_semana as
select
  s.id                                                                    as semana_id,
  coalesce(sum(case
    when v.tipo in ('deposito_reserva', 'pago_sitio_reserva') then v.monto
    else 0
  end), 0)                                                                as total_depositos,
  count(case when v.tipo in ('deposito_reserva','pago_sitio_reserva') then 1 end) as num_reservas
from semanas s
left join v_ingresos_unificados v
  on v.fecha between s.fecha_inicio and s.fecha_fin
group by s.id;
