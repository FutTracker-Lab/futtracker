-- 20260824153549_init — migración placeholder.
--
-- No crea ningún objeto. Existe para que `supabase migration up` tenga algo
-- que aplicar y el pipeline de migraciones quede probado antes de que T03a
-- cree la primera tabla real (`public.profiles`).
--
-- Regla del proyecto, para que quede escrita desde la primera migración:
-- toda tabla nueva sale con `alter table ... enable row level security` en la
-- misma migración que la crea, y su política de `select` exige sesión
-- iniciada. La autorización vive en RLS, no en el código de la app.

select 1;
