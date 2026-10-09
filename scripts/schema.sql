-- Estado del plan del viaje. Una fila por viaje.
create table if not exists trip_state (
  id          text        primary key,
  data        jsonb       not null default '{}'::jsonb,
  rev         integer     not null default 0,
  updated_at  timestamptz not null default now()
);

-- Historial: cada guardado deja una versión, por si hay que volver atrás.
create table if not exists trip_history (
  id          bigserial   primary key,
  trip_id     text        not null,
  rev         integer     not null,
  data        jsonb       not null,
  created_at  timestamptz not null default now()
);

create index if not exists trip_history_trip_idx on trip_history (trip_id, rev desc);
