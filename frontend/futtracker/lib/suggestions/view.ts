import type { Player } from "@/lib/data/players";
import type { SuggestTeamsResult, TeamSuggestion } from "@/lib/data/suggestions";
import { getPositionLabel } from "@/lib/format/playerLabels";
import { PROFILE_FAILURE_MESSAGES, suggestionsSubtitle } from "@/lib/format/suggestionLabels";
import { MAX_SEARCH_RADIUS } from "@/lib/search/params";
import {
  suggestionsHref,
  suggestionsPageCount,
  type SuggestionCriteria,
} from "@/lib/suggestions/params";

export type SuggestionsView =
  | { kind: "notFound" }
  | { kind: "profileIncomplete"; message: string }
  | { kind: "redirect"; href: string }
  | { kind: "empty"; subtitle: string; maxRadiusHref: string | null }
  | { kind: "results"; subtitle: string; rows: TeamSuggestion[]; totalPages: number };

export function suggestionsView(
  criteria: SuggestionCriteria,
  result: SuggestTeamsResult,
  player: Pick<Player, "position" | "city"> | null,
): SuggestionsView {
  if (!result.ok) {
    return result.reason === "playersOnly"
      ? { kind: "notFound" }
      : { kind: "profileIncomplete", message: PROFILE_FAILURE_MESSAGES[result.reason] };
  }

  const { rows, total } = result;

  if (rows.length === 0 && criteria.page > 1) {
    return { kind: "redirect", href: suggestionsHref(criteria, 1) };
  }

  const subtitle = suggestionsSubtitle(
    total,
    getPositionLabel(player?.position ?? null),
    criteria.radius,
    player?.city ?? null,
  );

  if (rows.length === 0) {
    return {
      kind: "empty",
      subtitle,
      maxRadiusHref:
        criteria.radius < MAX_SEARCH_RADIUS ? suggestionsHref({ radius: MAX_SEARCH_RADIUS }) : null,
    };
  }

  return { kind: "results", subtitle, rows, totalPages: suggestionsPageCount(total) };
}
