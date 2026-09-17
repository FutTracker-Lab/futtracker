"use client";

import { useFormStatus } from "react-dom";

import Spinner from "@/components/ui/Spinner";

type Props = {
  label: string;
};

// Genérico: cualquier <form action={...}> de la app lo puede usar, no
// específico de auth (comentario de review en PR #3: los 3 forms de auth
// tenían el mismo botón copiado 3 veces).
export default function SubmitButton({ label }: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? <Spinner /> : null}
      {label}
    </button>
  );
}
