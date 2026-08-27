import { getTranslations } from "next-intl/server";

// Panel de marca fijo del layout de auth (ver diseño: ScreenAuth.jsx). Es un
// elemento de diseño siempre oscuro, no el "dark mode" del sitio — por eso
// usa colores explícitos (bg-panel) y no la media query de prefers-color-scheme.
export default async function AuthBrandPanel() {
  const t = await getTranslations("auth.brandPanel");

  return (
    <div className="hidden w-full max-w-sm flex-col justify-between bg-panel p-10 text-panel-foreground md:flex">
      <div>
        <div className="mb-8 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
            {t("logoInitials")}
          </span>
          <span className="text-sm text-panel-muted">{t("logoCaption")}</span>
        </div>

        <h1 className="mb-3 text-3xl font-bold leading-tight">
          {t("title")}
        </h1>
        <p className="mb-8 text-panel-muted">{t("subtitle")}</p>

        <ul className="flex flex-col gap-3 text-sm">
          <li>{t("bullet1")}</li>
          <li>{t("bullet2")}</li>
          <li>{t("bullet3")}</li>
        </ul>
      </div>

      <p className="border-t border-white/10 pt-4 text-xs text-panel-muted">
        {t("note")}
      </p>
    </div>
  );
}
