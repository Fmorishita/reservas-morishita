-- ============================================================
-- INGRESOS UNIFICADOS
-- View que devuelve TODOS los movimientos de ingreso como line-items:
--   1. Anticipos (50% al confirmar): numero_personas * 925
--      fecha = fecha_pago si existe, si no created_at de la reserva
--   2. Pago en sitio del restante (al marcar Completada): numero_personas * 925
--      fecha = fecha de la reservación (cuando vinieron al restaurante)
--   3. Ingresos manuales (walk-ins, eventos, etc.) de ingresos_sitio
--
-- Permite dashboards con detalle, exports, y filtros por fecha.
-- ============================================================

create or replace view v_ingresos_unificados as
-- 1) Anticipo (50%) cuando la reserva está Confirmada o Completada
select
  ('dep_' || r.id::text)                                   as id,
  'deposito_reserva'::text                                 as tipo,
  r.id                                                     as reserva_id,
  null::uuid                                               as ingreso_sitio_id,
  coalesce(r.fecha_pago::date, r.created_at::date)         as fecha,
  coalesce(r.fecha_pago, r.created_at)                     as fecha_ts,
  (r.numero_personas * 925)::numeric                       as monto,
  coalesce(r.metodo_pago, 'efectivo')::text                as metodo,
  r.nombre_cliente                                         as nombre_cliente,
  r.numero_personas                                        as numero_personas,
  r.tipo_menu                                              as tipo_menu,
  r.estado                                                 as estado_reserva,
  ('Anticipo · ' || r.nombre_cliente || ' · ' || r.numero_personas || ' pax')::text as descripcion
from reservations r
where r.estado in ('Confirmada', 'Completada')

union all

-- 2) Pago restante en el restaurante (cuando se marca Completada)
select
  ('fin_' || r.id::text)                                   as id,
  'pago_sitio_reserva'::text                               as tipo,
  r.id                                                     as reserva_id,
  null::uuid                                               as ingreso_sitio_id,
  r.fecha                                                  as fecha,
  (r.fecha::timestamptz)                                   as fecha_ts,
  (r.numero_personas * 925)::numeric                       as monto,
  coalesce(r.metodo_pago, 'efectivo')::text                as metodo,
  r.nombre_cliente                                         as nombre_cliente,
  r.numero_personas                                        as numero_personas,
  r.tipo_menu                                              as tipo_menu,
  r.estado                                                 as estado_reserva,
  ('Pago en sitio · ' || r.nombre_cliente || ' · ' || r.numero_personas || ' pax')::text as descripcion
from reservations r
where r.estado = 'Completada'

union all

-- 3) Ingresos manuales (walk-ins, eventos, ajustes)
select
  ('sit_' || i.id::text)                                   as id,
  'ingreso_sitio'::text                                    as tipo,
  i.reserva_id                                             as reserva_id,
  i.id                                                     as ingreso_sitio_id,
  i.fecha                                                  as fecha,
  i.creado_en                                              as fecha_ts,
  i.monto::numeric                                         as monto,
  i.metodo::text                                           as metodo,
  null::text                                               as nombre_cliente,
  null::integer                                            as numero_personas,
  null::text                                               as tipo_menu,
  null::text                                               as estado_reserva,
  coalesce(i.descripcion, 'Ingreso adicional')::text       as descripcion
from ingresos_sitio i;

-- ============================================================
-- v_depositos_por_semana: rewrite para usar la nueva view
-- (mantiene la misma signatura para no romper código existente)
-- ============================================================
create or replace view v_depositos_por_semana as
select
  s.id                                                     as semana_id,
  coalesce(sum(case
    when v.tipo in ('deposito_reserva', 'pago_sitio_reserva') then v.monto
    else 0
  end), 0)                                                 as total_depositos,
  count(case when v.tipo in ('deposito_reserva','pago_sitio_reserva') then 1 end) as num_reservas
from semanas s
left join v_ingresos_unificados v
  on v.fecha between s.fecha_inicio and s.fecha_fin
group by s.id;
