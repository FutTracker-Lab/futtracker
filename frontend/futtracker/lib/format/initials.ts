// Helper de presentación puro (sacado de PlayerProfileHeader.tsx a pedido de
// review en PR #9: la lógica no trivial necesita vivir en un archivo propio
// para poder testearse sin renderizar un componente).
export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
