"use client";

import { useRouter } from "next/navigation";

import { deleteMatchStatAction } from "@/app/jugadores/mi-perfil/trayectoria/actions";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatMonthYear } from "@/lib/format/dates";
import { RouteConstants } from "@/lib/routes";

type Props = {
  entryId: string;
  matchId: string;
  opponent: string;
  matchDate: string;
  // Igual que en la etapa: el disparador cambia de forma segun viva suelto o
  // dentro del menu "..." de la fila.
  triggerClassName?: string;
};

export default function DeleteMatchStatButton({
  entryId,
  matchId,
  opponent,
  matchDate,
  triggerClassName,
}: Props) {
  const router = useRouter();

  return (
    <ConfirmDialog
      triggerLabel="Eliminar"
      triggerClassName={triggerClassName}
      title={`¿Eliminar el partido vs. ${opponent}?`}
      description={
        <>
          Partido del {formatMonthYear(matchDate)}. Se descuenta de tus
          totales de carrera y del resumen de ese año.
        </>
      }
      onConfirm={async () => {
        const result = await deleteMatchStatAction(entryId, matchId);
        if (!result.ok) {
          throw new Error(result.error);
        }
        // `router.push` con un query param y no `router.refresh()`: la fila
        // que dispara esto desaparece del árbol apenas se refrescan los
        // datos, y con ella el propio Toast si viviera acá (requisito 9). El
        // aviso lo monta la página, que sigue existiendo después del borrado.
        router.push(
          `${RouteConstants.profile.careerMatches(entryId)}?eliminado=partido`,
        );
      }}
    />
  );
}
