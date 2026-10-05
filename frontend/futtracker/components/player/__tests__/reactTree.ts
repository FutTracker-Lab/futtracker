import { isValidElement, type ReactNode } from "react";

// Estos tests recorren el árbol de elementos en vez de renderizarlo: son
// anteriores a que el repo tuviera jsdom y testing-library (FUT-113), y no se
// migraron.
export function flatten(node: ReactNode): ReactNode[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!isValidElement(node)) return node == null || node === false ? [] : [node];

  const { children } = node.props as { children?: ReactNode };

  return [node, ...flatten(children)];
}
