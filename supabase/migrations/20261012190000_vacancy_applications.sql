-- Postulaciones (T11a): la fila que une a un jugador con una vacante. Las
-- reglas del negocio viven en la base: una postulación por jugador y vacante
-- (clave única), solo a vacantes abiertas (trigger), solo de jugadores con
-- perfil (clave foránea a `players`) y visible solo para el jugador y para el
-- dueño del equipo (RLS).
--
-- Sin columna de estado: en v1 el delegado no responde (aceptar, rechazar,
-- "vista"). Se agrega cuando exista esa respuesta.
create table public.vacancy_applications (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies (id) on delete cascade,
  -- A `players` y no a `profiles`: una cuenta sin perfil de jugador (un
  -- delegado, o un jugador que todavía no completó su perfil) rebota con 23503.
  player_id uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint vacancy_applications_vacancy_player_key unique (vacancy_id, player_id)
);

-- La lista del delegado (por vacante) y la del jugador ("Mis postulaciones"),
-- las dos de la más nueva a la más vieja.
create index vacancy_applications_vacancy_id_created_at_idx
on public.vacancy_applications (vacancy_id, created_at desc);
create index vacancy_applications_player_id_created_at_idx
on public.vacancy_applications (player_id, created_at desc);

-- Solo se postula a una vacante abierta. Cerrarla después no toca las
-- postulaciones ya hechas: el trigger es solo de insert.
--
-- `security definer`, igual que el límite de highlights: tiene que ver la
-- vacante aunque mañana la RLS de `vacancies` deje de mostrar las cerradas.
-- Con un trigger invoker, una vacante cerrada invisible daría `null` y la
-- postulación pasaría.
--
-- Una vacante que no existe también da `null`, y ahí se deja pasar a
-- propósito: la clave foránea la rechaza con 23503, que es el error correcto.
-- Lanzar `vacancy_closed` diría que existe y está cerrada.
create function public.enforce_application_on_open_vacancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select v.status into v_status
  from public.vacancies v
  where v.id = new.vacancy_id;

  if v_status is not null and v_status <> 'open' then
    raise exception 'vacancy_closed' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger vacancy_applications_enforce_open_vacancy
before insert on public.vacancy_applications
for each row
execute function public.enforce_application_on_open_vacancy();

alter table public.vacancy_applications enable row level security;

-- La ve el jugador que se postuló y el dueño del equipo de la vacante. Nadie
-- más: a diferencia de las vacantes, una postulación no es pública.
create policy vacancy_applications_select on public.vacancy_applications
for select
to authenticated
using (
  player_id = (select auth.uid())
  or exists (
    select 1 from public.vacancies v
    where v.id = vacancy_id
      and public.is_team_owner(v.team_id)
  )
);

-- Solo a nombre propio. La RLS se evalúa antes que la clave foránea: un
-- delegado que se postula con su propio id pasa acá y rebota en la foránea
-- (23503); con el id de otro jugador rebota acá (42501).
create policy vacancy_applications_insert on public.vacancy_applications
for insert
to authenticated
with check (player_id = (select auth.uid()));

-- Sin política de update: una postulación es inmutable.

-- Retirarse es borrar la fila propia. Después se puede volver a postular, con
-- una fila nueva, si la vacante sigue abierta.
create policy vacancy_applications_delete on public.vacancy_applications
for delete
to authenticated
using (player_id = (select auth.uid()));

-- El select a `anon` es a propósito, como en el resto de las tablas: sin
-- policy para ese rol, una consulta anónima devuelve 0 filas en vez de un
-- error.
grant select on table public.vacancy_applications to anon, authenticated;
grant delete on table public.vacancy_applications to authenticated;

-- `id` y `created_at` los pone la base.
grant insert (vacancy_id, player_id)
on table public.vacancy_applications to authenticated;

-- Sin `grant update`: acompaña a la ausencia de política. Un update rebota
-- con 42501 antes de llegar a la RLS.
