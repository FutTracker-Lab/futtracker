import Link from "next/link";
import { Suspense } from "react";

import {
  totalApplications,
  type ApplicationCountsResult,
} from "@/components/team/teamApplications";
import { countOpen, type TeamVacanciesResult } from "@/components/team/teamVacancies";
import { RouteConstants } from "@/lib/routes";

export type TeamTab = "datos" | "vacantes" | "postulaciones";

type Props = {
  active: TeamTab;
  vacancies: Promise<TeamVacanciesResult>;
  applicationCounts: Promise<ApplicationCountsResult>;
};

const BADGE_CLASS = "rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700";

const TAB_CLASS =
  "flex shrink-0 items-center gap-2 border-b-2 whitespace-nowrap px-1 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset";

async function OpenCount({ result }: { result: Promise<TeamVacanciesResult> }) {
  const loaded = await result;

  if (!loaded.ok) {
    return null;
  }

  return (
    <span className={BADGE_CLASS}>
      <span className="sr-only">(abiertas: </span>
      {countOpen(loaded.vacancies)}
      <span className="sr-only">)</span>
    </span>
  );
}

async function ApplicationsCount({ result }: { result: Promise<ApplicationCountsResult> }) {
  const loaded = await result;

  if (!loaded.ok) {
    return null;
  }

  return (
    <span className={BADGE_CLASS}>
      <span className="sr-only">(total: </span>
      {totalApplications(loaded.counts)}
      <span className="sr-only">)</span>
    </span>
  );
}

// Links y no un tablist: cada pestaña es una URL que se puede compartir.
export default function TeamTabs({ active, vacancies, applicationCounts }: Props) {
  const tabs = [
    { id: "datos", label: "Datos del club", href: RouteConstants.team.mine, badge: null },
    {
      id: "vacantes",
      label: "Vacantes",
      href: RouteConstants.team.myVacancies,
      badge: <OpenCount result={vacancies} />,
    },
    {
      id: "postulaciones",
      label: "Postulaciones",
      href: RouteConstants.team.myApplications(),
      badge: <ApplicationsCount result={applicationCounts} />,
    },
  ] as const;

  // Con badges no entran a 375 px: scroll propio, y la línea es sombra porque un borde quedaría fuera del recorte.
  return (
    <nav aria-label="Secciones del equipo" className="flex gap-3 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-zinc-200)] sm:gap-6">
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
            {tab.badge ? <Suspense fallback={null}>{tab.badge}</Suspense> : null}
          </Link>
        );
      })}
    </nav>
  );
}
