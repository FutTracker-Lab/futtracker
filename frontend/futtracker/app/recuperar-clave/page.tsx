import { getTranslations } from "next-intl/server";

import RequestResetForm from "@/components/auth/RequestResetForm";

export default async function RecuperarClavePage() {
  const t = await getTranslations("auth.recover");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold">{t("title")}</h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          {t("description")}
        </p>
        <RequestResetForm />
      </div>
    </div>
  );
}
