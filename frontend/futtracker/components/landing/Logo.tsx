type Props = {
  tone?: "light" | "dark";
};

export default function Logo({ tone = "light" }: Props) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
        FT
      </span>
      <span
        className={`font-bold tracking-tight ${tone === "light" ? "text-panel-foreground" : "text-zinc-900"}`}
      >
        FutTracker
      </span>
    </span>
  );
}
