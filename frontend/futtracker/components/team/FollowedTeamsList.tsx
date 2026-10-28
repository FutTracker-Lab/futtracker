"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { FollowActionResult } from "@/app/equipos/follow-actions";
import FollowedTeamRow from "@/components/team/FollowedTeamRow";
import type { FollowedTeamItem } from "@/components/team/followedTeams";
import Toast from "@/components/ui/Toast";
import { PRIMARY_BUTTON_CLASS } from "@/components/vacancies/styles";
import { FOLLOW_ERROR_MESSAGES, unfollowSuccessMessage } from "@/lib/format/followLabels";
import { RouteConstants } from "@/lib/routes";

type Notice = { message: string; tone: "success" | "error"; at: number };

// El toast vive acá y no en la fila: la fila se desmonta al dejar de seguir.
export default function FollowedTeamsList({ teams }: { teams: FollowedTeamItem[] }) {
  const [items, setItems] = useState(teams);
  const [notice, setNotice] = useState<Notice | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const focusIndex = useRef<number | null>(null);

  // El botón con el foco se fue con su fila: el foco pasa a la que quedó en su lugar.
  useEffect(() => {
    if (focusIndex.current === null) return;

    const container = containerRef.current;
    const buttons = container?.querySelectorAll<HTMLElement>("[data-unfollow]") ?? [];
    const target = buttons[Math.min(focusIndex.current, buttons.length - 1)];
    (target ?? container?.querySelector<HTMLElement>("a"))?.focus();
    focusIndex.current = null;
  }, [items]);

  function handleUnfollowed(team: FollowedTeamItem, result: FollowActionResult) {
    if (!result.ok) {
      setNotice({ message: FOLLOW_ERROR_MESSAGES[result.error], tone: "error", at: Date.now() });
      return;
    }

    focusIndex.current = items.findIndex((item) => item.id === team.id);
    setItems((current) => current.filter((item) => item.id !== team.id));
    setNotice({ message: unfollowSuccessMessage(team.name), tone: "success", at: Date.now() });
  }

  const toast = notice ? <Toast key={notice.at} message={notice.message} tone={notice.tone} /> : null;

  return (
    <div ref={containerRef}>
      {items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-zinc-700">Todavía no seguís a ningún equipo.</p>
          <Link href={RouteConstants.vacancies.board} className={PRIMARY_BUTTON_CLASS}>
            Ver vacantes
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((team) => (
            <FollowedTeamRow
              key={team.id}
              team={team}
              onUnfollowed={(result) => handleUnfollowed(team, result)}
            />
          ))}
        </ul>
      )}
      {toast}
    </div>
  );
}
