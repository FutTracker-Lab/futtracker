-- Datos de desarrollo local. Corre solo en `supabase db reset`; ni dev ni prod
-- lo aplican.
--
-- Las cuentas se insertan directo en `auth.users` en vez de ir por la API de
-- Auth porque el seed corre sin el servidor arriba. El trigger
-- `on_auth_user_created` se encarga de las filas de `profiles`, así que acá
-- solo se escriben `auth.users`, `auth.identities` y `players`.
--
-- Todas las cuentas usan la password `password123`.
-- Los UUID son fijos para poder referenciarlos desde tests y desde Studio.

-- Las cuatro columnas de token van en '' y no en null: GoTrue las lee como
-- string y con null tira 500 al loguear ("converting NULL to string is
-- unsupported"). La API de Auth las inicializa sola; este insert directo no.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'lucia.fernandez@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Lucía Fernández","role":"player"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'martin.gomez@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Martín Gómez","role":"player"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'sofia.ramirez@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sofía Ramírez","role":"player"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'diego.sosa@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Diego Sosa","role":"player"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'valentina.ruiz@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Valentina Ruiz","role":"player"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'delegado@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carlos Delegado","role":"delegate"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '77777777-7777-4777-8777-777777777777', 'authenticated', 'authenticated', 'mariana.acuna@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mariana Acuña","role":"delegate"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '88888888-8888-4888-8888-888888888888', 'authenticated', 'authenticated', 'gustavo.ledesma@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Gustavo Ledesma","role":"delegate"}', now(), now(), '', '', '', ''),
  -- NO le agregues equipo: es la única cuenta de delegado sin equipo y QA la
  -- usa para el estado vacío de `/equipos/mi-equipo`.
  ('00000000-0000-0000-0000-000000000000', '99999999-9999-4999-8999-999999999999', 'authenticated', 'authenticated', 'paula.bermudez@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Paula Bermúdez","role":"delegate"}', now(), now(), '', '', '', '');

-- Sin la identidad, el login con email y password no encuentra la cuenta:
-- GoTrue busca por `auth.identities`, no por `auth.users`.
insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at,
  created_at, updated_at
)
select
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
from auth.users u;

-- Va por `update`: las filas de `profiles` las crea el trigger, no este seed.
-- El archivo lo sube el CLI desde `supabase/avatars/` (ver `config.toml`).
update public.profiles
set avatar_path = '11111111-1111-4111-8111-111111111111/avatar.png'
where id = '11111111-1111-4111-8111-111111111111';

-- Zonas de prueba fuera del AMBA (T09c). Las 88 del AMBA las carga la
-- migración; estas existen solo para tener jugadores y equipos "fuera de
-- radio". Inactivas: el formulario no las ofrece, pero la base las acepta. No
-- llegan a `prod` porque el seed no corre ahí.
insert into public.zones (id, name, province, latitude, longitude, is_active)
values
  ('rosario', 'Rosario', 'Santa Fe', -32.944200, -60.650500, false),
  ('cordoba', 'Córdoba', 'Córdoba', -31.420100, -64.188800, false),
  ('mendoza', 'Mendoza', 'Mendoza', -32.889500, -68.845800, false);

-- Cada jugador y equipo declara su zona; las coordenadas las pone el trigger
-- de T09c, nunca este archivo.
insert into public.players (
  id, birth_date, position, preferred_foot, height_cm, weight_kg,
  city, province, country, zone_id, bio, phone, is_seeking_team
)
values
  ('11111111-1111-4111-8111-111111111111', '1999-03-14', 'delantero', 'derecha', 168, 62, 'Pilar', 'Buenos Aires', 'AR', 'pilar', 'Nueve de área. Juego los martes en la liga de Pilar.', '+54 9 11 4000-0001', true),
  ('22222222-2222-4222-8222-222222222222', '1996-11-02', 'arquero', 'derecha', 189, 84, 'Rosario', 'Santa Fe', 'AR', 'rosario', 'Arquero desde los ocho años. Disponible fines de semana.', '+54 9 341 400-0002', true),
  ('33333333-3333-4333-8333-333333333333', '2001-06-27', 'mediocampista', 'izquierda', 172, 65, 'Córdoba', 'Córdoba', 'AR', 'cordoba', 'Volante central, buen pie para la pelota parada.', '+54 9 351 400-0003', false),
  ('44444444-4444-4444-8444-444444444444', '1994-01-19', 'defensor', 'derecha', 181, 78, 'La Plata', 'Buenos Aires', 'AR', 'la-plata', 'Marcador central. Juego al fútbol 11 hace quince años.', '+54 9 221 400-0004', true),
  ('55555555-5555-4555-8555-555555555555', '2003-09-08', 'mediocampista', 'ambidiestro', 165, 58, 'Mendoza', 'Mendoza', 'AR', 'mendoza', 'Enganche. Busco equipo para el torneo de verano.', '+54 9 261 400-0005', true);

-- El escudo del primer equipo lo sube el CLI desde `supabase/team-crests/`
-- (ver `config.toml`). En la base va el path y nunca la URL firmada: la firma
-- vence, y una URL guardada queda muerta.
insert into public.teams (
  id, owner_id, name, club_name, category, league, city, province, country,
  zone_id, founded_year, crest_path, bio, contact_email
)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '66666666-6666-4666-8666-666666666666', 'Club Atlético Pilar', 'Club Atlético Pilar', 'Primera', 'Liga de Pilar', 'Pilar', 'Buenos Aires', 'AR', 'pilar', 1954, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/escudo.png', 'Club de barrio con cancha propia. Entrenamos martes y jueves.', 'delegado@example.com'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '77777777-7777-4777-8777-777777777777', 'Racing de Rosario', 'Racing de Rosario', 'Reserva', 'Liga Rosarina', 'Rosario', 'Santa Fe', 'AR', 'rosario', 1978, null, 'Plantel joven de reserva. Buscamos arquero para el torneo.', null),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '88888888-8888-4888-8888-888888888888', 'Deportivo Córdoba', 'Deportivo Córdoba', 'Primera', 'Liga Cordobesa', 'Córdoba', 'Córdoba', 'AR', 'cordoba', 1991, null, 'Fútbol 11 los domingos. Tres ascensos en la última década.', null);

-- Trayectoria. Cada jugador tiene una sola entrada abierta (`is_current` con
-- `end_date` nula, que es lo que exige el check de la tabla) y el resto
-- cerradas, encadenadas desde las inferiores hasta la actual.
--
-- `team_id` va en null en todas: son clubes de la carrera del jugador, no
-- equipos dados de alta en la app. Los tres equipos de arriba son de delegados
-- y ninguno coincide con estos.
insert into public.career_entries (
  player_id, team_id, club_name, category, position, start_date, end_date, is_current
)
values
  ('11111111-1111-4111-8111-111111111111', null, 'Club Atlético Platense', 'Sexta división', 'delantero', '2015-03-01', '2017-12-15', false),
  ('11111111-1111-4111-8111-111111111111', null, 'Deportivo Morón', 'Reserva', 'delantero', '2018-02-10', '2021-06-30', false),
  ('11111111-1111-4111-8111-111111111111', null, 'Club Atlético Fénix', 'Primera', 'delantero', '2021-08-01', null, true),

  ('22222222-2222-4222-8222-222222222222', null, 'Club Atlético Central Córdoba de Rosario', 'Reserva', 'arquero', '2014-02-15', '2018-11-30', false),
  ('22222222-2222-4222-8222-222222222222', null, 'Club Atlético Tiro Federal Argentino', 'Primera', 'arquero', '2019-01-20', null, true),

  ('33333333-3333-4333-8333-333333333333', null, 'Club Atlético Belgrano', 'Sexta división', 'mediocampista', '2016-03-05', '2018-12-10', false),
  ('33333333-3333-4333-8333-333333333333', null, 'Instituto Atlético Central Córdoba', 'Reserva', 'mediocampista', '2019-02-01', '2022-07-15', false),
  ('33333333-3333-4333-8333-333333333333', null, 'Club Atlético Talleres', 'Primera', 'mediocampista', '2022-08-01', null, true),

  ('44444444-4444-4444-8444-444444444444', null, 'Club de Gimnasia y Esgrima La Plata', 'Quinta división', 'defensor', '2010-02-20', '2013-11-25', false),
  ('44444444-4444-4444-8444-444444444444', null, 'Club Atlético Villa San Carlos', 'Reserva', 'defensor', '2014-01-15', '2019-12-20', false),
  ('44444444-4444-4444-8444-444444444444', null, 'Club Everton de La Plata', 'Primera', 'defensor', '2020-02-10', null, true),

  ('55555555-5555-4555-8555-555555555555', null, 'Club Atlético Gimnasia y Esgrima de Mendoza', 'Sexta división', 'mediocampista', '2018-04-02', '2021-11-20', false),
  ('55555555-5555-4555-8555-555555555555', null, 'Club Deportivo Godoy Cruz Antonio Tomba', 'Reserva', 'mediocampista', '2022-02-14', null, true);

-- Partidos. El `career_entry_id` sale del join por jugador, club y período
-- porque los ids de la trayectoria son aleatorios; sin el período, un jugador
-- que vuelve al mismo club duplicaría los partidos. Casos a propósito, no los
-- "arregles": Diego no juega en 2025 (hueco), Lucía (2021) y Sofía (2022)
-- juegan en dos clubes el mismo año y Martín mezcla vallas invictas con
-- partidos donde le hicieron goles.
insert into public.match_stats (
  career_entry_id, player_id, match_date, opponent, competition, started,
  minutes_played, goals, assists, yellow_cards, red_cards, clean_sheet
)
select
  ce.id, ce.player_id, v.match_date::date, v.opponent, v.competition, v.started,
  v.minutes_played, v.goals, v.assists, v.yellow_cards, v.red_cards, v.clean_sheet
from (
  values
    ('11111111-1111-4111-8111-111111111111', 'Deportivo Morón', '2021-03-14', 'Club Atlético Acassuso', 'Primera B', true, 90, 1, 0, 0, 0, false),
    ('11111111-1111-4111-8111-111111111111', 'Deportivo Morón', '2021-04-18', 'Club Atlético Colegiales', 'Primera B', true, 78, 0, 1, 1, 0, false),
    ('11111111-1111-4111-8111-111111111111', 'Deportivo Morón', '2021-05-23', 'Club Social y Deportivo Flandria', 'Primera B', false, 25, 1, 0, 0, 0, false),
    ('11111111-1111-4111-8111-111111111111', 'Club Atlético Fénix', '2021-09-12', 'Club Atlético San Miguel', 'Primera B', true, 90, 2, 0, 0, 0, false),
    ('11111111-1111-4111-8111-111111111111', 'Club Atlético Fénix', '2021-10-17', 'Club Atlético Excursionistas', 'Primera B', true, 84, 0, 0, 1, 0, false),
    ('11111111-1111-4111-8111-111111111111', 'Club Atlético Fénix', '2023-04-02', 'Club Atlético Talleres de Remedios de Escalada', 'Primera B', true, 90, 1, 1, 0, 0, false),
    ('11111111-1111-4111-8111-111111111111', 'Club Atlético Fénix', '2023-05-07', 'Club Atlético Los Andes', 'Primera B', false, 30, 0, 0, 0, 0, false),
    ('11111111-1111-4111-8111-111111111111', 'Club Atlético Fénix', '2023-06-11', 'Club Comunicaciones', 'Primera B', true, 67, 1, 0, 0, 1, false),

    ('22222222-2222-4222-8222-222222222222', 'Club Atlético Central Córdoba de Rosario', '2017-09-03', 'Club Atlético Argentino de Rosario', 'Primera C', true, 90, 0, 0, 0, 0, true),
    ('22222222-2222-4222-8222-222222222222', 'Club Atlético Tiro Federal Argentino', '2023-03-05', 'Club Atlético Argentino de Rosario', 'Liga Rosarina', true, 90, 0, 0, 0, 0, true),
    ('22222222-2222-4222-8222-222222222222', 'Club Atlético Tiro Federal Argentino', '2023-03-19', 'Club Atlético Newell''s Old Boys', 'Liga Rosarina', true, 90, 0, 0, 1, 0, false),
    ('22222222-2222-4222-8222-222222222222', 'Club Atlético Tiro Federal Argentino', '2023-04-09', 'Club Atlético Rosario Central', 'Liga Rosarina', true, 90, 0, 0, 0, 0, true),
    ('22222222-2222-4222-8222-222222222222', 'Club Atlético Tiro Federal Argentino', '2024-03-10', 'Club Atlético Provincial', 'Liga Rosarina', true, 90, 0, 0, 0, 0, true),
    ('22222222-2222-4222-8222-222222222222', 'Club Atlético Tiro Federal Argentino', '2024-04-14', 'Club Atlético Calzada', 'Liga Rosarina', true, 90, 0, 0, 0, 0, false),
    ('22222222-2222-4222-8222-222222222222', 'Club Atlético Tiro Federal Argentino', '2024-05-19', 'Club Atlético Argentino de Rosario', 'Liga Rosarina', false, 45, 0, 0, 0, 0, false),

    ('33333333-3333-4333-8333-333333333333', 'Instituto Atlético Central Córdoba', '2021-10-03', 'Club Atlético Racing de Córdoba', 'Liga Cordobesa', true, 90, 0, 1, 0, 0, false),
    ('33333333-3333-4333-8333-333333333333', 'Instituto Atlético Central Córdoba', '2021-11-07', 'Club Atlético General Paz Juniors', 'Liga Cordobesa', true, 72, 1, 0, 1, 0, false),
    ('33333333-3333-4333-8333-333333333333', 'Instituto Atlético Central Córdoba', '2022-03-13', 'Asociación Atlética Estudiantes de Río Cuarto', 'Liga Cordobesa', true, 90, 0, 2, 0, 0, false),
    ('33333333-3333-4333-8333-333333333333', 'Instituto Atlético Central Córdoba', '2022-05-22', 'Club Sportivo Belgrano de San Francisco', 'Liga Cordobesa', false, 20, 0, 0, 0, 0, false),
    ('33333333-3333-4333-8333-333333333333', 'Club Atlético Talleres', '2022-09-04', 'Club Atlético Racing de Córdoba', 'Liga Cordobesa', true, 90, 1, 1, 0, 0, false),
    ('33333333-3333-4333-8333-333333333333', 'Club Atlético Talleres', '2022-10-16', 'Club Atlético Universitario de Córdoba', 'Liga Cordobesa', true, 85, 0, 1, 1, 0, false),
    ('33333333-3333-4333-8333-333333333333', 'Club Atlético Talleres', '2023-04-23', 'Club Atlético General Paz Juniors', 'Liga Cordobesa', true, 90, 0, 0, 0, 0, false),

    ('44444444-4444-4444-8444-444444444444', 'Club Everton de La Plata', '2024-03-17', 'Club Atlético Cambaceres', 'Liga Amateur Platense', true, 90, 0, 0, 1, 0, false),
    ('44444444-4444-4444-8444-444444444444', 'Club Everton de La Plata', '2024-04-21', 'Club Atlético Estrella de Berisso', 'Liga Amateur Platense', true, 90, 1, 0, 0, 0, false),
    ('44444444-4444-4444-8444-444444444444', 'Club Everton de La Plata', '2024-06-02', 'Club Atlético Villa San Carlos', 'Liga Amateur Platense', true, 90, 0, 0, 1, 0, false),
    ('44444444-4444-4444-8444-444444444444', 'Club Everton de La Plata', '2026-03-15', 'Club Atlético Brandsen', 'Liga Amateur Platense', true, 90, 0, 1, 0, 0, false),
    ('44444444-4444-4444-8444-444444444444', 'Club Everton de La Plata', '2026-04-19', 'Club Atlético Cambaceres', 'Liga Amateur Platense', false, 15, 0, 0, 0, 0, false),
    ('44444444-4444-4444-8444-444444444444', 'Club Everton de La Plata', '2026-05-24', 'Club Atlético Estrella de Berisso', 'Liga Amateur Platense', true, 64, 0, 0, 1, 1, false),

    ('55555555-5555-4555-8555-555555555555', 'Club Atlético Gimnasia y Esgrima de Mendoza', '2021-05-09', 'Club Sportivo Independiente Rivadavia', 'Liga Mendocina', false, 30, 0, 1, 0, 0, false),
    ('55555555-5555-4555-8555-555555555555', 'Club Atlético Gimnasia y Esgrima de Mendoza', '2021-08-15', 'Club Deportivo Maipú', 'Liga Mendocina', true, 90, 1, 0, 0, 0, false),
    ('55555555-5555-4555-8555-555555555555', 'Club Deportivo Godoy Cruz Antonio Tomba', '2023-04-16', 'Club Atlético San Martín de Mendoza', 'Liga Mendocina', true, 90, 0, 1, 0, 0, false),
    ('55555555-5555-4555-8555-555555555555', 'Club Deportivo Godoy Cruz Antonio Tomba', '2023-06-25', 'Club Deportivo Maipú', 'Liga Mendocina', true, 80, 2, 0, 1, 0, false),
    ('55555555-5555-4555-8555-555555555555', 'Club Deportivo Godoy Cruz Antonio Tomba', '2024-09-08', 'Club Sportivo Independiente Rivadavia', 'Liga Mendocina', true, 90, 1, 2, 0, 0, false)
) as v (
  player_id, club_name, match_date, opponent, competition, started,
  minutes_played, goals, assists, yellow_cards, red_cards, clean_sheet
)
join public.career_entries ce
  on ce.player_id = v.player_id::uuid
  and ce.club_name = v.club_name
  and v.match_date::date between ce.start_date and coalesce(ce.end_date, v.match_date::date);

-- Highlights (T08a). Solo las filas: los objetos del bucket no se siembran
-- por SQL. Para probar la reproducción hay que subir un video chico a mano
-- con la sesión del jugador; el mecanismo lo define el TL (requisito 9).
--
-- Lucía y Martín tienen clips; Sofía, Diego y Valentina quedan en cero, para
-- que la galería vacía también tenga con qué probarse.
insert into public.player_highlights (player_id, title, storage_path)
values
  ('11111111-1111-4111-8111-111111111111', 'Gol de tiro libre vs Acassuso', '11111111-1111-4111-8111-111111111111/a1b2c3d4-0001-4000-8000-000000000001.mp4'),
  ('11111111-1111-4111-8111-111111111111', 'Doblete vs San Miguel', '11111111-1111-4111-8111-111111111111/a1b2c3d4-0001-4000-8000-000000000002.mp4'),
  ('11111111-1111-4111-8111-111111111111', 'Asistencia de taco', '11111111-1111-4111-8111-111111111111/a1b2c3d4-0001-4000-8000-000000000003.mp4'),
  ('22222222-2222-4222-8222-222222222222', 'Atajada abajo vs Newell''s', '22222222-2222-4222-8222-222222222222/a1b2c3d4-0002-4000-8000-000000000001.mp4'),
  ('22222222-2222-4222-8222-222222222222', 'Penal atajado vs Central', '22222222-2222-4222-8222-222222222222/a1b2c3d4-0002-4000-8000-000000000002.mp4');


-- =====================================================================
-- Búsqueda de jugadores (T09a)
--
-- Escenario geográfico para `search_players`. Los nombres de código (D1-D3,
-- P1-P7) son los del ticket y los reutilizan T09b y T12a; van en un
-- comentario al lado de cada cuenta. UUID fijos para poder referenciarlos
-- desde los tests: los delegados empiezan con `d`, los jugadores con `f` y
-- el relleno con `e`.
-- =====================================================================

-- Fuera de la búsqueda: los jugadores de arriba con coordenadas que caen
-- dentro de los radios de los criterios de T09a. Lucía está en Pilar (~0 km
-- del origen), Diego en La Plata (~100 km) y Martín en Rosario. Con
-- coordenadas, cambiarían los conteos exactos que el ticket fija.
--
-- Quedan sin zona y, por el trigger de T09c, sin coordenadas. Conservan su
-- `city` de texto: son también el caso del perfil anterior al catálogo de
-- zonas que pide T09c. Ninguna pantalla muestra las coordenadas, así que los
-- perfiles no cambian. T12a hace lo mismo con los equipos del seed.
update public.players
set zone_id = null
where id in (
  '11111111-1111-4111-8111-111111111111',  -- Lucía
  '22222222-2222-4222-8222-222222222222',  -- Martín
  '44444444-4444-4444-8444-444444444444'   -- Diego
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000'::uuid, v.id::uuid, 'authenticated',
  'authenticated', v.email,
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', v.full_name, 'role', v.role),
  now(), now(), '', '', '', ''
from (
  values
    ('d0000001-0000-4000-8000-000000000108', 'busqueda.d1@example.com', 'Hernán Castro',   'delegate'),  -- D1: equipo en Pilar
    ('d0000002-0000-4000-8000-000000000108', 'busqueda.d2@example.com', 'Rocío Medina',    'delegate'),  -- D2: equipo sin coordenadas
    ('d0000003-0000-4000-8000-000000000108', 'busqueda.d3@example.com', 'Julián Ferreyra', 'delegate'),  -- D3: sin equipo
    ('f0000001-0000-4000-8000-000000000108', 'busqueda.p1@example.com', 'Tomás Aguirre',   'player'),    -- P1
    ('f0000002-0000-4000-8000-000000000108', 'busqueda.p2@example.com', 'Nicolás Benítez', 'player'),    -- P2
    ('f0000003-0000-4000-8000-000000000108', 'busqueda.p3@example.com', 'Agustín Rojas',   'player'),    -- P3
    ('f0000004-0000-4000-8000-000000000108', 'busqueda.p4@example.com', 'Facundo Ríos',    'player'),    -- P4
    ('f0000005-0000-4000-8000-000000000108', 'busqueda.p5@example.com', 'Lautaro Gil',     'player'),    -- P5
    ('f0000006-0000-4000-8000-000000000108', 'busqueda.p6@example.com', 'Matías Vera',     'player'),    -- P6
    ('f0000007-0000-4000-8000-000000000108', 'busqueda.p7@example.com', 'Gonzalo Peralta', 'player')     -- P7
) as v (id, email, full_name, role);

-- Relleno 01 a 25: el nombre es el que pide el ticket, para que se reconozcan
-- en la paginación de T09b.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  ('e00000' || lpad(n::text, 2, '0') || '-0000-4000-8000-000000000108')::uuid,
  'authenticated', 'authenticated',
  'busqueda.relleno' || lpad(n::text, 2, '0') || '@example.com',
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', 'Relleno ' || lpad(n::text, 2, '0'), 'role', 'player'),
  now(), now(), '', '', '', ''
from generate_series(1, 25) as n;

-- El insert de identidades de arriba ya corrió y solo tomó las cuentas que
-- existían en ese momento; estas necesitan el suyo.
insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at,
  created_at, updated_at
)
select
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
from auth.users u
where u.email like 'busqueda.%@example.com';

insert into public.teams (owner_id, name, city, province, zone_id)
values
  -- D1: el origen de todos los criterios de T09a. Mismas coordenadas que P1,
  -- así P1 da 0.0 km.
  ('d0000001-0000-4000-8000-000000000108', 'Club Social Pilar Norte', 'Pilar', 'Buenos Aires', 'pilar'),
  -- D2: equipo sin coordenadas, para `search_origin_missing`.
  ('d0000002-0000-4000-8000-000000000108', 'Deportivo Las Lomas', 'San Isidro', 'Buenos Aires', null);
  -- D3 no tiene equipo a propósito.

-- Fechas de nacimiento relativas: con una fecha fija, la edad de P1 dejaría
-- de ser 25 al año siguiente y el criterio de la edad se rompería solo.
insert into public.players (
  id, birth_date, position, city, province, zone_id, is_seeking_team
)
values
  ('f0000001-0000-4000-8000-000000000108', (current_date - interval '25 years')::date, 'delantero',     'Pilar',      'Buenos Aires', 'pilar', true),   -- P1
  ('f0000002-0000-4000-8000-000000000108', (current_date - interval '22 years')::date, 'delantero',     'San Isidro', 'Buenos Aires', 'san-isidro', true),   -- P2
  ('f0000003-0000-4000-8000-000000000108', null,                                       'mediocampista', null,         null,           'san-isidro', true),   -- P3: sin fecha de nacimiento y sin partidos
  ('f0000004-0000-4000-8000-000000000108', (current_date - interval '27 years')::date, 'delantero',     'Rosario',    'Santa Fe',     'rosario', true),   -- P4
  ('f0000005-0000-4000-8000-000000000108', (current_date - interval '24 years')::date, 'delantero',     'Pilar',      'Buenos Aires', 'pilar', false),  -- P5: no busca equipo
  ('f0000006-0000-4000-8000-000000000108', (current_date - interval '21 years')::date, 'delantero',     'Escobar',    'Buenos Aires', null,       true),   -- P6: sin coordenadas
  ('f0000007-0000-4000-8000-000000000108', (current_date - interval '29 years')::date, 'arquero',       'Rosario',    'Santa Fe',     'rosario', true);   -- P7

-- Relleno: delanteros en Pilar que no buscan equipo. Con el filtro por
-- defecto (`p_seeking_only = true`) no aparecen, así que no alteran los
-- resultados de los otros criterios; con `false` llevan el total a 29.
insert into public.players (
  id, birth_date, position, city, province, zone_id, is_seeking_team
)
select
  ('e00000' || lpad(n::text, 2, '0') || '-0000-4000-8000-000000000108')::uuid,
  (current_date - make_interval(years => 19 + n % 12))::date,
  'delantero', 'Pilar', 'Buenos Aires', 'pilar', false
from generate_series(1, 25) as n;

-- P1 tiene 3 partidos, para `matches_played = 3`. Fechas relativas por el
-- mismo motivo que las de nacimiento; los triggers de `match_stats` exigen
-- que caigan dentro del período de la etapa.
insert into public.career_entries (
  player_id, team_id, club_name, category, position, start_date, end_date, is_current
)
values
  ('f0000001-0000-4000-8000-000000000108', null, 'Club Atlético Pilar', 'Primera', 'delantero', (current_date - interval '2 years')::date, null, true);

insert into public.match_stats (
  career_entry_id, player_id, match_date, opponent, competition, started,
  minutes_played, goals, assists, yellow_cards, red_cards, clean_sheet
)
select
  ce.id, ce.player_id, (current_date - v.days_ago)::date, v.opponent,
  'Liga Pilarense', true, 90, v.goals, 0, 0, 0, false
from public.career_entries ce
cross join (
  values
    (30, 'Club Atlético Del Viso', 1),
    (60, 'Club Social Derqui',     0),
    (90, 'Deportivo Fátima',       2)
) as v (days_ago, opponent, goals)
where ce.player_id = 'f0000001-0000-4000-8000-000000000108';


-- =====================================================================
-- Vacantes (T10a)
--
-- Sobre los equipos del seed de T05a. Convención de nombres que reutilizan
-- los tickets siguientes de EPIC-03: E1, E2, E3 son los tres primeros equipos
-- de este archivo, en orden (Carlos, Mariana y Gustavo); DE0 es Paula, la
-- delegada sin equipo; PJ1 a PJ3 son Lucía, Martín y Sofía.
--
-- `created_at` relativo: los criterios ordenan por fecha, y con fechas fijas
-- el orden no cambiaría, pero las vacantes envejecerían en la pantalla.
-- UUID fijos que terminan en `0120`, para referenciarlas desde los tests.
-- =====================================================================
insert into public.vacancies (
  id, team_id, position, modality, level, description, status, created_at
)
values
  -- V1: E1, abierta.
  ('0a000001-0000-4000-8000-000000000120', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'mediocampista', 'futbol_11', 'competitivo', 'Volante con llegada al área. Entrenamos martes y jueves.', 'open', now() - interval '3 days'),
  -- V2: E1, abierta.
  ('0a000002-0000-4000-8000-000000000120', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'arquero', 'futbol_11', 'competitivo', 'Buscamos arquero titular para el torneo de la liga.', 'open', now() - interval '2 days'),
  -- V3: E1, cerrada. Sirve para probar que una cerrada no bloquea abrir otra
  -- de la misma posición.
  ('0a000003-0000-4000-8000-000000000120', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'defensor', 'futbol_11', 'recreativo', null, 'closed', now() - interval '5 days'),
  -- V4: E2, abierta.
  ('0a000004-0000-4000-8000-000000000120', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'delantero', 'futbol_7', 'intermedio', null, 'open', now() - interval '1 day');
  -- E3 queda sin vacantes, para el estado vacío.

-- =====================================================================
-- Postulaciones (T11a)
--
-- Convención de nombres de T10a: PJ1 Lucía, PJ2 Martín, PJ3 Sofía; V1-V4 las
-- vacantes de esa sección. Las cuentas y filas nuevas de acá terminan en
-- `0123` para referenciarlas desde los tests: PJ0 empieza con `c0000000`, los
-- delegados de relleno con `c000000N`, sus equipos con `c00000a0`/`c00000b0`
-- y las vacantes de relleno con `0b`.
-- =====================================================================

-- PJ0: cuenta de jugador sin fila en `players`, para el 23503 de la foránea.
-- DR1 y DR2: delegados de los equipos de relleno.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000'::uuid, v.id::uuid, 'authenticated',
  'authenticated', v.email,
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', v.full_name, 'role', v.role),
  now(), now(), '', '', '', ''
from (
  values
    ('c0000000-0000-4000-8000-000000000123', 'postulaciones.pj0@example.com', 'Bruno Sin Perfil',  'player'),    -- PJ0
    ('c0000001-0000-4000-8000-000000000123', 'postulaciones.dr1@example.com', 'Delegado Relleno A', 'delegate'),  -- DR1
    ('c0000002-0000-4000-8000-000000000123', 'postulaciones.dr2@example.com', 'Delegado Relleno B', 'delegate')   -- DR2
) as v (id, email, full_name, role);

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at,
  created_at, updated_at
)
select
  u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email like 'postulaciones.%@example.com';

-- PJ1 -> V1, PJ2 -> V1 y PJ1 -> V4. PJ3 no tiene postulaciones. Las fechas
-- fijan el orden de los listados: en V1, PJ1 (hace 2 h) antes que PJ2 (ayer).
insert into public.vacancy_applications (id, vacancy_id, player_id, created_at)
values
  ('0c000001-0000-4000-8000-000000000123', '0a000001-0000-4000-8000-000000000120', '11111111-1111-4111-8111-111111111111', now() - interval '2 hours'),
  ('0c000002-0000-4000-8000-000000000123', '0a000001-0000-4000-8000-000000000120', '22222222-2222-4222-8222-222222222222', now() - interval '1 day'),
  ('0c000003-0000-4000-8000-000000000123', '0a000004-0000-4000-8000-000000000120', '11111111-1111-4111-8111-111111111111', now() - interval '3 days');

-- Relleno para paginar el job board de T11b: dos equipos sin coordenadas
-- (así nunca entran en las sugerencias de T12a), con 4 vacantes abiertas
-- cada uno. Con V1, V2 y V4 suman 11 vacantes abiertas.
insert into public.teams (id, owner_id, name)
values
  ('c00000a0-0000-4000-8000-000000000123', 'c0000001-0000-4000-8000-000000000123', 'Relleno A'),
  ('c00000b0-0000-4000-8000-000000000123', 'c0000002-0000-4000-8000-000000000123', 'Relleno B');

insert into public.vacancies (id, team_id, position, modality, level, status, created_at)
select
  ('0b00000' || n || '-0000-4000-8000-000000000123')::uuid,
  case when n <= 4 then 'c00000a0-0000-4000-8000-000000000123'::uuid
       else 'c00000b0-0000-4000-8000-000000000123'::uuid end,
  (array['arquero', 'defensor', 'mediocampista', 'delantero'])[((n - 1) % 4) + 1],
  'futbol_11', 'recreativo', 'open',
  -- R1 a R4: de 10 a 13 días; R5 a R8: de 14 a 17.
  now() - make_interval(days => 9 + n)
from generate_series(1, 8) as n;

-- =====================================================================
-- Seguir equipos (T13a)
--
-- Convención de T10a: PJ1 Lucía, PJ2 Martín, PJ3 Sofía; E1, E2 y E3 los tres
-- equipos del sprint 1. Las fechas fijan el orden de los listados: para PJ1,
-- E2 (ayer) antes que E1 (hace 2 días); en E1, PJ2 (hace 3 h) antes que PJ1.
-- PJ3 no sigue a nadie y E3 no tiene seguidores.
-- =====================================================================
insert into public.team_follows (follower_id, team_id, created_at)
values
  ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '2 days'),   -- PJ1 -> E1
  ('11111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', now() - interval '1 day'),    -- PJ1 -> E2
  ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now() - interval '3 hours');  -- PJ2 -> E1

-- =====================================================================
-- T22 · Reporter de KPIs (FUT-132)
--
-- La cuenta que usa `scripts/kpis/kpis.mts` en local. Es un delegado con
-- equipo porque `search_players` toma el origen del equipo de quien busca, y
-- el reporter mide la latencia de la búsqueda. Lo que la distingue es
-- `app_metadata.kpi_reporter`, que en dev y prod pone a mano un
-- administrador (ver docs/kpis.md).
-- =====================================================================
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values (
  '00000000-0000-0000-0000-000000000000', 'c0000001-0000-4000-8000-000000000132',
  'authenticated', 'authenticated', 'kpi.reporter@example.com',
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"],"kpi_reporter":true}',
  '{"full_name":"Reporter de KPIs","role":"delegate"}',
  now(), now(), '', '', '', ''
);

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at,
  created_at, updated_at
)
select
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
from auth.users u
where u.email = 'kpi.reporter@example.com';

-- En la zona de D1 (Pilar), así las búsquedas del reporter devuelven filas. La
-- ciudad y las coordenadas las deriva el trigger de zonas (T09c).
insert into public.teams (owner_id, name, zone_id)
values ('c0000001-0000-4000-8000-000000000132', 'FutTracker KPIs (interno)', 'pilar');

-- =====================================================================
-- Sugerencias (T12a)
--
-- Convención de T09a y T10a: P1, P3 y P6 son los jugadores de la búsqueda; D1
-- es el delegado del equipo de Pilar. Las filas nuevas terminan en `0125`.
--
--   TA  el equipo de D1 (Pilar): VA1 mediocampista y VA2 arquero, abiertas.
--   TB  Vicente López: VB1 mediocampista y VB2 delantero, abiertas; VB3
--       mediocampista, cerrada.
--   TC  Rosario: VC1 mediocampista, abierta. Queda a más de 200 km de todos.
--   TE  sin zona y sin coordenadas: VE1 mediocampista, abierta.
--   P9  jugador sin posición, con coordenadas (en Mendoza, ver abajo).
--
-- TB va en Vicente López y no en San Isidro: P3 está en el centro de San
-- Isidro (T09c), y en la misma zona quedaría a 0 km, así que `suggest_teams(1)`
-- lo encontraría. Ninguna zona cae a los 2,5-3,5 km que pide el ticket: la más
-- cercana es Vicente López, a 6,6 km. Las distancias de los criterios las
-- corrige el PO, como en T09c.
-- =====================================================================

-- E1, E2, E3 y los equipos de relleno de T11a quedan sin coordenadas, así nunca
-- aparecen en las sugerencias. El trigger de zonas borra las coordenadas al
-- sacarles la zona; la ciudad de texto queda.
update public.teams
set zone_id = null
where id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',  -- E1
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',  -- E2
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'   -- E3
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000'::uuid, v.id::uuid, 'authenticated',
  'authenticated', v.email,
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', v.full_name, 'role', v.role),
  now(), now(), '', '', '', ''
from (
  values
    ('d00000b0-0000-4000-8000-000000000125', 'sugerencias.db@example.com', 'Delegado TB',     'delegate'),
    ('d00000c0-0000-4000-8000-000000000125', 'sugerencias.dc@example.com', 'Delegado TC',     'delegate'),
    ('d00000e0-0000-4000-8000-000000000125', 'sugerencias.de@example.com', 'Delegado TE',     'delegate'),
    ('f0000009-0000-4000-8000-000000000125', 'sugerencias.p9@example.com', 'Ezequiel Molina', 'player')    -- P9
) as v (id, email, full_name, role);

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at,
  created_at, updated_at
)
select
  u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email like 'sugerencias.%@example.com';

insert into public.teams (id, owner_id, name, zone_id)
values
  ('c00000b0-0000-4000-8000-000000000125', 'd00000b0-0000-4000-8000-000000000125', 'Club Vicente López', 'vicente-lopez'),  -- TB
  ('c00000c0-0000-4000-8000-000000000125', 'd00000c0-0000-4000-8000-000000000125', 'Atlético Rosario',   'rosario'),        -- TC
  ('c00000e0-0000-4000-8000-000000000125', 'd00000e0-0000-4000-8000-000000000125', 'Club Sin Ubicación', null);             -- TE

insert into public.vacancies (id, team_id, position, modality, level, status)
values
  -- TA, el equipo de D1. Va por `owner_id` porque su `id` no es fijo.
  ('0d000a01-0000-4000-8000-000000000125', (select id from public.teams where owner_id = 'd0000001-0000-4000-8000-000000000108'), 'mediocampista', 'futbol_11', 'competitivo', 'open'),    -- VA1
  ('0d000a02-0000-4000-8000-000000000125', (select id from public.teams where owner_id = 'd0000001-0000-4000-8000-000000000108'), 'arquero',       'futbol_11', 'competitivo', 'open'),    -- VA2
  ('0d000b01-0000-4000-8000-000000000125', 'c00000b0-0000-4000-8000-000000000125', 'mediocampista', 'futbol_11', 'intermedio', 'open'),    -- VB1
  ('0d000b02-0000-4000-8000-000000000125', 'c00000b0-0000-4000-8000-000000000125', 'delantero',     'futbol_7',  'recreativo', 'open'),    -- VB2
  ('0d000b03-0000-4000-8000-000000000125', 'c00000b0-0000-4000-8000-000000000125', 'mediocampista', 'futbol_11', 'intermedio', 'closed'),  -- VB3
  ('0d000c01-0000-4000-8000-000000000125', 'c00000c0-0000-4000-8000-000000000125', 'mediocampista', 'futbol_11', 'intermedio', 'open'),    -- VC1
  ('0d000e01-0000-4000-8000-000000000125', 'c00000e0-0000-4000-8000-000000000125', 'mediocampista', 'futbol_11', 'intermedio', 'open');    -- VE1

-- P9: ficha sin posición y con zona, para `suggestion_position_missing`. El
-- ticket lo ubica en Pilar, pero ahí aparecería en las búsquedas de D1 (T09a)
-- y cambiaría sus conteos. Solo necesita coordenadas, así que va a Mendoza,
-- una zona de prueba a más de 200 km, el tope de la búsqueda.
insert into public.players (id, birth_date, position, zone_id, is_seeking_team)
values ('f0000009-0000-4000-8000-000000000125', (current_date - interval '22 years')::date, null, 'mendoza', true);

-- P3 ya se postuló a VA1: sale en sus sugerencias con `applied = true`.
insert into public.vacancy_applications (id, vacancy_id, player_id)
values ('0c000a01-0000-4000-8000-000000000125', '0d000a01-0000-4000-8000-000000000125', 'f0000003-0000-4000-8000-000000000108');

-- =====================================================================
-- Mensajería (T14a)
--
-- Convención de T10a: PJ1 Lucía, PJ2 Martín, PJ3 Sofía; DE1 Carlos. UUID fijos
-- que terminan en `0134`. Cada par va en orden canónico (`user_a < user_b`):
-- los UUID de los jugadores (`1111…`, `2222…`) son menores que el de DE1
-- (`6666…`).
--
--   PJ1↔DE1  3 mensajes: DE1 (hace 2 días, leído), PJ1 (hace 1 día, leído) y
--            DE1 (hace 2 horas, sin leer).
--   PJ2↔DE1  1 mensaje de PJ2 (hace 5 horas, sin leer).
--   PJ3 y DE3 no tienen conversaciones.
-- =====================================================================
insert into public.conversations (id, user_a, user_b, created_at)
values
  ('0e000001-0000-4000-8000-000000000134', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666666', now() - interval '2 days'),   -- PJ1↔DE1
  ('0e000002-0000-4000-8000-000000000134', '22222222-2222-4222-8222-222222222222', '66666666-6666-4666-8666-666666666666', now() - interval '5 hours');  -- PJ2↔DE1

-- `last_message_at` lo pone el trigger al insertar cada mensaje.
insert into public.messages (id, conversation_id, sender_id, body, created_at, read_at)
values
  ('0f000001-0000-4000-8000-000000000134', '0e000001-0000-4000-8000-000000000134', '66666666-6666-4666-8666-666666666666', 'Hola Lucía, vimos tu perfil. ¿Te interesa probarte el martes?', now() - interval '2 days',  now() - interval '1 day 2 hours'),
  ('0f000002-0000-4000-8000-000000000134', '0e000001-0000-4000-8000-000000000134', '11111111-1111-4111-8111-111111111111', '¡Hola! Sí, me interesa. ¿A qué hora entrenan?',                 now() - interval '1 day',   now() - interval '20 hours'),
  ('0f000003-0000-4000-8000-000000000134', '0e000001-0000-4000-8000-000000000134', '66666666-6666-4666-8666-666666666666', 'A las 20 en la cancha del club. Te esperamos.',                 now() - interval '2 hours', null),
  ('0f000004-0000-4000-8000-000000000134', '0e000002-0000-4000-8000-000000000134', '22222222-2222-4222-8222-222222222222', 'Buenas, ¿siguen buscando arquero?',                              now() - interval '5 hours', null);
