"use client";

import { useState } from "react";

import HighlightUploadDialog from "@/components/player/HighlightUploadDialog";

type Props = {
  playerId: string;
  label: string;
  disabled?: boolean;
  variant: "header" | "tab" | "tile";
};

const VARIANT_CLASS = {
  header:
    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100",
  tab: "inline-flex items-center gap-2 rounded-md border border-brand-tint-border bg-brand-tint px-3 py-1.5 text-sm font-semibold text-brand",
  tile: "flex w-full flex-col items-center justify-center gap-1 rounded-lg bg-zinc-950 px-4 py-3 text-xs text-zinc-300 hover:bg-zinc-900",
} as const;

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
        className={`${VARIANT_CLASS[variant]} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {variant === "tile" ? (
          <>
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
            {label}
          </>
        ) : (
          <>
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
            {label}
          </>
        )}
      </button>

      <HighlightUploadDialog
        open={open}
        onClose={() => setOpen(false)}
        playerId={playerId}
      />
    </>
  );
}
