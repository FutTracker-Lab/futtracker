"use client";

import { useState, useTransition } from "react";

import { followTeamAction, unfollowTeamAction, type FollowActionResult } from "@/app/equipos/follow-actions";
import Toast from "@/components/ui/Toast";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/vacancies/styles";
import {
  FOLLOW_ERROR_MESSAGES,
  followSuccessMessage,
  unfollowSuccessMessage,
} from "@/lib/format/followLabels";

type Props = {
  teamId: string;
  teamName: string;
  following: boolean;
};

type Notice = { message: string; tone: "success" | "error"; at: number };

export default function FollowButton({ teamId, teamName, following: initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (isPending) return;

    const nextFollowing = !following;

    startTransition(async () => {
      let result: FollowActionResult;

      try {
        result = nextFollowing ? await followTeamAction(teamId) : await unfollowTeamAction(teamId);
      } catch {
        result = { ok: false, error: "unexpected" };
      }

      if (!result.ok) {
        setNotice({ message: FOLLOW_ERROR_MESSAGES[result.error], tone: "error", at: Date.now() });
        return;
      }

      setFollowing(nextFollowing);
      setNotice({
        message: nextFollowing ? followSuccessMessage(teamName) : unfollowSuccessMessage(teamName),
        tone: "success",
        at: Date.now(),
      });
    });
  }

  return (
    <>
      {/* `aria-disabled` y no `disabled`: un botón deshabilitado pierde el foco y el teclado queda en el body. */}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={following}
        aria-disabled={isPending}
        className={`shrink-0 aria-disabled:cursor-wait aria-disabled:opacity-60 ${
          following ? SECONDARY_BUTTON_CLASS : PRIMARY_BUTTON_CLASS
        }`}
      >
        {following ? "Siguiendo" : "Seguir"}
      </button>
      {notice ? <Toast key={notice.at} message={notice.message} tone={notice.tone} /> : null}
    </>
  );
}
