-- FUT-158 (DT-20): saca los caracteres de control bidireccional de los textos
-- libres que ya están guardados. Desde este ticket el schema de Zod los saca
-- antes de guardar (`stripBidiControls`); esto limpia lo anterior y deja lo
-- mismo que dejaría Zod: sin los caracteres, recortado, y los campos opcionales
-- que quedan vacíos en null.
--
-- Son U+202A a U+202E (embedding y override) y U+2066 a U+2069 (isolates):
-- cambian cómo se ve el texto que los sigue (con U+202E, "gpj.exe" se lee
-- "exe.jpg"). El HTML ya sale escapado; esto cubre lo que el escape no toca.
-- Las regex los nombran por su código y no con el carácter: escrito tal cual
-- sería invisible en el archivo.
--
-- Textos libres: nombre, club, categoría, liga y bio del equipo, y la
-- descripción de la vacante. Ciudad y provincia no: las escribe el trigger de
-- zonas desde el catálogo.
--
-- Solo toca las filas que tienen alguno, así no cambia el `updated_at` del
-- resto.
--
-- Dos casos que harían fallar la migración entera, y por eso se chequean antes
-- de desplegarla (consulta en la PR): un nombre que sin los caracteres queda
-- con menos de 2 (el check de `name`) y dos equipos que sin ellos quedan con
-- el mismo nombre en la misma ciudad (`teams_name_city_unique`). El primero se
-- deja como está en vez de romper el check.

update public.teams
set
  name = case
    when char_length(btrim(regexp_replace(name, '[\u202A-\u202E\u2066-\u2069]', '', 'g'))) >= 2 then btrim(regexp_replace(name, '[\u202A-\u202E\u2066-\u2069]', '', 'g'))
    else name
  end,
  club_name = nullif(btrim(regexp_replace(club_name, '[\u202A-\u202E\u2066-\u2069]', '', 'g')), ''),
  category = nullif(btrim(regexp_replace(category, '[\u202A-\u202E\u2066-\u2069]', '', 'g')), ''),
  league = nullif(btrim(regexp_replace(league, '[\u202A-\u202E\u2066-\u2069]', '', 'g')), ''),
  bio = nullif(btrim(regexp_replace(bio, '[\u202A-\u202E\u2066-\u2069]', '', 'g')), '')
where concat_ws(' ', name, club_name, category, league, bio) ~ '[\u202A-\u202E\u2066-\u2069]';

-- `vacancies_enforce_status_only` no deja cambiar la descripción (una vacante
-- no se edita): se apaga solo para este update, dentro de la transacción de la
-- migración. Si queda vacía pasa a null, por el check de 20261106200000.
alter table public.vacancies disable trigger vacancies_enforce_status_only;

update public.vacancies
set description = nullif(btrim(regexp_replace(description, '[\u202A-\u202E\u2066-\u2069]', '', 'g')), '')
where description ~ '[\u202A-\u202E\u2066-\u2069]';

alter table public.vacancies enable trigger vacancies_enforce_status_only;
