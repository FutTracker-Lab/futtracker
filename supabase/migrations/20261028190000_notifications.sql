-- T15a · Notificaciones (FUT-142).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('new_message', 'new_application')),
  actor_id uuid references public.profiles (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete cascade,
  vacancy_id uuid references public.vacancies (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_target check (
    (type = 'new_message' and conversation_id is not null and vacancy_id is null)
    or (type = 'new_application' and vacancy_id is not null and conversation_id is null)
  )
);

create index notifications_user_id_created_at_idx
on public.notifications (user_id, created_at desc);
create index notifications_unread_idx
on public.notifications (user_id) where read_at is null;
-- Un solo aviso sin leer por conversación, aunque lleguen dos mensajes a la vez.
create unique index notifications_one_unread_per_conversation
on public.notifications (user_id, conversation_id)
where type = 'new_message' and read_at is null;
-- Y uno por jugador y vacante: retirarse y volver a postularse no inunda al delegado.
create unique index notifications_one_unread_per_application
on public.notifications (user_id, vacancy_id, actor_id)
where type = 'new_application' and read_at is null;

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
for select
to authenticated
using (user_id = (select auth.uid()));

-- Sin políticas ni grants de insert, update o delete: rebotan con 42501.
-- El select a `anon` es el patrón del repo: sin policy, ve 0 filas en vez de un error.
grant select on table public.notifications to anon, authenticated;

-- `security definer`: escribe en `notifications`, que no tiene grant de insert.
create function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, actor_id, conversation_id)
  select
    case when c.user_a = new.sender_id then c.user_b else c.user_a end,
    'new_message',
    new.sender_id,
    new.conversation_id
  from public.conversations c
  where c.id = new.conversation_id
  on conflict (user_id, conversation_id) where type = 'new_message' and read_at is null
  do nothing;

  return new;
end;
$$;

revoke execute on function public.notify_new_message() from public, anon, authenticated;

create trigger messages_notify_recipient
after insert on public.messages
for each row
execute function public.notify_new_message();

-- `security definer`: escribe en `notifications` y lee el dueño del equipo sin depender de la RLS del jugador.
create function public.notify_new_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, actor_id, vacancy_id)
  select t.owner_id, 'new_application', new.player_id, new.vacancy_id
  from public.vacancies v
  join public.teams t on t.id = v.team_id
  where v.id = new.vacancy_id
    and t.owner_id <> new.player_id
  on conflict (user_id, vacancy_id, actor_id) where type = 'new_application' and read_at is null
  do nothing;

  return new;
end;
$$;

revoke execute on function public.notify_new_application() from public, anon, authenticated;

create trigger vacancy_applications_notify_owner
after insert on public.vacancy_applications
for each row
execute function public.notify_new_application();

-- `security definer`: `notifications` no tiene grant de update; solo esta función toca `read_at`.
create function public.mark_notifications_read(p_ids uuid[] default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.notifications
  set read_at = now()
  where user_id = (select auth.uid())
    and read_at is null
    and (p_ids is null or id = any (p_ids));

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
