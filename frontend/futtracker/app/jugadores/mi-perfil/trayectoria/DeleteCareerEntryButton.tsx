"use client";

import { useRouter } from "next/navigation";

import { deleteCareerEntryAction } from "@/app/jugadores/mi-perfil/trayectoria/actions";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { RouteConstants } from "@/lib/routes";

type Props = {
  entryId: string;
  clubName: string;
  // El disparador cambia de forma según dónde viva: botón suelto o item del
  // menú "..." de la fila.
  triggerClassName?: string;
};

export default function DeleteCareerEntryButton({
  entryId,
  clubName,
  triggerClassName,
}: Props) {
  const router = useRouter();

  return (
    <ConfirmDialog
      triggerLabel="Eliminar"
      triggerClassName={triggerClassName}
      title={`¿Eliminar tu etapa en ${clubName}?`}
      description={
        <>
          Esto también borra todos los partidos que cargaste en esta etapa, y
          no se puede deshacer.
        </>
      }
      onConfirm={async () => {
        const result = await deleteCareerEntryAction(entryId);
        if (!result.ok) {
          throw new Error(result.error);
        }
        // `router.push` con un query param y no `router.refresh()`: la fila
        // que dispara esto desaparece del árbol apenas se refrescan los
        // datos, y con ella cualquier Toast que viviera acá (requisito 9). El
        // aviso lo monta la página, que sigue existiendo después del borrado.
        router.push(`${RouteConstants.profile.career}?eliminado=etapa`);
      }}
    />
  );
}
