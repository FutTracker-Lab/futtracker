"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { setVacancyStatusAction } from "@/app/equipos/vacancies-actions";
import { VACANCY_ERROR_MESSAGES } from "@/lib/format/vacancyLabels";

type Props = {
  vacancyId: string;
  positionLabel: string;
  onClosed: () => void;
};

export default function CloseVacancyDialog({ vacancyId, positionLabel, onClosed }: Props) {
  async function handleConfirm() {
    try {
      const result = await setVacancyStatusAction(vacancyId, "closed");

      if (!result.ok) {
        return result.error;
      }
    } catch {
      return VACANCY_ERROR_MESSAGES.unexpected;
    }

    onClosed();
  }

  return (
    <ConfirmDialog
      triggerLabel="Cerrar vacante"
      triggerRole="menuitem"
      triggerClassName="px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
      title={`¿Cerrar la vacante de ${positionLabel}?`}
      description="Los jugadores dejarán de poder postularse."
      confirmLabel="Cerrar"
      pendingLabel="Cerrando…"
      onConfirm={handleConfirm}
    />
  );
}
