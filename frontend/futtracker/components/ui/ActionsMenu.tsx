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

// Las opciones llegan como `children` opacos, así que se ubican por su rol y
// no recorriendo el árbol de React.
function menuItems(menu: HTMLElement | null): HTMLElement[] {
  if (!menu) return [];
  return Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
}

// Roving tabindex: solo la opción enfocada queda tabulable, así un Tab sale
// del menú y no uno por opción.
function focusOption(options: HTMLElement[], index: number) {
  options.forEach((option, position) => {
    option.tabIndex = position === index ? 0 : -1;
  });

  options[index]?.focus();
}

/**
 * Menú de acciones "..." por fila (diseño ScreenTrayectoria.jsx y
 * ScreenPartidos.jsx). Hecho a mano y no con una librería de popover: es el
 * único desplegable de la app y no justifica sumar una dependencia.
 *
 * Cierra con Escape y con un click afuera, y el teclado sigue la convención
 * de menús del proyecto (FUT-113). No atrapa el foco: es un menú, no un
 * diálogo modal.
 *
 * Cada opción tiene que llegar con `role="menuitem"`; sin eso queda fuera de
 * la navegación con flechas.
 */
export default function ActionsMenu({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    focusOption(menuItems(menuRef.current), 0);

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      // Si hay un diálogo de confirmación abierto (el "Eliminar" de este
      // mismo menú lo monta acá adentro), las teclas son suyas: cerrar el
      // menú desmontaría el diálogo junto con su disparador, y las flechas le
      // sacarían el foco de adentro. El segundo Escape sí cierra el menú.
      if (document.querySelector('[role="alertdialog"]')) return;

      if (event.key === "Escape") {
        setOpen(false);
        // La opción enfocada se desmonta con el menú: sin esto el foco queda
        // tirado en el <body>.
        triggerRef.current?.focus();
        return;
      }

      // Sin `preventDefault` y sin devolver el foco: Tab cierra el menú y
      // deja que el foco siga al siguiente elemento de la página.
      if (event.key === "Tab") {
        setOpen(false);
        return;
      }

      const options = menuItems(menuRef.current);

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();

        const current = options.indexOf(document.activeElement as HTMLElement);
        const down = event.key === "ArrowDown";

        // El foco puede no estar en una opción: confirmar un borrado cierra
        // el diálogo sin devolverlo y el menú queda abierto. Ahí la flecha
        // entra por el extremo que le toca.
        if (current === -1) {
          focusOption(options, down ? 0 : options.length - 1);
          return;
        }

        // El `+ options.length` es por la vuelta hacia arriba: en JS el resto
        // de un negativo es negativo.
        const step = down ? 1 : -1;
        focusOption(options, (current + step + options.length) % options.length);
      }

      // La barra no activa un `<a href>`, y las opciones que navegan son
      // links. Enter no necesita nada: ahí sí lo hace el navegador.
      if (event.key === " ") {
        event.preventDefault();
        options[options.indexOf(document.activeElement as HTMLElement)]?.click();
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        focusOption(options, 0);
      }

      if (event.key === "End") {
        event.preventDefault();
        focusOption(options, options.length - 1);
      }
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
        ref={triggerRef}
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
          ref={menuRef}
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
