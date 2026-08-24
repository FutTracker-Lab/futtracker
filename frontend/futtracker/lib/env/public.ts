import { z } from "zod";

/**
 * Variables de entorno públicas: llegan al bundle del browser.
 *
 * Este módulo se puede importar desde cualquier lado, cliente incluido. Lo que
 * es secreto vive en `lib/env/server.ts`, que está marcado con `server-only`.
 *
 * Las referencias a `process.env.X` tienen que ser literales: Next las
 * reemplaza por su valor en tiempo de build, y un acceso dinámico
 * (`process.env[nombre]`) queda como `undefined` en el browser.
 */

/**
 * Lo que devuelve `vercel pull` cuando la variable está marcada como Sensitive
 * en el dashboard. No es un valor: es el string literal, tal cual.
 */
const PLACEHOLDER_SENSITIVE = "[SENSITIVE]";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(
    "NEXT_PUBLIC_SUPABASE_URL tiene que ser una URL válida: https://<project-ref>.supabase.co en la nube, o http://127.0.0.1:54321 en local",
  ),
  // El prefijo no es decorativo: `.min(1)` aceptaba cualquier string no vacío,
  // incluido un valor truncado o mal copiado, y el build salía verde con una
  // clave que rebota en cada request. Las claves legacy (`anon`, un JWT que
  // arranca con `eyJ`) quedan rechazadas a propósito: el proyecto usa las
  // publishable nuevas.
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY es obligatoria")
    .startsWith(
      "sb_publishable_",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tiene que ser una clave publishable (arranca con sb_publishable_)",
    ),
});

const valores = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

// Se chequea antes del schema para poder dar el remedio exacto. Si cayera en
// la validación genérica, el mensaje diría "no es una URL válida" y mandaría a
// buscar el problema al lugar equivocado.
const marcadasSensitive = Object.entries(valores)
  .filter(([, valor]) => valor === PLACEHOLDER_SENSITIVE)
  .map(([nombre]) => nombre);

if (marcadasSensitive.length > 0) {
  throw new Error(
    `Estas variables llegaron con el literal "${PLACEHOLDER_SENSITIVE}":\n` +
      marcadasSensitive.map((nombre) => `  · ${nombre}`).join("\n") +
      "\n\nEstán marcadas como Sensitive en Vercel, y con el flujo --prebuilt " +
      "`vercel build` corre en el runner, no en la infraestructura de Vercel, " +
      "así que `vercel pull` no puede bajar su valor real.\n" +
      "Recreálas sin ese flag: vercel env add NOMBRE preview --value 'valor' --no-sensitive",
  );
}

const parsed = schema.safeParse(valores);

if (!parsed.success) {
  const detalle = parsed.error.issues
    .map((issue) => `  · ${issue.message}`)
    .join("\n");

  throw new Error(
    `Faltan variables de entorno públicas o están mal cargadas:\n${detalle}\n\n` +
      "Copiá .env.example a .env.local y completá los valores (Supabase → Project Settings → API).\n" +
      "En Vercel se cargan en el dashboard del proyecto, no como secrets de GitHub.",
  );
}

export const publicEnv = parsed.data;
