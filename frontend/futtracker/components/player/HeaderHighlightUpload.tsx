import { Suspense } from "react";

import HighlightUploadButton from "@/components/player/HighlightUploadButton";
import { getPlayerHighlights } from "@/lib/data/highlightGallery";
import { MAX_HIGHLIGHTS_PER_PLAYER } from "@/lib/data/highlights";

type Props = {
  playerId: string;
};

async function UploadButtonWithLimit({ playerId }: Props) {
  let isFull: boolean;

  try {
    isFull = (await getPlayerHighlights(playerId)).length >= MAX_HIGHLIGHTS_PER_PLAYER;
  } catch {
    // Si no se pudo leer la lista, la pestaña ya muestra el error.
    isFull = true;
  }

  return (
    <HighlightUploadButton
      playerId={playerId}
      label="Subir highlight"
      disabled={isFull}
      variant="header"
    />
  );
}

export default function HeaderHighlightUpload({ playerId }: Props) {
  return (
    <Suspense
      fallback={
        <HighlightUploadButton
          playerId={playerId}
          label="Subir highlight"
          disabled
          variant="header"
        />
      }
    >
      <UploadButtonWithLimit playerId={playerId} />
    </Suspense>
  );
}
