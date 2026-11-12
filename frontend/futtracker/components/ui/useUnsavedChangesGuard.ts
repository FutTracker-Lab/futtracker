"use client";

import { useEffect, useRef, useState } from "react";

import { UNSAVED_GUARD_ATTRIBUTE } from "@/components/ui/unsavedGuardAttribute";

/**
 * Mientras `isDirty` es true, un clic en un link marcado con
 * `data-unsaved-guard` no navega: devuelve a dónde iba, para que quien lo usa
 * pregunte y después siga (`leave`) o se quede (`cancel`).
 *
 * Escucha en `document` y no en cada link porque las pestañas las renderiza un
 * Server Component (`TeamTabs`), que no comparte estado con el formulario.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  // El link que se tocó, para devolverle el foco si se cancela.
  const pendingLink = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    function onClick(event: MouseEvent) {
      // Abrir en otra pestaña o ventana no pierde nada: se deja pasar.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        `a[${UNSAVED_GUARD_ATTRIBUTE}]`,
      );

      if (!link) {
        return;
      }

      // Un link a la página en la que ya está no la desmonta ni pierde nada:
      // si se preguntara, "Salir" iría a la misma URL y el aviso quedaría
      // abierto (revisión de la #65).
      const target = new URL(link.href, window.location.href);
      if (
        target.pathname === window.location.pathname &&
        target.search === window.location.search
      ) {
        return;
      }

      event.preventDefault();
      // Capture: que el `<Link>` de Next no llegue a navegar por su cuenta.
      event.stopPropagation();
      pendingLink.current = link;
      setPendingHref(link.getAttribute("href"));
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty]);

  return {
    pendingHref,
    cancel() {
      setPendingHref(null);
      pendingLink.current?.focus();
    },
    // Cierra el aviso antes de navegar: si no, queda abierto hasta que carga
    // la ruta nueva, y un segundo clic navega otra vez.
    leave(navigate: (href: string) => void) {
      if (pendingHref) {
        setPendingHref(null);
        navigate(pendingHref);
      }
    },
  };
}
