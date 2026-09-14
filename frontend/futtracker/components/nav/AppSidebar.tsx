"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import SignOutButton from "@/components/auth/SignOutButton";
import { initialsOf } from "@/lib/format/initials";
import type { Role } from "@/lib/auth/schemas";
import { RouteConstants } from "@/lib/routes";

type NavItem = {
  href: string;
  label: string;
};

// Data-driven a propósito (comentario del ticket, foto del kit de diseño):
// la barra lateral del diseño trae bastante más ("Trayectoria", "Buscar
// jugadores", "Convocatorias", modo "Equipo"...) que lo que existe hoy en la
// app. Se listan acá solo las rutas que ya están construidas; cada feature
// nueva suma su entrada a este array, no un componente de sidebar nuevo.
const NAV_ITEMS_BY_ROLE: Record<Role, NavItem[]> = {
  player: [
    { href: RouteConstants.profile.mine, label: "Mi perfil" },
    { href: RouteConstants.profile.edit, label: "Editar perfil" },
  ],
  // Ningún ítem todavía: T05b (página de equipo) no está construido. Cuando
  // exista, entra acá de la misma forma que los de "player" arriba.
  delegate: [],
};

type Props = {
  fullName: string;
  role: Role;
};

// Fondo blanco, no el panel oscuro de auth: son dos elementos de diseño
// distintos aunque ambos vengan del mismo kit. `AuthBrandPanel` es un panel
// de marca siempre oscuro (fijo, decorativo); este sidebar es la navegación
// normal del sitio, en el mismo tema claro que el resto de la app — el
// activo se marca con un pill sólido de `--color-brand`, no con un overlay
// claro sobre negro.
export default function AppSidebar({ fullName, role }: Props) {
  const pathname = usePathname();
  const items = NAV_ITEMS_BY_ROLE[role];

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-zinc-200 bg-white p-4">
      <div>
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
            FT
          </span>
          <span className="text-sm text-zinc-500">FutTracker · MVP</span>
        </div>

        {items.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="px-2 pb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Navegación
            </p>
            {items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand text-brand-foreground"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 border-t border-zinc-200 pt-4">
        <div className="flex items-center gap-3 px-2 pb-2">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground"
          >
            {initialsOf(fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900">
              {fullName}
            </p>
            <p className="text-xs text-zinc-500">
              {role === "player" ? "Jugador" : "Delegado"}
            </p>
          </div>
        </div>
        <SignOutButton variant="sidebar" />
      </div>
    </aside>
  );
}
