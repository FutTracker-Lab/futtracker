import type { ReactNode } from "react";

import {
  ClipboardCheckIcon,
  SearchIcon,
  UserIcon,
} from "@/components/landing/icons";

const STEPS: { title: string; description: string; icon: ReactNode }[] = [
  {
    title: "Armá tu perfil",
    description:
      "Posiciones, trayectoria y highlights. Cargá tus partidos y tus números se calculan solos.",
    icon: <UserIcon />,
  },
  {
    title: "Te encuentran",
    description:
      "Los equipos buscan por posición, zona y horarios, y tu perfil aparece cuando encaja.",
    icon: <SearchIcon />,
  },
  {
    title: "Te invitan a probarte",
    description:
      "Recibís invitaciones a pruebas y te postulás a las vacantes de los equipos de tu zona.",
    icon: <ClipboardCheckIcon />,
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
          Cómo funciona
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900">
          Del perfil a la prueba, en tres pasos.
        </h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-tint text-brand">
                  {step.icon}
                </span>
                <span className="font-mono text-xs font-semibold text-zinc-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-zinc-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
