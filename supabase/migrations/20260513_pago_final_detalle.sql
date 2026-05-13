-- ============================================================
-- PAGO FINAL — Detalle adicional (cobrado_por / tipo_tarjeta / propina)
-- ============================================================
-- Cuando una reserva se marca como Completada, un modal pide:
--   - Si Efectivo  → quién cobró (Fran / Verónica)
--   - Si Terminal  → tipo de tarjeta (crédito / débito) + propina
--   - Propina (% o $) disponible para los 3 métodos
-- ============================================================

alter table reservations
  add column if not exists cobrado_por_final   text,
  add column if not exists tipo_tarjeta_final  text,
  add column if not exists propina_final       numeric;

-- cobrado_por_final: solo 'fran' o 'veronica'
alter table reservations
  drop constraint if exists reservations_cobrado_por_final_check;
alter table reservations
  add constraint reservations_cobrado_por_final_check
  check (cobrado_por_final is null or cobrado_por_final in ('fran', 'veronica'));

-- tipo_tarjeta_final: solo 'credito' o 'debito'
alter table reservations
  drop constraint if exists reservations_tipo_tarjeta_final_check;
alter table reservations
  add constraint reservations_tipo_tarjeta_final_check
  check (tipo_tarjeta_final is null or tipo_tarjeta_final in ('credito', 'debito'));

-- propina_final: no negativa
alter table reservations
  drop constraint if exists reservations_propina_final_check;
alter table reservations
  add constraint reservations_propina_final_check
  check (propina_final is null or propina_final >= 0);
