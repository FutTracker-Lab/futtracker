"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type Props = {
  // Nombre accesible completo del disparador: el diseño muestra solo "..." y
  // tres puntos no le dicen nada a un lector de pantalla cuando hay uno por
  // fila. Va entero y no armado acá para que cada pantalla lo redacte bien
  // ("Acciones del partido vs. X" y no "Acciones de el partido vs. X").
  label: string;
  children: ReactNode;
};

/**
 * Menú de acciones "..." por fila (diseño ScreenTrayectoria.jsx y
 * ScreenPartidos.jsx). Hecho a mano y no con una librería de popover: es el
 * único desplegable de la app y no justifica sumar una dependencia.
 *
 * Cierra con Escape y con un click afuera. No atrapa el foco a propósito —
 * no es un diálogo modal, es un menú: el foco puede salir con Tab y eso lo
 * cierra igual desde el click-afuera o el Escape.
 */
export default function ActionsMenu({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      // Si hay un diálogo de confirmación abierto (el "Eliminar" de este
      // mismo menú lo monta acá adentro), el Escape es suyo: cerrar el menú
      // desmontaría el diálogo junto con su disparador y el foco quedaría
      // tirado en el <body>. El segundo Escape sí cierra el menú.
      if (document.querySelector('[role="alertdialog"]')) return;

      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="rounded-md border border-zinc-200 px-2 py-1 text-sm font-semibold leading-none text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
      >
        …
      </button>
      {open ? (
        <div
          role="menu"
          // Nada de cerrar el menú al click: los items que navegan lo
          // desmontan solos con la página, y el que abre un diálogo de
          // confirmación vive ACÁ adentro — cerrar el menú lo desmontaría
          // junto con el diálogo que acaba de abrir. Se cierra por Escape o
          // por click afuera, que es lo que maneja el efecto de arriba.
          className="absolute right-0 z-10 mt-1 flex min-w-36 flex-col rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
