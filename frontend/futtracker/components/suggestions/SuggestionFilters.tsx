import Form from "next/form";
import Link from "next/link";

import SelectField from "@/components/ui/SelectField";
import { LINK_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/vacancies/styles";
import { radiusOptionLabel } from "@/lib/format/suggestionLabels";
import { RouteConstants } from "@/lib/routes";
import { SEARCH_RADII, type SearchRadius } from "@/lib/search/params";

const RADIUS_OPTIONS = SEARCH_RADII.map((radius) => ({
  value: String(radius),
  label: radiusOptionLabel(radius),
}));

type Props = { radius: SearchRadius };

// Select no controlado: al cambiar la URL lo remonta el `key` del Suspense de page.tsx.
export default function SuggestionFilters({ radius }: Props) {
  return (
    <Form
      action={RouteConstants.suggestions}
      aria-label="Filtros"
      className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="min-w-40 flex-1 sm:flex-none">
        <SelectField
          id="suggestions-radius"
          name="radio"
          label="Distancia"
          options={RADIUS_OPTIONS}
          defaultValue={String(radius)}
        />
      </div>
      <button type="submit" className={PRIMARY_BUTTON_CLASS}>
        Aplicar
      </button>
      <Link href={RouteConstants.suggestions} className={LINK_CLASS}>
        Limpiar
      </Link>
    </Form>
  );
}
