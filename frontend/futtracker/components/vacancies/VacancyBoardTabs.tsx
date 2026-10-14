import Link from "next/link";

import { RouteConstants } from "@/lib/routes";
import type { VacancyBoardTab } from "@/lib/vacancies/params";

const TABS = [
  { id: "abiertas", label: "Abiertas", href: RouteConstants.vacancies.board },
  { id: "postulaciones", label: "Mis postulaciones", href: RouteConstants.vacancies.myApplications },
] as const;

const TAB_CLASS =
  "-mb-px border-b-2 px-1 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

// Links y no un tablist, como TeamTabs: cada pestaña es una URL.
export default function VacancyBoardTabs({ active }: { active: VacancyBoardTab }) {
  return (
    <nav aria-label="Secciones de vacantes" className="flex gap-6 border-b border-zinc-200">
      {TABS.map((tab) => {
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
          </Link>
        );
      })}
    </nav>
  );
}
