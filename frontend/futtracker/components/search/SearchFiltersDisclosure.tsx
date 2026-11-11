"use client";

import { useState, type ReactNode } from "react";

import CountBadge from "@/components/nav/CountBadge";
import { formatCount } from "@/lib/format/numbers";

type Props = {
  appliedCount: number;
  clearLink: ReactNode;
  children: ReactNode;
};

export default function SearchFiltersDisclosure({ appliedCount, clearLink, children }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      aria-labelledby="search-filters-title"
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="search-filters-title" className="text-lg font-semibold text-zinc-900">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="search-filters-panel"
            onClick={() => setIsOpen((open) => !open)}
            className="flex min-h-11 items-center gap-2 rounded-md pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden"
          >
            Filtros{" "}
            <CountBadge
              count={appliedCount}
              label={formatCount(appliedCount, "aplicado", "aplicados")}
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-5 w-5 text-zinc-500 ${isOpen ? "rotate-180" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <span className="hidden lg:inline">Filtros</span>
        </h2>
        {clearLink}
      </div>
      <div id="search-filters-panel" className={isOpen ? "mt-4" : "mt-4 hidden lg:block"}>
        {children}
      </div>
    </section>
  );
}
