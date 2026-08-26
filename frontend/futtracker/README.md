# futtracker — app web

App Next.js (App Router) del proyecto. Es el Root Directory del proyecto de
Vercel: todos los comandos corren desde acá.

**El setup completo está en el [README de la raíz](../../README.md)** —
ambientes, variables de entorno, base de datos y flujo de promoción. Esta
página es solo la referencia rápida.

## Correr en local

```bash
npm install
cp .env.example .env.local   # completar antes de seguir
npm run dev
```

El paso del `.env.local` **no es opcional**. `next.config.ts` valida las
variables al arrancar, así que con el archivo vacío `npm run dev` corta con un
mensaje que dice qué falta. Es a propósito: es preferible a levantar la app
apuntando a `undefined` y descubrirlo en la primera request.

Los valores para trabajar contra el stack local salen de `supabase status`
(hay que tener Docker corriendo y haber hecho `supabase start` desde la raíz
del repo).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en localhost:3000 |
| `npm run build` | Build de producción |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest, una corrida |
| `npm run test:watch` | Vitest en watch |
| `npm run db:types` | Regenera `lib/supabase/database.types.ts` contra la base local |

Los primeros cuatro son los que gatea el CI antes de desplegar.

## Dónde va cada cosa

```
app/                      rutas y páginas (App Router)
app/(auth)/actions.ts     Server Actions de auth (alta, login, reset)
lib/auth/schemas.ts       schemas de Zod y redirects por rol
lib/env/public.ts         variables públicas, validadas con Zod
lib/env/server.ts         variables privadas, marcado con `server-only`
lib/supabase/client.ts    cliente para Client Components
lib/supabase/server.ts    cliente para Server Components y Server Actions
lib/supabase/proxy.ts     refresh de sesión que consume proxy.ts
proxy.ts                  se llama así, no middleware.ts (ver AGENTS.md)
```

La configuración de auth por ambiente y las decisiones detrás de las actions
están en [docs/auth.md](../../docs/auth.md).

Los tres clientes de `lib/supabase/` son el **único** lugar donde se llama a
`createBrowserClient` o `createServerClient`. Instanciarlos sueltos termina en
sesiones que no se refrescan.
