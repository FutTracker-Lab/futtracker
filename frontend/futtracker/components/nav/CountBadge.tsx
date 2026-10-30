import { formatBadgeCount } from "@/lib/format/numbers";

type Props = {
  count: number;
  label: string;
};

export default function CountBadge({ count, label }: Props) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-brand-foreground">
      <span aria-hidden="true">{formatBadgeCount(count)}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
