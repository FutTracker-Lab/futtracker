import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("home");

  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-2 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        {t("title")}
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        {t("subtitle")}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        {t("status")}
      </p>
    </div>
  );
}
