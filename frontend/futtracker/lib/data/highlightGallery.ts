import { cache } from "react";

import { getHighlightSignedUrls, listHighlights } from "@/lib/data/highlights";
import { formatShortDate } from "@/lib/format/dates";
import { createClient } from "@/lib/supabase/server";

export type HighlightTile = {
  id: string;
  title: string;
  dateLabel: string;
  // Null si el storage no pudo firmar el archivo: el tile se muestra igual.
  url: string | null;
};

// Memoizado por request: el botón del encabezado y la pestaña leen la misma lista.
export const getPlayerHighlights = cache(async (playerId: string) =>
  listHighlights(await createClient(), playerId),
);

export async function getHighlightGallery(playerId: string): Promise<HighlightTile[]> {
  const highlights = await getPlayerHighlights(playerId);
  const urls = await getHighlightSignedUrls(
    await createClient(),
    highlights.map((highlight) => highlight.storage_path),
  );

  // La fecha sale formateada del servidor para que el cliente no la recalcule en otra zona horaria.
  return highlights.map((highlight) => ({
    id: highlight.id,
    title: highlight.title,
    dateLabel: formatShortDate(highlight.created_at),
    url: urls.get(highlight.storage_path) ?? null,
  }));
}
