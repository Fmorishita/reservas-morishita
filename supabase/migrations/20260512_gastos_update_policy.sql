-- ============================================================================
-- Agregar política de UPDATE para tabla gastos
-- Permite que los socios activos actualicen gastos
-- ============================================================================

create policy "gastos_update" on gastos
  for update using (
    auth.uid() in (select user_id from socios where activo = true)
  )
  with check (
    auth.uid() in (select user_id from socios where activo = true)
  );
