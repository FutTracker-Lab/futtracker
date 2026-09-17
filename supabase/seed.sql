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

insert into public.players (
  id, birth_date, position, preferred_foot, height_cm, weight_kg,
  city, province, country, latitude, longitude, bio, phone, is_seeking_team
)
values
  ('11111111-1111-4111-8111-111111111111', '1999-03-14', 'delantero', 'derecha', 168, 62, 'Pilar', 'Buenos Aires', 'AR', -34.458300, -58.914200, 'Nueve de área. Juego los martes en la liga de Pilar.', '+54 9 11 4000-0001', true),
  ('22222222-2222-4222-8222-222222222222', '1996-11-02', 'arquero', 'derecha', 189, 84, 'Rosario', 'Santa Fe', 'AR', -32.944200, -60.650500, 'Arquero desde los ocho años. Disponible fines de semana.', '+54 9 341 400-0002', true),
  ('33333333-3333-4333-8333-333333333333', '2001-06-27', 'mediocampista', 'izquierda', 172, 65, 'Córdoba', 'Córdoba', 'AR', -31.420100, -64.188800, 'Volante central, buen pie para la pelota parada.', '+54 9 351 400-0003', false),
  ('44444444-4444-4444-8444-444444444444', '1994-01-19', 'defensor', 'derecha', 181, 78, 'La Plata', 'Buenos Aires', 'AR', -34.921500, -57.954500, 'Marcador central. Juego al fútbol 11 hace quince años.', '+54 9 221 400-0004', true),
  ('55555555-5555-4555-8555-555555555555', '2003-09-08', 'mediocampista', 'ambidiestro', 165, 58, 'Mendoza', 'Mendoza', 'AR', -32.889500, -68.845800, 'Enganche. Busco equipo para el torneo de verano.', '+54 9 261 400-0005', true);

-- El escudo del primer equipo lo sube el CLI desde `supabase/team-crests/`
-- (ver `config.toml`). En la base va el path y nunca la URL firmada: la firma
-- vence, y una URL guardada queda muerta.
insert into public.teams (
  id, owner_id, name, club_name, category, league, city, province, country,
  latitude, longitude, founded_year, crest_path, bio, contact_email
)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '66666666-6666-4666-8666-666666666666', 'Club Atlético Pilar', 'Club Atlético Pilar', 'Primera', 'Liga de Pilar', 'Pilar', 'Buenos Aires', 'AR', -34.458300, -58.914200, 1954, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/escudo.png', 'Club de barrio con cancha propia. Entrenamos martes y jueves.', 'delegado@example.com'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '77777777-7777-4777-8777-777777777777', 'Racing de Rosario', 'Racing de Rosario', 'Reserva', 'Liga Rosarina', 'Rosario', 'Santa Fe', 'AR', -32.944200, -60.650500, 1978, null, 'Plantel joven de reserva. Buscamos arquero para el torneo.', null),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '88888888-8888-4888-8888-888888888888', 'Deportivo Córdoba', 'Deportivo Córdoba', 'Primera', 'Liga Cordobesa', 'Córdoba', 'Córdoba', 'AR', -31.420100, -64.188800, 1991, null, 'Fútbol 11 los domingos. Tres ascensos en la última década.', null);

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
