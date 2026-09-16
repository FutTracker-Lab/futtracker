"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { signOut } from "@/app/(auth)/actions";

type Variant = "default" | "sidebar" | "sidebarCompact";

// Misma acción, dos looks: "default" es el link suelto sobre fondo claro;
// "sidebar" lo usa AppSidebar sobre la superficie oscura (`bg-panel`). Un
// solo componente en vez de duplicar el `onClick`/`startTransition` en cada
// lugar que necesita cerrar sesión.
const VARIANT_CLASS: Record<Variant, string> = {
  default: "text-sm font-medium text-zinc-600 hover:underline disabled:opacity-60",
  sidebar:
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-panel-muted transition-colors hover:bg-panel-active/50 hover:text-panel-foreground disabled:opacity-60",
  // Mismo tema oscuro que "sidebar", pero sin ocupar todo el ancho: en la
  // barra de mobile convive con el logo en la misma fila.
  sidebarCompact:
    "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-panel-muted transition-colors hover:bg-panel-active/50 hover:text-panel-foreground disabled:opacity-60",
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
