import { createClient } from "@supabase/supabase-js";
import { unstable_rethrow } from "next/navigation";
import { after, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Registro de las respuestas 5xx de nuestra API (T22, R1). Alimenta el KPI
 * `errores_5xx` del reporter diario.
 *
 * Cada ruta de `app/` que sea un Route Handler exporta su método envuelto:
 *
 *   export const GET = withErrorLog("/api/health", async () => { ... });
 *
 * La ruta va escrita a mano y es el patrón, nunca el path real: un `[id]` o un
 * query string meterían datos del usuario en el registro. La base solo acepta
 * las rutas de su lista (`log_api_error`, en la migración del reporter): una
 * ruta nueva se agrega ahí y en `ApiRoute` en la misma PR.
 */
export type ApiRoute = "/api/health" | "/auth/callback";

type Handler<Args extends unknown[]> = (
  request: NextRequest,
  ...args: Args
) => Response | Promise<Response>;

export function withErrorLog<Args extends unknown[]>(
  route: ApiRoute,
  handler: Handler<Args>,
): (request: NextRequest, ...args: Args) => Promise<Response> {
  return async (request, ...args) => {
    let response: Response;

    try {
      response = await handler(request, ...args);
    } catch (error) {
      // `redirect()` y `notFound()` viajan como excepciones de Next: no son
      // errores y tienen que llegarle intactas.
      unstable_rethrow(error);
      scheduleLog(route, request.method, 500);
      // Se relanza para que Next responda como respondía antes del wrapper.
      throw error;
    }

    if (response.status >= 500 && response.status <= 599) {
      scheduleLog(route, request.method, response.status);
    }

    return response;
  };
}

/**
 * `after` corre el registro cuando la respuesta ya salió, así que no la
 * demora; y corre también cuando el handler tiró. El `try` es por si `after`
 * mismo fallara: el logging nunca cambia la respuesta (R1.4).
 */
function scheduleLog(route: ApiRoute, method: string, status: number): void {
  try {
    after(() => logApiError(route, method, status));
  } catch (error) {
    console.error("[error-log] no se pudo programar el registro", error);
  }
}

/**
 * Nunca tira: un registro que falla queda en el log del servidor y nada más.
 *
 * Cliente sin cookies a propósito: el registro no es del usuario. Va como
 * `anon`, que es a quien la base le da permiso de ejecutar `log_api_error`.
 */
export async function logApiError(
  route: ApiRoute,
  method: string,
  status: number,
): Promise<void> {
  try {
    const supabase = createClient<Database>(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { error } = await supabase.rpc("log_api_error", {
      p_route: route,
      p_method: method,
      p_status: status,
    });

    if (error) {
      console.error("[error-log] la base rechazó el registro", error.code);
    }
  } catch (error) {
    console.error("[error-log] no se pudo registrar el error", error);
  }
}
