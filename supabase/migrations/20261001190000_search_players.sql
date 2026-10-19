-- Búsqueda de jugadores para delegados (T09a). Dos funciones y ninguna tabla:
-- la distancia y los filtros viven en la base, donde también los va a
-- reutilizar T12a (sugerencias).

-- Distancia en km entre dos puntos sobre una esfera de radio 6371 km.
--
-- Función propia y no inline en la búsqueda para que T12a la reutilice en
-- vez de repetir la fórmula. `strict` devuelve null si algún argumento es
-- null, sin evaluar el cuerpo.
--
-- El `least(1, ...)` no es decorativo: por error de redondeo de punto
-- flotante, dos puntos casi antípodas pueden dar un seno apenas mayor que 1,
-- y `asin` fuera de [-1, 1] tira error en vez de devolver un número.
--
-- `search_path` vacío: solo usa funciones de `pg_catalog`, que se resuelven
-- igual. Mismo criterio que `safe_uuid`.
create function public.haversine_km(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
returns double precision
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select 2 * 6371 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2))
      * power(sin(radians(lon2 - lon1) / 2), 2)
  )));
$$;

-- Jugadores cerca del equipo del delegado que llama, ordenados por distancia.
--
-- `security invoker`: corre con los permisos de quien llama, así que respeta
-- la RLS de `players`, `profiles`, `teams` y las vistas de estadísticas. No
-- lleva política propia: el control de acceso es el chequeo de rol de acá
-- adentro más los grants del final.
--
-- Las validaciones van en este orden —rol, parámetros, origen— para que un
-- jugador reciba siempre `search_delegates_only`, sin importar con qué
-- parámetros la llame. Mismo orden que pide T12a.
create function public.search_players(
  p_radius_km int,
  p_position text default null,
  p_seeking_only boolean default true,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  player_id uuid,
  full_name text,
  avatar_path text,
  -- Entre comillas: `position` es palabra reservada en la lista de columnas
  -- de una función (en un `create table` no lo es). La columna sale igual
  -- con el nombre `position`.
  "position" text,
  age int,
  city text,
  province text,
  matches_played int,
  is_seeking_team boolean,
  distance_km numeric,
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
  v_origin_lat double precision;
  v_origin_lon double precision;
begin
  select pr.role into v_role
  from public.profiles pr
  where pr.id = (select auth.uid());

  -- `is distinct from` y no `<>`: una sesión sin fila en `profiles` deja
  -- `v_role` en null, y `null <> 'delegate'` es null, que el `if` toma como
  -- falso y dejaría pasar.
  if v_role is distinct from 'delegate' then
    raise exception 'search_delegates_only' using errcode = '42501';
  end if;

  -- El tope de 200 km es el mismo que usan T09b y T12a.
  if p_radius_km is null or p_radius_km not between 1 and 200 then
    raise exception 'invalid_radius' using errcode = '22023';
  end if;

  if p_position is not null
     and p_position not in ('arquero', 'defensor', 'mediocampista', 'delantero') then
    raise exception 'invalid_position' using errcode = '22023';
  end if;

  if p_limit is null or p_limit not between 1 and 50 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  if p_offset is null or p_offset < 0 then
    raise exception 'invalid_offset' using errcode = '22023';
  end if;

  -- Un delegado tiene a lo sumo un equipo (`owner_id` es unique), así que el
  -- origen es único. Sin equipo, el `select into` deja las dos variables en
  -- null y cae en el mismo error que un equipo sin coordenadas.
  select t.latitude, t.longitude
  into v_origin_lat, v_origin_lon
  from public.teams t
  where t.owner_id = (select auth.uid());

  if v_origin_lat is null or v_origin_lon is null then
    raise exception 'search_origin_missing' using errcode = 'P0001';
  end if;

  return query
  with candidates as (
    select
      p.id,
      pr.full_name,
      pr.avatar_path,
      p.position,
      p.birth_date,
      p.city,
      p.province,
      p.is_seeking_team,
      public.haversine_km(
        v_origin_lat, v_origin_lon,
        p.latitude::double precision, p.longitude::double precision
      ) as distance
    from public.players p
    join public.profiles pr on pr.id = p.id
    -- Sin coordenadas no se puede medir la distancia: siempre afuera.
    where p.latitude is not null
      and p.longitude is not null
      and (p_position is null or p.position = p_position)
      and (not coalesce(p_seeking_only, true) or p.is_seeking_team)
  )
  select
    c.id,
    c.full_name,
    c.avatar_path,
    c.position,
    extract(year from age(current_date, c.birth_date))::int,
    c.city,
    c.province,
    -- `count(*)` en la vista es bigint; la función promete int.
    coalesce(t.total_matches, 0)::int,
    c.is_seeking_team,
    round(c.distance::numeric, 1),
    -- Se calcula antes del `limit`: es el total sin paginar.
    count(*) over ()
  from candidates c
  left join public.player_career_totals t on t.player_id = c.id
  -- Se filtra y se ordena por la distancia sin redondear; solo la columna
  -- devuelta se redondea. El `id` desempata para que la paginación sea
  -- estable entre una página y la siguiente.
  where c.distance <= p_radius_km
  order by c.distance, c.id
  limit p_limit
  offset p_offset;
end;
$$;

-- Postgres le da `execute` a PUBLIC sobre toda función nueva, y PUBLIC
-- incluye a `anon`. Por eso el revoke va explícito y antes del grant.
--
-- `haversine_km` también necesita el grant a `authenticated`: como
-- `search_players` es `security invoker`, la llama con los permisos de quien
-- busca. Sin el grant, la búsqueda fallaría con "permission denied for
-- function haversine_km" en cuanto se revoca PUBLIC.
revoke execute on function public.haversine_km(double precision, double precision, double precision, double precision)
from public, anon;
grant execute on function public.haversine_km(double precision, double precision, double precision, double precision)
to authenticated;

revoke execute on function public.search_players(int, text, boolean, int, int)
from public, anon;
grant execute on function public.search_players(int, text, boolean, int, int)
to authenticated;
