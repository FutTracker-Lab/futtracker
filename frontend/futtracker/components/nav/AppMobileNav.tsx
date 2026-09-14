"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import SignOutButton from "@/components/auth/SignOutButton";
import { NAV_ITEMS_BY_ROLE } from "@/components/nav/navItems";
import type { Role } from "@/lib/auth/schemas";

type Props = {
  role: Role;
};

// La contraparte de AppSidebar para pantallas chicas (requisito 10: 375 px
// sin scroll horizontal). Barra superior en vez de menú desplegable: con dos
// ítems un toggle sería más clics y más estado para la misma navegación. Si
// la lista crece, esto pasa a ser un menú.
export default function AppMobileNav({ role }: Props) {
  const pathname = usePathname();
  const items = NAV_ITEMS_BY_ROLE[role];

  return (
    <header className="flex shrink-0 flex-col gap-3 bg-panel p-4 text-panel-foreground md:hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
            FT
          </span>
          <span className="text-sm text-panel-muted">FutTracker · MVP</span>
        </div>
        <SignOutButton variant="sidebarCompact" />
      </div>

      {items.length > 0 ? (
        <nav className="flex gap-2 overflow-x-auto">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-panel-active text-panel-foreground"
                    : "text-panel-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
