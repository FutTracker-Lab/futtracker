import Link from "next/link";

import HighlightGrid from "@/components/player/HighlightGrid";
import HighlightsError from "@/components/player/HighlightsError";
import HighlightUploadButton from "@/components/player/HighlightUploadButton";
import { HIGHLIGHT_ERRORS } from "@/lib/data/highlightErrors";
import {
  getHighlightGallery,
  type HighlightTile,
} from "@/lib/data/highlightGallery";
import { MAX_HIGHLIGHTS_PER_PLAYER } from "@/lib/data/highlights";
import { RouteConstants } from "@/lib/routes";

type Props = {
  playerId: string;
  isOwner: boolean;
  hasPlayerRow: boolean;
};

// try/catch y no `error.tsx`: el error no puede tumbar las otras pestañas.
export default async function HighlightsTab({
  playerId,
  isOwner,
  hasPlayerRow,
}: Props) {
  let tiles: HighlightTile[];

  try {
    tiles = await getHighlightGallery(playerId);
  } catch {
    return <HighlightsError />;
  }

  const canUpload = isOwner && hasPlayerRow;
  const isFull = tiles.length >= MAX_HIGHLIGHTS_PER_PLAYER;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-zinc-900">Highlights</h2>
          <p className="text-sm text-zinc-600">Hasta cuatro clips de dos minutos.</p>
        </div>

        {canUpload ? (
          <div className="shrink-0">
            <HighlightUploadButton
              playerId={playerId}
              label="Subir clip"
              disabled={isFull}
              variant="tab"
            />
          </div>
        ) : isOwner ? (
          <Link
            href={RouteConstants.profile.edit}
            className="text-sm font-medium text-brand hover:underline"
          >
            {HIGHLIGHT_ERRORS.profileIncomplete}
          </Link>
        ) : null}
      </div>

      {canUpload && isFull ? (
        <p className="text-sm text-zinc-600">{HIGHLIGHT_ERRORS.limitReached}</p>
      ) : null}

      {tiles.length === 0 ? (
        <p className="text-sm text-zinc-600">
          {isOwner
            ? "Todavía no subiste highlights."
            : "Este jugador todavía no subió highlights."}
        </p>
      ) : (
        <HighlightGrid tiles={tiles} isOwner={canUpload} playerId={playerId} />
      )}
    </section>
  );
}
