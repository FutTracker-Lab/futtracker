import Link from "next/link";

import type { FilterChip } from "@/components/search/searchView";

type Props = { chips: FilterChip[] };

export default function ActiveFilterChips({ chips }: Props) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Filtros activos" className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.label}>
          <Link
            href={chip.removeHref}
            aria-label={`Quitar filtro ${chip.label}`}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {chip.label}
            <span aria-hidden="true">×</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
