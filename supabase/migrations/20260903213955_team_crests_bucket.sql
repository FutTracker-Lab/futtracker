-- Las políticas de storage tienen que castear el primer segmento del path a
-- uuid, y un path como `hack/escudo.png` revienta el cast con 22P02: el
-- usuario recibe un 500 en vez de un 403. Con esto un path inválido es
-- simplemente "no sos el dueño".
create function public.safe_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

-- `security definer` para que las políticas de `storage.objects` no dependan
-- de la RLS de `teams`: sin esto, la política de storage solo ve las filas que
-- el usuario puede leer, y la autorización del escudo quedaría atada a un
-- cambio futuro en las políticas de la tabla. El `search_path` fijo es
-- obligatorio con definer, o se puede secuestrar la función.
create function public.is_team_owner(team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teams t
    where t.id = is_team_owner.team
      and t.owner_id = auth.uid()
  );
$$;

revoke execute on function public.is_team_owner(uuid) from public;
grant execute on function public.is_team_owner(uuid) to authenticated;

-- Path: `<team_id>/<filename>`. En la base va el path, nunca la URL firmada.
-- 2 MB y los tres mime types son decisión nuestra (el ticket no fija límites);
-- se eligieron iguales a los de `avatars` para no tener dos reglas distintas
-- para la misma clase de archivo. Sin SVG a propósito: es vector de XSS.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-crests',
  'team-crests',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
);

-- `storage.objects` ya trae RLS y los grants: acá van solo las políticas.

create policy team_crests_select on storage.objects
for select
to authenticated
using (bucket_id = 'team-crests');

create policy team_crests_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'team-crests'
  and public.is_team_owner(public.safe_uuid((storage.foldername(name))[1]))
);

create policy team_crests_update on storage.objects
for update
to authenticated
using (
  bucket_id = 'team-crests'
  and public.is_team_owner(public.safe_uuid((storage.foldername(name))[1]))
)
with check (
  bucket_id = 'team-crests'
  and public.is_team_owner(public.safe_uuid((storage.foldername(name))[1]))
);

create policy team_crests_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'team-crests'
  and public.is_team_owner(public.safe_uuid((storage.foldername(name))[1]))
);
