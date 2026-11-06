"use client";

import { useEffect, useState } from "react";

import { UNSAVED_GUARD_ATTRIBUTE } from "@/components/ui/unsavedGuardAttribute";

/**
 * Mientras `isDirty` es true, un clic en un link marcado con
 * `data-unsaved-guard` no navega: devuelve a dónde iba, para que quien lo usa
 * pregunte y después siga (`router.push`) o se quede (`cancel`).
 *
 * Escucha en `document` y no en cada link porque las pestañas las renderiza un
 * Server Component (`TeamTabs`), que no comparte estado con el formulario.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);

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

      event.preventDefault();
      // Capture: que el `<Link>` de Next no llegue a navegar por su cuenta.
      event.stopPropagation();
      setPendingHref(link.getAttribute("href"));
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty]);

  return { pendingHref, cancel: () => setPendingHref(null) };
}
