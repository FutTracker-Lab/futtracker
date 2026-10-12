import Form from "next/form";
import Link from "next/link";

import SelectField from "@/components/ui/SelectField";
import { POSITIONS } from "@/lib/data/players";
import { POSITION_LABELS } from "@/lib/format/playerLabels";
import { RouteConstants } from "@/lib/routes";
import { SEARCH_RADII, type SearchCriteria } from "@/lib/search/params";

const STATUS_OPTIONS = [
  { value: "buscan", label: "Buscan equipo" },
  { value: "todos", label: "Todos" },
] as const;

const RADIO_CLASS = "h-4 w-4 accent-brand focus-visible:ring-2 focus-visible:ring-brand";

type Props = { filters: SearchCriteria };

// Inputs no controlados: cuando un chip o "Limpiar" cambian la URL, los remonta el `key` del Suspense de page.tsx.
export default function SearchFilters({ filters }: Props) {
  return (
    <section
      aria-labelledby="search-filters-title"
      className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 id="search-filters-title" className="text-lg font-semibold text-zinc-900">
          Filtros
        </h2>
        <Link
          href={RouteConstants.search}
          className="rounded text-sm font-medium text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Limpiar
        </Link>
      </div>

      <Form action={RouteConstants.search} className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-zinc-900">Posición</legend>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="posicion"
              value=""
              defaultChecked={filters.position === null}
              className={RADIO_CLASS}
            />
            Todas
          </label>
          {POSITIONS.map((position) => (
            <label key={position} className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                name="posicion"
                value={position}
                defaultChecked={filters.position === position}
                className={RADIO_CLASS}
              />
              {POSITION_LABELS[position]}
            </label>
          ))}
        </fieldset>

        <SelectField
          id="search-radius"
          name="radio"
          label="Distancia"
          defaultValue={String(filters.radius)}
          options={SEARCH_RADII.map((radius) => ({
            value: String(radius),
            label: `Hasta ${radius} km`,
          }))}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-zinc-900">Estado</legend>
          {STATUS_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                name="estado"
                value={option.value}
                defaultChecked={filters.status === option.value}
                className={RADIO_CLASS}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Buscar
        </button>
      </Form>
    </section>
  );
}
