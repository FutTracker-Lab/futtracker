create table public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  club_name text,
  category text,
  league text,
  city text,
  province text,
  country text default 'AR',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  -- La cota de arriba es un literal y no `extract(year from now())` porque
  -- Postgres exige que un `check` sea IMMUTABLE: con `now()` la migración ni
  -- corre. 2100 es un tope absurdo a propósito, el filtro real es el formulario.
  founded_year int check (founded_year between 1850 and 2100),
  crest_path text,
  bio text check (char_length(bio) <= 1000),
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger teams_set_updated_at
before update on public.teams
for each row
execute function public.set_updated_at();

-- El `coalesce` es lo que hace que el índice sirva: sin él, dos equipos con el
-- mismo nombre y `city` nula no colisionan, porque NULL nunca es igual a NULL y
-- un índice único deja pasar todas las filas que quieran. El `btrim` es porque
-- "Racing " y "Racing" son el mismo duplicado, no dos equipos.
create unique index teams_name_city_unique
on public.teams (lower(btrim(name)), lower(btrim(coalesce(city, ''))));

-- De los filtros del buscador de equipos, no de las políticas: la de `select`
-- no mira ninguna columna y las de escritura filtran por `owner_id`, que ya
-- tiene índice por el `unique`.
create index teams_city_idx on public.teams (city);
create index teams_category_idx on public.teams (category);

alter table public.teams enable row level security;

create policy teams_select on public.teams
for select
using (auth.role() = 'authenticated');

-- El `exists` sobre `profiles` es lo que impide que una cuenta de jugador cree
-- equipos: `auth.uid() = owner_id` solo dice que la fila es propia, no que la
-- cuenta sea de delegado.
--
-- La regex del `crest_path` va con `[^/]+` y no con un `like 'id/%'`: con el
-- like, `id/../otro.png` pasa el check y el escudo termina en la carpeta de
-- otro equipo.
create policy teams_insert on public.teams
for insert
with check (
  auth.uid() = owner_id
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'delegate'
  )
  and (
    crest_path is null
    or crest_path ~ ('^' || id::text || '/[^/]+$')
  )
);

create policy teams_update on public.teams
for update
using (auth.uid() = owner_id)
with check (
  auth.uid() = owner_id
  and (
    crest_path is null
    or crest_path ~ ('^' || id::text || '/[^/]+$')
  )
);

create policy teams_delete on public.teams
for delete
using (auth.uid() = owner_id);

-- Sin esto PostgREST devuelve 42501 aunque RLS esté bien: el proyecto no
-- expone las tablas nuevas automáticamente.
grant select on table public.teams to authenticated;
grant delete on table public.teams to authenticated;

-- Las columnas van enumeradas y no `on table`: RLS controla qué fila se toca,
-- nunca qué columna. Así los timestamps y el `id` quedan para la base y no los
-- puede escribir un PATCH desde el navegador.
grant insert (
  owner_id, name, club_name, category, league, city, province, country,
  latitude, longitude, founded_year, crest_path, bio, contact_email
) on table public.teams to authenticated;

-- `owner_id` está en el insert pero no acá: sin ese recorte, un PATCH podía
-- transferirle el equipo a otra cuenta. Transferir la titularidad está fuera
-- del alcance del ticket.
grant update (
  name, club_name, category, league, city, province, country,
  latitude, longitude, founded_year, crest_path, bio, contact_email
) on table public.teams to authenticated;
