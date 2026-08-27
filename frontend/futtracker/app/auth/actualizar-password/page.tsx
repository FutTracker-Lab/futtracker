import { getTranslations } from "next-intl/server";

import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";

// Ruta fijada por el redirect real de Supabase Auth en las Server Actions de
// T03a (`PASSWORD_RESET_REDIRECT` en app/(auth)/actions.ts), no por el
// nombre "/actualizar-clave" que usaba el texto original del ticket — el
// código manda sobre el texto cuando difieren.
export default async function ActualizarPasswordPage() {
  const t = await getTranslations("auth.updatePasswordScreen");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-xl font-semibold text-zinc-900">{t("title")}</h1>
      <UpdatePasswordForm />
    </div>
  );
}
