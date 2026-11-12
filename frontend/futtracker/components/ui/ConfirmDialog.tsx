"use client";

import { useRef, useState, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";

import AlertDialog from "@/components/ui/AlertDialog";

type Props = {
  // Texto del botón que abre el diálogo (ej. "Eliminar").
  triggerLabel: string;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  // El rol lo pone quien renderiza la opción, no el menú: ver
  // `docs/accesibilidad.md`.
  triggerRole?: "menuitem";
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  // Un string devuelto es un error ya traducido: se muestra sin cerrar.
  onConfirm: () => Promise<void | string>;
};

const DEFAULT_TRIGGER_CLASS =
  "rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50";

/**
 * Confirmación de borrado genérica (requisito 6 de FUT-92: nombrar el
 * registro y, para una etapa, advertir el cascade): un botón que abre un
 * `AlertDialog`.
 */
export default function ConfirmDialog({
  triggerLabel,
  triggerAriaLabel,
  triggerClassName,
  triggerRole,
  title,
  description,
  confirmLabel = "Eliminar",
  pendingLabel = "Eliminando…",
  onConfirm,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    // Devolver el foco al disparador: sin esto queda en el <body> y hay que
    // tabular desde el principio de la página para volver a la fila. Vale
    // también para Escape, que cierra por acá.
    triggerRef.current?.focus();
  }

  async function handleConfirm() {
    setIsPending(true);
    setError(null);

    try {
      const failure = await onConfirm();

      if (failure) {
        setError(failure);
        return;
      }

      setOpen(false);
    } catch (error) {
      unstable_rethrow(error);
      setError("No pudimos completar la acción. Probá de nuevo.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role={triggerRole}
        aria-label={triggerAriaLabel}
        onClick={() => setOpen(true)}
        className={triggerClassName ?? DEFAULT_TRIGGER_CLASS}
      >
        {triggerLabel}
      </button>

      {open ? (
        <AlertDialog
          title={title}
          description={description}
          error={error}
          confirmLabel={confirmLabel}
          pendingLabel={pendingLabel}
          isPending={isPending}
          onCancel={close}
          onConfirm={handleConfirm}
        />
      ) : null}
    </>
  );
}
