import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resuelve el alias `@/*` del tsconfig, así los tests importan igual que
    // la app. Vite lo soporta de forma nativa desde la v7; no hace falta
    // vite-tsconfig-paths.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    // Los `.rls.test.ts` necesitan el stack local de Supabase corriendo, que
    // el CI no tiene. Van por `npm run test:rls`, con su propia config.
    exclude: [
      "node_modules/**",
      ".next/**",
      ".vercel/**",
      "**/*.rls.test.ts",
    ],
  },
});
