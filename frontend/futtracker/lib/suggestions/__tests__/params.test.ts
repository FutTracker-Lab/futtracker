import { describe, expect, it } from "vitest";

import {
  DEFAULT_SUGGESTION_CRITERIA,
  parseSuggestionParams,
  suggestionsHref,
  suggestionsPageCount,
  toSuggestTeamsParams,
} from "@/lib/suggestions/params";

describe("parseSuggestionParams", () => {
  it("sin parámetros usa 25 km y página 1", () => {
    expect(parseSuggestionParams({})).toEqual(DEFAULT_SUGGESTION_CRITERIA);
    expect(DEFAULT_SUGGESTION_CRITERIA).toEqual({ radius: 25, page: 1 });
  });

  it("lee los valores válidos", () => {
    expect(parseSuggestionParams({ radio: "50", pagina: "2" })).toEqual({ radius: 50, page: 2 });
  });

  it.each(["999", "30", "abc", "0", "-10", ""])("ignora radio=%s y usa 25", (radio) => {
    expect(parseSuggestionParams({ radio }).radius).toBe(25);
  });

  it.each(["abc", "0", "-1", "1.5"])("ignora pagina=%s y usa 1", (pagina) => {
    expect(parseSuggestionParams({ pagina }).page).toBe(1);
  });

  it("con el parámetro repetido toma el primero", () => {
    expect(parseSuggestionParams({ radio: ["100", "10"] }).radius).toBe(100);
  });
});

describe("suggestionsHref", () => {
  it("sin parámetros con los valores por defecto", () => {
    expect(suggestionsHref({ radius: 25 })).toBe("/sugerencias");
  });

  it("conserva el radio al paginar", () => {
    expect(suggestionsHref({ radius: 50 }, 1)).toBe("/sugerencias?radio=50&pagina=1");
    expect(suggestionsHref({ radius: 50 }, 2)).toBe("/sugerencias?radio=50&pagina=2");
  });

  it("'Probar con 200 km' lleva a radio=200", () => {
    expect(suggestionsHref({ radius: 200 })).toBe("/sugerencias?radio=200");
  });
});

describe("toSuggestTeamsParams", () => {
  it("pide 10 por página con el offset de la página", () => {
    expect(toSuggestTeamsParams({ radius: 50, page: 1 })).toEqual({
      radiusKm: 50,
      limit: 10,
      offset: 0,
    });
    expect(toSuggestTeamsParams({ radius: 50, page: 3 }).offset).toBe(20);
  });
});

describe("suggestionsPageCount", () => {
  it("una sola página hasta 10 resultados", () => {
    expect(suggestionsPageCount(0)).toBe(0);
    expect(suggestionsPageCount(10)).toBe(1);
    expect(suggestionsPageCount(11)).toBe(2);
  });
});
