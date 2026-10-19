import { describe, expect, it } from "vitest";

import {
  parseVacancyBoardParams,
  toListOpenVacanciesParams,
  vacanciesHref,
  vacanciesPageCount,
} from "@/lib/vacancies/params";

describe("parseVacancyBoardParams", () => {
  it("sin parámetros: Abiertas, todas las posiciones, página 1", () => {
    expect(parseVacancyBoardParams({})).toEqual({ tab: "abiertas", position: null, page: 1 });
  });

  it("lee posición, página y pestaña válidas", () => {
    expect(
      parseVacancyBoardParams({ posicion: "delantero", pagina: "2", tab: "postulaciones" }),
    ).toEqual({ tab: "postulaciones", position: "delantero", page: 2 });
  });

  it.each([
    [{ posicion: "portero" }, { position: null }],
    [{ pagina: "abc" }, { page: 1 }],
    [{ pagina: "0" }, { page: 1 }],
    [{ pagina: "1.5" }, { page: 1 }],
    [{ tab: "otra" }, { tab: "abiertas" }],
  ])("ignora %o y usa el valor por defecto", (raw, expected) => {
    expect(parseVacancyBoardParams(raw)).toMatchObject(expected);
  });

  it("con un parámetro repetido toma el primero", () => {
    expect(parseVacancyBoardParams({ posicion: ["arquero", "defensor"] }).position).toBe(
      "arquero",
    );
  });
});

describe("vacanciesHref", () => {
  it("sin filtros es /vacantes", () => {
    expect(vacanciesHref({ position: null })).toBe("/vacantes");
  });

  it("conserva la posición al cambiar de página", () => {
    expect(vacanciesHref({ position: "delantero" }, 2)).toBe(
      "/vacantes?posicion=delantero&pagina=2",
    );
    expect(vacanciesHref({ position: null }, 1)).toBe("/vacantes?pagina=1");
  });
});

describe("paginado", () => {
  it("10 por página", () => {
    expect(vacanciesPageCount(11)).toBe(2);
    expect(vacanciesPageCount(10)).toBe(1);
    expect(vacanciesPageCount(0)).toBe(0);
    expect(toListOpenVacanciesParams({ tab: "abiertas", position: null, page: 2 })).toEqual({
      position: undefined,
      limit: 10,
      offset: 10,
    });
  });
});
