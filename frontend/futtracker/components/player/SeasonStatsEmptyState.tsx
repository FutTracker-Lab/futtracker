import Link from "next/link";

import { RouteConstants } from "@/lib/routes";

type Props = {
  isOwner: boolean;
};

export default function SeasonStatsEmptyState({ isOwner }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm">
      <p className="text-sm font-medium text-zinc-900">
        Todavía no hay estadísticas para mostrar.
      </p>
      {isOwner ? (
        <Link
          href={RouteConstants.profile.career}
          className="mt-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          Cargá tu primer partido
        </Link>
      ) : null}
    </div>
  );
}
