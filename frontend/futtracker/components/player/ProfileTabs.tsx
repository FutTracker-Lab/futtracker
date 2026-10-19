"use client";

import Link from "next/link";
import type { KeyboardEvent, ReactNode } from "react";

import { PROFILE_TABS, type ProfileTabId } from "@/components/player/profileTabsView";

const ARROW_STEP: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };

// Las flechas solo mueven el foco: activar es navegar y cada tecla haría una consulta.
function moveFocusWithArrows(event: KeyboardEvent<HTMLAnchorElement>) {
  const step = ARROW_STEP[event.key];
  if (!step) return;

  const tablist = event.currentTarget.parentElement;
  if (!tablist) return;

  event.preventDefault();

  const tabs = Array.from(
    tablist.querySelectorAll<HTMLAnchorElement>('[role="tab"]'),
  );
  const next = tabs.indexOf(event.currentTarget) + step;

  tabs[(next + tabs.length) % tabs.length]?.focus();
}

type Props = {
  activeTab: ProfileTabId;
  children: ReactNode;
};

export default function ProfileTabs({ activeTab, children }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Secciones del perfil"
        className="flex gap-6 border-b border-zinc-200"
      >
        {PROFILE_TABS.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <Link
              key={tab.id}
              id={`tab-${tab.id}`}
              href={`?tab=${tab.id}`}
              // Sin esto, cambiar de pestaña salta al tope de la página.
              scroll={false}
              role="tab"
              aria-selected={isActive}
              // El panel inactivo no se renderiza: apuntarle sería una referencia rota.
              aria-controls={isActive ? `panel-${tab.id}` : undefined}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={moveFocusWithArrows}
              className={`border-b-2 px-1 pb-2 text-sm font-medium ${
                isActive
                  ? "border-brand text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {children}
      </div>
    </div>
  );
}
