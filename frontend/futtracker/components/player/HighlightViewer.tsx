"use client";

import { useId, useState, type SyntheticEvent } from "react";

import Dialog from "@/components/ui/Dialog";
import type { HighlightTile } from "@/lib/data/highlightGallery";

// `MediaError.MEDIA_ERR_NETWORK`, como número para no depender de la clase.
const MEDIA_ERR_NETWORK = 2;

type Props = {
  tile: HighlightTile;
  onClose: () => void;
};

export default function HighlightViewer({ tile, onClose }: Props) {
  const titleId = useId();
  const [failure, setFailure] = useState<"unplayable" | "network" | null>(null);

  // FUT-163: un clip que el navegador no puede decodificar quedaba en negro.
  // Puede avisar con `error`, o cargar igual y reproducir solo el audio, con
  // una pista de video sin tamaño (Chrome sin soporte de HEVC).
  function checkHasPicture(event: SyntheticEvent<HTMLVideoElement>) {
    if (event.currentTarget.videoWidth === 0) {
      setFailure("unplayable");
    }
  }

  // Un error de red no es culpa del dispositivo: no hay que decir que no lo
  // puede reproducir.
  function handleError(event: SyntheticEvent<HTMLVideoElement>) {
    setFailure(event.currentTarget.error?.code === MEDIA_ERR_NETWORK ? "network" : "unplayable");
  }

  return (
    <Dialog open onClose={onClose} labelledBy={titleId} className="max-w-3xl">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-base font-semibold text-zinc-900">
            {tile.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <svg
              aria-hidden="true"
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {!tile.url || failure === "network" ? (
          <p className="text-sm text-zinc-600">No pudimos cargar este clip.</p>
        ) : failure === "unplayable" ? (
          <p role="alert" className="text-sm text-zinc-600">
            Este clip no se puede reproducir en este dispositivo. Probá desde otro navegador o
            dispositivo.
          </p>
        ) : (
          <video
            controls
            preload="metadata"
            src={tile.url}
            onError={handleError}
            onLoadedMetadata={checkHasPicture}
            className="w-full rounded-lg bg-black"
          />
        )}
      </div>
    </Dialog>
  );
}
