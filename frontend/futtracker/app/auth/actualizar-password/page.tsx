import { getTranslations } from "next-intl/server";

import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";

// Ruta fijada por el redirect real de Supabase Auth en las Server Actions de
// T03a (`PASSWORD_RESET_REDIRECT` en app/(auth)/actions.ts), no por el
// nombre "/actualizar-clave" que usaba el texto original del ticket — el
// código manda sobre el texto cuando difieren.
//
// Mismo layout partido que /login y /recuperar-clave.
export default async function ActualizarPasswordPage() {
  const t = await getTranslations("auth.updatePasswordScreen");

  return (
    <div className="flex flex-1">
      <AuthBrandPanel />
      <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="mb-6 text-xl font-semibold text-zinc-900">
            {t("title")}
          </h1>
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}
