"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { applyToVacancyAction } from "@/app/vacantes/actions";
import CompleteProfileNotice from "@/components/vacancies/CompleteProfileNotice";
import {
  NEUTRAL_CHIP_CLASS,
  PRIMARY_BUTTON_CLASS,
  SUCCESS_CHIP_CLASS,
} from "@/components/vacancies/styles";
import Toast from "@/components/ui/Toast";
import {
  APPLY_ERROR_MESSAGES,
  applyButtonLabel,
  applySuccessMessage,
} from "@/lib/format/applicationLabels";

type Props = {
  vacancyId: string;
  positionLabel: string;
  teamName: string;
  applied: boolean;
};

type Status = "idle" | "applied" | "closed" | "incomplete";
type Notice = { message: string; tone: "success" | "error"; at: number };

export default function ApplyButton({ vacancyId, positionLabel, teamName, applied }: Props) {
  const [status, setStatus] = useState<Status>(applied ? "applied" : "idle");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isPending, startTransition] = useTransition();
  const statusRef = useRef<HTMLSpanElement>(null);
  const changedByClick = useRef(false);

  // El botón con el foco se desmonta: el foco pasa al chip que lo reemplaza.
  useEffect(() => {
    if (changedByClick.current) statusRef.current?.focus();
  }, [status]);

  function notify(message: string, tone: Notice["tone"]) {
    setNotice({ message, tone, at: Date.now() });
  }

  function apply() {
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof applyToVacancyAction>>;

      try {
        result = await applyToVacancyAction(vacancyId);
      } catch {
        result = { ok: false, error: "unexpected" };
      }

      changedByClick.current = true;

      if (result.ok) {
        setStatus("applied");
        notify(applySuccessMessage(positionLabel, teamName), "success");
        return;
      }

      if (result.error === "alreadyApplied") setStatus("applied");
      if (result.error === "vacancyClosed") setStatus("closed");
      if (result.error === "profileIncomplete") {
        setStatus("incomplete");
        return;
      }

      notify(APPLY_ERROR_MESSAGES[result.error], "error");
    });
  }

  const toast = notice ? <Toast key={notice.at} message={notice.message} tone={notice.tone} /> : null;

  if (status === "incomplete") {
    return <CompleteProfileNotice />;
  }

  if (status === "applied" || status === "closed") {
    return (
      <>
        <span
          ref={statusRef}
          tabIndex={-1}
          className={status === "applied" ? SUCCESS_CHIP_CLASS : NEUTRAL_CHIP_CLASS}
        >
          {status === "applied" ? "Postulado" : "Vacante cerrada"}
        </span>
        {toast}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={apply}
        disabled={isPending}
        aria-label={applyButtonLabel(positionLabel, teamName)}
        className={PRIMARY_BUTTON_CLASS}
      >
        {isPending ? "Enviando…" : "Postularme"}
      </button>
      {toast}
    </>
  );
}
