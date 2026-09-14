"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import SignOutButton from "@/components/auth/SignOutButton";
import { NAV_ITEMS_BY_ROLE } from "@/components/nav/navItems";
import { initialsOf } from "@/lib/format/initials";
import type { Role } from "@/lib/auth/schemas";

type Props = {
  fullName: string;
  role: Role;
};

// Superficie oscura (`bg-panel`), igual que el panel de auth: en el diseño de
// referencia del ticket el nav es verde muy oscuro y el contenido de la app
// va sobre blanco al lado. El ítem activo se marca con el verde de
// `--color-panel-active`, muestreado de esa misma imagen.
//
// Solo desde `md`: 256px fijos sobre una pantalla de 375px dejarían 119px de
// contenido. En mobile navega AppMobileNav.
export default function AppSidebar({ fullName, role }: Props) {
  const pathname = usePathname();
  const items = NAV_ITEMS_BY_ROLE[role];

  return (
    <aside className="hidden w-64 shrink-0 flex-col justify-between bg-panel p-4 text-panel-foreground md:flex">
      <div>
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
            FT
          </span>
          <span className="text-sm text-panel-muted">FutTracker · MVP</span>
        </div>

        {items.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="px-2 pb-1 text-xs font-semibold tracking-wide text-panel-muted uppercase">
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
                      ? "bg-panel-active text-panel-foreground"
                      : "text-panel-muted hover:bg-panel-active/50 hover:text-panel-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 px-2 pb-2">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground"
          >
            {initialsOf(fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-panel-foreground">
              {fullName}
            </p>
            <p className="text-xs text-panel-muted">
              {role === "player" ? "Jugador" : "Delegado"}
            </p>
          </div>
        </div>
        <SignOutButton variant="sidebar" />
      </div>
    </aside>
  );
}
