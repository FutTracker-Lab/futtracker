// Helper de presentación puro (sacado de PlayerProfileHeader.tsx a pedido de
// review en PR #9: la lógica no trivial necesita vivir en un archivo propio
// para poder testearse sin renderizar un componente).
export function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).slice(0, 2);
  // `Array.from` recorre por code points: `word[0]` parte los emojis a la mitad.
  return words
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}
