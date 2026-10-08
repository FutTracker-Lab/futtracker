import { listOpenVacancies, type OpenVacancy } from "@/lib/data/vacancies";
import { formatShortDate } from "@/lib/format/dates";
import { getPositionLabel } from "@/lib/format/playerLabels";
import { getLevelLabel, getModalityLabel } from "@/lib/format/vacancyLabels";
import { createClient } from "@/lib/supabase/server";

// Una abierta por posición (T10a) y cuatro posiciones: 20 sobra.
const LIMIT = 20;

export default async function OpenVacanciesSection({ teamId }: { teamId: string }) {
  let vacancies: OpenVacancy[] | null = null;

  try {
    const supabase = await createClient();
    ({ vacancies } = await listOpenVacancies(supabase, {
      teamIds: [teamId],
      limit: LIMIT,
      offset: 0,
    }));
  } catch {
    // Un fallo acá no tira abajo el perfil del equipo.
  }

  return (
    <section aria-labelledby="open-vacancies-title" className="flex flex-col gap-3">
      <h2 id="open-vacancies-title" className="text-base font-semibold text-zinc-900">
        Vacantes abiertas
      </h2>

      {vacancies === null ? (
        <p role="alert" className="text-sm text-zinc-600">
          No pudimos cargar las vacantes.
        </p>
      ) : vacancies.length === 0 ? (
        <p className="text-sm text-zinc-600">Este equipo no tiene vacantes abiertas.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {vacancies.map((vacancy) => (
            <li key={vacancy.id} className="flex flex-col gap-1 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="font-medium text-zinc-900">
                  {getPositionLabel(vacancy.position) ?? vacancy.position}
                </p>
                <p className="text-xs text-zinc-500">
                  Publicada el {formatShortDate(vacancy.created_at)}
                </p>
              </div>
              <p className="text-sm text-zinc-700">
                {getModalityLabel(vacancy.modality)} · {getLevelLabel(vacancy.level)}
              </p>
              {vacancy.description ? (
                <p className="text-sm break-words text-zinc-600">{vacancy.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
