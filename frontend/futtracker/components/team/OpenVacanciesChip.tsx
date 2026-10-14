import { countOpen, type TeamVacanciesResult } from "@/components/team/teamVacancies";
import { openVacanciesLabel } from "@/lib/format/vacancyLabels";

export default async function OpenVacanciesChip({
  result,
}: {
  result: Promise<TeamVacanciesResult>;
}) {
  const loaded = await result;

  // Sin dato no hay chip: un "0" inventado diría algo falso.
  if (!loaded.ok) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-tint-border bg-brand-tint px-3 py-1 text-xs font-medium text-zinc-900">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />
      {openVacanciesLabel(countOpen(loaded.vacancies))}
    </span>
  );
}
