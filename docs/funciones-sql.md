# Funciones SQL nuevas: quién puede ejecutarlas

Toda función nueva en `public` sale de su migración con un `revoke` explícito,
y con un `grant` a `authenticated` solo si un usuario tiene que poder
ejecutarla:

```sql
revoke execute on function public.mi_funcion(uuid) from public, anon;
grant execute on function public.mi_funcion(uuid) to authenticated;
```

Sin el `revoke`, cualquiera la puede llamar sin sesión por `/rpc`. Sin el
`grant` (cuando hace falta), falla para los usuarios logueados con
`permission denied for function`. Esto es así desde la PR #28.

## Por qué

| Paso | Qué pasa |
|---|---|
| Se crea la función | Postgres le da `execute` a `PUBLIC`, y `PUBLIC` incluye a `anon`. |
| `revoke ... from public, anon` | Se cierra a quien no tiene sesión. En el stack local, `authenticated` tenía `execute` solo a través de `PUBLIC`, así que también lo pierde. |
| `grant ... to authenticated` | Se lo devuelve a quien tiene sesión. |

Verificado en el stack local: una función recién creada tiene `proacl` nulo
(`execute` para `PUBLIC`), y después del `revoke` `authenticated` ya no la puede
ejecutar. Los proyectos de la nube traen privilegios por defecto distintos (ver
el README), que pueden darle `execute` directo a `anon` y a `authenticated`. Por
eso el `revoke` nombra a `anon` explícitamente: con el `revoke` y el `grant` la
función queda igual en los tres ambientes.

**Toda función con `grant` a `authenticated` es un endpoint:** cualquier
usuario logueado la puede llamar por `/rpc` con los argumentos que quiera, no
solo desde la pantalla para la que se escribió.

## Qué funciones necesitan el `grant`

| Función | `grant` a `authenticated` |
|---|---|
| Se llama desde la app por `/rpc` (`search_players`) | Sí. |
| La llama una función `security invoker` (`haversine_km`, que la llama `search_players`) | Sí. La `invoker` corre con los permisos del usuario, y todo lo que llama adentro también. Sin el `grant`, la búsqueda falla con `permission denied for function haversine_km`, aunque `search_players` sí lo tenga. |
| Se usa dentro de una política de RLS (`is_team_owner`) | Sí. La política se evalúa con los permisos del usuario. |
| La llama solo una función `security definer` | No. Adentro de la `definer` todo corre como su dueño (`postgres`). Sin `grant`, además, no queda expuesta por `/rpc`. |
| Función de trigger (`returns trigger`) | No. No se puede llamar por `/rpc`, y al dispararse el trigger Postgres no chequea el `execute` del usuario. |

El `revoke` va siempre, aunque no haya `grant`. La excepción son las funciones
de trigger: como no se pueden llamar por `/rpc`, no cambia nada, y las del repo
no lo llevan.

## `security definer`: con cuidado

Una función `security definer` corre como su dueño, así que **adentro no aplica
la RLS**. Si tiene `grant`, cualquier usuario logueado la llama por `/rpc` y lee
o escribe lo que la función toque. Antes de darle el `grant`:

- Que valide en el cuerpo quién la llama (`auth.uid()`) y qué puede hacer, como
  haría una política.
- Que fije el `search_path` (`set search_path = ''`, o `public` si califica
  todo) y nombre las tablas con su schema (`public.players`). Sin eso, un objeto
  con el mismo nombre en otro schema puede cambiar qué ejecuta.
- Si solo la llama otra función `security definer`, que no tenga `grant`. Si
  se usa en una política o la llama una función `security invoker`, sí lo
  necesita: el `execute` se chequea con el usuario antes de entrar a la
  función, aunque sea `definer` (ver la tabla de arriba).

Ejemplos en el repo del `search_path` fijo y los nombres con schema:
`enforce_highlight_limit` y los triggers de
`20261012190000_vacancy_applications.sql`. Son funciones de trigger, así que no
llevan `revoke` ni `grant`.

## Al recrear una función

`create or replace function` conserva los privilegios. `drop function` y
después `create function` los resetea: vuelve el `execute` a `PUBLIC`. Si una
migración recrea una función con `drop`, repite el `revoke` y el `grant`.

## Checklist para una función nueva

- [ ] `revoke execute ... from public, anon`, con la firma completa (tipos de los parámetros). No hace falta en las de trigger.
- [ ] `grant execute ... to authenticated` solo si está en una fila "Sí" de la tabla.
- [ ] Si es `security invoker`, cada función que llama tiene su propio `grant`.
- [ ] Si es `security definer`: valida al usuario en el cuerpo y fija el `search_path`.
- [ ] Recomendado: un test de RLS que la llame con sesión (funciona) y sin sesión (`42501`).
