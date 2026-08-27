import { getTranslations } from "next-intl/server";

import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import RequestResetForm from "@/components/auth/RequestResetForm";

// Mismo layout partido que /login (panel de marca + tarjeta blanca) — antes
// esta pantalla no lo tenía y quedaba visualmente suelta del resto del auth.
export default async function RecuperarClavePage() {
  const t = await getTranslations("auth.recover");

  return (
    <div className="flex flex-1">
      <AuthBrandPanel />
      <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-zinc-900">
            {t("title")}
          </h1>
          <p className="mb-6 text-sm text-zinc-500">{t("description")}</p>
          <RequestResetForm />
        </div>
      </div>
    </div>
  );
}
