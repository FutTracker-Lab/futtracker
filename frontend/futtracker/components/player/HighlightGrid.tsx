"use client";

import { useState } from "react";

import DeleteHighlightDialog from "@/components/player/DeleteHighlightDialog";
import HighlightUploadButton from "@/components/player/HighlightUploadButton";
import HighlightViewer from "@/components/player/HighlightViewer";
import type { HighlightTile } from "@/lib/data/highlightGallery";
import { MAX_HIGHLIGHTS_PER_PLAYER } from "@/lib/data/highlights";

type Props = {
  tiles: HighlightTile[];
  isOwner: boolean;
  playerId: string;
};

export default function HighlightGrid({ tiles, isOwner, playerId }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openTile = tiles.find((tile) => tile.id === openId);

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tiles.map((tile) => (
          <li key={tile.id} className="relative">
            <button
              type="button"
              onClick={() => setOpenId(tile.id)}
              aria-label={`Reproducir ${tile.title}`}
              className="flex w-full flex-col items-center justify-center gap-1 rounded-lg bg-zinc-950 px-12 py-3 text-xs text-zinc-300 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <svg
                aria-hidden="true"
                className="size-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M10 8.5l5 3.5-5 3.5z" />
              </svg>
              {/* Se trunca el título, nunca la fecha. */}
              <span className="flex max-w-full">
                <span className="truncate">{tile.title}</span>
                <span className="shrink-0 whitespace-pre">{` · ${tile.dateLabel}`}</span>
              </span>
            </button>
            {isOwner ? (
              <div className="absolute right-2 top-2">
                <DeleteHighlightDialog id={tile.id} title={tile.title} />
              </div>
            ) : null}
          </li>
        ))}
        {isOwner && tiles.length < MAX_HIGHLIGHTS_PER_PLAYER ? (
          <li>
            <HighlightUploadButton
              playerId={playerId}
              label="Espacio para un clip más"
              variant="tile"
            />
          </li>
        ) : null}
      </ul>

      {openTile ? (
        <HighlightViewer tile={openTile} onClose={() => setOpenId(null)} />
      ) : null}
    </>
  );
}
