-- FUT-157 (DT-19): la descripción de una vacante no puede quedar vacía ni
-- solo con espacios. El formulario mandaba `null`, pero la Server Action
-- llamada directo (o un insert por PostgREST) guardaba `''`. Ahora el schema
-- de Zod normaliza a `null` y la base lo exige.
--
-- Primero se pasan a `null` las filas que ya existan vacías: si no, agregar el
-- check fallaría. El trigger `vacancies_enforce_status_only` rechaza cualquier
-- cambio de `description` (una vacante no se edita), así que se apaga solo
-- para este update y se vuelve a prender. Todo va en la transacción de la
-- migración: si algo falla, el trigger no queda apagado. El update dispara
-- igual `vacancies_set_updated_at`, así que esas filas quedan con
-- `updated_at` de cuando corrió la migración.
--
-- `btrim` sin segundo argumento recorta solo espacios, como pide el ticket. El
-- schema recorta además tabs y saltos de línea, así que por la app no llega
-- nada que este check deje pasar.
alter table public.vacancies disable trigger vacancies_enforce_status_only;

update public.vacancies
set description = null
where description is not null
  and char_length(btrim(description)) = 0;

alter table public.vacancies enable trigger vacancies_enforce_status_only;

alter table public.vacancies
  add constraint vacancies_description_not_blank
  check (description is null or char_length(btrim(description)) > 0);
