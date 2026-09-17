-- Path: `<auth.uid()>/<filename>`. En la base va el path, nunca la URL firmada.
-- 2 MB y los tres mime types son decisión nuestra: el ticket no fija límites.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
);

-- `storage.objects` ya trae RLS y los grants: acá van solo las políticas.

create policy avatars_select on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

create policy avatars_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatars_update on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy avatars_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
