# Deploy a Vercel — cómo quedó armado en FutTracker

Este repo deploya a Vercel por **GitHub Actions**, no por la integración nativa de Vercel con GitHub
(no tenemos admin en la org para instalar la GitHub App). Actions compila y empuja el artefacto ya
hecho; Vercel es solo hosting.

La guía genérica del approach está en [`vercel-ci-deploy.md`](./vercel-ci-deploy.md). Este documento
es lo específico de **nuestro** repo: qué decidimos, qué nos costó tiempo, y qué mirar la próxima vez.

---

## Cómo funciona hoy

| Evento | Entorno | Resultado |
|---|---|---|
| push a `dev` | preview | URL de preview |
| push a `main` | **production** | Deploy a producción |
| pull request | preview | URL de preview + comentario en el PR |
| `workflow_dispatch` | preview | Deploy manual desde la UI de Actions |

El workflow tiene dos jobs: **`verify`** (typecheck → lint → tests) y **`deploy`**, que declara
`needs: verify`. Si `verify` falla, `deploy` ni arranca y producción se queda en la última versión
buena. Ese gate lo enforcea Actions, no depende de branch protection ni de permisos de admin.

Archivos involucrados:

| Archivo | Rol |
|---|---|
| `.github/workflows/vercel.yml` | El pipeline completo |
| `frontend/futtracker/vercel.json` | `framework: nextjs` + `github.enabled: false` |
| `frontend/futtracker/package.json` | Script `typecheck` |
| `frontend/futtracker/eslint.config.mjs` | Ignora `.vercel/**` |

---

## Decisiones específicas de este repo

Cada una está acá porque **no es obvia** y porque cambiarla rompe algo.

| Decisión | Por qué |
|---|---|
| **Root Directory en Vercel queda en `.`** | La app vive en `frontend/futtracker/`, y el workflow ya corre todo con `working-directory`. Si además lo configurás en el dashboard, `vercel build` busca `frontend/futtracker/frontend/futtracker` y falla. Es uno **o** el otro, nunca los dos. |
| `cache-dependency-path` en `setup-node` | El `package-lock.json` no está en la raíz. Sin esto, `setup-node` no encuentra el lockfile y el cache no resuelve. |
| `typecheck` = `next typegen && tsc --noEmit` | Ver "Tropiezos" #3. |
| ESLint ignora `.vercel/**` | Ver "Tropiezos" #4. |
| Token con scope **All Projects** | Ver "Tropiezos" #2. |
| `vercel.json` sin `outputDirectory` ni `rewrites` | En Next, Vercel maneja el output solo. Y el rewrite SPA (`/(.*)` → `/index.html`) es para Vite/CRA — en Next rompe el routing. |

---

## Tropiezos: lo que nos hizo perder tiempo

### 1. El mensaje de error te manda a un lugar equivocado

```
Error: Could not retrieve Project Settings.
To link your Project, remove the `.vercel` directory and deploy again.
```

**Ese consejo es para tu máquina, no para CI.** En el runner no existe ningún `.vercel` — se hace
checkout limpio y está gitignoreado. Perseguirlo es media hora tirada.

Lo que significa de verdad: la CLI pidió el proyecto a la API y recibió un **403**. O sea, las
credenciales no alcanzan para resolver *ese* proyecto. Se confirma en el código de la CLI: el mensaje
sale de la rama `err.status === 403` con código `forbidden` / `team_unauthorized`, y **no** de la
rama de token inválido — que tiene su propio error distinto.

> **Regla:** si falla en `vercel pull`, es la terna `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` +
> `VERCEL_TOKEN`. No es el build, no es el Root Directory, no es un `.vercel` viejo.

### 2. Los tres secrets se validan como terna, y no se pueden inspeccionar

El `PROJECT_ID` se resuelve **dentro del scope del `ORG_ID`**, y los dos tienen que caer dentro del
scope del token. Los tres pueden estar "bien" por separado y fallar igual.

Y el detalle que define cómo debuggear esto: **GitHub no te deja ver el valor de un secret una vez
guardado.** No podés verificar a ojo si quedó con un espacio al final o un salto de línea.

Perdimos tiempo probando tres scopes de token distintos (proyecto → All Projects → Full Account),
convencidos de que era un problema de permisos. **Lo que lo arregló fue borrar los tres secrets y
recrearlos.** Terminó funcionando con scope **All Projects**, que era uno de los que "había fallado"
antes.

Nunca supimos cuál de los tres estaba mal pegado. No importa.

> **Regla:** ante un 403 en `vercel pull`, **recreá los tres secrets antes de investigar nada más.**
> Son dos minutos, y es la única forma de descartar un valor mal pegado. Investigar scopes y
> permisos antes de eso es debuggear a ciegas.

Al pegarlos: sin comillas, sin espacios, sin salto de línea. Los IDs salen de:

```bash
cat frontend/futtracker/.vercel/project.json
```

### 3. `tsc --noEmit` solo falla en CI, nunca en tu máquina

```
app/layout.tsx: error TS2304: Cannot find name 'LayoutProps'.
```

`LayoutProps`, `PageProps` y `RouteContext` son **helpers globales generados** por Next 16, igual que
`next-env.d.ts`. Los tres están gitignoreados. En local existen porque alguna vez corriste
`next dev`; en CI, con checkout limpio, no.

Por eso el script es `next typegen && tsc --noEmit`, no `tsc --noEmit` a secas.

> **Regla:** cualquier check nuevo probalo con `rm -rf .next next-env.d.ts` antes. Si depende de algo
> generado, lo ves ahí y no en el primer PR.

### 4. `npm run lint` se rompe después de un `vercel build` local

`vercel build` genera `.vercel/output/` con bundles minificados, y el script `lint` es `eslint`
pelado, sin path: lintea todo el directorio. Resultado: ~1900 errores en código que no escribiste.

En CI no pasa, porque `verify` corre en un job aparte con checkout limpio, antes de que exista
`.vercel/output`. Es un papercut puramente local — por eso `.vercel/**` está en los ignores.

### 5. El token OIDC de `.env.local` no es el token de deploy

`vercel link` crea un `.env.local` con un `VERCEL_OIDC_TOKEN`. **No sirve para el CI.** Es de vida
corta (horas), se renueva solo, y es para que tu app en local acceda a servicios externos. El de
deploy es un personal access token, se crea aparte y va en el secret `VERCEL_TOKEN`.

---

## Cuando toque producción (`main`)

**El pipeline ya está armado.** Un push a `main` resuelve `environment=production` y agrega `--prod`
al build y al deploy solo. No hay que tocar el workflow ni crear otro proyecto de Vercel.

Lo que sí hay que hacer antes del primer deploy a producción:

- [ ] **Cargar las env vars de Production** en el dashboard de Vercel. `vercel pull` baja las del
      entorno que le pidas; si están solo en Preview, producción sale sin valores.
- [ ] **Marcar los tres entornos** (Production / Preview / Development) salvo que quieras valores
      distintos a propósito.
- [ ] **La `service_role` key de Supabase nunca lleva prefijo `NEXT_PUBLIC_`.** Con ese prefijo
      termina en el bundle del browser y saltea RLS de todos los usuarios.
- [ ] **Ordenar la migración de Supabase.** Vercel publica código y Supabase aplica migraciones por
      caminos separados, sin orden garantizado. La migración tiene que ser compatible hacia atrás con
      el código ya publicado, o el deploy se escalona. Nada destructivo (drop/rename de columna,
      constraint más estricto) en un solo release.
- [ ] **Escribir el rollback antes de deployar.** "Restaurar de backup" es un plan de incidente, no
      un rollback.

> Ojo con los previews: un preview apunta a la Supabase de **producción** salvo que configures
> database branching. Con las migraciones vacías da igual; en cuanto haya datos reales, resolverlo.

---

## Checklist para repetir el setup en otro repo

- [ ] `vercel link` **desde el directorio de la app**, no desde la raíz del repo
- [ ] Elegir la cuenta personal, no un Team
- [ ] Root Directory en `.` (no tocar si el workflow usa `working-directory`)
- [ ] Token con scope **All Projects**, expiración corta, anotar la fecha
- [ ] Cargar los 3 secrets sin comillas ni espacios
- [ ] Probar local antes de pushear: `vercel build --prod`
- [ ] Confirmar que `.vercel/` y `.env*` están gitignoreados

---

## Pendientes conocidos

| Tema | Estado |
|---|---|
| **Node 24 vs 22** | El proyecto en Vercel corre `nodeVersion: 24.x`; el workflow buildea con `22`. Con `--prebuilt`, las functions se compilan en 22 y se ejecutan en 24. Hoy no rompe, pero conviene alinear. |
| **Tests reales** | El step de tests usa `npm run test --if-present`: hoy pasa porque no hay tests, no porque haya cobertura. El gate real es typecheck + lint + que compile. |
| **Token de cuenta personal** | El pipeline depende del token personal de un dev. Si rota o se va, los deploys mueren. La versión sana es una cuenta de Vercel dedicada a CI ("service account"). Registrado como riesgo, no como estado permanente. |
| **Telemetría de la CLI** | Se puede silenciar con `VERCEL_TELEMETRY_DISABLED: "1"` en el bloque `env`. Cosmético. |
