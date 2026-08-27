import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Importar acá es lo que hace que la validación corra en tiempo de build.
// Next evalúa este archivo después de cargar los .env y antes de compilar.
//
// Sin este import, `lib/env/public.ts` recién se evalúa cuando alguien pega
// la primera request: el build sale verde y la app queda rota en producción,
// que es exactamente el fallo silencioso que FUT-82 pide evitar.
import "./lib/env/public";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
