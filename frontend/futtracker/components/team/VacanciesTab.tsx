import VacanciesCard from "@/components/team/VacanciesCard";
import VacancyRowMenu from "@/components/team/VacancyRowMenu";
import type { TeamVacanciesResult } from "@/components/team/teamVacancies";
import RetryButton from "@/components/ui/RetryButton";
import { getPositionLabel } from "@/lib/format/playerLabels";
import { getLevelLabel, getModalityLabel, getStatusLabel } from "@/lib/format/vacancyLabels";

export default async function VacanciesTab({
  result,
}: {
  result: Promise<TeamVacanciesResult>;
}) {
  const loaded = await result;

  if (!loaded.ok) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-zinc-200 bg-white p-6">
        <p role="alert" className="text-sm text-zinc-700">
          No pudimos cargar las vacantes.
        </p>
        <RetryButton />
      </div>
    );
  }

  if (loaded.vacancies.length === 0) {
    return (
      <VacanciesCard>
        <p className="text-sm text-zinc-600">Todavía no publicaste vacantes.</p>
      </VacanciesCard>
    );
  }

  return (
    <VacanciesCard>
      <table className="block w-full text-sm sm:table">
        <caption className="sr-only">Vacantes del club</caption>
        <thead className="hidden sm:table-header-group">
          <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500">
            <th scope="col" className="py-2 pr-3 font-medium">Posición</th>
            <th scope="col" className="py-2 pr-3 font-medium">Modalidad</th>
            <th scope="col" className="py-2 pr-3 font-medium">Nivel</th>
            <th scope="col" className="py-2 pr-3 font-medium">Estado</th>
            <th scope="col" className="py-2"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody className="block sm:table-row-group">
          {loaded.vacancies.map((vacancy) => {
            const positionLabel = getPositionLabel(vacancy.position) ?? vacancy.position;
            const isOpen = vacancy.status === "open";

            return (
              <tr
                key={vacancy.id}
                className="relative flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-zinc-100 py-3 pr-10 last:border-b-0 sm:table-row sm:pr-0"
              >
                <th scope="row" className="w-full text-left font-medium text-zinc-900 sm:w-auto sm:py-3 sm:pr-3">
                  {positionLabel}
                </th>
                <td className="text-zinc-700 sm:py-3 sm:pr-3">{getModalityLabel(vacancy.modality)}</td>
                <td className="text-zinc-700 sm:py-3 sm:pr-3">{getLevelLabel(vacancy.level)}</td>
                <td className="sm:py-3 sm:pr-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isOpen ? "bg-green-50 text-green-800" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {getStatusLabel(vacancy.status)}
                  </span>
                </td>
                <td className="absolute top-2.5 right-0 sm:static sm:py-3 sm:text-right">
                  <VacancyRowMenu vacancyId={vacancy.id} positionLabel={positionLabel} isOpen={isOpen} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </VacanciesCard>
  );
}
