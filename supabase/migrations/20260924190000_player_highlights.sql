-- Highlights de un jugador: el clip vive en el bucket privado `highlights`
-- (ver la migración siguiente) y acá queda el registro. En la base va el
-- path, nunca una URL firmada: la URL vence a las 24 h y guardarla
-- garantizaría servir links muertos.
create table public.player_highlights (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  -- Check de tabla y no de columna: compara dos columnas entre sí. Ata el
  -- path a la carpeta del dueño, que es la misma condición que aplican las
  -- políticas de storage. Sin esto, un jugador podía registrar como propio un
  -- clip guardado en la carpeta de otro.
  check (storage_path like player_id::text || '/%')
);

-- Sin `updated_at` ni su trigger a propósito: no hay política de update (ver
-- más abajo), así que la fila nunca cambia después de creada.

create index player_highlights_player_id_created_at_idx
on public.player_highlights (player_id, created_at desc);

-- El límite de 4 por jugador lo fija el diseño ("Hasta cuatro clips"). Va en
-- un trigger y no en un check porque depende de las otras filas del jugador,
-- no de la que se está insertando.
--
-- `security definer` como el resto de los triggers del repo: el conteo tiene
-- que ver todas las filas del jugador, no solo las que la RLS del que inserta
-- deje leer. Hoy la policy de select es abierta para cualquier autenticado y
-- daría lo mismo, pero si mañana se restringe, el límite seguiría contando
-- bien en vez de dejar pasar un quinto clip en silencio.
create function public.enforce_highlight_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  select count(*) into current_count
  from public.player_highlights
  where player_id = new.player_id;

  if current_count >= 4 then
    -- El mensaje es un código para el frontend, no un texto para mostrar:
    -- T08b lo traduce. Mandarlo en castellano obligaría a matchear contra una
    -- frase que cambia con cualquier corrección de redacción.
    raise exception 'highlight_limit_reached'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger player_highlights_enforce_limit
before insert on public.player_highlights
for each row
execute function public.enforce_highlight_limit();

alter table public.player_highlights enable row level security;

-- Cualquier usuario con sesión ve los highlights de cualquiera: es una
-- galería pública dentro del producto (decisión 1.6, nada es visible sin
-- cuenta).
create policy player_highlights_select on public.player_highlights
for select
to authenticated
using (true);

-- `player_id = auth.uid()` alcanza sin consultar `players`: su PK es la de
-- `profiles`, que es la de `auth.users`. Un delegado no tiene fila en
-- `players` y la FK lo rebota con 23503.
create policy player_highlights_insert on public.player_highlights
for insert
to authenticated
with check (player_id = (select auth.uid()));

-- Sin política de update a propósito: en esta versión el título no se edita,
-- se borra el clip y se vuelve a subir. Tampoco hay `grant update` (ver abajo),
-- así que un intento rebota con 42501 antes de llegar a la RLS.

create policy player_highlights_delete on public.player_highlights
for delete
to authenticated
using (player_id = (select auth.uid()));

-- Sin los grants PostgREST devuelve 42501 aunque la RLS esté bien. El select
-- a `anon` es a propósito: sin policy para ese rol, una consulta anónima
-- devuelve 0 filas en vez de un error de permisos.
grant select on table public.player_highlights to anon, authenticated;
grant delete on table public.player_highlights to authenticated;

-- Columnas enumeradas y no `on table`: la RLS controla qué fila se toca,
-- nunca qué columna. Así el `id` y el `created_at` quedan para la base y no
-- los puede escribir un POST desde el navegador.
grant insert (player_id, title, storage_path)
on table public.player_highlights to authenticated;

-- Sin `grant update`: acompaña a la ausencia de política de update.
