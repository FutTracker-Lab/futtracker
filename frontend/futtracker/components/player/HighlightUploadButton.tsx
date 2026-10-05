"use client";

import { useState } from "react";

import HighlightUploadDialog from "@/components/player/HighlightUploadDialog";
import { HIGHLIGHT_TILE_CLASS, PlayIcon } from "@/components/player/HighlightTileFace";

type Props = {
  playerId: string;
  label: string;
  disabled?: boolean;
  variant: "header" | "tab" | "tile";
};

const VARIANT_CLASS = {
  header:
    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
  tab: "inline-flex items-center gap-2 rounded-md border border-brand-tint-border bg-brand-tint px-3 py-1.5 text-sm font-semibold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
  tile: `${HIGHLIGHT_TILE_CLASS} px-4`,
} as const;

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" />
    </svg>
  );
}

export default function HighlightUploadButton({
  playerId,
  label,
  disabled,
  variant,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={`${VARIANT_CLASS[variant]} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {variant === "tile" ? <PlayIcon /> : <UploadIcon />}
        {label}
      </button>

      <HighlightUploadDialog
        open={open}
        onClose={() => setOpen(false)}
        playerId={playerId}
      />
    </>
  );
}
