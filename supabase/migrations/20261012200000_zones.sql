-- Catálogo de zonas (T09c). Nadie completaba `latitude` ni `longitude`: los
-- formularios no tienen control para esos campos, así que la búsqueda de
-- jugadores (T09a) y las sugerencias (T12a) no devolvían nunca nada con
-- usuarios reales. Ahora el jugador o el equipo elige su zona y la base copia
-- las coordenadas del centro de esa zona.
--
-- De paso, nunca se guarda la ubicación exacta de nadie: solo el centro de la
-- zona (cierra el supuesto 6 de T09a). `search_players` no cambia: sigue
-- leyendo las mismas columnas.
create table public.zones (
  -- Slug en minúsculas con guiones (`villa-urquiza`): es lo que guarda
  -- `zone_id` y lo que manda el formulario.
  id text primary key,
  name text not null,
  province text not null
    check (province in ('CABA', 'Buenos Aires', 'Santa Fe', 'Córdoba', 'Mendoza')),
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  -- Solo decide qué zonas ofrece el formulario. La base acepta cualquier
  -- `zone_id` que exista, activa o no.
  is_active boolean not null default true,
  unique (name, province)
);

alter table public.zones enable row level security;

-- Cualquier usuario con sesión lee el catálogo. Sin políticas de escritura a
-- propósito: el catálogo solo cambia por migración.
create policy zones_select on public.zones
for select
to authenticated
using (true);

-- El select a `anon` es el patrón del repo: sin policy para ese rol, una
-- consulta anónima devuelve 0 filas en vez de un error. Sin grants de
-- escritura: un insert o update rebota con 42501.
grant select on table public.zones to anon, authenticated;

-- Las 88 zonas del AMBA van en la migración y no en `seed.sql`: tienen que
-- existir en `prod`.
--
-- Fuente de las coordenadas: el centroide que publica la API Georef de
-- datos.gob.ar (https://apis.datos.gob.ar/georef/api), consultada el
-- 2026-10-12. Los barrios salen de `localidades?provincia=02` y los partidos
-- de `departamentos?provincia=06`. El ticket proponía el dataset de barrios
-- de Buenos Aires Data para CABA, pero trae polígonos sin centro; Georef ya
-- publica el centro de los 48 barrios, así que queda una sola fuente.
--
-- Dos excepciones, fijadas por el ticket porque las usan los criterios de
-- T09a: `pilar` y `san-isidro`. Georef da otro centro para las dos, a 1,5 km y
-- 2 km de estos valores.
insert into public.zones (id, name, province, latitude, longitude)
values
  ('agronomia', 'Agronomía', 'CABA', -34.592309, -58.489682),
  ('almagro', 'Almagro', 'CABA', -34.605783, -58.419101),
  ('balvanera', 'Balvanera', 'CABA', -34.608787, -58.401784),
  ('barracas', 'Barracas', 'CABA', -34.637524, -58.374392),
  ('belgrano', 'Belgrano', 'CABA', -34.562073, -58.456555),
  ('boedo', 'Boedo', 'CABA', -34.625579, -58.416086),
  ('caballito', 'Caballito', 'CABA', -34.616275, -58.440551),
  ('chacarita', 'Chacarita', 'CABA', -34.585265, -58.453955),
  ('coghlan', 'Coghlan', 'CABA', -34.558925, -58.474375),
  ('colegiales', 'Colegiales', 'CABA', -34.575823, -58.448619),
  ('constitucion', 'Constitución', 'CABA', -34.626822, -58.387188),
  ('flores', 'Flores', 'CABA', -34.628534, -58.463686),
  ('floresta', 'Floresta', 'CABA', -34.630044, -58.482519),
  ('la-boca', 'La Boca', 'CABA', -34.632127, -58.360770),
  ('la-paternal', 'La Paternal', 'CABA', -34.598871, -58.466453),
  ('liniers', 'Liniers', 'CABA', -34.638710, -58.521239),
  ('mataderos', 'Mataderos', 'CABA', -34.660114, -58.502934),
  ('monte-castro', 'Monte Castro', 'CABA', -34.619861, -58.505976),
  ('monserrat', 'Monserrat', 'CABA', -34.613223, -58.383058),
  ('nueva-pompeya', 'Nueva Pompeya', 'CABA', -34.652057, -58.415998),
  ('nunez', 'Núñez', 'CABA', -34.548807, -58.463228),
  ('palermo', 'Palermo', 'CABA', -34.581237, -58.421015),
  ('parque-avellaneda', 'Parque Avellaneda', 'CABA', -34.647447, -58.484029),
  ('parque-chacabuco', 'Parque Chacabuco', 'CABA', -34.635277, -58.439028),
  ('parque-chas', 'Parque Chas', 'CABA', -34.582546, -58.479229),
  ('parque-patricios', 'Parque Patricios', 'CABA', -34.637282, -58.405396),
  ('puerto-madero', 'Puerto Madero', 'CABA', -34.607819, -58.362303),
  ('recoleta', 'Recoleta', 'CABA', -34.588044, -58.397182),
  ('retiro', 'Retiro', 'CABA', -34.594603, -58.375660),
  ('saavedra', 'Saavedra', 'CABA', -34.554898, -58.486327),
  ('san-cristobal', 'San Cristóbal', 'CABA', -34.623784, -58.402122),
  ('san-nicolas', 'San Nicolás', 'CABA', -34.603770, -58.381597),
  ('san-telmo', 'San Telmo', 'CABA', -34.620542, -58.371712),
  ('velez-sarsfield', 'Vélez Sarsfield', 'CABA', -34.631472, -58.492373),
  ('versalles', 'Versalles', 'CABA', -34.630027, -58.523931),
  ('villa-crespo', 'Villa Crespo', 'CABA', -34.599876, -58.438815),
  ('villa-del-parque', 'Villa del Parque', 'CABA', -34.605658, -58.492586),
  ('villa-devoto', 'Villa Devoto', 'CABA', -34.599332, -58.512223),
  ('villa-general-mitre', 'Villa General Mitre', 'CABA', -34.610479, -58.467609),
  ('villa-lugano', 'Villa Lugano', 'CABA', -34.675735, -58.475112),
  ('villa-luro', 'Villa Luro', 'CABA', -34.638929, -58.500777),
  ('villa-ortuzar', 'Villa Ortúzar', 'CABA', -34.578671, -58.469482),
  ('villa-pueyrredon', 'Villa Pueyrredón', 'CABA', -34.584525, -58.501836),
  ('villa-real', 'Villa Real', 'CABA', -34.620621, -58.526868),
  ('villa-riachuelo', 'Villa Riachuelo', 'CABA', -34.693552, -58.468939),
  ('villa-santa-rita', 'Villa Santa Rita', 'CABA', -34.615408, -58.483663),
  ('villa-soldati', 'Villa Soldati', 'CABA', -34.663888, -58.444537),
  ('villa-urquiza', 'Villa Urquiza', 'CABA', -34.572062, -58.489257),
  ('almirante-brown', 'Almirante Brown', 'Buenos Aires', -34.835619, -58.367373),
  ('avellaneda', 'Avellaneda', 'Buenos Aires', -34.678199, -58.341145),
  ('berazategui', 'Berazategui', 'Buenos Aires', -34.818245, -58.155462),
  ('berisso', 'Berisso', 'Buenos Aires', -34.909355, -57.828380),
  ('brandsen', 'Brandsen', 'Buenos Aires', -35.222520, -58.175234),
  ('campana', 'Campana', 'Buenos Aires', -34.138389, -58.882957),
  ('canuelas', 'Cañuelas', 'Buenos Aires', -35.144804, -58.691094),
  ('ensenada', 'Ensenada', 'Buenos Aires', -34.842150, -57.979109),
  ('escobar', 'Escobar', 'Buenos Aires', -34.328683, -58.771179),
  ('esteban-echeverria', 'Esteban Echeverría', 'Buenos Aires', -34.831214, -58.476948),
  ('exaltacion-de-la-cruz', 'Exaltación de la Cruz', 'Buenos Aires', -34.295134, -59.155946),
  ('ezeiza', 'Ezeiza', 'Buenos Aires', -34.876097, -58.564701),
  ('florencio-varela', 'Florencio Varela', 'Buenos Aires', -34.877745, -58.258555),
  ('general-las-heras', 'General Las Heras', 'Buenos Aires', -34.909424, -58.995447),
  ('general-rodriguez', 'General Rodríguez', 'Buenos Aires', -34.650616, -58.987847),
  ('general-san-martin', 'General San Martín', 'Buenos Aires', -34.552772, -58.564282),
  ('hurlingham', 'Hurlingham', 'Buenos Aires', -34.599283, -58.649525),
  ('ituzaingo', 'Ituzaingó', 'Buenos Aires', -34.636072, -58.688760),
  ('jose-c-paz', 'José C. Paz', 'Buenos Aires', -34.511853, -58.777635),
  ('la-matanza', 'La Matanza', 'Buenos Aires', -34.770348, -58.625446),
  ('la-plata', 'La Plata', 'Buenos Aires', -35.003847, -58.017778),
  ('lanus', 'Lanús', 'Buenos Aires', -34.705654, -58.394697),
  ('lomas-de-zamora', 'Lomas de Zamora', 'Buenos Aires', -34.754968, -58.424095),
  ('lujan', 'Luján', 'Buenos Aires', -34.567322, -59.158456),
  ('malvinas-argentinas', 'Malvinas Argentinas', 'Buenos Aires', -34.487311, -58.712137),
  ('marcos-paz', 'Marcos Paz', 'Buenos Aires', -34.814003, -58.847831),
  ('merlo', 'Merlo', 'Buenos Aires', -34.711003, -58.741958),
  ('moreno', 'Moreno', 'Buenos Aires', -34.610681, -58.810899),
  ('moron', 'Morón', 'Buenos Aires', -34.649386, -58.619832),
  ('pilar', 'Pilar', 'Buenos Aires', -34.458700, -58.914200),
  ('presidente-peron', 'Presidente Perón', 'Buenos Aires', -34.929848, -58.398084),
  ('quilmes', 'Quilmes', 'Buenos Aires', -34.734971, -58.276858),
  ('san-fernando', 'San Fernando', 'Buenos Aires', -34.155836, -58.534582),
  ('san-isidro', 'San Isidro', 'Buenos Aires', -34.470800, -58.528600),
  ('san-miguel', 'San Miguel', 'Buenos Aires', -34.552134, -58.691784),
  ('san-vicente', 'San Vicente', 'Buenos Aires', -35.071509, -58.431812),
  ('tigre', 'Tigre', 'Buenos Aires', -34.382020, -58.588174),
  ('tres-de-febrero', 'Tres de Febrero', 'Buenos Aires', -34.596010, -58.579188),
  ('vicente-lopez', 'Vicente López', 'Buenos Aires', -34.526531, -58.504487),
  ('zarate', 'Zárate', 'Buenos Aires', -33.997090, -59.128215);

-- Nullable: los perfiles anteriores a este cambio quedan sin zona y conservan
-- su `city` de texto hasta que la elijan (lo resuelve T09d).
alter table public.players
add column zone_id text references public.zones (id);

alter table public.teams
add column zone_id text references public.zones (id);

create index players_zone_id_idx on public.players (zone_id);
create index teams_zone_id_idx on public.teams (zone_id);

-- `zone_id` se suma a los grants por columna, igual que el resto de las
-- columnas editables. `latitude` y `longitude` siguen otorgadas, pero el
-- trigger de abajo pisa cualquier valor que se mande.
grant insert (zone_id), update (zone_id) on table public.players to authenticated;
grant insert (zone_id), update (zone_id) on table public.teams to authenticated;

-- Deriva la ubicación de la zona. La base es la única que escribe las
-- coordenadas: ni el formulario ni una llamada directa por PostgREST pueden
-- guardar una latitud o longitud propias.
--
-- Corre también en los updates que no tocan la zona, y es a propósito: es lo
-- que impide que un `update players set latitude = 0` deje un valor propio.
--
-- `security invoker`: lee `zones` con la sesión del usuario, que tiene
-- `select` por la política de arriba.
create function public.apply_zone_location()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_zone record;
begin
  if new.zone_id is null then
    -- Sin zona no hay coordenadas. `city` y `province` no se tocan: un perfil
    -- anterior conserva su ciudad de texto.
    new.latitude := null;
    new.longitude := null;
    return new;
  end if;

  select z.name, z.province, z.latitude, z.longitude
  into v_zone
  from public.zones z
  where z.id = new.zone_id;

  -- Una zona que no existe se deja pasar a propósito: la clave foránea la
  -- rechaza con 23503 al final de la sentencia, que es el error que la app
  -- traduce a "Elegí una zona de la lista.".
  if not found then
    return new;
  end if;

  new.city := v_zone.name;
  new.province := v_zone.province;
  new.latitude := v_zone.latitude;
  new.longitude := v_zone.longitude;

  return new;
end;
$$;

create trigger players_apply_zone_location
before insert or update on public.players
for each row
execute function public.apply_zone_location();

create trigger teams_apply_zone_location
before insert or update on public.teams
for each row
execute function public.apply_zone_location();
