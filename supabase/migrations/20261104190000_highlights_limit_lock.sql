-- FUT-148 (DT-10): el límite de 4 clips por jugador se superaba con inserts
-- concurrentes. El trigger contaba las filas sin lock: dos transacciones que
-- cuentan a la vez ven 3 clips cada una y entran las dos. Con 8 inserts en
-- paralelo para un jugador sin clips entraban 5.
--
-- Ahora la función toma un advisory lock de transacción por jugador antes de
-- contar. Los inserts del mismo jugador hacen fila: cada uno cuenta después de
-- que el anterior commiteó (en read committed, cada sentencia de una función
-- volatile ve lo commiteado hasta ese momento, así que el `count` que sigue al
-- lock ya ve la fila del anterior). Los de jugadores distintos no se esperan.
-- Depende de ese nivel de aislamiento: en repeatable read o serializable el
-- snapshot es el de la primera sentencia y el lock no alcanzaría. PostgREST
-- corre en read committed.
--
-- Es `xact`: se suelta solo al terminar la transacción del insert, con commit
-- o con rollback. No puede quedar tomado.
--
-- La clave tiene dos partes: el nombre de la tabla separa este lock de
-- cualquier otro advisory lock que se agregue mañana con otra clave derivada de
-- un uuid, y `hashtext` del jugador lo baja a int4. Dos jugadores con el mismo
-- hash comparten la fila de espera: más lento, nunca incorrecto.
--
-- Se redefine con `create or replace`: conserva el trigger, el dueño y los
-- grants. Lo demás queda igual que en 20260924190000_player_highlights.sql
-- (`security definer`, `search_path`, mensaje y código de error).
create or replace function public.enforce_highlight_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  perform pg_advisory_xact_lock(
    hashtext('player_highlights'),
    hashtext(new.player_id::text)
  );

  select count(*) into current_count
  from public.player_highlights
  where player_id = new.player_id;

  if current_count >= 4 then
    -- El mensaje es un código para el frontend, no un texto para mostrar:
    -- T08b lo traduce. Mandarlo en castellano obligaría a matchear contra una
    -- frase que cambia con cualquier corrección de redacción.
    raise exception 'highlight_limit_reached'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
