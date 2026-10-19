import SelectField from "@/components/ui/SelectField";
import { getPositionLabel } from "@/lib/format/playerLabels";
import { getStatusLabel } from "@/lib/format/vacancyLabels";
import type { Vacancy } from "@/lib/data/vacancies";
import { RouteConstants } from "@/lib/routes";

// Formulario GET con botón: funciona sin JavaScript y no navega solo al cambiar el select (WCAG 3.2.2).
export default function ApplicationsFilter({
  vacancies,
  vacancyId,
}: {
  vacancies: Vacancy[];
  vacancyId: string | null;
}) {
  return (
    <form
      method="get"
      action={RouteConstants.team.mine}
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="tab" value="postulaciones" />
      <SelectField
        id="applications-vacancy"
        name="vacante"
        label="Vacante"
        placeholder="Todas las vacantes"
        defaultValue={vacancyId ?? ""}
        options={vacancies.map((vacancy) => ({
          value: vacancy.id,
          label: `${getPositionLabel(vacancy.position) ?? vacancy.position} · ${getStatusLabel(vacancy.status)}`,
        }))}
      />
      <button
        type="submit"
        className="self-start rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:self-auto"
      >
        Aplicar
      </button>
    </form>
  );
}
