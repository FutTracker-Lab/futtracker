import { describe, expect, it } from "vitest";

import {
  activeFilterChips,
  pageCount,
  resultsSubtitle,
} from "@/components/search/searchView";
import { DEFAULT_SEARCH_FILTERS } from "@/lib/search/params";

describe("resultsSubtitle", () => {
  it("usa el singular con un jugador", () => {
    expect(resultsSubtitle(1, 10, "Pilar")).toBe(
      "1 jugador disponible a menos de 10 km de Pilar.",
    );
  });

  it("usa el plural con varios y con cero", () => {
    expect(resultsSubtitle(29, 50, "Pilar")).toBe(
      "29 jugadores disponibles a menos de 50 km de Pilar.",
    );
    expect(resultsSubtitle(0, 10, "Pilar")).toBe(
      "0 jugadores disponibles a menos de 10 km de Pilar.",
    );
  });

  it("sin ciudad del equipo termina en 'de tu equipo.'", () => {
    expect(resultsSubtitle(3, 50, null)).toBe(
      "3 jugadores disponibles a menos de 50 km de tu equipo.",
    );
  });
});

describe("activeFilterChips", () => {
  it("quitar la posición conserva el radio", () => {
    const chips = activeFilterChips({
      ...DEFAULT_SEARCH_FILTERS,
      radius: 50,
      position: "mediocampista",
    });

    expect(chips[0]).toEqual({ label: "Mediocampista", removeHref: "/jugadores?radio=50" });
  });

  it("'Agente libre' aparece con el estado por defecto y quitarlo pasa a todos", () => {
    expect(activeFilterChips(DEFAULT_SEARCH_FILTERS)).toEqual([
      { label: "Agente libre", removeHref: "/jugadores?estado=todos" },
    ]);
  });

  it("con estado todos y sin posición no hay chips", () => {
    expect(
      activeFilterChips({ ...DEFAULT_SEARCH_FILTERS, status: "todos" }),
    ).toEqual([]);
  });

  it("quitar un chip vuelve a la primera página", () => {
    const [chip] = activeFilterChips({
      ...DEFAULT_SEARCH_FILTERS,
      position: "arquero",
      page: 3,
    });

    expect(chip.removeHref).not.toContain("pagina");
  });
});

describe("pageCount", () => {
  it("redondea para arriba de a 20", () => {
    expect(pageCount(0)).toBe(0);
    expect(pageCount(3)).toBe(1);
    expect(pageCount(20)).toBe(1);
    expect(pageCount(29)).toBe(2);
  });
});
