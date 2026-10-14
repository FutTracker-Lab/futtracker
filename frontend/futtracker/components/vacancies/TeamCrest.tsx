import Image from "next/image";

import { initialsOf } from "@/lib/format/initials";

type Props = { teamName: string; crestUrl: string | null };

export default function TeamCrest({ teamName, crestUrl }: Props) {
  if (crestUrl) {
    return (
      <Image
        src={crestUrl}
        alt={`Escudo de ${teamName}`}
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-md object-cover"
        unoptimized
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-semibold text-brand-foreground"
    >
      {initialsOf(teamName)}
    </div>
  );
}
