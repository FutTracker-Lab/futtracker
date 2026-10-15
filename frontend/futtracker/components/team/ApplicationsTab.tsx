import Image from "next/image";
import Link from "next/link";

import ApplicationsFilter from "@/components/team/ApplicationsFilter";
import type { ApplicationRow, TeamApplicationsResult } from "@/components/team/teamApplications";
import RetryButton from "@/components/ui/RetryButton";
import { formatShortDate } from "@/lib/format/dates";
import { initialsOf } from "@/lib/format/initials";
import { getPositionLabel } from "@/lib/format/playerLabels";
import { RouteConstants } from "@/lib/routes";

function ApplicationItem({ application }: { application: ApplicationRow }) {
  const details = [
    application.age !== null ? `${application.age} años` : null,
    application.city,
    getPositionLabel(application.position),
  ].filter(Boolean);
  const vacancyPosition =
    getPositionLabel(application.vacancy.position) ?? application.vacancy.position;

  return (
    <li className="flex flex-col gap-3 border-b border-zinc-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {application.avatarUrl ? (
          <Image
            src={application.avatarUrl}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-sm font-semibold text-brand"
          >
            {initialsOf(application.full_name)}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-medium break-words text-zinc-900">{application.full_name}</p>
          {details.length > 0 ? (
            <p className="text-sm text-zinc-600">{details.join(" · ")}</p>
          ) : null}
          <p className="text-xs text-zinc-500">
            Postulado a: {vacancyPosition} · Se postuló el {formatShortDate(application.created_at)}
          </p>
        </div>
      </div>
      <Link
        href={RouteConstants.profile.view(application.player_id)}
        className="shrink-0 self-start rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:self-auto"
      >
        Ver perfil
        <span className="sr-only"> de {application.full_name}</span>
      </Link>
    </li>
  );
}

export default async function ApplicationsTab({
  result,
}: {
  result: Promise<TeamApplicationsResult>;
}) {
  const loaded = await result;

  if (!loaded.ok) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-zinc-200 bg-white p-6">
        <p role="alert" className="text-sm text-zinc-700">
          No pudimos cargar las postulaciones.
        </p>
        <RetryButton />
      </div>
    );
  }

  return (
    <section
      aria-labelledby="applications-title"
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="applications-title" className="text-base font-semibold text-zinc-900">
            Postulaciones
          </h2>
          <p className="text-sm text-zinc-600">{loaded.applications.length} en total.</p>
        </div>
        <ApplicationsFilter vacancies={loaded.vacancies} vacancyId={loaded.vacancyId} />
      </div>

      {loaded.applications.length === 0 ? (
        <p className="text-sm text-zinc-600">Todavía no recibiste postulaciones.</p>
      ) : (
        <ul>
          {loaded.applications.map((application) => (
            <ApplicationItem key={application.id} application={application} />
          ))}
        </ul>
      )}
    </section>
  );
}
