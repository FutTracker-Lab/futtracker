"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  title: string;
  description: ReactNode;
  // Un error ya traducido: se muestra sin cerrar.
  error?: string | null;
  cancelLabel?: string;
  confirmLabel: string;
  // Mientras la confirmación corre, los botones se deshabilitan y Escape no
  // cierra.
  isPending?: boolean;
  pendingLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * El overlay de confirmación. Lo abre quien lo renderiza: `ConfirmDialog` desde
 * su propio botón, y el aviso de cambios sin guardar (FUT-158) desde un clic en
 * una pestaña.
 *
 * No usa `<dialog>` nativo porque el repo no tiene un patrón de foco/
 * `::backdrop` ya resuelto para eso: un overlay fijo con `role="alertdialog"`
 * es más simple de hacer accesible a mano acá.
 */
export default function AlertDialog({
  title,
  description,
  error,
  cancelLabel = "Cancelar",
  confirmLabel,
  isPending = false,
  pendingLabel,
  onCancel,
  onConfirm,
}: Props) {
  // Un id por instancia: hay un diálogo por fila y un `aria-labelledby` fijo
  // los haría apuntar todos al mismo encabezado.
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // El foco entra por "Cancelar" y no por la confirmación: si alguien llega
  // acá y aprieta Enter de puro reflejo, la opción segura es la que está
  // debajo del cursor de teclado. Vuelve ahí también cuando termina una
  // confirmación que falló: mientras corría, el botón clickeado estaba
  // deshabilitado y el foco se había ido al <body>.
  useEffect(() => {
    if (!isPending) {
      cancelRef.current?.focus();
    }
  }, [isPending]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onCancel();
        return;
      }

      // Foco atrapado: Tab desde el último botón vuelve al primero y al revés.
      if (event.key === "Tab") {
        const buttons = Array.from(
          dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
        );
        const first = buttons[0];
        const last = buttons[buttons.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPending, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div
        ref={dialogRef}
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
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isPending && pendingLabel ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
