import { withErrorLog } from "@/lib/api/error-log";

/**
 * Health de la app (T22). Lo consulta el reporter diario de KPIs para
 * `api_alcanzable`: responde 200 si el servidor de Next está atendiendo.
 *
 * No toca la base a propósito. La base tiene su propio KPI (`db_alcanzable`):
 * si este endpoint la consultara, una caída de Supabase se contaría dos veces
 * y no se sabría cuál de las dos piezas falló.
 *
 * Los Route Handlers no se cachean por defecto en Next 16, así que cada GET
 * llega de verdad al servidor. El `no-store` es para los intermediarios.
 */
export const GET = withErrorLog("/api/health", () =>
  Response.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  ),
);
