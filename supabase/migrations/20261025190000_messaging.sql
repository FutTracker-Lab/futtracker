-- T14a · Mensajería directa: conversaciones 1 a 1 y mensajes (FUT-134).
--
-- Una conversación es un par de cuentas, guardado en orden canónico
-- (`user_a < user_b`): así hay una sola por par y no hay conversación con uno
-- mismo, las dos cosas garantizadas por la base. Una conversación y sus
-- mensajes los ven solo sus dos participantes, y nadie escribe a nombre de
-- otro. Sin realtime ni Edge Functions.

-- =====================================================================
-- Tablas
-- =====================================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- null hasta el primer mensaje; lo mantiene el trigger de `messages`.
  last_message_at timestamptz,
  constraint conversations_ordered_pair check (user_a < user_b),
  constraint conversations_unique_pair unique (user_a, user_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  -- null = el destinatario todavía no lo leyó. Solo lo cambia
  -- `mark_conversation_read`.
  read_at timestamptz,
  constraint messages_body_length check (char_length(btrim(body)) between 1 and 2000)
);

-- La bandeja de cada participante, de la conversación más reciente a la más
-- vieja. `conversations_unique_pair` ya indexa `user_a` como primera columna,
-- pero no ordena por `last_message_at`.
create index conversations_user_a_last_message_idx
  on public.conversations (user_a, last_message_at desc);
create index conversations_user_b_last_message_idx
  on public.conversations (user_b, last_message_at desc);

-- El hilo, paginado del más nuevo al más viejo.
create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

-- Los no leídos de cada conversación: el índice solo guarda los que importan.
create index messages_unread_idx
  on public.messages (conversation_id)
  where read_at is null;

-- =====================================================================
-- Helpers
-- =====================================================================

-- `security definer`: las políticas de `messages` lo llaman por cada fila, y así
-- no se evalúa la RLS de `conversations` adentro de la de `messages`.
create function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and (select auth.uid()) in (c.user_a, c.user_b)
  );
$$;

revoke execute on function public.is_conversation_participant(uuid) from public, anon;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

-- `security definer` porque `conversations` no tiene política ni grant de
-- `update`: `last_message_at` lo mantiene solo este trigger.
--
-- `greatest` y no `new.created_at` a secas: un mensaje con fecha anterior (un
-- seed, una carga histórica) no debe hacer retroceder la conversación en la
-- bandeja. Con mensajes nuevos es lo mismo, porque `created_at` es `now()`.
create function public.touch_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = greatest(coalesce(last_message_at, new.created_at), new.created_at)
  where id = new.conversation_id;

  return new;
end;
$$;

revoke execute on function public.touch_conversation_last_message() from public, anon, authenticated;

create trigger messages_touch_conversation
after insert on public.messages
for each row
execute function public.touch_conversation_last_message();

-- Marca como leídos los mensajes que recibió quien llama en esa conversación.
-- Devuelve cuántos marcó; si no es participante, 0 y no toca nada.
create function public.mark_conversation_read(p_conversation_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if not public.is_conversation_participant(p_conversation_id) then
    return 0;
  end if;

  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and read_at is null
    and sender_id <> (select auth.uid());

  get diagnostics v_updated = row_count;

  return v_updated;
end;
$$;

revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy conversations_select on public.conversations
for select
to authenticated
using ((select auth.uid()) in (user_a, user_b));

-- Solo una conversación en la que uno es parte. Que no sea con uno mismo y que
-- no se repita lo garantizan los dos `constraint` de la tabla.
create policy conversations_insert on public.conversations
for insert
to authenticated
with check ((select auth.uid()) in (user_a, user_b));

create policy messages_select on public.messages
for select
to authenticated
using (public.is_conversation_participant(conversation_id));

create policy messages_insert on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and public.is_conversation_participant(conversation_id)
);

-- Sin políticas ni grants de `update` y `delete` en ninguna de las dos: los
-- mensajes son inmutables y las conversaciones no se borran (supuesto 4).
-- Borrar una cuenta las borra en cascada.

-- Por columna: `id`, `created_at`, `last_message_at` y `read_at` los pone la
-- base. Con un grant sobre la tabla entera, cualquiera podría insertar un
-- mensaje ya "leído" o una conversación con fecha de último mensaje inventada.
grant select on table public.conversations to authenticated;
grant insert (user_a, user_b) on table public.conversations to authenticated;

grant select on table public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on table public.messages to authenticated;

-- =====================================================================
-- Resumen de la bandeja
-- =====================================================================

-- Una fila por conversación de quien consulta, con el otro participante, el
-- último mensaje y cuántos le faltan leer, en una sola consulta (notas
-- técnicas: no N consultas desde el frontend).
--
-- `security_invoker`: la RLS de `conversations` y `messages` se aplica con el
-- usuario que consulta, así que cada uno ve solo sus conversaciones.
create view public.conversation_summaries
with (security_invoker = true)
as
select
  c.id,
  c.created_at,
  c.last_message_at,
  other.id as other_id,
  other.full_name as other_full_name,
  other.avatar_path as other_avatar_path,
  other.role as other_role,
  -- Recortado a 120 caracteres: es la vista previa de la bandeja.
  left(last_message.body, 120) as last_message_body,
  last_message.created_at as last_message_created_at,
  last_message.sender_id as last_message_sender_id,
  (
    select count(*)
    from public.messages m
    where m.conversation_id = c.id
      and m.read_at is null
      and m.sender_id <> (select auth.uid())
  ) as unread_count
from public.conversations c
join public.profiles other
  on other.id = case when c.user_a = (select auth.uid()) then c.user_b else c.user_a end
left join lateral (
  select m.body, m.created_at, m.sender_id
  from public.messages m
  where m.conversation_id = c.id
  order by m.created_at desc
  limit 1
) last_message on true;

grant select on public.conversation_summaries to authenticated;
