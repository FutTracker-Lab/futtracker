import type { ReactNode } from "react";

type Props = {
  // Título de la sección, opcional: una tarjeta también sirve como simple
  // contenedor sin encabezado.
  title?: string;
  children: ReactNode;
};

// Genérico, en components/ui y no en components/player: es la superficie
// blanca sobre el fondo gris que usa el diseño para agrupar secciones de un
// formulario ("Datos personales", "Cómo jugás"). No sabe nada de jugadores.
export default function Card({ title, children }: Props) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      {title ? (
        <h2 className="mb-4 text-base font-semibold text-zinc-900">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
