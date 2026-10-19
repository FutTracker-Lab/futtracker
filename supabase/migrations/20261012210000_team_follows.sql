-- Seguir equipos (T13a): una fila `(seguidor, equipo)`. Lo delicado es la
-- privacidad: cuántos siguen a un equipo es visible para cualquier cuenta,
-- pero quién sigue a quién solo lo ven el propio seguidor y el dueño del
-- equipo.
create table public.team_follows (
  -- A `profiles` y no a `players`: seguir no exige el perfil de jugador
  -- completo (supuesto 2). Que sea un jugador lo exige la política de insert.
  follower_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- La regla "un seguimiento por jugador y equipo": el segundo intento falla
  -- en la base (23505), no solo en la UI.
  primary key (follower_id, team_id)
);

-- La lista de seguidores del equipo y la lista "Siguiendo" del jugador, las
-- dos de la más nueva a la más vieja.
create index team_follows_team_id_created_at_idx
on public.team_follows (team_id, created_at desc);
create index team_follows_follower_id_created_at_idx
on public.team_follows (follower_id, created_at desc);

alter table public.team_follows enable row level security;

-- Quién sigue a quién no es público (supuesto 4): solo el seguidor ve sus
-- filas y el dueño ve las de su equipo. El número lo da la función de abajo.
create policy team_follows_select on public.team_follows
for select
to authenticated
using (
  follower_id = (select auth.uid())
  or public.is_team_owner(team_id)
);

-- Solo jugadores siguen (supuesto 1), y solo a nombre propio. Un delegado o
-- alguien que inserta con el id de otro rebota acá con 42501.
create policy team_follows_insert on public.team_follows
for insert
to authenticated
with check (
  follower_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'player'
  )
);

-- Sin política de update: un seguimiento es inmutable.

-- Dejar de seguir es borrar la fila propia.
create policy team_follows_delete on public.team_follows
for delete
to authenticated
using (follower_id = (select auth.uid()));

-- El select a `anon` es el patrón del repo: sin policy para ese rol, una
-- consulta anónima devuelve 0 filas en vez de un error.
grant select on table public.team_follows to anon, authenticated;
grant delete on table public.team_follows to authenticated;

-- `created_at` lo pone la base.
grant insert (follower_id, team_id) on table public.team_follows to authenticated;

-- Sin `grant update`: acompaña a la ausencia de política. Un update rebota
-- con 42501 antes de llegar a la RLS.

-- Cuántos siguen a un equipo. Función y no vista: una vista `security_invoker`
-- (la convención del repo) heredaría la RLS de arriba, y cada jugador vería un
-- 0 o un 1. Esta es `security definer` para contar todas las filas, y expone
-- solo el número, así que no filtra quién sigue a quién.
--
-- Un equipo que no existe da 0, sin error. `search_path = public` como pide el
-- ticket: con `definer`, fijarlo es lo que impide que alguien suplante
-- `team_follows` con una tabla propia en otro esquema.
create function public.team_follower_count(p_team_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.team_follows where team_id = p_team_id;
$$;

-- Postgres le da `execute` a PUBLIC sobre toda función nueva, y PUBLIC
-- incluye a `anon`: el revoke va explícito y antes del grant.
revoke execute on function public.team_follower_count(uuid) from public, anon;
grant execute on function public.team_follower_count(uuid) to authenticated;
