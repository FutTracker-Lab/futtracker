"use client";

import { useEffect, useId, useRef, useState } from "react";

import { removeHighlight } from "@/app/jugadores/[id]/highlights-actions";
import Dialog from "@/components/ui/Dialog";
import { HIGHLIGHT_ERRORS } from "@/lib/data/highlightErrors";
import type { HighlightActionResult } from "@/lib/data/highlights";

type Props = {
  id: string;
  title: string;
};

export default function DeleteHighlightDialog({ id, title }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Corre después del efecto de Dialog, que es el que abre el modal.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setError(null);
  }

  async function handleConfirm() {
    setIsPending(true);
    setError(null);

    const result: HighlightActionResult = await removeHighlight(id).catch(() => ({
      ok: false,
      error: HIGHLIGHT_ERRORS.network,
    }));

    setIsPending(false);

    if (result.ok) {
      close();
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Borrar highlight ${title}`}
        className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <svg
          aria-hidden="true"
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
        </svg>
      </button>

      <Dialog
        open={open}
        onClose={close}
        labelledBy={titleId}
        role="alertdialog"
        dismissible={!isPending}
        className="max-w-sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-base font-semibold text-zinc-900">
              {`¿Borrar «${title}»?`}
            </h2>
            <p className="text-sm text-zinc-600">
              Esta acción no se puede deshacer.
            </p>
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
              {isPending ? "Borrando…" : "Borrar"}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
