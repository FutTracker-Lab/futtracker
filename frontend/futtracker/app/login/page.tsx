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

  return (
    <div className="flex flex-1">
      <AuthBrandPanel />
      <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6">
        <AuthForm initialTab={initialTab} redirectTo={redirectTo} />
      </div>
    </div>
  );
}
