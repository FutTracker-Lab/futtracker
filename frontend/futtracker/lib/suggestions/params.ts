import { RouteConstants } from "@/lib/routes";
import {
  first,
  pageSchema,
  radiusSchema,
  valueOr,
  type RawSearchParams,
  type SearchRadius,
} from "@/lib/search/params";

export const SUGGESTIONS_PAGE_SIZE = 10;

export type SuggestionCriteria = {
  radius: SearchRadius;
  page: number;
};

export const DEFAULT_SUGGESTION_CRITERIA: SuggestionCriteria = { radius: 25, page: 1 };

export function parseSuggestionParams(raw: RawSearchParams): SuggestionCriteria {
  return {
    radius: valueOr(radiusSchema, first(raw.radio), DEFAULT_SUGGESTION_CRITERIA.radius),
    page: valueOr(pageSchema, first(raw.pagina), DEFAULT_SUGGESTION_CRITERIA.page),
  };
}

export function suggestionsHref({ radius }: Pick<SuggestionCriteria, "radius">, page?: number): string {
  const params = new URLSearchParams();

  if (radius !== DEFAULT_SUGGESTION_CRITERIA.radius) {
    params.set("radio", String(radius));
  }
  if (page !== undefined) {
    params.set("pagina", String(page));
  }

  const query = params.toString();
  return query ? `${RouteConstants.suggestions}?${query}` : RouteConstants.suggestions;
}

export function suggestionsPageCount(total: number): number {
  return Math.ceil(total / SUGGESTIONS_PAGE_SIZE);
}

export function toSuggestTeamsParams({ radius, page }: SuggestionCriteria) {
  return {
    radius,
    limit: SUGGESTIONS_PAGE_SIZE,
    offset: (page - 1) * SUGGESTIONS_PAGE_SIZE,
  };
}
