# Deploy a Vercel vía CI con token personal

> Guía genérica y portable. Sirve para cualquier repo, con cualquier framework.
> Copiá este archivo al repo que quieras y adaptá las dos o tres cosas marcadas
> con **[ADAPTAR]**.

---

## 1. El problema que resuelve

La integración Git nativa de Vercel funciona instalando una **GitHub App a nivel
de organización**. Eso trae fricciones que no siempre podés (o querés) pagar:

- **Permisos**: instalar la App requiere admin de la org. En una empresa o una
  cátedra, eso es un ticket y una semana de espera.
- **Facturación**: un repo de org conectado a un Vercel Team factura por seat.
  Para un side project, un TP o un ambiente de staging es plata tirada.
- **Superficie de acceso**: la App pide permisos de lectura sobre repos. Si el
  repo tiene código que no querés compartir con un tercero, es un no.
- **Control del build**: el build corre en la infra de Vercel, con su versión de
  Node, su cache y sus límites. No podés meterle pasos previos (tests, lint
  estricto, generación de código, descarga de assets privados).

El workaround invierte la relación: **Vercel deja de ser tu CI y pasa a ser solo
hosting**. El CI es GitHub Actions, que compila y empuja el artefacto ya hecho.

---

## 2. Cómo funciona

```
git push
   │
   ▼
GitHub Actions runner
   │
   ├─ vercel pull    ← baja config + env vars del proyecto
   ├─ vercel build   ← COMPILA ACÁ (tu Node, tu cache, tus pasos previos)
   │                    genera .vercel/output/
   └─ vercel deploy --prebuilt
          │  (autenticado con token personal)
          ▼
      Vercel Edge Network
```

La pieza central es `--prebuilt`. Le dice a Vercel: "no compiles nada, tomá este
directorio `.vercel/output/` y publicalo". Vercel nunca ve el repo, nunca clona,
nunca instala una App en tu organización. Solo recibe un artefacto y un token
válido.

`.vercel/output/` es el [Build Output API](https://vercel.com/docs/build-output-api),
un formato estándar: estáticos, functions, rutas y config. Cualquier framework
que Vercel soporte lo genera igual, y por eso este pipeline es agnóstico.

### Qué se pierde

Sé honesto sobre el trade-off antes de adoptarlo:

| Perdés | Impacto real |
|---|---|
| Comentarios automáticos de preview en PRs | Se recupera con un step del workflow (incluido abajo) |
| Checks de Vercel en el PR | Los reemplaza el check de Actions |
| Rollback desde el dashboard | Sigue funcionando; Vercel guarda cada deployment |
| Deploy automático al mergear desde la web de GitHub | Sigue funcionando; el push dispara Actions igual |

En la práctica no perdés casi nada. Ganás control del build.

---

## 3. Setup (una sola vez)

### 3.1. Crear y linkear el proyecto

Desde tu cuenta **personal** de Vercel (Hobby, gratis), sin conectar Git:

```bash
npm i -g vercel
vercel login
cd tu-repo
vercel link      # elegí tu cuenta personal, no un Team
```

Esto genera `.vercel/project.json`:

```jsonc
{
  "projectId": "prj_xxxxxxxxxxxxxxxx",
  "orgId": "team_xxxxxxxxxxxxxxxx"   // sí, dice "team" aunque sea personal
}
```

Agregá `.vercel` al `.gitignore`. **Nunca** lo commitees: no es secreto crítico,
pero es ruido y confunde a quien clona.

### 3.2. Generar el token

https://vercel.com/account/settings/tokens → **Create Token**

- **Scope**: la misma cuenta del `orgId` de arriba. Si no coinciden, el deploy
  falla con `Project not found` y vas a perder media hora buscando dónde.
- **Expiración**: la más corta que te sirva. Un token sin vencimiento es una
  credencial que vas a olvidar rotar y que sobrevive a que te vayas del equipo.

### 3.3. Cargar los secrets en GitHub

```bash
gh secret set VERCEL_TOKEN        # el token del paso anterior
gh secret set VERCEL_ORG_ID       # orgId de .vercel/project.json
gh secret set VERCEL_PROJECT_ID   # projectId de .vercel/project.json
```

O por UI: Repo → Settings → Secrets and variables → Actions.

> `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` no son secretos en sentido estricto (son
> identificadores, no credenciales), pero cargarlos como secrets mantiene todo
> en un solo lugar y evita hardcodear IDs en el YAML.

---

## 4. El workflow

`.github/workflows/vercel.yml`:

```yaml
name: Vercel

on:
  push:
    branches: [main]          # [ADAPTAR] agregá dev/staging si las usás
  pull_request:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: vercel-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    name: Build & Deploy (Vercel CLI)
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"    # [ADAPTAR] la versión de tu proyecto
          cache: npm            # [ADAPTAR] npm | yarn | pnpm

      - name: Resolve deployment target
        id: target
        run: |
          if [ "${{ github.event_name }}" = "push" ] && [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "environment=production" >> "$GITHUB_OUTPUT"
            echo "flag=--prod" >> "$GITHUB_OUTPUT"
          else
            echo "environment=preview" >> "$GITHUB_OUTPUT"
            echo "flag=" >> "$GITHUB_OUTPUT"
          fi

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Pull Vercel project settings
        run: |
          vercel pull --yes \
            --environment=${{ steps.target.outputs.environment }} \
            --token="${{ secrets.VERCEL_TOKEN }}"

      - name: Build project artifacts
        run: vercel build ${{ steps.target.outputs.flag }} --token="${{ secrets.VERCEL_TOKEN }}"

      - name: Deploy prebuilt artifacts
        id: deploy
        run: |
          URL=$(vercel deploy --prebuilt ${{ steps.target.outputs.flag }} \
            --token="${{ secrets.VERCEL_TOKEN }}")
          echo "url=$URL" >> "$GITHUB_OUTPUT"
          echo "### Vercel: [$URL]($URL)" >> "$GITHUB_STEP_SUMMARY"

      - name: Comment preview URL on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview: ${{ steps.deploy.outputs.url }}`,
            });
```

### Las decisiones que importan en ese YAML

**El orden `pull` → `build` → `deploy` no es negociable.** `vercel pull` baja las
variables de entorno del proyecto al runner. Si compilás antes, las variables no
entran al bundle y te vas a comer un deploy silenciosamente roto: build verde,
app apuntando a `undefined`.

**`--environment` en el pull y `--prod` en build/deploy tienen que coincidir.**
Si pullás `preview` y buildeás `--prod`, publicás producción con las variables de
preview. Es el bug más caro de este setup porque nada falla: simplemente queda mal.

**`concurrency` con `cancel-in-progress`.** Dos pushes seguidos a la misma rama
disparan dos runs. Sin esto, el más lento puede terminar último y publicar el
build viejo encima del nuevo. Es una race condition, y las race conditions en
deploy se descubren en el peor momento.

**`permissions` explícito.** Por defecto el `GITHUB_TOKEN` puede tener más
permisos de los necesarios. Declarar el mínimo (`contents: read`,
`pull-requests: write`) es higiene básica.

### Mapa de comportamiento

| Evento | Entorno Vercel | Resultado |
|---|---|---|
| push a `main` | production | Deploy a producción, dominio principal |
| push a otra rama configurada | preview | URL de preview persistente |
| pull request | preview | URL de preview + comentario en el PR |
| `workflow_dispatch` | preview | Deploy manual desde la UI de Actions |

---

## 5. `vercel.json`

Config del proyecto que viaja con el repo. Ejemplo base:

```jsonc
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",              // [ADAPTAR] ver tabla abajo
  "buildCommand": "npm run build",  // [ADAPTAR]
  "outputDirectory": "dist",        // [ADAPTAR]
  "installCommand": "npm ci",       // [ADAPTAR]
  "github": { "enabled": false }
}
```

**`"github": { "enabled": false }` es la línea defensiva del setup.** Si alguien
conecta el repo desde el dashboard de Vercel "para probar", vas a tener dos
fuentes de deploy compitiendo: Actions publicando el artefacto correcto y Vercel
publicando su propio build. Con esta línea, Vercel ignora los eventos de Git.
Una sola fuente de verdad.

### Por framework

| Framework | `framework` | `outputDirectory` | Notas |
|---|---|---|---|
| Vite (React/Vue/Svelte) | `vite` | `dist` | Requiere rewrites SPA (ver abajo) |
| Next.js | `nextjs` | *(omitir)* | Vercel lo maneja solo; no toques output |
| Astro | `astro` | `dist` | Con adapter `@astrojs/vercel` si usás SSR |
| SvelteKit | `sveltekit` | *(omitir)* | Necesita `adapter-vercel` |
| Nuxt | `nuxtjs` | *(omitir)* | Con preset `vercel` |
| Create React App | `create-react-app` | `build` | Requiere rewrites SPA |
| Estático puro | `null` | tu carpeta | Sin build step |

### SPA: el rewrite que todo el mundo olvida

Si tu app usa routing del lado del cliente (`BrowserRouter`, `vue-router` en
modo history, etc.), **necesitás** esto:

```jsonc
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
```

Sin eso, la home anda perfecto y cualquier ruta directa da 404. El motivo es
conceptual, no un bug: el servidor busca un archivo físico en `/dashboard` y no
existe — el único HTML que hay es `index.html`. El rewrite le dice "para
cualquier path, devolvé el index" y ahí recién el router del cliente lee la URL
y renderiza la vista.

Frameworks con SSR (Next, Nuxt, SvelteKit con adapter) **no** llevan este
rewrite: sus rutas sí existen en el server y el catch-all te rompería todo.

### Cache headers para assets con hash

Si tu bundler emite archivos con hash en el nombre (`app-a3f2b1.js`), esos
archivos son inmutables por definición: si cambia el contenido, cambia el nombre.
Cacheálos agresivamente:

```jsonc
"headers": [
  {
    "source": "/assets/(.*)",
    "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
    ]
  }
]
```

**Cuidado**: el `source` tiene que apuntar solo a la carpeta de assets hasheados.
Si le ponés un cache de un año al `index.html`, los usuarios quedan clavados en
la versión vieja hasta que limpien el browser.

---

## 6. Variables de entorno

Se cargan en el **dashboard de Vercel** (Project → Settings → Environment
Variables), no como secrets de GitHub. `vercel pull` las trae al runner.

### El concepto que hay que tener claro

Hay dos categorías, y confundirlas es un incidente de seguridad:

**Build-time / públicas**: se inlinean como texto en el bundle JavaScript que
descarga el navegador. Cualquiera abre DevTools y las lee. Llevan prefijo
obligatorio según el framework:

| Framework | Prefijo |
|---|---|
| Vite | `VITE_` |
| Next.js | `NEXT_PUBLIC_` |
| Astro | `PUBLIC_` |
| SvelteKit | `PUBLIC_` |
| Nuxt | `NUXT_PUBLIC_` |
| Create React App | `REACT_APP_` |

Ese prefijo **no es una convención de estilo, es un mecanismo de seguridad**: el
bundler solo expone al cliente lo que está explícitamente marcado como público.
Todo lo demás queda afuera del bundle a propósito.

**Runtime / privadas**: solo existen en el server (API routes, Server
Components, edge functions). Van sin prefijo y nunca llegan al browser. Si tu
proyecto es 100% estático (una SPA de Vite sin backend), **no tenés variables
privadas**. Todo lo que metas termina público. Una API key en una SPA es una API
key filtrada, sin importar cómo la cargues.

### Errores frecuentes

- **Hardcodear la URL del backend.** `const API = "http://localhost:8080"`
  deployado apunta al localhost *del usuario*, no a tu server. Y si el sitio
  va por HTTPS, el browser bloquea el request a `http://` por mixed content.
  Siempre: `import.meta.env.VITE_API_URL ?? "http://localhost:8080"`.
- **Cambiar una variable y no redeployar.** Como se inlinean en build time,
  editarlas en el dashboard no afecta al deploy ya publicado. Hay que rebuildear.
- **Definir la variable solo en Production.** Los previews van a quedar sin
  valor. Marcá los tres entornos (Production / Preview / Development) salvo que
  quieras valores distintos a propósito.

---

## 7. Monorepos

Si el proyecto no está en la raíz del repo, hay dos ajustes.

En el dashboard de Vercel: Settings → General → **Root Directory** → `apps/web`.

En el workflow, si necesitás correr comandos desde la raíz (instalar el
workspace completo, por ejemplo):

```yaml
      - name: Install workspace deps
        run: npm ci            # desde la raíz

      - name: Pull / Build / Deploy
        working-directory: apps/web
        run: |
          vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
          vercel build --prod --token="$VERCEL_TOKEN"
          vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"
```

Un proyecto de Vercel por app deployable. Cada uno con su `VERCEL_PROJECT_ID`.
Si tenés varias apps, usá un `matrix` en el job y secrets por app.

Bonus: agregá un filtro `paths:` en el trigger para no redeployar la web cuando
alguien toca solo el backend.

```yaml
on:
  push:
    branches: [main]
    paths: ["apps/web/**", "packages/ui/**"]
```

---

## 8. Seguridad y operación del token

El token personal es la credencial que sostiene todo el setup. Tratalo como tal:

- **Rotación**: ponele expiración y agendá el recambio. Un token de 1 año que
  nadie recuerda es deuda de seguridad.
- **Alcance del blast radius**: un token personal puede deployar *cualquier*
  proyecto de esa cuenta. Si te preocupa, creá una cuenta de Vercel dedicada a
  CI y usá esa. Es la versión "service account" del workaround.
- **Offboarding**: si el token es de una persona y esa persona se va, los
  deploys mueren. Documentá quién lo generó y dónde se rota. Este es el costo
  real de evitar la integración de org — no lo descubras el día que pasa.
- **Nunca en logs**: pasalo siempre por `secrets.*`. GitHub enmascara los
  secrets en el output, pero si lo echás a un archivo o lo pasás a un script que
  hace `set -x`, se filtra igual.

---

## 9. Deploy manual desde tu máquina

```bash
vercel build --prod
vercel deploy --prebuilt --prod
```

Son exactamente los dos comandos que corre el runner. Si falla local, falla en
CI — y debuggear local es diez veces más rápido que a fuerza de pushes.

---

## 10. Troubleshooting

| Síntoma | Causa | Fix |
|---|---|---|
| `No existing credentials found` | falta `VERCEL_TOKEN` o el nombre del secret está mal escrito | revisar Settings → Secrets |
| `Project not found` | el token es de un scope distinto al del `VERCEL_ORG_ID` | los tres valores tienen que ser de la misma cuenta |
| 404 al recargar en una ruta interna | falta el rewrite SPA | agregar `rewrites` en `vercel.json` |
| La app deployada usa valores viejos | env var cambiada sin rebuild | redeployar (las build-time se inlinean) |
| Variables `undefined` en el bundle | falta el prefijo público, o `build` corrió antes de `pull` | revisar prefijo y orden de steps |
| Producción con datos de staging | `--environment` del pull no coincide con `--prod` | alinear pull y build/deploy |
| Se publicó un build viejo | dos runs concurrentes | verificar el bloque `concurrency` |
| Build OK local, falla en CI | versión de Node distinta, o un lint/test que local no corriste | fijar `node-version`, correr el build completo local |

---

## 11. Cuándo NO usar este workaround

No es la solución universal. Usá la integración nativa si:

- Ya tenés un Vercel Team pago y permisos de admin en la org. La nativa es menos
  piezas móviles y menos cosas que se rompen.
- Tu equipo depende fuerte de los checks y comentarios nativos de Vercel en PRs.
- Nadie en el equipo quiere ser dueño de un token personal ni de su rotación.

El workaround es la respuesta correcta cuando el bloqueo es organizacional o de
costo, no cuando es simple preferencia. Elegí la complejidad a conciencia:
cada pieza que agregás al pipeline es una pieza que alguien va a tener que
entender a las 2 AM.
