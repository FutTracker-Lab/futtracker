# Cuentas de prueba

Sembradas por [`supabase/seed.sql`](../../supabase/seed.sql). Válidas en local
(`supabase db reset`) siempre. En `dev`, solo después de aplicar el seed a
mano (ver abajo) — no hay ningún mecanismo que lo corra solo todavía.

| Rol | Email | Password |
|---|---|---|
| Jugador | `jugador.demo@futtracker.test` | `FutTracker!1` |
| Delegado | `delegado.demo@futtracker.test` | `FutTracker!1` |

Password igual para las dos a propósito: son cuentas de prueba, no reales,
y la password se documenta acá mismo — no hace falta más de una.

## Estado actual

Estas cuentas hoy solo existen en `auth.users`. Todavía no tienen fila en
`public.profiles` ni `public.players` porque esas tablas las crean T03a y
T04a, que no están mergeadas a esta rama. Cuando existan, `seed.sql` se
actualiza para poblarlas también, usando estos mismos ids de usuario
(`11111111-...`, `22222222-...`).

## Cómo aplicar este seed contra `futtracker-dev`

`supabase/seed.sql` **no corre solo** contra un proyecto remoto — solo se
ejecuta automáticamente con `supabase db reset` en local. Contra `dev`:

```bash
psql "$SUPABASE_DB_URL_STAGING" -f supabase/seed.sql
```

(`SUPABASE_DB_URL_STAGING` es el connection string del proyecto
`futtracker-dev`, el mismo formato que usa el CI de Supabase — ver
`Settings → Database → Connect → URI` en el dashboard.)

Nunca correr esto contra `futtracker-prod`.
