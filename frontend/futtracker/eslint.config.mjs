import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // FUT-82: ningún string literal en JSX, todo texto va a
    // messages/es-AR.json vía next-intl. `noStrings` solo mira los hijos de
    // texto de un elemento JSX, no atributos como `className` o `href`.
    files: ["**/*.tsx"],
    rules: {
      "react/jsx-no-literals": ["error", { noStrings: true, ignoreProps: true }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefactos de `vercel build` (Build Output API). Generados y minificados.
    ".vercel/**",
  ]),
]);

export default eslintConfig;
