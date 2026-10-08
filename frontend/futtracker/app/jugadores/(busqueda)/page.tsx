import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import ActiveFilterChips from "@/components/search/ActiveFilterChips";
import PlayerResultRow from "@/components/search/PlayerResultRow";
import PlayerSearchSkeleton from "@/components/search/PlayerSearchSkeleton";
import SearchFilters from "@/components/search/SearchFilters";
import SearchPagination from "@/components/search/SearchPagination";
import {
  activeFilterChips,
  pageCount,
  resultsSubtitle,
} from "@/components/search/searchView";
import { getAvatarSignedUrls, searchPlayers } from "@/lib/data/players";
import { getMyTeam } from "@/lib/data/teams";
import { RouteConstants } from "@/lib/routes";
import {
  MAX_SEARCH_RADIUS,
  parseSearchFilters,
  searchHref,
  toSearchPlayersParams,
  type SearchCriteria,
} from "@/lib/search/params";
import { createClient } from "@/lib/supabase/server";

export default async function PlayerSearchPage({
  searchParams,
}: PageProps<"/jugadores">) {
  const filters = parseSearchFilters(await searchParams);

  // loading.tsx no aparece si solo cambian los parámetros; el `key` remonta el Suspense.
  return (
    <Suspense key={searchHref(filters, filters.page)} fallback={<PlayerSearchSkeleton />}>
      <PlayerSearchResults filters={filters} />
    </Suspense>
  );
}

async function PlayerSearchResults({ filters }: { filters: SearchCriteria }) {
  const supabase = await createClient();

  const [result, team] = await Promise.all([
    searchPlayers(supabase, toSearchPlayersParams(filters)),
    getMyTeam(supabase),
  ]);

  if (!result.ok && result.reason === "delegates_only") {
    notFound();
  }

  if (!result.ok) {
    return (
      <SearchLayout>
        <div className="flex flex-col items-start gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-zinc-700">
            Para buscar jugadores cercanos necesitás un equipo con ubicación.
          </p>
          <Link
            href={RouteConstants.team.mine}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Ir a mi equipo
          </Link>
        </div>
      </SearchLayout>
    );
  }

  const { rows, total } = result;

  if (rows.length === 0 && filters.page > 1) {
    redirect(searchHref(filters, 1));
  }

  const avatarUrls = await getAvatarSignedUrls(
    supabase,
    rows.flatMap((row) => (row.avatar_path ? [row.avatar_path] : [])),
  );

  return (
    <SearchLayout subtitle={resultsSubtitle(total, filters.radius, team?.city ?? null)}>
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <SearchFilters filters={filters} />

        <div className="flex min-w-0 flex-col gap-4">
          <ActiveFilterChips chips={activeFilterChips(filters)} />

          {rows.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-zinc-700">No encontramos jugadores con esos filtros.</p>
              {filters.radius < MAX_SEARCH_RADIUS ? (
                <Link
                  href={searchHref({ ...filters, radius: MAX_SEARCH_RADIUS })}
                  className="rounded text-sm font-medium text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Probar con {MAX_SEARCH_RADIUS} km
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-sm">
              {rows.map((row) => (
                <PlayerResultRow
                  key={row.player_id}
                  player={row}
                  avatarUrl={row.avatar_path ? (avatarUrls.get(row.avatar_path) ?? null) : null}
                />
              ))}
            </ul>
          )}

          <SearchPagination filters={filters} totalPages={pageCount(total)} />
        </div>
      </div>
    </SearchLayout>
  );
}

function SearchLayout({
  subtitle,
  children,
}: {
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Buscar jugadores</h1>
          {subtitle ? <p className="text-zinc-600">{subtitle}</p> : null}
        </header>
        {children}
      </div>
    </div>
  );
}
