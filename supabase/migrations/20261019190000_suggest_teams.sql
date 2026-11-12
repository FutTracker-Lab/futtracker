-- T12a · Sugerencias de equipos para jugadores (FUT-125).
--
-- A un jugador se le sugieren las vacantes abiertas de su posición en
-- equipos dentro de un radio, de la más cercana a la más lejana. Sin puntaje
-- ni IA: la regla es posición más distancia (supuesto 1).
--
-- La distancia sale de `public.haversine_km` (T09a), la misma que usa la
-- búsqueda de jugadores. Esta función no repite la fórmula.
--
-- `security invoker`: respeta la RLS de `players`, `teams`, `vacancies` y
-- `vacancy_applications`. Un jugador ve todos los equipos y todas las
-- vacantes, y de las postulaciones solo las propias, que es justo lo que
-- necesita `applied`. No lleva política propia: el control de acceso es el
-- chequeo de rol de adentro más los grants del final.
create function public.suggest_teams(
  p_radius_km int default 25,
  p_limit int default 10,
  p_offset int default 0
)
returns table (
  vacancy_id uuid,
  team_id uuid,
  team_name text,
  crest_path text,
  city text,
  province text,
  category text,
  "position" text,
  modality text,
  level text,
  description text,
  distance_km numeric,
  applied boolean,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_role text;
  v_position text;
  v_origin_lat double precision;
  v_origin_lon double precision;
begin
  -- Requisito 6: primero el rol, después los parámetros, después el perfil.
  select pr.role into v_role
  from public.profiles pr
  where pr.id = (select auth.uid());

  if v_role is distinct from 'player' then
    raise exception 'suggestions_players_only' using errcode = '42501';
  end if;

  if p_radius_km is null or p_radius_km not between 1 and 200 then
    raise exception 'invalid_radius' using errcode = '22023';
  end if;

  if p_limit is null or p_limit not between 1 and 50 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  if p_offset is null or p_offset < 0 then
    raise exception 'invalid_offset' using errcode = '22023';
  end if;

  select p.position, p.latitude, p.longitude
  into v_position, v_origin_lat, v_origin_lon
  from public.players p
  where p.id = (select auth.uid());

  if not found then
    raise exception 'suggestion_profile_incomplete' using errcode = 'P0001';
  end if;

  if v_position is null then
    raise exception 'suggestion_position_missing' using errcode = 'P0001';
  end if;

  if v_origin_lat is null or v_origin_lon is null then
    raise exception 'suggestion_origin_missing' using errcode = 'P0001';
  end if;

  -- Requisito 10: ni `owner_id`, ni `contact_email`, ni las coordenadas del
  -- equipo salen de acá. La distancia redondeada a 1 decimal no alcanza para
  -- ubicarlo, y además las coordenadas son el centro de una zona (T09c).
  return query
  with candidates as (
    select
      v.id,
      t.id as team_id,
      t.name,
      t.crest_path,
      t.city,
      t.province,
      t.category,
      v.position,
      v.modality,
      v.level,
      v.description,
      public.haversine_km(
        v_origin_lat, v_origin_lon,
        t.latitude::double precision, t.longitude::double precision
      ) as distance
    from public.vacancies v
    join public.teams t on t.id = v.team_id
    where v.status = 'open'
      and v.position = v_position
      and t.latitude is not null
      and t.longitude is not null
  )
  select
    c.id,
    c.team_id,
    c.name,
    c.crest_path,
    c.city,
    c.province,
    c.category,
    c.position,
    c.modality,
    c.level,
    c.description,
    -- Se redondea solo lo que se devuelve; el filtro compara sin redondear.
    round(c.distance::numeric, 1),
    -- Las ya postuladas se devuelven igual, marcadas (supuesto 6).
    exists (
      select 1
      from public.vacancy_applications a
      where a.vacancy_id = c.id
        and a.player_id = (select auth.uid())
    ),
    count(*) over ()
  from candidates c
  where c.distance <= p_radius_km
  -- `vacancy_id` desempata: sin él, dos vacantes a la misma distancia (dos
  -- equipos en la misma zona) podían cambiar de página entre consultas.
  order by c.distance, c.id
  limit p_limit
  offset p_offset;
end;
$$;

-- Supabase concede `execute` a `anon` por defecto en las funciones de
-- `public`. El chequeo de rol ya frenaría a un cliente sin sesión, pero así
-- ni siquiera llega a ejecutarla (requisito 7).
revoke execute on function public.suggest_teams(int, int, int) from public, anon;
grant execute on function public.suggest_teams(int, int, int) to authenticated;
