"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type Props = {
  // Texto del botón que abre el diálogo (ej. "Eliminar").
  triggerLabel: string;
  triggerClassName?: string;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
};

const DEFAULT_TRIGGER_CLASS =
  "rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50";

/**
 * Confirmación de borrado genérica (requisito 6 de FUT-92: nombrar el
 * registro y, para una etapa, advertir el cascade). No usa `<dialog>` nativo
 * porque el repo no tiene un patrón de foco/`::backdrop` ya resuelto para eso
 * — un overlay fijo con `role="alertdialog"` es más simple de hacer accesible
 * a mano acá.
 */
export default function ConfirmDialog({
  triggerLabel,
  triggerClassName,
  title,
  description,
  confirmLabel = "Eliminar",
  onConfirm,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Un id por instancia: hay un diálogo por fila y un `aria-labelledby` fijo
  // los haría apuntar todos al mismo encabezado.
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // El foco entra al diálogo por "Cancelar" y no por "Eliminar": si alguien
    // llega acá y aprieta Enter de puro reflejo, la opción segura es la que
    // está debajo del cursor de teclado.
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        setOpen(false);
        // Mismo retorno de foco que el botón Cancelar: cerrar con teclado no
        // puede dejar el foco tirado en el <body>.
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isPending]);

  function close() {
    setOpen(false);
    // Devolver el foco al disparador: sin esto queda en el <body> y hay que
    // tabular desde el principio de la página para volver a la fila.
    triggerRef.current?.focus();
  }

  async function handleConfirm() {
    setIsPending(true);
    setError(null);

    try {
      await onConfirm();
      setOpen(false);
    } catch {
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
        onClick={() => setOpen(true)}
        className={triggerClassName ?? DEFAULT_TRIGGER_CLASS}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-6 shadow-lg"
          >
            <div className="flex flex-col gap-1">
              <h2 id={titleId} className="text-base font-semibold text-zinc-900">
                {title}
              </h2>
              <div className="text-sm text-zinc-600">{description}</div>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                ref={cancelRef}
                onClick={close}
                disabled={isPending}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isPending ? "Eliminando…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
