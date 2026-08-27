-- Cuentas de prueba para desarrollo local y para sembrar `dev` (FUT-82,
-- requisitos 12-13). Corre automáticamente con `supabase db reset` en
-- local; contra un proyecto remoto no corre solo — se aplica a mano, ver
-- docs/qa/cuentas-de-prueba.md.
--
-- Inserta directo en auth.users porque un seed.sql común no puede llamar a
-- la API de Auth. `crypt`/`gen_salt` vienen de pgcrypto, ya en el
-- search_path (ver supabase/config.toml, extra_search_path).
--
-- Todavía NO inserta filas en `public.profiles` ni `public.players`: esas
-- tablas las crea T03a/T04a, que no están mergeadas a esta rama. Cuando
-- esas migraciones existan, agregar los inserts correspondientes acá mismo
-- usando estos mismos ids de usuario.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'jugador.demo@futtracker.test',
    crypt('FutTracker!1', gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Jugador Demo","role":"player"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'delegado.demo@futtracker.test',
    crypt('FutTracker!1', gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Delegado Demo","role":"delegate"}',
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;
