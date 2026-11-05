import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/**
 * Tests de RLS. Corren contra el stack local (`supabase start`) y ejercitan
 * las políticas de verdad, con sesiones reales y a través de PostgREST: es el
 * único camino que también pasa por los grants, que es donde ya nos mordió una
 * vez.
 *
 * Van aparte de `npm run test` porque necesitan Docker corriendo. En CI los
 * corre el workflow "RLS y migraciones" (.github/workflows/rls.yml), que
 * levanta Supabase en el runner y falla si alguno queda salteado. En local,
 * correrlos antes de abrir el PR ahorra esperar al CI.
 */
export default defineConfig(({ mode }) => ({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // A diferencia de los tests unitarios, estos importan `lib/env/public.ts`
    // de verdad en vez de mockearlo, porque de ahí sale contra qué stack
    // apuntan. Vitest no lee `.env.local` solo: eso lo hace Next.
    env: loadEnv(mode, process.cwd(), ""),
    environment: "node",
    include: ["**/*.rls.test.ts"],
    exclude: ["node_modules/**", ".next/**", ".vercel/**"],
    // Cada caso da de alta usuarios contra el stack local; el default de 5 s
    // se queda corto en la primera corrida, cuando los contenedores recién
    // se despertaron.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Los casos comparten la tabla `profiles`: en paralelo se pisan las
    // aserciones de conteo.
    fileParallelism: false,
  },
}));
