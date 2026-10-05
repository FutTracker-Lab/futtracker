"use client";

import { useId } from "react";

import Dialog from "@/components/ui/Dialog";
import type { HighlightTile } from "@/lib/data/highlightGallery";

type Props = {
  tile: HighlightTile;
  onClose: () => void;
};

export default function HighlightViewer({ tile, onClose }: Props) {
  const titleId = useId();

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

        {tile.url ? (
          <video
            controls
            preload="metadata"
            src={tile.url}
            className="w-full rounded-lg bg-black"
          />
        ) : (
          <p className="text-sm text-zinc-600">No pudimos cargar este clip.</p>
        )}
      </div>
    </Dialog>
  );
}
