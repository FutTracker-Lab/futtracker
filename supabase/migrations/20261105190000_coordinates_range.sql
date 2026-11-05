-- FUT-152 (DT-21): rango de las coordenadas de jugadores y equipos en la base.
-- Hasta ahora una latitud de 500 cabía en `numeric(9, 6)` y solo la frenaba Zod
-- en el cliente.
--
-- Hoy nadie puede guardar una coordenada propia: `apply_zone_location`
-- (20261012200000_zones.sql) las pisa en cada insert y update con las de la
-- zona, que ya tienen su check, o con null. Los checks de acá son defensa en
-- profundidad: frenan lo que no pase por ese trigger (SQL directo con los
-- triggers apagados, una carga de datos, un cambio futuro del trigger). Como
-- un check se evalúa sobre la fila que deja el trigger, por la API no se
-- llega a ver un 23514: el valor fuera de rango ya fue reemplazado.
--
-- Un caso donde el trigger no pisa: con un `zone_id` que no existe deja pasar
-- las coordenadas que mandó el cliente, para que la foránea rechace la zona
-- con 23503. Si además la latitud está fuera de rango, ahora el error es 23514
-- y no 23503, porque el check corre antes que la foránea. El formulario no
-- manda coordenadas, así que solo cambia para una request armada a mano.
--
-- `null` pasa: un check con una comparación nula no falla, y sin zona las
-- coordenadas son null.
--
-- Agregar el check valida las filas existentes. Si alguna estuviera fuera de
-- rango, la migración falla entera y no se aplica nada. Por eso, antes de
-- desplegarla, esto tiene que dar 0 en dev y en prod (y lo mismo sobre teams):
--
--   select count(*) from public.players
--   where latitude not between -90 and 90 or longitude not between -180 and 180;
alter table public.players
  add constraint players_latitude_range check (latitude between -90 and 90),
  add constraint players_longitude_range check (longitude between -180 and 180);

alter table public.teams
  add constraint teams_latitude_range check (latitude between -90 and 90),
  add constraint teams_longitude_range check (longitude between -180 and 180);
