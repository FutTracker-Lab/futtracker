-- `safe_uuid` alimenta la decisión de autorización del bucket de escudos, y la
-- resolución del tipo en `value::uuid` pasa por el `search_path`: un tipo
-- `uuid` plantado en un esquema que quede antes en el path cambiaría el
-- resultado del cast. Hoy no es alcanzable (`authenticated` no tiene `create`
-- en ningún esquema), así que esto cierra el camino antes de que exista.
--
-- Va en '' y no en `public`: la función no toca ningún objeto nuestro, y
-- `pg_catalog` se busca igual aunque no esté en la lista.
alter function public.safe_uuid(text) set search_path = '';
