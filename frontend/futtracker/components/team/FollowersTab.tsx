import Image from "next/image";
import Link from "next/link";

import type { FollowerRow, FollowerRowsResult } from "@/components/team/teamFollowers";
import RetryButton from "@/components/ui/RetryButton";
import { initialsOf } from "@/lib/format/initials";
import { getPositionLabel } from "@/lib/format/playerLabels";
import { RouteConstants } from "@/lib/routes";

function FollowerItem({ follower }: { follower: FollowerRow }) {
  const details = [getPositionLabel(follower.position), follower.city].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 border-b border-zinc-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {follower.avatarUrl ? (
          <Image
            src={follower.avatarUrl}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-sm font-semibold text-brand"
          >
            {initialsOf(follower.full_name)}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-medium break-words text-zinc-900">{follower.full_name}</p>
          {details.length > 0 ? (
            <p className="text-sm text-zinc-600">{details.join(" · ")}</p>
          ) : null}
        </div>
      </div>
      <Link
        href={RouteConstants.profile.view(follower.follower_id)}
        className="shrink-0 self-start rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:self-auto"
      >
        Ver perfil
        <span className="sr-only"> de {follower.full_name}</span>
      </Link>
    </li>
  );
}

export default async function FollowersTab({ result }: { result: Promise<FollowerRowsResult> }) {
  const loaded = await result;

  if (!loaded.ok) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-zinc-200 bg-white p-6">
        <p role="alert" className="text-sm text-zinc-700">
          No pudimos cargar los seguidores.
        </p>
        <RetryButton />
      </div>
    );
  }

  return (
    <section
      aria-labelledby="followers-title"
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <h2 id="followers-title" className="text-base font-semibold text-zinc-900">
        Seguidores
      </h2>

      {loaded.followers.length === 0 ? (
        <p className="text-sm text-zinc-600">Todavía no tenés seguidores.</p>
      ) : (
        <ul>
          {loaded.followers.map((follower) => (
            <FollowerItem key={follower.follower_id} follower={follower} />
          ))}
        </ul>
      )}
    </section>
  );
}
