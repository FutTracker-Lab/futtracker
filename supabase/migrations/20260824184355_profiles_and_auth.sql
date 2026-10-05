create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('player', 'delegate')),
  full_name text not null,
  email text not null,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `security definer` porque corre como owner: el usuario que se da de alta
-- todavía no tiene permisos sobre `profiles`. El `search_path` fijo es
-- obligatorio con definer, o se puede secuestrar la función.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'role'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();

  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
for select
using (auth.role() = 'authenticated');

create policy profiles_insert on public.profiles
for insert
with check (auth.uid() = id);

create policy profiles_update on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Sin esto PostgREST devuelve 42501 aunque RLS esté bien: el proyecto no
-- expone las tablas nuevas automáticamente. Sin `insert`: la única alta la
-- hace el trigger de arriba, que es definer y no pasa por los grants.
grant select on table public.profiles to authenticated;

-- El update va por columna y no por tabla. La política de RLS controla QUÉ
-- FILA se toca, nunca QUÉ COLUMNA, así que con un grant sobre la tabla entera
-- el propio usuario podía cambiarse el `role` con un PATCH y ascenderse a
-- delegate. El rol se elige en el registro y no se edita después.
grant update (full_name, avatar_path) on table public.profiles to authenticated;
