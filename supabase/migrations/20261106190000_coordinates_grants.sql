-- FUT-154 (DT-13): nadie manda coordenadas de jugadores ni de equipos.
--
-- Desde T09c (20261012200000_zones.sql), `apply_zone_location` pisa
-- `latitude` y `longitude` en cada insert y update con el centro de la zona, o
-- con null si no hay zona. Las columnas seguían otorgadas, así que mandarlas
-- funcionaba y el valor se descartaba en silencio. Ahora se quitan del insert y
-- del update de `authenticated`: mandarlas rebota con 42501, que es lo que pide
-- el ticket ("un equipo no puede modificar las coordenadas de su equipo fuera
-- de las que corresponden a su zona").
--
-- El trigger sigue siendo el que las escribe. Postgres chequea los grants de
-- las columnas que nombra la sentencia, no de las que cambia un trigger, así
-- que elegir una zona sigue cargando sus coordenadas.
--
-- La lectura no cambia: lo que se guarda es siempre el centro de la zona
-- (verificado en dev, ninguna fila fuera del centro), el mismo dato público que
-- ya da la ciudad. `search_players` y `suggest_teams` las siguen leyendo con los
-- permisos del usuario.
--
-- Los grants de insert y update de las dos tablas son por columna (players y
-- teams), así que el revoke por columna los saca sin tocar el resto.
revoke insert (latitude, longitude), update (latitude, longitude)
on table public.players from authenticated;

revoke insert (latitude, longitude), update (latitude, longitude)
on table public.teams from authenticated;
