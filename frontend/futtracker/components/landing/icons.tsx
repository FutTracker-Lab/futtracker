import type { ReactNode } from "react";

// Trazos de Lucide, inline para no sumar una dependencia por cinco íconos.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {children}
    </svg>
  );
}

export function UserIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </Icon>
  );
}

export function UsersIcon() {
  return (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

export function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  );
}

export function ClipboardCheckIcon() {
  return (
    <Icon>
      <rect width="8" height="4" x="8" y="2" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </Icon>
  );
}

export function ArrowRightIcon() {
  return (
    <Icon>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Icon>
  );
}
