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
  ('00000000-0000-0000-0000-000000000000', '66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'delegado@example.com', extensions.crypt('password123', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Carlos Delegado","role":"delegate"}', now(), now(), '', '', '', '');

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
