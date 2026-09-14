"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { signOut } from "@/app/(auth)/actions";

type Variant = "default" | "sidebar";

// Misma acción, dos looks: "default" es el link suelto que ya usaba el
// header claro; "sidebar" lo usa AppSidebar, en el mismo tema claro que el
// resto del sitio (no es el panel oscuro de auth). Un solo componente en vez
// de duplicar el `onClick`/`startTransition` en cada lugar que necesita
// cerrar sesión.
const VARIANT_CLASS: Record<Variant, string> = {
  default: "text-sm font-medium text-zinc-600 hover:underline disabled:opacity-60",
  sidebar:
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60",
};

type Props = {
  variant?: Variant;
};

export default function SignOutButton({ variant = "default" }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={VARIANT_CLASS[variant]}
    >
      Cerrar sesión
    </button>
  );
}
