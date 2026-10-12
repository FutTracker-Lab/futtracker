-- Vacantes de los equipos (T10a): lo que un equipo necesita cubrir. Es el
-- objeto sobre el que se apoyan las postulaciones (T11a) y las sugerencias
-- (T12a). La ubicación es la del equipo; la vacante no tiene una propia.
create table public.vacancies (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  position text not null
    check (position in ('arquero', 'defensor', 'mediocampista', 'delantero')),
  modality text not null check (modality in ('futbol_11', 'futbol_7')),
  level text not null check (level in ('recreativo', 'intermedio', 'competitivo')),
  description text check (char_length(description) <= 280),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una sola abierta por posición y equipo ("Una vacante por posición
-- buscada", del diseño). Parcial: las cerradas no cuentan, así que un equipo
-- puede acumular varias cerradas de la misma posición.
create unique index vacancies_one_open_per_position
on public.vacancies (team_id, position)
where status = 'open';

-- El índice único de arriba es parcial y no sirve para leer todas las
-- vacantes de un equipo, abiertas y cerradas: este sí.
create index vacancies_team_id_idx on public.vacancies (team_id);
create index vacancies_status_position_idx on public.vacancies (status, position);

create trigger vacancies_set_updated_at
before update on public.vacancies
for each row
execute function public.set_updated_at();

-- Una vacante no se edita: se cierra y, si hace falta, se publica otra.
-- Editarla después de recibir postulaciones cambiaría lo que el jugador
-- aceptó. Solo `status` (y el `updated_at` que pone el otro trigger) pueden
-- cambiar.
--
-- Sin `security definer`: solo compara OLD contra NEW, no lee ninguna tabla.
create function public.enforce_vacancy_status_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.team_id is distinct from old.team_id
     or new.position is distinct from old.position
     or new.modality is distinct from old.modality
     or new.level is distinct from old.level
     or new.description is distinct from old.description then
    -- Código para el frontend, no texto para mostrar: lo traduce
    -- `vacancyErrorKey` a `fieldsLocked`.
    raise exception 'vacancy_fields_locked' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger vacancies_enforce_status_only
before update on public.vacancies
for each row
execute function public.enforce_vacancy_status_only();

alter table public.vacancies enable row level security;

-- Cualquier usuario con sesión lee todas, abiertas y cerradas (decisión
-- 1.6); la app filtra por `status = 'open'` donde corresponde.
create policy vacancies_select on public.vacancies
for select
to authenticated
using (true);

-- `is_team_owner` es de T05a: `security definer`, así que no depende de la
-- RLS de `teams` para resolver el dueño.
create policy vacancies_insert on public.vacancies
for insert
to authenticated
with check (public.is_team_owner(team_id));

create policy vacancies_update on public.vacancies
for update
to authenticated
using (public.is_team_owner(team_id))
with check (public.is_team_owner(team_id));

-- Sin política de delete: en v1 no se borra, se cierra. El `on delete
-- cascade` sigue funcionando cuando el delegado borra su equipo, porque lo
-- ejecuta la clave foránea con los permisos del dueño de la tabla, no el rol
-- de quien borra.

-- El select a `anon` es a propósito, como en `player_highlights`: sin policy
-- para ese rol, una consulta anónima devuelve 0 filas en vez de un error.
grant select on table public.vacancies to anon, authenticated;

-- Columnas enumeradas: `id`, `status`, `created_at` y `updated_at` los pone la
-- base. Una vacante nace abierta.
grant insert (team_id, position, modality, level, description)
on table public.vacancies to authenticated;

-- El update incluye las columnas que el trigger bloquea, y es a propósito:
-- si solo se otorgara `status`, cambiar `position` rebotaría con un 42501 de
-- permisos antes de llegar al trigger, y la app mostraría "no tenés permiso"
-- en vez de "una vacante no se edita". El trigger es el que dice que no, con
-- su propio código.
grant update (team_id, position, modality, level, description, status)
on table public.vacancies to authenticated;

-- Sin `grant delete`: acompaña a la ausencia de política. Un delete directo
-- rebota con 42501.
