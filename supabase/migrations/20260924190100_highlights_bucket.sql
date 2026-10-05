-- Bucket privado de highlights. Path: `<auth.uid()>/<uuid>.<ext>`, la misma
-- convención que `avatars` y `team-crests`: la primera carpeta es el dueño, y
-- es lo que chequean las políticas de abajo y el check de `storage_path` en
-- `player_highlights`.
--
-- 50 MB es el límite por archivo del plan gratuito de Supabase. Queda
-- anotado el riesgo que ya marca el ticket: un clip de 2 minutos filmado en
-- 1080p con un celular suele pesar más que eso, así que el jugador va a tener
-- que comprimir. Si el equipo pasa a un plan pago, se sube acá con una
-- migración nueva.
--
-- La duración de 2 minutos NO se valida en la base: no hay Edge Function ni
-- procesamiento de video (decisión 1.10). La valida el cliente en T08b y no
-- es a prueba de manipulación.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'highlights',
  'highlights',
  false,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime']
);

-- `storage.objects` ya trae RLS y los grants: acá van solo las políticas.

create policy highlights_select on storage.objects
for select
to authenticated
using (bucket_id = 'highlights');

-- Insert y delete piden además fila en `players`. A diferencia de
-- `player_highlights`, acá no hay una FK que rebote al delegado: sin este
-- `exists`, una cuenta de delegado podría llenar el bucket de archivos que
-- ninguna fila referencia.
create policy highlights_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'highlights'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.players where id = (select auth.uid()))
);

-- Sin política de update, igual que en la tabla: un clip no se edita, se
-- borra y se sube de nuevo.

create policy highlights_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'highlights'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select 1 from public.players where id = (select auth.uid()))
);
