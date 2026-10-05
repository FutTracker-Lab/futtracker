create table public.players (
  id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date,
  position text check (position in ('arquero', 'defensor', 'mediocampista', 'delantero')),
  preferred_foot text check (preferred_foot in ('derecha', 'izquierda', 'ambidiestro')),
  height_cm int check (height_cm between 100 and 250),
  weight_kg int check (weight_kg between 30 and 200),
  city text,
  province text,
  country text default 'AR',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  bio text check (char_length(bio) <= 1000),
  phone text,
  is_seeking_team boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- La fila no la crea un trigger de alta como en `profiles`: nace en el primer
-- guardado del perfil. Una cuenta de delegado no tiene datos futbolísticos y
-- no debe tener fila acá.

create trigger players_set_updated_at
before update on public.players
for each row
execute function public.set_updated_at();

-- Los tres índices son de los filtros del buscador de jugadores (T09a) y del
-- listado de "libres", no de las políticas: la de `select` no mira ninguna
-- columna y las de escritura filtran por `id`, que ya es la PK.
create index players_city_idx on public.players (city);
create index players_position_idx on public.players (position);
create index players_is_seeking_team_idx on public.players (is_seeking_team);

alter table public.players enable row level security;

create policy players_select on public.players
for select
using (auth.role() = 'authenticated');

-- El `exists` sobre `profiles` es lo que impide que un delegado se cree una
-- ficha de jugador: `auth.uid() = id` solo dice que la fila es propia, no que
-- la cuenta sea de un jugador.
create policy players_insert on public.players
for insert
with check (
  auth.uid() = id
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'player'
  )
);

create policy players_update on public.players
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Sin política de `delete` a propósito: la ficha se va con la cuenta, por el
-- `on delete cascade`.

-- Sin esto PostgREST devuelve 42501 aunque RLS esté bien: el proyecto no
-- expone las tablas nuevas automáticamente.
grant select on table public.players to authenticated;

-- Las columnas van enumeradas y no `on table`: RLS controla qué fila se toca,
-- nunca qué columna. Así los timestamps quedan para la base (el default y el
-- trigger de arriba) y no los puede escribir un PATCH desde el navegador.
grant insert (
  id, birth_date, position, preferred_foot, height_cm, weight_kg,
  city, province, country, latitude, longitude, bio, phone, is_seeking_team
) on table public.players to authenticated;

-- `id` va en el update aunque no se edite: un upsert de PostgREST manda el PK
-- dentro del `set` del `on conflict`, y sin el grant el segundo guardado del
-- perfil falla con 42501. Cambiarlo de dueño sigue sin poder: el `with check`
-- de `players_update` exige que la fila resultante sea propia.
grant update (
  id, birth_date, position, preferred_foot, height_cm, weight_kg,
  city, province, country, latitude, longitude, bio, phone, is_seeking_team
) on table public.players to authenticated;
