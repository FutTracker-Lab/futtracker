"use client";

import { withdrawApplicationAction } from "@/app/vacantes/actions";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { WITHDRAW_ERROR_MESSAGE } from "@/lib/format/applicationLabels";

type Props = {
  applicationId: string;
  teamName: string;
  onWithdrawn: () => void;
};

export default function WithdrawDialog({ applicationId, teamName, onWithdrawn }: Props) {
  async function handleConfirm() {
    try {
      const result = await withdrawApplicationAction(applicationId);

      if (!result.ok) {
        return WITHDRAW_ERROR_MESSAGE;
      }
    } catch {
      return WITHDRAW_ERROR_MESSAGE;
    }

    onWithdrawn();
  }

  return (
    <ConfirmDialog
      triggerLabel="Retirar postulación"
      triggerAriaLabel={`Retirar postulación a ${teamName}`}
      title={`¿Retirar tu postulación a ${teamName}?`}
      description="Vas a poder volver a postularte si la vacante sigue abierta."
      confirmLabel="Retirar"
      pendingLabel="Retirando…"
      onConfirm={handleConfirm}
    />
  );
}
