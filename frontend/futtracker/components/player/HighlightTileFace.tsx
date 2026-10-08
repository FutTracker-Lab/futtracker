export const HIGHLIGHT_TILE_CLASS =
  "flex w-full flex-col items-center justify-center gap-1 rounded-lg bg-zinc-950 py-3 text-xs text-zinc-300 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand";

export function PlayIcon() {
  return (
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
  );
}
