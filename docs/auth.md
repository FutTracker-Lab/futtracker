# Auth: configuración por ambiente y decisiones

La autenticación es email + password contra Supabase Auth. Cada alta crea una
fila en `public.profiles` con el rol (`player` o `delegate`), y ese rol define a
dónde entra el usuario después de loguearse.

Esta página cubre **lo que no se puede deducir del código**: qué hay que cargar
a mano en cada ambiente, y por qué algunas decisiones son las que son.

## Quick path (local)

1. `supabase start` desde la raíz del repo.
2. En `frontend/futtracker/.env.local`, `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000`.
3. `npm run dev`. Los mails no salen a internet: quedan en Mailpit,
   http://127.0.0.1:54324.

En local no hace falta confirmar el mail para entrar
(`enable_confirmations = false` en `supabase/config.toml`).

## Configuración por ambiente

| | local | dev | prod |
|---|---|---|---|
| `enable_confirmations` | `false` | `false` | **`true`** |
| Dónde se configura | `supabase/config.toml` | dashboard | dashboard |
| SMTP | Mailpit | default de Supabase | **Resend** |
| `NEXT_PUBLIC_SITE_URL` | `http://127.0.0.1:3000` | URL del deploy de dev | dominio de prod |

`config.toml` **solo aplica al stack local.** Los proyectos de la nube se
configuran desde el dashboard; lo que está en este archivo no se les pushea.

### Redirect URLs

Van en Authentication → URL Configuration, en cada proyecto de Supabase.

- **Site URL**: el origen de ese ambiente.
- **Redirect URLs** (allowlist): las tres, en los dos proyectos.

```
http://localhost:3000
http://127.0.0.1:3000
https://<deploy-de-dev>.vercel.app
https://<dominio-de-prod>
```

> **La allowlist matchea exacto.** `localhost` y `127.0.0.1` son entradas
> distintas, y el esquema cuenta. Un valor que no matchea no da un error
> visible: el link del mail rebota al Site URL y el usuario aterriza en el home
> sin sesión, sin que nada quede logueado.

Por eso `NEXT_PUBLIC_SITE_URL` se valida sin barra final en
`lib/env/public.ts`: `https://sitio.com/` + `/auth/callback` da una URL con
doble barra que no matchea ninguna entrada.

### SMTP en prod: Resend

El SMTP default de Supabase **no sirve para producción**: tiene un límite bajo
de mails por hora y solo entrega a direcciones de miembros del proyecto. Un
usuario real que se registra nunca recibe el mail.

Las credenciales de Resend se cargan como variables de entorno del proyecto de
Supabase, desde el dashboard. **Nunca en el repo**, ni siquiera en un archivo
gitignoreado: no hay ningún flujo del proyecto que las necesite en local.

## Decisiones

### `signUp` con un email ya registrado responde igual que con uno nuevo

Un formulario de alta que contesta "ese email ya está registrado" es un oráculo
de existencia de cuentas: sirve para averiguar quién tiene cuenta.

La action se traga el error y devuelve el mismo `{ ok: true, redirectTo }` que
un alta nueva, con el rol que vino del formulario. Como no hay sesión, el proxy
lo manda a `/login` igual. Desde afuera los dos caminos son indistinguibles.

Hay dos formas en que Supabase reporta el caso, y las dos quedan cubiertas:

| | Qué devuelve `auth.signUp` |
|---|---|
| `enable_confirmations = false` (local, dev) | error `user_already_exists` → se traga |
| `enable_confirmations = true` (prod) | sin error, `user.identities` vacío → ya era `ok: true` |

Lo mismo aplica a `signIn`, que devuelve `auth.errors.invalidCredentials` tanto
si la password está mal como si el email no existe, y a
`requestPasswordReset`, que devuelve `{ ok: true }` siempre.

Nada de esto sirve si los tiempos de respuesta delatan el camino, así que
`signUp`, `signIn` y `requestPasswordReset` tienen un piso de 700 ms
(`withMinimumDuration`).

> **Ese piso no tiene ningún test que lo cuide.** La suite corre con timers
> falsos, así que pasa en verde igual si el piso desaparece. Si alguien borra
> `withMinimumDuration`, nada lo marca.

El piso tampoco cubre el camino de input inválido: la validación de Zod corta
antes, así que un input mal formado responde más rápido. No filtra existencia
de cuentas, pero es observable.

### El rol no se puede editar después del registro

Es el supuesto 3 de las decisiones del Sprint 1: el rol se elige en el alta y
quien necesite los dos se crea dos cuentas.

Hacer cumplir eso **no** es cuestión de la política de RLS. La política de
`update` de `profiles` controla qué *fila* toca cada usuario (`auth.uid() =
id`), pero no dice nada sobre qué *columnas*. Con un `grant update` sobre la
tabla entera, cualquier jugador podía ascenderse solo:

```
PATCH /rest/v1/profiles?id=eq.<su-id>   {"role":"delegate"}
```

Sin Server Action de por medio, con la clave publishable, desde el navegador.

Por eso el grant va **por columna**:

```sql
grant update (full_name, avatar_path) on table public.profiles to authenticated;
```

`role` y `email` quedan fuera y PostgREST devuelve `42501` si alguien los manda
en el body. Si algún día hace falta un flujo de cambio de rol, la salida no es
ampliar este grant: es una función `security definer` que valide la transición.

Esto importa más allá de `profiles`. T04a.1 decide si alguien puede crear su
fila de `players` mirando `profiles.role`; con el rol editable, ese chequeo no
protegía nada.

### Los errores son claves de i18n, no texto

Las actions devuelven `auth.errors.invalidCredentials`, no "Email o password
incorrectos". El texto lo resuelve la UI (T03b). Un mensaje de Supabase
reenviado tal cual al usuario filtra detalles del backend y no se puede
traducir.

## Deuda técnica conocida

**`profiles.email` duplica `auth.users.email`.** Hoy se llena una sola vez,
desde el trigger `handle_new_user`, y nada lo vuelve a tocar. El día que exista
un flujo de cambio de email, `auth.users.email` se actualiza y
`profiles.email` queda viejo, en silencio.

Cuando llegue ese momento, las opciones son un trigger sobre
`auth.users` para el `update`, o borrar la columna y leer el mail de la sesión.
Se dejó duplicado para poder listar perfiles sin tocar el schema `auth`, que no
está expuesto por la API.

**`handle_new_user` depende del metadata del alta.** `full_name` y `role` salen
de `raw_user_meta_data`, y las dos columnas son `not null`. Un alta que no pase
esos campos falla con un error de constraint. Hoy el único camino de alta es
`signUp`, que los valida con Zod antes, pero un usuario creado a mano desde el
dashboard de Supabase va a fallar.

## Pendiente

Las rutas `/auth/callback` y `/auth/actualizar-password` todavía no existen:
las crea T03b. Hasta entonces los links de los mails caen en un 404. Los
redirects ya apuntan ahí a propósito, para no tener que tocar la config después.
