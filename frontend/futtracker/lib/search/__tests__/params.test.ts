import { describe, expect, it } from "vitest";

import {
  DEFAULT_SEARCH_FILTERS,
  parseSearchFilters,
  searchHref,
  toSearchPlayersParams,
} from "@/lib/search/params";

describe("parseSearchFilters", () => {
  it("sin parámetros usa 10 km, todas las posiciones, buscan y página 1", () => {
    expect(parseSearchFilters({})).toEqual(DEFAULT_SEARCH_FILTERS);
  });

  it("lee los valores válidos", () => {
    expect(
      parseSearchFilters({
        radio: "50",
        posicion: "mediocampista",
        estado: "todos",
        pagina: "2",
      }),
    ).toEqual({ radius: 50, position: "mediocampista", status: "todos", page: 2 });
  });

  it("ignora un radio fuera de la lista", () => {
    expect(parseSearchFilters({ radio: "999" }).radius).toBe(10);
    expect(parseSearchFilters({ radio: "30" }).radius).toBe(10);
    expect(parseSearchFilters({ radio: "abc" }).radius).toBe(10);
  });

  it("ignora una posición que no existe o vacía (la opción Todas)", () => {
    expect(parseSearchFilters({ posicion: "portero" }).position).toBeNull();
    expect(parseSearchFilters({ posicion: "" }).position).toBeNull();
  });

  it("con estado y página inválidos usa buscan y 1", () => {
    const filters = parseSearchFilters({ estado: "xyz", pagina: "abc" });

    expect(filters.status).toBe("buscan");
    expect(filters.page).toBe(1);
  });

  it("no acepta páginas cero, negativas ni con decimales", () => {
    expect(parseSearchFilters({ pagina: "0" }).page).toBe(1);
    expect(parseSearchFilters({ pagina: "-3" }).page).toBe(1);
    expect(parseSearchFilters({ pagina: "1.5" }).page).toBe(1);
  });

  it("con un parámetro repetido toma el primero", () => {
    expect(parseSearchFilters({ radio: ["25", "50"] }).radius).toBe(25);
  });
});

describe("searchHref", () => {
  it("sin filtros vuelve a /jugadores sin parámetros", () => {
    expect(searchHref(DEFAULT_SEARCH_FILTERS)).toBe("/jugadores");
  });

  it("omite los valores por defecto y conserva el resto", () => {
    expect(
      searchHref({ radius: 50, position: null, status: "buscan" }),
    ).toBe("/jugadores?radio=50");
  });

  it("arma la vuelta a la página 1 que pide el redirect", () => {
    expect(
      searchHref({ radius: 50, position: null, status: "todos" }, 1),
    ).toBe("/jugadores?radio=50&estado=todos&pagina=1");
  });

  it("conserva la posición al probar con 200 km", () => {
    expect(
      searchHref({ radius: 200, position: "arquero", status: "buscan" }),
    ).toBe("/jugadores?radio=200&posicion=arquero");
  });
});

describe("toSearchPlayersParams", () => {
  it("pide de a 20 con el offset de la página y solo los que buscan por defecto", () => {
    expect(toSearchPlayersParams({ ...DEFAULT_SEARCH_FILTERS, radius: 50, page: 2 })).toEqual({
      radius: 50,
      position: null,
      seekingOnly: true,
      limit: 20,
      offset: 20,
    });
  });

  it("con estado todos no filtra por los que buscan", () => {
    expect(
      toSearchPlayersParams({ ...DEFAULT_SEARCH_FILTERS, status: "todos" }).seekingOnly,
    ).toBe(false);
  });
});
