-- T22 · Reporter diario de KPIs (FUT-132).
--
-- Tres piezas:
--
--   api_error_log    registro de las respuestas 5xx de nuestra API (R1).
--   kpi_report_runs  copia de cada envío a la plataforma de la cátedra (R2.4).
--   kpi_daily_counts los conteos de negocio para el reporter, sin service_role.
--
-- El reporter es una cuenta común de Supabase Auth con
-- `app_metadata.kpi_reporter = true`. `app_metadata` solo se escribe con
-- privilegios de administrador (la API de Auth no deja que el usuario lo
-- toque), así que la marca no se la puede poner nadie a sí mismo. El alta de
-- la cuenta en dev y prod está en docs/kpis.md.

-- =====================================================================
-- ¿Quién llama es el reporter?
-- =====================================================================
create function public.is_kpi_reporter()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt()) -> 'app_metadata' -> 'kpi_reporter' = 'true'::jsonb,
    false
  );
$$;

revoke execute on function public.is_kpi_reporter() from public, anon;
grant execute on function public.is_kpi_reporter() to authenticated;

-- =====================================================================
-- R1 · Registro de errores 5xx
-- =====================================================================
-- Sin cuerpo, sin query string, sin usuario: solo cuándo, qué ruta (el patrón,
-- no el path real, para que un parámetro no meta datos personales), qué método
-- y qué código.
create table public.api_error_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  route text not null,
  method text not null,
  status int not null check (status between 500 and 599)
);

create index api_error_log_created_at_idx on public.api_error_log (created_at);

-- RLS sin ninguna política y sin grants: nadie lee ni escribe la tabla de forma
-- directa. Se escribe solo por `log_api_error` y se cuenta solo por
-- `kpi_daily_counts`, las dos `security definer`.
alter table public.api_error_log enable row level security;

-- La llama el wrapper de los route handlers (lib/api/error-log.ts) con la
-- clave publishable y sin sesión, por eso va también para `anon`. Riesgo
-- residual aceptado por el TL: cualquiera con la clave pública puede sumar
-- registros válidos e inflar `errores_5xx`. La validación acota qué se
-- guarda, no quién; la retención acota cuánto ocupa.
--
-- Retención: cada registro borra los de más de 30 días. El reporter solo
-- cuenta el día anterior, y 30 días alcanzan para reportar a mano un día
-- pasado con KPI_DATE. Va acá y no en un cron porque pg_cron no está
-- garantizado en el plan del proyecto; el índice por `created_at` hace que
-- el borrado sea una búsqueda por rango, casi siempre vacía.
create function public.log_api_error(
  p_route text,
  p_method text,
  p_status int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status is null or p_status not between 500 and 599 then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  -- Una ruta nueva de la API se agrega acá en la misma PR que la crea.
  if p_route is null or p_route not in ('/api/health', '/auth/callback') then
    raise exception 'unknown_route' using errcode = '22023';
  end if;

  if p_method is null
     or p_method not in ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS') then
    raise exception 'invalid_method' using errcode = '22023';
  end if;

  delete from public.api_error_log
  where created_at < now() - interval '30 days';

  insert into public.api_error_log (route, method, status)
  values (p_route, p_method, p_status);
end;
$$;

revoke execute on function public.log_api_error(text, text, int) from public;
grant execute on function public.log_api_error(text, text, int) to anon, authenticated;

-- =====================================================================
-- R2.4 · Copia de cada envío
-- =====================================================================
create table public.kpi_report_runs (
  run_id uuid primary key,
  env text not null check (env in ('dev', 'qa', 'prod')),
  kpi_date date not null,
  -- El body tal cual se mandó a la plataforma.
  payload jsonb not null,
  -- null: no hubo respuesta (falla de red en todos los intentos).
  response_status int,
  attempts int not null check (attempts between 1 and 4),
  -- Los KPIs que no se pudieron medir y viajaron con su valor de reemplazo.
  fallbacks text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.kpi_report_runs enable row level security;

-- Solo inserción y solo el reporter. Sin `select`: el reporter manda con
-- `return=minimal` y no necesita leer lo que guardó. Sin `update` ni
-- `delete`: la copia es un registro de lo que pasó.
create policy kpi_report_runs_insert on public.kpi_report_runs
for insert
to authenticated
with check ((select public.is_kpi_reporter()));

-- Por columna: `created_at` la pone la base.
grant insert (run_id, env, kpi_date, payload, response_status, attempts, fallbacks)
on table public.kpi_report_runs to authenticated;

-- =====================================================================
-- Conteos de negocio para el reporter
-- =====================================================================
-- `security definer` porque cuenta filas que la RLS no le mostraría a una
-- cuenta común (perfiles, seguimientos ajenos, el log de errores). A cambio
-- devuelve solo números, y solo al reporter.
--
-- `p_date` es un día calendario en America/Argentina/Buenos_Aires. Los
-- acumulados toman todo lo creado antes de que termine ese día; los errores,
-- solo lo de ese día.
create function public.kpi_daily_counts(p_date date)
returns table (
  players_registered bigint,
  players_following bigint,
  complete_profiles bigint,
  contacts_started bigint,
  contacts_successful bigint,
  errors_5xx bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_registered bigint;
  v_following bigint := 0;
  v_complete bigint;
  v_errors bigint;
begin
  if not public.is_kpi_reporter() then
    raise exception 'kpi_reporter_only' using errcode = '42501';
  end if;

  if p_date is null then
    raise exception 'invalid_date' using errcode = '22023';
  end if;

  v_start := p_date::timestamp at time zone 'America/Argentina/Buenos_Aires';
  v_end := (p_date + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires';

  -- Jugador registrado: una cuenta con rol `player`, tenga o no su ficha.
  select count(*) into v_registered
  from public.profiles pr
  where pr.role = 'player'
    and pr.created_at < v_end;

  -- Perfil completo: la ficha de jugador creada.
  select count(*) into v_complete
  from public.players p
  where p.created_at < v_end;

  -- `team_follows` llega con T13a. PL/pgSQL resuelve las tablas recién al
  -- ejecutar cada sentencia, así que mientras la tabla no exista esta rama no
  -- corre y el KPI vale 0, que es el valor que fija el ticket.
  if to_regclass('public.team_follows') is not null then
    select count(distinct f.follower_id) into v_following
    from public.team_follows f
    join public.profiles pr on pr.id = f.follower_id
    where pr.role = 'player'
      and pr.created_at < v_end
      and f.created_at < v_end;
  end if;

  select count(*) into v_errors
  from public.api_error_log e
  where e.created_at >= v_start
    and e.created_at < v_end;

  -- Los contactos salen de "Mensajería directa", que todavía no existe. Hasta
  -- entonces van en 0, como prevé el ticket.
  return query
  select v_registered, v_following, v_complete, 0::bigint, 0::bigint, v_errors;
end;
$$;

revoke execute on function public.kpi_daily_counts(date) from public, anon;
grant execute on function public.kpi_daily_counts(date) to authenticated;
