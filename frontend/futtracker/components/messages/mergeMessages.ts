type Timed = { id: string; created_at: string };

/**
 * El mismo orden que la base: por `created_at` y, si empatan, por `id`.
 *
 * Primero por milisegundos y después por el texto: PostgREST manda los
 * microsegundos y siempre con el mismo huso (`+00:00`), así que dentro del mismo
 * milisegundo el texto ordena igual que Postgres.
 */
export function compareMessages(a: Timed, b: Timed): number {
  const byMs = Date.parse(a.created_at) - Date.parse(b.created_at);
  if (byMs !== 0) return byMs;
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

/**
 * Une lo que ya se ve con lo que llega (del servidor al enviar, o de "Ver
 * mensajes anteriores"), sin repetidos y del más viejo al más nuevo.
 *
 * No da por hecho que las dos listas sean contiguas: al enviar, el servidor
 * manda los últimos 50 corridos un lugar, y el que sale de esa ventana tiene
 * que seguir en la lista (FUT-140, review de la #50).
 */
export function mergeMessages<T extends Timed>(current: T[], incoming: T[]): T[] {
  const byId = new Map<string, T>();

  for (const message of current) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);

  return [...byId.values()].sort(compareMessages);
}
