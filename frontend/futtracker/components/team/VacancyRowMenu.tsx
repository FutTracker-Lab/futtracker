"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { setVacancyStatusAction } from "@/app/equipos/vacancies-actions";
import CloseVacancyDialog from "@/components/team/CloseVacancyDialog";
import ActionsMenu from "@/components/ui/ActionsMenu";
import Toast from "@/components/ui/Toast";
import { VACANCY_ERROR_MESSAGES } from "@/lib/format/vacancyLabels";

type Props = {
  vacancyId: string;
  positionLabel: string;
  isOpen: boolean;
};

type Notice = { message: string; tone: "success" | "error"; at: number };

export default function VacancyRowMenu({ vacancyId, positionLabel, isOpen }: Props) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isPending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const previousIsOpen = useRef(isOpen);

  // El botón que tenía el foco se desmonta con el cambio de estado: vuelve al "…".
  useEffect(() => {
    if (previousIsOpen.current === isOpen) return;
    previousIsOpen.current = isOpen;
    wrapperRef.current?.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.focus();
  }, [isOpen]);

  function notify(message: string, tone: Notice["tone"]) {
    setNotice({ message, tone, at: Date.now() });
  }

  function reopen() {
    startTransition(async () => {
      try {
        const result = await setVacancyStatusAction(vacancyId, "open");
        notify(result.ok ? "Vacante reabierta." : result.error, result.ok ? "success" : "error");
      } catch {
        notify(VACANCY_ERROR_MESSAGES.unexpected, "error");
      }
    });
  }

  return (
    <div ref={wrapperRef}>
      {/* La `key` lo remonta cerrado cuando la vacante cambia de estado. */}
      <ActionsMenu key={String(isOpen)} label={`Acciones de la vacante de ${positionLabel}`}>
        {isOpen ? (
          <CloseVacancyDialog
            vacancyId={vacancyId}
            positionLabel={positionLabel}
            onClosed={() => notify("Vacante cerrada.", "success")}
          />
        ) : (
          <button
            type="button"
            role="menuitem"
            disabled={isPending}
            onClick={reopen}
            className="px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none disabled:opacity-60"
          >
            Reabrir vacante
          </button>
        )}
      </ActionsMenu>
      {notice ? <Toast key={notice.at} message={notice.message} tone={notice.tone} /> : null}
    </div>
  );
}
