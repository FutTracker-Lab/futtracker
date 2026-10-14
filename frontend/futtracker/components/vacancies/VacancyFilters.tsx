import Form from "next/form";
import Link from "next/link";

import { LINK_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/vacancies/styles";
import { POSITIONS, type Position } from "@/lib/data/players";
import { POSITION_LABELS } from "@/lib/format/playerLabels";
import { RouteConstants } from "@/lib/routes";

const RADIO_CLASS = "h-4 w-4 accent-brand focus-visible:ring-2 focus-visible:ring-brand";

const OPTIONS: { value: Position | ""; label: string }[] = [
  { value: "", label: "Todas" },
  ...POSITIONS.map((position) => ({ value: position, label: POSITION_LABELS[position] })),
];

export default function VacancyFilters({ position }: { position: Position | null }) {
  return (
    <section
      aria-labelledby="vacancy-filters-title"
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 id="vacancy-filters-title" className="text-lg font-semibold text-zinc-900">
          Filtros
        </h2>
        <Link href={RouteConstants.vacancies.board} className={LINK_CLASS}>
          Limpiar
        </Link>
      </div>

      <Form action={RouteConstants.vacancies.board} className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-zinc-900">Posición</legend>
          {OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                name="posicion"
                value={option.value}
                defaultChecked={(position ?? "") === option.value}
                className={RADIO_CLASS}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <button type="submit" className={PRIMARY_BUTTON_CLASS}>
          Buscar
        </button>
      </Form>
    </section>
  );
}
