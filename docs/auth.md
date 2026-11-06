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
| Confirmación de email | apagada | **prendida** | **prendida** |
| Dónde se configura | `supabase/config.toml` | dashboard | dashboard |
| SMTP | Mailpit | **Gmail** (`futtracker.lab4@gmail.com`) | **Gmail** (`futtracker.lab4@gmail.com`) |
| Mails por hora (Rate Limits) | — | 30 | 30 |
| Site URL de Supabase | — | `https://futtracker-dev.vercel.app` | `https://futtracker.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | `http://127.0.0.1:3000` | URL del deploy de dev | URL del deploy de prod |

Estado verificado en el dashboard el 2026-11-06. Si cambiás algo de esta tabla
en un proyecto, actualizala acá en el mismo momento: hasta esa fecha decía que
prod usaba Resend y que dev no confirmaba, y ninguna de las dos cosas era
cierta.

`config.toml` **solo aplica al stack local.** Los proyectos de la nube se
configuran desde el dashboard; lo que está en este archivo no se les pushea.

### Redirect URLs

Van en Authentication → URL Configuration, en cada proyecto de Supabase.

- **Site URL**: el origen de ese ambiente, **nunca `localhost`** en la nube.
  Es el destino cuando una redirección no está en la allowlist, y el valor
  que usan las plantillas de mail. Los dos proyectos lo tuvieron en
  `http://localhost:3000` hasta el 2026-11-06.
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

### SMTP: Gmail

El SMTP default de Supabase **no sirve con la confirmación prendida**: manda 2
mails por hora para todo el proyecto y solo entrega a direcciones de miembros
del equipo de Supabase. Un usuario real que se registra nunca recibe el mail.

dev y prod mandan por el SMTP de Gmail, con la cuenta del proyecto
`futtracker.lab4@gmail.com`. Se configura en cada proyecto, en Authentication →
Emails → SMTP Settings → Enable custom SMTP:

| Campo | Valor |
|---|---|
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username y sender email | `futtracker.lab4@gmail.com` |
| Sender name | `FutTracker` |
| Password | una contraseña de aplicación de esa cuenta de Google |

- **La contraseña de aplicación** se genera en la cuenta de Google (pide la
  verificación en 2 pasos prendida) y se carga solo en el dashboard de
  Supabase. **Nunca en el repo**, ni siquiera en un archivo gitignoreado: no
  hay ningún flujo del proyecto que la necesite en local. Si se revoca en
  Google, los mails dejan de salir en los dos ambientes.
- **Gmail manda unos 500 mails por día**, compartidos entre dev y prod.
- **No es Resend** porque Resend solo manda a cualquier dirección después de
  verificar un dominio propio, con registros DNS. El proyecto usa los dominios
  de Vercel (`*.vercel.app`), que no se pueden verificar. Si algún día hay
  dominio propio, cambiar a Resend o similar es cambiar estos campos.
- **Las plantillas de mail** solo se pueden editar con un SMTP propio. Hoy son
  las de Supabase, en inglés.

### Límites de Auth: el 429

Supabase Auth corta con **429** al pasar alguno de los límites de
Authentication → Rate Limits. Los dos que importan:

| Límite | Valor hoy | `error_code` |
|---|---|---|
| Mails por hora, para **todo el proyecto** | 30 (2 con el SMTP default de Supabase) | `over_email_send_rate_limit` |
| Registros y logins cada 5 minutos, por IP | 30 | `over_request_rate_limit` |

Con la confirmación prendida, **cada alta manda un mail**, y ese cupo lo
comparten también la recuperación de contraseña y el cambio de email. Pasó en
dev y en prod el 2026-11-05: confirmación prendida, sin SMTP propio, y desde el
tercer registro de la hora todos daban 429. Con el SMTP de Gmail el límite se
subió a 30.

El formulario muestra "Hubo demasiados intentos. Esperá unos minutos y probá de
nuevo." (`auth.errors.tooManyRequests`) en el registro y en el login. La
recuperación de contraseña no lo muestra: responde `ok` siempre, para no
revelar qué emails existen. En local no se ve: el stack local no aplica estos
límites.

## Decisiones

### `signUp` con un email ya registrado responde igual que con uno nuevo

Un formulario de alta que contesta "ese email ya está registrado" es un oráculo
de existencia de cuentas: sirve para averiguar quién tiene cuenta.

Supabase reporta el caso distinto según la confirmación de email, y la action
responde a un email ya registrado lo mismo que a uno nuevo en cada modo:

| Confirmación | Alta nueva | Email ya registrado | La action devuelve |
|---|---|---|---|
| prendida (dev, prod) | sin error, sin sesión | sin error, sin sesión, `user.identities` vacío | `{ ok: true, checkEmail: true }` en los dos |
| apagada (local) | sin error, con sesión | error `user_already_exists` → se traga | `{ ok: true, redirectTo }` en los dos |

Con `checkEmail` el formulario no navega: muestra "Te mandamos un mail a … para
confirmar la cuenta". Antes navegaba al perfil, el proxy lo devolvía a `/login`
porque todavía no había sesión, y no se veía ningún aviso.

Con la confirmación apagada, el alta nueva entra con sesión y el email ya
registrado termina en `/login`: ahí los dos caminos sí se distinguen. Solo pasa
en local.

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

`role` queda fuera y PostgREST devuelve `42501` si alguien lo manda en el body.
Si algún día hace falta un flujo de cambio de rol, la salida no es ampliar este
grant: es una función `security definer` que valide la transición.

Esto importa más allá de `profiles`. T04a.1 decide si alguien puede crear su
fila de `players` mirando `profiles.role`; con el rol editable, ese chequeo no
protegía nada.

### `profiles` no guarda el email

El email vive solo en `auth.users`. La primera versión de la tabla lo copiaba
en `profiles`, para poder listar perfiles sin tocar el schema `auth`, que no
está expuesto por la API. Dos problemas con eso:

- La copia la escribía el trigger de alta y nada la volvía a tocar. El día que
  exista un flujo de cambio de email, `auth.users.email` se actualiza y la
  copia queda vieja, en silencio.
- El `grant select` es sobre la tabla entera y la política de lectura es
  `auth.role() = 'authenticated'`. O sea que cualquier usuario logueado podía
  leer el mail de todos los demás.

El propio usuario tiene el suyo en la sesión, que es el único caso que la app
necesita hoy. Si más adelante un delegado tiene que ver el contacto de sus
jugadores, eso es una exposición deliberada y se resuelve con una vista o una
función `security definer` que muestre solo a quien corresponda — no
devolviendo la columna a todo el mundo.

### Los errores son claves de i18n, no texto

Las actions devuelven `auth.errors.invalidCredentials`, no "Email o password
incorrectos". El texto lo resuelve la UI (T03b). Un mensaje de Supabase
reenviado tal cual al usuario filtra detalles del backend y no se puede
traducir.

## Deuda técnica conocida

**`handle_new_user` depende del metadata del alta.** `full_name` y `role` salen
de `raw_user_meta_data`, y las dos columnas son `not null`. Un alta que no pase
esos campos falla con un error de constraint. Hoy el único camino de alta es
`signUp`, que los valida con Zod antes, pero un usuario creado a mano desde el
dashboard de Supabase va a fallar.

## Las rutas de los mails

Las dos existen desde T03b:

- **`/auth/callback`** (`app/auth/callback/route.ts`): el destino del link de
  confirmación del alta. Canjea el `code` del flujo PKCE por una sesión y
  redirige. Si el código no sirve, al `/login`.
- **`/auth/actualizar-password`**: el destino del link de recuperación.

## Destinos después del login (FUT-136)

Dos parámetros de la URL deciden adónde va el usuario después de entrar: `next`
en `/auth/callback` y `redirectTo` en `/login` (lo arma `proxy.ts` al mandar al
login a quien no tiene sesión). Como vienen en la URL, cualquiera puede armar un
link con un destino propio, así que los dos pasan por **una sola regla**,
`safeRedirectPath` en `lib/auth/redirect.ts`:

- **Válido:** una ruta de la app, que empieza con una sola `/`
  (`/jugadores?radio=50`). Se usa tal cual, con su query.
- **Todo lo demás cae al inicio según el rol** (`homeForRole`: jugador a
  `/jugadores/mi-perfil`, delegado a `/equipos/mi-equipo`): URLs con esquema,
  `//otro-sitio`, barras invertidas, espacios o caracteres de control, lo mismo
  escondido con codificación, y rutas que el navegador resolvería fuera del
  sitio (`/..//otro-sitio`).

El callback, sin `next` (la confirmación del alta), también va al inicio por
rol. Si aparece otro lugar que redirige a un destino que viene de afuera, tiene
que usar `safeRedirectPath`.
