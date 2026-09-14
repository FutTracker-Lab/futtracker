import type { ReactNode } from "react";

import type { Team } from "@/lib/data/teams";

type Props = {
  team: Team;
  // Slots para lo que llega después: vacantes (T10b) y postulaciones (US-08).
  // El diseño ya muestra esas solapas, pero son de Sprint 3 — se dejan como
  // huecos identificados en vez de renderizar algo a medias.
  openingsSlot?: ReactNode;
  applicationsSlot?: ReactNode;
};

export default function TeamProfileDetails({
  team,
  openingsSlot,
  applicationsSlot,
}: Props) {
  const location =
    team.city || team.province
      ? [team.city, team.province].filter(Boolean).join(", ")
      : null;

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Categoría</dt>
          <dd className="font-medium text-zinc-900">{team.category ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Liga</dt>
          <dd className="font-medium text-zinc-900">{team.league ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Ubicación</dt>
          <dd className="font-medium text-zinc-900">{location ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Fundación</dt>
          <dd className="font-medium text-zinc-900">
            {team.founded_year ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Contacto</dt>
          <dd className="font-medium break-words text-zinc-900">
            {team.contact_email ?? "—"}
          </dd>
        </div>
      </dl>

      {team.bio ? <p className="text-sm text-zinc-700">{team.bio}</p> : null}

      {openingsSlot}
      {applicationsSlot}
    </div>
  );
}
