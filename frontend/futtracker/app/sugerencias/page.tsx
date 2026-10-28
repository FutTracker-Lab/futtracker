import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import SearchPagination from "@/components/search/SearchPagination";
import SuggestedTeamCard from "@/components/suggestions/SuggestedTeamCard";
import SuggestionFilters from "@/components/suggestions/SuggestionFilters";
import SuggestionsSkeleton from "@/components/suggestions/SuggestionsSkeleton";
import { LINK_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/vacancies/styles";
import { getPlayerAccess } from "@/lib/auth/playerAccess";
import { getMyPlayer } from "@/lib/data/players";
import { suggestTeams } from "@/lib/data/suggestions";
import { getCrestSignedUrls } from "@/lib/data/teams";
import { RouteConstants } from "@/lib/routes";
import { MAX_SEARCH_RADIUS } from "@/lib/search/params";
import {
  parseSuggestionParams,
  suggestionsHref,
  toSuggestTeamsParams,
  type SuggestionCriteria,
} from "@/lib/suggestions/params";
import { suggestionsView } from "@/lib/suggestions/view";
import { createClient } from "@/lib/supabase/server";

export default async function SuggestionsPage({ searchParams }: PageProps<"/sugerencias">) {
  // El layout corre en paralelo: sin esto, el 404 del delegado igual trae las sugerencias en el payload.
  const access = await getPlayerAccess();

  if (access === "unavailable") {
    throw new Error("No se pudo leer el rol");
  }

  if (access !== "player") {
    notFound();
  }

  const criteria = parseSuggestionParams(await searchParams);

  // loading.tsx no aparece si solo cambian los parámetros; el `key` remonta el Suspense.
  return (
    <Suspense key={suggestionsHref(criteria, criteria.page)} fallback={<SuggestionsSkeleton />}>
      <SuggestionsResults criteria={criteria} />
    </Suspense>
  );
}

async function SuggestionsResults({ criteria }: { criteria: SuggestionCriteria }) {
  const supabase = await createClient();

  const [result, player] = await Promise.all([
    suggestTeams(supabase, toSuggestTeamsParams(criteria)),
    getMyPlayer(supabase),
  ]);

  const view = suggestionsView(criteria, result, player);

  if (view.kind === "notFound") {
    notFound();
  }

  if (view.kind === "redirect") {
    redirect(view.href);
  }

  if (view.kind === "profileIncomplete") {
    return (
      <SuggestionsFrame>
        <div className="flex flex-col items-start gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-zinc-700">{view.message}</p>
          <Link href={RouteConstants.profile.edit} className={PRIMARY_BUTTON_CLASS}>
            Completar perfil
          </Link>
        </div>
      </SuggestionsFrame>
    );
  }

  if (view.kind === "empty") {
    return (
      <SuggestionsFrame subtitle={view.subtitle}>
        <SuggestionFilters radius={criteria.radius} />
        <div className="flex flex-col items-start gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-zinc-700">No hay equipos sugeridos con esos filtros.</p>
          {view.maxRadiusHref ? (
            <Link href={view.maxRadiusHref} className={LINK_CLASS}>
              Probar con {MAX_SEARCH_RADIUS} km
            </Link>
          ) : null}
        </div>
      </SuggestionsFrame>
    );
  }

  const crestUrls = await getCrestSignedUrls(
    supabase,
    view.rows.flatMap((row) => (row.crest_path ? [row.crest_path] : [])),
  );

  return (
    <SuggestionsFrame subtitle={view.subtitle}>
      <SuggestionFilters radius={criteria.radius} />

      <ul className="grid gap-4 lg:grid-cols-2">
        {view.rows.map((row) => (
          <SuggestedTeamCard
            key={row.vacancy_id}
            suggestion={row}
            crestUrl={row.crest_path ? (crestUrls.get(row.crest_path) ?? null) : null}
          />
        ))}
      </ul>

      <SearchPagination
        page={criteria.page}
        totalPages={view.totalPages}
        hrefFor={(page) => suggestionsHref(criteria, page)}
      />
    </SuggestionsFrame>
  );
}

function SuggestionsFrame({ subtitle, children }: { subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Equipos sugeridos</h1>
          {subtitle ? <p className="text-zinc-600">{subtitle}</p> : null}
        </header>
        {children}
      </div>
    </div>
  );
}
