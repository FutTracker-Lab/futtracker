"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

// Único estado de cliente de la sección (nota técnica de FUT-91): el server
// siempre renderiza las filas que exceden el límite de 5, y este wrapper
// chico solo las oculta con CSS hasta que se abre el toggle. Con JavaScript
// desactivado las filas quedan en el DOM (requisito de accesibilidad del
// ticket: "todas las filas están presentes en el HTML"), aunque el botón no
// responda — cumple "presentes", no "visibles sin JS".
export default function CareerTimelineExpand({ children }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className={expanded ? "flex flex-col gap-4" : "hidden"}>
        {children}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="self-start text-sm font-medium text-brand hover:underline"
      >
        {expanded ? "Ver menos" : "Ver trayectoria completa"}
      </button>
    </div>
  );
}
