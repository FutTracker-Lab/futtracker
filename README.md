# FutTracker

Aplicación de seguimiento de jugadores y equipos de fútbol amateur.
Next.js (App Router) + TypeScript + Supabase, hosteada en Vercel.

## Estructura

```
frontend/futtracker/    la app Next.js (es el root del proyecto de Vercel)
supabase/               config, migraciones y edge functions
docs/                   notas de deploy y de auth
.github/workflows/      CI y CD
```

Esta estructura está acordada y no se modifica. Los tickets que describan
rutas tipo `apps/web/...` se adaptan a este layout.

## Puesta en marcha

```bash
cd frontend/futtracker
npm install
cp .env.example .env.local   # completar con los valores del dashboard
npm run dev
```
`

### Base de datos

Requiere Docker corriendo.

```bash
supabase start                 # levanta el stack local
supabase migration up          # aplica las migraciones
supabase db diff               # tiene que salir sin drift
```

Para regenerar los tipos de la base, con el stack local levantado:

```bash
cd frontend/futtracker && npm run db:types
```

Toda tabla nueva sale con `alter table ... enable row level security` en la
misma migración que la crea, y su política de `select` exige sesión iniciada.

> **`supabase db diff --linked` nunca va a salir limpio, y está bien.**
> El stack local y los proyectos de la nube no arrancan idénticos: la nube
> agrega un event trigger `ensure_rls` que habilita RLS sola en cada tabla
> nueva de `public`, tiene privilegios por defecto más estrictos y no trae
> `pg_net`; el local sí lo trae. Nada de eso lo generamos nosotros.
>
> No conviertas ese diff en una migración: te llevarías al repo objetos que
> administra la plataforma.
>
> El chequeo de drift que vale es `supabase db diff` a secas, contra la shadow
> local. Ese sí tiene que salir sin cambios.
>
> Consecuencia práctica: **no te apoyes en el trigger de la nube.** Una tabla a
> la que se le olvide el `enable row level security` queda protegida en dev
> pero abierta en local, así que RLS se declara siempre en la migración.

### Auth

Email + password contra Supabase Auth. En local no hace falta confirmar el mail
y los mails quedan en Mailpit (http://127.0.0.1:54324).

**En dev y prod hay configuración que se carga a mano en el dashboard** —
allowlist de redirect URLs, confirmación de email y SMTP. Está toda en
**[docs/auth.md](docs/auth.md)**, junto con las decisiones de diseño (por qué
un email ya registrado responde igual que uno nuevo) y la deuda conocida.

### Linkear el CLI

Hace falta solo para operar contra los proyectos de la nube (`db push`,
`gen types --project-id`). Para trabajar en local no se necesita.

```bash
supabase login
supabase link --project-ref <ref-de-futtracker-dev>
```

El ref sale de la URL del dashboard: `.../dashboard/project/<ref>`.

Se linkea **a `futtracker-dev`, nunca a `futtracker-prod`**: así un `db push`
sin `--project-ref` va a dev y no a producción por descuido.

El link se guarda en `supabase/.temp/`, que está gitignoreado. No se comparte:
cada integrante lo corre una vez en su máquina.

### Flujo de promoción

Las migraciones se aplican **primero en `dev`**, se verifican contra el deploy
de `dev`, y recién después se promueven a `prod`:

```bash
supabase db push --project-ref <ref-de-dev>
# verificar contra el deploy de dev
supabase db push --project-ref <ref-de-prod>
```

Vercel despliega código y Supabase aplica migraciones por caminos separados,
sin garantía de orden entre ellos: código nuevo contra schema viejo falla en
runtime. Por eso la migración va siempre antes que el deploy.

## Verificación

```bash
cd frontend/futtracker
npm run typecheck
npm run lint
npm run test
```

El CI (`.github/workflows/vercel.yml`) corre esos tres pasos como gate antes
de desplegar, y publica con `vercel deploy --prebuilt`.

### Tests de RLS

Aparte, y a mano antes de abrir un PR que toque políticas:

```bash
supabase start
cd frontend/futtracker && npm run test:rls
```

Ejercitan las políticas contra el stack local, con sesiones reales y a través
de PostgREST — el único camino que también pasa por los `grant`, que es donde
una política correcta igual puede fallar. Van fuera de `npm run test` porque
necesitan Docker, que el CI todavía no levanta. **Mientras eso siga así, correr
este comando es responsabilidad de quien abre el PR.**

Solo corren si `NEXT_PUBLIC_SUPABASE_URL` apunta a localhost: dan de alta
usuarios, y contra un proyecto de la nube ensuciarían `dev` o `prod`.

