import Link from "next/link";

import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import AuthForm from "@/components/auth/AuthForm";
import { safeRedirectPath } from "@/lib/auth/redirect";

// Una sola ruta con tabs para alta/login, en vez de /registro y /login
// separados — decisión documentada en el comentario de FUT-84: el kit de
// diseño ya construye la pantalla así (ScreenAuth), y es el mismo destino al
// que redirige proxy.ts cuando no hay sesión.
export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  // `redirectTo` viene en la URL: pasa por `safeRedirectPath` (FUT-136). Si no
  // es una ruta de la app, el formulario manda al usuario a su inicio según el
  // rol.
  const redirectTo = safeRedirectPath(params.redirectTo) ?? undefined;
  const initialTab = params.tab === "crear-cuenta" ? "sign-up" : "sign-in";
  // Lo pone proxy.ts cuando Auth no responde.
  const serviceUnavailable = params.aviso === "servicio";

  return (
    <div className="flex flex-1">
      <AuthBrandPanel />
      <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6">
        <div className="flex w-full max-w-sm flex-col gap-4">
          {serviceUnavailable ? (
            <div
              role="status"
              className="flex flex-col items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <p>El servicio no está disponible en este momento. Probá de nuevo en unos minutos.</p>
              {redirectTo ? (
                <Link
                  href={redirectTo}
                  className="rounded font-medium underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Reintentar
                </Link>
              ) : null}
            </div>
          ) : null}
          <AuthForm initialTab={initialTab} redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  );
}
