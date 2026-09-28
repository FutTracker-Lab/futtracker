import { isValidElement, type ReactNode } from "react";

// El repo no tiene testing-library ni jsdom (vitest corre en `environment:
// "node"`), pero un componente es una función que devuelve un árbol de
// elementos de React, que son objetos planos. Recorrerlo alcanza para
// verificar qué se monta y dónde, sin sumar una dependencia nueva ni un DOM.
export function flatten(node: ReactNode): ReactNode[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!isValidElement(node)) return node == null || node === false ? [] : [node];

  const { children } = node.props as { children?: ReactNode };

  return [node, ...flatten(children)];
}
