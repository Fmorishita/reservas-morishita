-- ============================================================================
-- Morishita Japanese Cuisine — Módulo de Finanzas
-- Migración inicial completa
-- ============================================================================
-- NOTA: La VIEW v_depositos_por_semana usa la tabla `reservations` del
-- proyecto existente, con los nombres reales de columna:
--   monto_pagado  = monto del anticipo
--   fecha_pago    = fecha en que entró el dinero
--   estado        = 'Confirmada' | 'Completada'
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- ENUMs
-- ---------------------------------------------------------------------------
create type estado_semana       as enum ('abierta', 'cerrada');
create type metodo_pago         as enum ('efectivo', 'transferencia', 'cohete', 'terminal');
create type tipo_gasto          as enum ('insumos', 'publicidad', 'operacion');
create type pagador             as enum ('fran', 'veronica', 'empresa');
create type origen_dinero_enum  as enum ('personal', 'caja_negocio', 'fondo_acumulado');
create type estado_reembolso    as enum ('pendiente', 'pagado_parcial', 'pagado');
create type tipo_dispersion     as enum ('reembolso', 'utilidad', 'efectivo_caja');

-- ---------------------------------------------------------------------------
-- socios
-- ---------------------------------------------------------------------------
create table socios (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid unique references auth.users(id) on delete set null,
  alias       pagador unique not null,
  nombre      text not null,
  rol         text not null default 'socio',
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- semanas
-- ---------------------------------------------------------------------------
create table semanas (
  id                  uuid primary key default uuid_generate_v4(),
  fecha_inicio        date not null,
  fecha_fin           date not null,
  estado              estado_semana not null default 'abierta',
  arrastre_anterior   numeric(12,2) not null default 0,
  notas               text,
  creado_en           timestamptz not null default now(),
  cerrada_en          timestamptz,

  constraint semanas_fechas_check check (fecha_fin >= fecha_inicio),
  constraint semanas_unicas       unique (fecha_inicio, fecha_fin)
);

create index idx_semanas_estado       on semanas(estado);
create index idx_semanas_fecha_inicio on semanas(fecha_inicio desc);

-- ---------------------------------------------------------------------------
-- ingresos_sitio
-- ---------------------------------------------------------------------------
create table ingresos_sitio (
  id            uuid primary key default uuid_generate_v4(),
  semana_id     uuid not null references semanas(id) on delete restrict,
  fecha         date not null,
  monto         numeric(12,2) not null check (monto > 0),
  metodo        metodo_pago not null,
  reserva_id    uuid,
  descripcion   text,
  capturado_por uuid references socios(id),
  creado_en     timestamptz not null default now()
);

create index idx_ingresos_sitio_semana  on ingresos_sitio(semana_id);
create index idx_ingresos_sitio_fecha   on ingresos_sitio(fecha);

-- ---------------------------------------------------------------------------
-- gastos
-- ---------------------------------------------------------------------------
create table gastos (
  id                uuid primary key default uuid_generate_v4(),
  semana_id         uuid not null references semanas(id) on delete restrict,
  fecha             date not null,
  monto             numeric(12,2) not null check (monto > 0),
  tipo              tipo_gasto not null,
  pagado_por        pagador not null,
  origen_dinero     origen_dinero_enum not null,
  descripcion       text not null,
  proveedor         text,
  foto_ticket_url   text,
  capturado_por     uuid references socios(id),
  creado_en         timestamptz not null default now(),

  constraint gastos_origen_coherente check (
    (pagado_por = 'empresa' and origen_dinero <> 'personal')
    or (pagado_por <> 'empresa')
  )
);

create index idx_gastos_semana     on gastos(semana_id);
create index idx_gastos_fecha      on gastos(fecha);
create index idx_gastos_tipo       on gastos(tipo);
create index idx_gastos_pagado_por on gastos(pagado_por);

-- ---------------------------------------------------------------------------
-- reembolsos
-- ---------------------------------------------------------------------------
create table reembolsos (
  id              uuid primary key default uuid_generate_v4(),
  semana_id       uuid not null references semanas(id) on delete cascade,
  socio           pagador not null check (socio in ('fran', 'veronica')),
  monto_total     numeric(12,2) not null check (monto_total >= 0),
  monto_pagado    numeric(12,2) not null default 0 check (monto_pagado >= 0),
  estado          estado_reembolso not null default 'pendiente',
  cuenta_destino  text,
  fecha_pago      date,
  notas           text,
  creado_en       timestamptz not null default now(),

  constraint reembolsos_pago_no_excede    check (monto_pagado <= monto_total),
  constraint reembolsos_unicos_por_semana unique (semana_id, socio)
);

create index idx_reembolsos_semana on reembolsos(semana_id);
create index idx_reembolsos_estado on reembolsos(estado);

-- ---------------------------------------------------------------------------
-- cortes
-- ---------------------------------------------------------------------------
create table cortes (
  id                      uuid primary key default uuid_generate_v4(),
  semana_id               uuid not null unique references semanas(id) on delete cascade,
  ingresos_depositos      numeric(12,2) not null default 0,
  ingresos_sitio_total    numeric(12,2) not null default 0,
  ingresos_totales        numeric(12,2) not null default 0,
  gastos_totales          numeric(12,2) not null default 0,
  reembolsos_totales      numeric(12,2) not null default 0,
  utilidad_bruta          numeric(12,2) not null default 0,
  utilidad_distribuible   numeric(12,2) not null default 0,
  fran_recibe             numeric(12,2) not null default 0,
  veronica_recibe         numeric(12,2) not null default 0,
  arrastre_siguiente      numeric(12,2) not null default 0,
  pdf_url                 text,
  cerrado_por             uuid references socios(id),
  cerrado_en              timestamptz not null default now()
);

create index idx_cortes_semana on cortes(semana_id);

-- ---------------------------------------------------------------------------
-- dispersiones
-- ---------------------------------------------------------------------------
create table dispersiones (
  id              uuid primary key default uuid_generate_v4(),
  corte_id        uuid not null references cortes(id) on delete cascade,
  tipo            tipo_dispersion not null,
  beneficiario    pagador not null,
  monto           numeric(12,2) not null check (monto > 0),
  cuenta_destino  text,
  metodo          metodo_pago,
  fecha_ejecucion date,
  conciliado      boolean not null default false,
  notas           text,
  creado_en       timestamptz not null default now()
);

create index idx_dispersiones_corte on dispersiones(corte_id);

-- ---------------------------------------------------------------------------
-- VIEW: v_depositos_por_semana
-- Usa la tabla `reservations` del proyecto existente.
-- Columnas reales: monto_pagado, fecha_pago, estado
-- ---------------------------------------------------------------------------
create or replace view v_depositos_por_semana as
select
  s.id as semana_id,
  coalesce(sum(r.monto_pagado), 0) as total_depositos,
  count(r.id)                       as num_reservas
from semanas s
left join reservations r
  on r.fecha_pago between s.fecha_inicio and s.fecha_fin
  and r.estado in ('Confirmada', 'Completada')
  and r.monto_pagado is not null
group by s.id;

-- ---------------------------------------------------------------------------
-- VIEW: v_resumen_semana
-- ---------------------------------------------------------------------------
create or replace view v_resumen_semana as
select
  s.id as semana_id,
  s.fecha_inicio,
  s.fecha_fin,
  s.estado,
  s.arrastre_anterior,
  coalesce((select sum(monto) from ingresos_sitio where semana_id = s.id), 0) as ingresos_sitio,
  coalesce((select sum(monto) from gastos where semana_id = s.id and tipo = 'insumos'), 0)    as gastos_insumos,
  coalesce((select sum(monto) from gastos where semana_id = s.id and tipo = 'publicidad'), 0) as gastos_publicidad,
  coalesce((select sum(monto) from gastos where semana_id = s.id and tipo = 'operacion'), 0)  as gastos_operacion,
  coalesce((select sum(monto) from gastos where semana_id = s.id), 0)                          as gastos_totales,
  coalesce((select sum(monto) from gastos
            where semana_id = s.id and pagado_por <> 'empresa' and origen_dinero = 'personal'), 0) as reembolsos_potenciales,
  coalesce((select sum(monto) from gastos
            where semana_id = s.id and pagado_por = 'fran' and origen_dinero = 'personal'), 0)     as fran_puso_personal,
  coalesce((select sum(monto) from gastos
            where semana_id = s.id and pagado_por = 'veronica' and origen_dinero = 'personal'), 0) as veronica_puso_personal
from semanas s;

-- ---------------------------------------------------------------------------
-- TRIGGER: cerrada_en automático
-- ---------------------------------------------------------------------------
create or replace function set_cerrada_en()
returns trigger as $$
begin
  if new.estado = 'cerrada' and old.estado = 'abierta' then
    new.cerrada_en := now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_semanas_cerrada_en
  before update on semanas
  for each row
  execute function set_cerrada_en();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table socios          enable row level security;
alter table semanas         enable row level security;
alter table ingresos_sitio  enable row level security;
alter table gastos          enable row level security;
alter table reembolsos      enable row level security;
alter table cortes          enable row level security;
alter table dispersiones    enable row level security;

-- Lectura: cualquier socio activo
create policy "socios_read_all" on socios
  for select using (auth.uid() in (select user_id from socios where activo = true));

create policy "semanas_read_all" on semanas
  for select using (auth.uid() in (select user_id from socios where activo = true));

create policy "ingresos_read_all" on ingresos_sitio
  for select using (auth.uid() in (select user_id from socios where activo = true));

create policy "gastos_read_all" on gastos
  for select using (auth.uid() in (select user_id from socios where activo = true));

create policy "reembolsos_read_all" on reembolsos
  for select using (auth.uid() in (select user_id from socios where activo = true));

create policy "cortes_read_all" on cortes
  for select using (auth.uid() in (select user_id from socios where activo = true));

create policy "dispersiones_read_all" on dispersiones
  for select using (auth.uid() in (select user_id from socios where activo = true));

-- Escritura: cualquier socio activo puede capturar
create policy "ingresos_insert" on ingresos_sitio
  for insert with check (auth.uid() in (select user_id from socios where activo = true));

create policy "gastos_insert" on gastos
  for insert with check (auth.uid() in (select user_id from socios where activo = true));

-- Escritura admin: solo fran puede cerrar semanas / cortes
create policy "semanas_admin_write" on semanas
  for all using (
    auth.uid() in (select user_id from socios where alias = 'fran' and activo = true)
  );

create policy "cortes_admin_write" on cortes
  for all using (
    auth.uid() in (select user_id from socios where alias = 'fran' and activo = true)
  );

create policy "reembolsos_admin_write" on reembolsos
  for all using (
    auth.uid() in (select user_id from socios where alias = 'fran' and activo = true)
  );

create policy "dispersiones_admin_write" on dispersiones
  for all using (
    auth.uid() in (select user_id from socios where alias = 'fran' and activo = true)
  );

-- ---------------------------------------------------------------------------
-- Storage bucket tickets (ejecutar desde dashboard o descomentar):
-- ---------------------------------------------------------------------------
-- insert into storage.buckets (id, name, public) values ('tickets', 'tickets', false);
--
-- create policy "tickets_socios_read" on storage.objects
--   for select using (
--     bucket_id = 'tickets'
--     and auth.uid() in (select user_id from socios where activo = true)
--   );
-- create policy "tickets_socios_insert" on storage.objects
--   for insert with check (
--     bucket_id = 'tickets'
--     and auth.uid() in (select user_id from socios where activo = true)
--   );

-- ---------------------------------------------------------------------------
-- SEED socios — ejecutar DESPUÉS de crear usuarios en Supabase Auth:
-- ---------------------------------------------------------------------------
-- insert into socios (user_id, alias, nombre, rol) values
--   ('<UUID-DE-FRAN-EN-AUTH>',     'fran',     'Francisco', 'admin'),
--   ('<UUID-DE-VERONICA-EN-AUTH>', 'veronica', 'Verónica',  'socio');
