-- ============================================================
-- ANTICIPO — Detalle adicional (cobrado_por / tipo_tarjeta / propina)
-- ============================================================
-- Equivalente al de pago final pero para el anticipo (50%).
-- El trigger Cohete ya aplica 14.06% sobre monto_pagado cuando
-- metodo_pago = 'Terminal', así que no hace falta cambiar el trigger.
-- ============================================================

alter table reservations
  add column if not exists cobrado_por   text,
  add column if not exists tipo_tarjeta  text,
  add column if not exists propina       numeric;

-- cobrado_por: solo 'fran' o 'veronica'
alter table reservations
  drop constraint if exists reservations_cobrado_por_check;
alter table reservations
  add constraint reservations_cobrado_por_check
  check (cobrado_por is null or cobrado_por in ('fran', 'veronica'));

-- tipo_tarjeta: solo 'credito' o 'debito'
alter table reservations
  drop constraint if exists reservations_tipo_tarjeta_check;
alter table reservations
  add constraint reservations_tipo_tarjeta_check
  check (tipo_tarjeta is null or tipo_tarjeta in ('credito', 'debito'));

-- propina: no negativa
alter table reservations
  drop constraint if exists reservations_propina_check;
alter table reservations
  add constraint reservations_propina_check
  check (propina is null or propina >= 0);
