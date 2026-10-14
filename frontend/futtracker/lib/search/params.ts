import { z } from "zod";

import {
  POSITIONS,
  positionSchema,
  type SearchPlayersParams,
} from "@/lib/data/players";
import { RouteConstants } from "@/lib/routes";

export const SEARCH_RADII = [10, 25, 50, 100, 200] as const;
export const SEARCH_STATUSES = ["buscan", "todos"] as const;
export const SEARCH_PAGE_SIZE = 20;

export type SearchRadius = (typeof SEARCH_RADII)[number];
export type SearchStatus = (typeof SEARCH_STATUSES)[number];
export type SearchPosition = (typeof POSITIONS)[number];

export const MAX_SEARCH_RADIUS: SearchRadius = 200;

export type SearchCriteria = {
  radius: SearchRadius;
  position: SearchPosition | null;
  status: SearchStatus;
  page: number;
};

export const DEFAULT_SEARCH_FILTERS: SearchCriteria = {
  radius: 10,
  position: null,
  status: "buscan",
  page: 1,
};

const radiusSchema = z.coerce.number().pipe(z.literal(SEARCH_RADII));
const statusSchema = z.enum(SEARCH_STATUSES);
// Tope para que un `pagina` enorme no desborde el `int` del offset en la base.
const pageSchema = z.coerce.number().int().min(1).max(100_000);

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function valueOr<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const result = schema.safeParse(value);
  return result.success ? result.data : fallback;
}

export function parseSearchFilters(raw: RawSearchParams): SearchCriteria {
  return {
    radius: valueOr(radiusSchema, first(raw.radio), DEFAULT_SEARCH_FILTERS.radius),
    position: valueOr(positionSchema.nullable(), first(raw.posicion) ?? null, null),
    status: valueOr(statusSchema, first(raw.estado), DEFAULT_SEARCH_FILTERS.status),
    page: valueOr(pageSchema, first(raw.pagina), DEFAULT_SEARCH_FILTERS.page),
  };
}

export function searchHref(
  filters: Omit<SearchCriteria, "page">,
  page?: number,
): string {
  const params = new URLSearchParams();

  if (filters.radius !== DEFAULT_SEARCH_FILTERS.radius) {
    params.set("radio", String(filters.radius));
  }
  if (filters.position) {
    params.set("posicion", filters.position);
  }
  if (filters.status !== DEFAULT_SEARCH_FILTERS.status) {
    params.set("estado", filters.status);
  }
  if (page !== undefined) {
    params.set("pagina", String(page));
  }

  const query = params.toString();
  return query ? `${RouteConstants.search}?${query}` : RouteConstants.search;
}

export function toSearchPlayersParams(criteria: SearchCriteria): SearchPlayersParams {
  return {
    radius: criteria.radius,
    position: criteria.position,
    seekingOnly: criteria.status === "buscan",
    limit: SEARCH_PAGE_SIZE,
    offset: (criteria.page - 1) * SEARCH_PAGE_SIZE,
  };
}
