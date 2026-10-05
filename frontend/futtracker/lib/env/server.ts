import "server-only";

import { z } from "zod";

/**
 * Variables de entorno privadas.
 *
 * El import de `server-only` es la red de contención: si algún día un módulo
 * con `"use client"` termina importando esto, el build falla en vez de
 * publicar la clave secreta dentro del bundle del browser.
 *
 * `SUPABASE_SECRET_KEY` saltea RLS por completo. Hoy no la usa ningún módulo,
 * así que se valida como opcional: exigirla rompería el build de cualquiera
 * que clone el repo sin tenerla. Cuando aparezca el primer consumidor, sacarle
 * el `.optional()` y documentarlo.
 */
const schema = z.object({
  SUPABASE_SECRET_KEY: z
    .string()
    .min(1, "SUPABASE_SECRET_KEY no puede estar vacía si está definida")
    .optional(),
});

const parsed = schema.safeParse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  · ${issue.message}`)
    .join("\n");

  throw new Error(`Variables de entorno de servidor inválidas:\n${details}`);
}

export const serverEnv = parsed.data;
