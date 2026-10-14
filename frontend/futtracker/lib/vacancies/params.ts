import { z } from "zod";

import { positionSchema, type Position } from "@/lib/data/players";
import { RouteConstants } from "@/lib/routes";
import { first, pageSchema, valueOr, type RawSearchParams } from "@/lib/search/params";

export const VACANCIES_PAGE_SIZE = 10;

export const VACANCY_BOARD_TABS = ["abiertas", "postulaciones"] as const;
export type VacancyBoardTab = (typeof VACANCY_BOARD_TABS)[number];

export type VacancyBoardCriteria = {
  tab: VacancyBoardTab;
  position: Position | null;
  page: number;
};

const tabSchema = z.enum(VACANCY_BOARD_TABS);

export function parseVacancyBoardParams(raw: RawSearchParams): VacancyBoardCriteria {
  return {
    tab: valueOr(tabSchema, first(raw.tab), "abiertas"),
    position: valueOr(positionSchema.nullable(), first(raw.posicion) ?? null, null),
    page: valueOr(pageSchema, first(raw.pagina), 1),
  };
}

export function vacanciesHref(
  { position }: Pick<VacancyBoardCriteria, "position">,
  page?: number,
): string {
  const params = new URLSearchParams();

  if (position) {
    params.set("posicion", position);
  }
  if (page !== undefined) {
    params.set("pagina", String(page));
  }

  const query = params.toString();
  return query ? `${RouteConstants.vacancies.board}?${query}` : RouteConstants.vacancies.board;
}

export function vacanciesPageCount(total: number): number {
  return Math.ceil(total / VACANCIES_PAGE_SIZE);
}

export function toListOpenVacanciesParams({ position, page }: VacancyBoardCriteria) {
  return {
    position: position ?? undefined,
    limit: VACANCIES_PAGE_SIZE,
    offset: (page - 1) * VACANCIES_PAGE_SIZE,
  };
}
