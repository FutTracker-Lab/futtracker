-- `profiles.email` duplicaba `auth.users.email`: lo llenaba el trigger de alta
-- y nada lo volvía a tocar, así que el día que exista un cambio de email la
-- copia quedaba vieja en silencio. Peor: el `grant select` es sobre la tabla
-- entera, así que cualquier usuario autenticado leía el mail de todos.
--
-- El propio usuario tiene el suyo en la sesión. Si alguna vez hace falta el de
-- otro, la salida es una vista o una función `security definer` que lo exponga
-- solo a quien corresponda, no una columna abierta a todo el mundo.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'role'
  );

  return new;
end;
$$;

alter table public.profiles drop column email;
