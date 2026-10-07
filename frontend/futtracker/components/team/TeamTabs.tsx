import Link from "next/link";
import { Suspense } from "react";

import { countOpen, type TeamVacanciesResult } from "@/components/team/teamVacancies";
import { RouteConstants } from "@/lib/routes";

export type TeamTab = "datos" | "vacantes";

type Props = {
  active: TeamTab;
  vacancies: Promise<TeamVacanciesResult>;
};

const TAB_CLASS =
  "-mb-px flex items-center gap-2 border-b-2 px-1 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

async function OpenCount({ result }: { result: Promise<TeamVacanciesResult> }) {
  const loaded = await result;

  if (!loaded.ok) {
    return null;
  }

  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
      <span className="sr-only">(abiertas: </span>
      {countOpen(loaded.vacancies)}
      <span className="sr-only">)</span>
    </span>
  );
}

// Links y no un tablist: cada pestaña es una URL que se puede compartir.
export default function TeamTabs({ active, vacancies }: Props) {
  const tabs = [
    { id: "datos", label: "Datos del club", href: RouteConstants.team.mine, count: null },
    { id: "vacantes", label: "Vacantes", href: RouteConstants.team.myVacancies, count: vacancies },
  ] as const;

  return (
    <nav aria-label="Secciones del equipo" className="flex gap-6 border-b border-zinc-200">
      {tabs.map((tab) => {
        const isActive = tab.id === active;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`${TAB_CLASS} ${
              isActive
                ? "border-brand text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {tab.label}
            {tab.count ? (
              <Suspense fallback={null}>
                <OpenCount result={tab.count} />
              </Suspense>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
