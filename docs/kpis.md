# Reporte diario de KPIs (LAB4)

FutTracker manda todos los días 10 KPIs a la plataforma central de la cátedra. Cada KPI cuenta el **día en que llega**, así que un día sin reporte baja la nota. Ticket: FUT-132 (T22). Contrato de la plataforma: [lab4-kpis.github.io/kpis](https://lab4-kpis.github.io/kpis/).

| pieza | dónde |
|---|---|
| script (`catalog` y `report`) | `frontend/futtracker/scripts/kpis/kpis.mts` |
| ejecución diaria y manual | `.github/workflows/kpi-report.yml` |
| tablas y funciones en nuestra base | `supabase/migrations/20261014190000_kpi_reporter.sql` |
| registro de 5xx de la API | `frontend/futtracker/lib/api/error-log.ts` |
| health de la app | `frontend/futtracker/app/api/health/route.ts` |

## Dos proyectos de Supabase, no se mezclan

| variables | proyecto | para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_*` | el nuestro (dev o prod) | lo que se **mide** |
| `KPI_*` | el de la cátedra | adonde se **envía** |

**La cátedra también tiene un proyecto por ambiente**, cada uno con su URL y su clave pública. Las dos son públicas (figuran en los portales):

| `env` | portal | `KPI_API_URL` |
|---|---|---|
| `dev` | [lab4-kpis.github.io/kpis/dev](https://lab4-kpis.github.io/kpis/dev/) | `https://gapkrqfdshqbowdtldzc.supabase.co` |
| `prod` | [lab4-kpis.github.io/kpis](https://lab4-kpis.github.io/kpis/) | `https://rzlalzowistpiphmdqpp.supabase.co` |

Cada clave de equipo (`KPI_PROJECT_KEY`) llega con la URL y la clave pública de su ambiente: van juntas. Una clave de prod contra la URL de dev rebota con 403.

El script se niega a correr si las dos URLs apuntan al mismo proyecto, o si se reporta a `prod` midiendo el stack local.

## Configuración en GitHub

Settings → Environments. Cada ambiente mide lo suyo y reporta a su `env`: los secretos de `dev` nunca llegan a `prod`.

| nombre | tipo | dónde | valor |
|---|---|---|---|
| `KPI_API_URL` | variable | `dev` y `prod` | la `SUPABASE_URL` que vino con la clave de ese ambiente (tabla de arriba) |
| `KPI_SUPABASE_PUBLISHABLE_KEY` | secreto | `dev` y `prod` | la `SUPABASE_PUBLISHABLE_KEY` que vino con la clave de ese ambiente |
| `KPI_PROJECT_KEY` | secreto | `dev` y `prod` | la `PROJECT_KEY` del equipo **para ese ambiente** (se muestra una sola vez al emitirla) |
| `KPI_REPORTER_EMAIL` | secreto | `dev` y `prod` | el mail de la cuenta del reporter de ese ambiente |
| `KPI_REPORTER_PASSWORD` | secreto | `dev` y `prod` | su contraseña |
| `SUPABASE_PUBLISHABLE_KEY` | variable | `dev` y `prod` | la publishable de **nuestro** proyecto (la misma que usa Vercel) |
| `KPI_APP_URL` | variable | `dev` y `prod` | la URL del deploy, sin barra final |
| `KPI_SCHEDULE_ENV` | variable | repo | `dev` hasta que exista la clave de prod; después se borra o se pone `prod` |

`SUPABASE_PROJECT_REF` ya existe en los dos ambientes (lo usa el deploy de migraciones) y de ahí sale la URL de nuestra base.

Si el deploy de un ambiente tiene activada la protección de Vercel (Deployment Protection), `/api/health` responde 401 y `api_alcanzable` da 0 en ese ambiente.

## La cuenta del reporter

El reporter **no usa `service_role`**. Es una cuenta común con una marca en `app_metadata`, que solo se escribe con privilegios de administrador. La marca le permite dos cosas y nada más: llamar a `kpi_daily_counts`, que devuelve solo conteos, e insertar en `kpi_report_runs`.

Una vez por ambiente (dev y prod):

1. **Registrar la cuenta desde la app**, como **delegado**, con un mail del equipo, y confirmar el mail.
2. **Crearle un equipo** desde la app, por ejemplo "FutTracker KPIs (interno)", con una zona o ciudad. `search_players` toma el origen del equipo de quien busca; sin equipo, las 5 búsquedas fallan.
3. **Marcarla** desde el SQL Editor del dashboard de Supabase:

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"kpi_reporter": true}'
   where email = '<mail de la cuenta>';
   ```

4. Cargar el mail y la contraseña como `KPI_REPORTER_EMAIL` y `KPI_REPORTER_PASSWORD` en el ambiente.

El token nuevo trae la marca recién en el próximo inicio de sesión, y el reporter inicia sesión en cada corrida.

## Puesta en marcha

1. **Catálogo de dev:** Actions → *Reporte diario de KPIs* → Run workflow, con `environment: dev` y `command: catalog`. Se puede correr las veces que haga falta: da de alta lo que falta y no duplica.
2. **Primer reporte a dev:** lo mismo con `command: report`. Tiene que terminar en verde con `Plataforma: 201`.
3. **Cuando llegue la clave de prod:** cargar los secretos de `prod`, correr `catalog` y `report` contra `prod`, y borrar `KPI_SCHEDULE_ENV`.

Desde la terminal:

```bash
gh workflow run kpi-report.yml -f environment=dev -f command=report && gh run watch
```

## En local

Con el stack local arriba (`supabase start`) y la app corriendo (`npm run dev`), desde `frontend/futtracker`. La cuenta del reporter local la crea el seed.

Crear un `.env.kpi` (gitignoreado por el `.env*` del `.gitignore`) con:

```
KPI_ENV=dev
KPI_API_URL=https://gapkrqfdshqbowdtldzc.supabase.co
KPI_SUPABASE_PUBLISHABLE_KEY=
KPI_PROJECT_KEY=
KPI_APP_URL=http://127.0.0.1:3000
KPI_REPORTER_EMAIL=kpi.reporter@example.com
KPI_REPORTER_PASSWORD=
```

La contraseña del reporter local es la de todas las cuentas del seed. Las claves de la plataforma son las de **dev**: desde local no se reporta a prod (el script lo impide).

```bash
node --env-file=.env.local --env-file=.env.kpi scripts/kpis/kpis.mts report
```

`KPI_DATE=YYYY-MM-DD` reporta otro día en vez de ayer. Sirve para reproducir un día puntual, y la plataforma ignora lo que ya tenía.

## Los 10 KPIs

`date` es el día anterior en Buenos Aires. Salud y latencias se miden en el momento de la corrida. Si un KPI no se puede medir, viaja con su valor de reemplazo y queda anotado en la columna `fallbacks` de la copia: nunca se omite.

| KPI | cálculo | reemplazo |
|---|---|---|
| `tasa_conexion_jugador_club` | cuentas de jugador que siguen al menos un club / cuentas de jugador × 100 | 0 |
| `perfiles_completos` | fichas de jugador (`players`) | 0 |
| `tasa_contactos_exitosos` | 0 hasta que exista "Mensajería directa" | 0 |
| `latencia_p95` | p95 de 20 lecturas del listado de equipos | 10000 |
| `latencia_busqueda` | p95 de las 5 búsquedas fijas (`SEARCHES` en el script) | 10000 |
| `errores_5xx` | registros de `api_error_log` del día | 0 |
| `busquedas_fallidas` | búsquedas fijas con error o más de 10 s | 5 |
| `api_alcanzable` | `/api/health` responde 200 en menos de 5 s | 0 |
| `db_alcanzable` | una consulta trivial responde | 0 |
| `auth_alcanzable` | `/auth/v1/health` responde 200 | 0 |

`tasa_conexion_jugador_club` vale 0 hasta que se mergee "Seguir equipos" (T13a): la función lo cuenta apenas exista la tabla, sin otra migración.

## Registrar los 5xx de una ruta nueva

Cada Route Handler exporta su método envuelto:

```ts
export const GET = withErrorLog("/api/lo-que-sea", async (request) => { ... });
```

La base solo acepta las rutas de su lista. Una ruta nueva se agrega en la misma PR en dos lugares: en `ApiRoute` (`lib/api/error-log.ts`) y en `log_api_error`, con una migración nueva. Se registra el patrón (`/api/equipos/[id]`), nunca el path real.

## Fallas

- El workflow termina en rojo si la plataforma no aceptó el lote o si no se pudo guardar la copia. Cada error dice qué pasó: 401, la clave es de otro ambiente; 403, inválida o revocada; 409, falta correr `catalog`.
- Ante falla de red o 5xx de la plataforma reintenta 3 veces (1, 2 y 4 s). Los 4xx no se reintentan.
- Reejecutar el mismo día no duplica nada: la plataforma ignora los duplicados y responde 201.
