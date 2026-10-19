"use client";

import Link from "next/link";
import { useState } from "react";

import Toast from "@/components/ui/Toast";
import TeamCrest from "@/components/vacancies/TeamCrest";
import WithdrawDialog from "@/components/vacancies/WithdrawDialog";
import {
  NEUTRAL_CHIP_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from "@/components/vacancies/styles";
import type { MyApplication } from "@/lib/data/applications";
import { formatShortDate } from "@/lib/format/dates";
import { getPositionLabel } from "@/lib/format/playerLabels";
import { getLevelLabel, getModalityLabel } from "@/lib/format/vacancyLabels";
import { RouteConstants } from "@/lib/routes";

export type MyApplicationItem = MyApplication & { crestUrl: string | null };

export default function MyApplicationsList({ applications }: { applications: MyApplicationItem[] }) {
  const [items, setItems] = useState(applications);
  const [withdrawnCount, setWithdrawnCount] = useState(0);

  function remove(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setWithdrawnCount((count) => count + 1);
  }

  const toast = withdrawnCount ? <Toast key={withdrawnCount} message="Postulación retirada." /> : null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-zinc-700">Todavía no te postulaste a ninguna vacante.</p>
        <Link href={RouteConstants.vacancies.board} className={PRIMARY_BUTTON_CLASS}>
          Ver vacantes
        </Link>
        {toast}
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-4">
        {items.map((application) => {
          const { vacancy } = application;
          const { team } = vacancy;

          return (
            <li
              key={application.id}
              className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-start gap-3">
                <TeamCrest teamName={team.name} crestUrl={application.crestUrl} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h2 className="font-semibold break-words text-zinc-900">{team.name}</h2>
                  <p className="font-medium text-zinc-900">
                    {getPositionLabel(vacancy.position) ?? vacancy.position}
                  </p>
                  <p className="text-sm text-zinc-700">
                    {getModalityLabel(vacancy.modality)} · {getLevelLabel(vacancy.level)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Te postulaste el {formatShortDate(application.created_at)}
                  </p>
                </div>
                {vacancy.status === "closed" ? (
                  <span className={`${NEUTRAL_CHIP_CLASS} shrink-0`}>Vacante cerrada</span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <Link href={RouteConstants.team.view(team.id)} className={SECONDARY_BUTTON_CLASS}>
                  Ver equipo
                </Link>
                <WithdrawDialog
                  applicationId={application.id}
                  teamName={team.name}
                  onWithdrawn={() => remove(application.id)}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {toast}
    </>
  );
}
