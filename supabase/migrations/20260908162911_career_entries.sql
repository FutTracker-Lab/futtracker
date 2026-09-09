create table public.career_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  -- Sin FK todavía: `public.teams` existe en T05a, que no mergeó a dev. Poner
  -- la referencia acá rompería esta migración al aplicarla. Va en una
  -- migración de seguimiento cuando T05a esté en dev, no editando esta.
  team_id uuid,
  club_name text not null check (char_length(club_name) between 2 and 80),
  category text,
  position text check (position in ('arquero', 'defensor', 'mediocampista', 'delantero')),
  start_date date not null,
  end_date date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (not is_current or end_date is null)
);

create trigger career_entries_set_updated_at
before update on public.career_entries
for each row
execute function public.set_updated_at();

create index career_entries_player_id_start_date_idx
on public.career_entries (player_id, start_date desc);

alter table public.career_entries enable row level security;

create policy career_entries_select on public.career_entries
for select
to authenticated
using (true);

-- `player_id = auth.uid()` alcanza sin consultar `players`: su PK es la de
-- `profiles`, que es la de `auth.users`. Tampoco se repite el `exists` de
-- `players_insert`: un delegado no tiene fila en `players` y la FK lo rebota.
create policy career_entries_insert on public.career_entries
for insert
to authenticated
with check (player_id = auth.uid());

create policy career_entries_update on public.career_entries
for update
to authenticated
using (player_id = auth.uid())
with check (player_id = auth.uid());

create policy career_entries_delete on public.career_entries
for delete
to authenticated
using (player_id = auth.uid());

-- Sin esto PostgREST devuelve 42501 aunque RLS esté bien. El select a `anon`
-- es a propósito: sin policy para ese rol, una consulta anónima devuelve 0
-- filas en vez de un error de permisos.
grant select on table public.career_entries to anon, authenticated;
grant delete on table public.career_entries to authenticated;

-- Las columnas van enumeradas y no `on table`: RLS controla qué fila se toca,
-- nunca qué columna. Así el `id` y los timestamps quedan para la base y no los
-- puede escribir un PATCH desde el navegador.
grant insert (
  player_id, team_id, club_name, category, position, start_date, end_date,
  is_current
) on table public.career_entries to authenticated;

-- `player_id` está en el insert pero no acá: sin ese recorte, un PATCH podía
-- endosarle la entrada a otro jugador. El `with check` de `career_entries_update`
-- ya lo impide; esto lo corta un paso antes.
grant update (
  team_id, club_name, category, position, start_date, end_date, is_current
) on table public.career_entries to authenticated;
