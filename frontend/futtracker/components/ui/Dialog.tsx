"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  dismissible?: boolean;
  role?: "dialog" | "alertdialog";
  className?: string;
  children: ReactNode;
};

export default function Dialog({
  open,
  onClose,
  labelledBy,
  dismissible = true,
  role = "dialog",
  className = "max-w-lg",
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;

    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();

    return () => {
      dialog.close();
      // El navegador no siempre devuelve el foco al disparador (p. ej. si el diálogo se desmonta).
      previous?.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] rounded-xl bg-white p-6 shadow-lg backdrop:bg-zinc-900/40 ${className}`}
    >
      {children}
    </dialog>
  );
}
