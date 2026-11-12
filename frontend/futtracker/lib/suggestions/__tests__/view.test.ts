import { describe, expect, it } from "vitest";

import type { SuggestTeamsResult, TeamSuggestion } from "@/lib/data/suggestions";
import { suggestionsView } from "@/lib/suggestions/view";

const P3 = { position: "mediocampista", city: "San Isidro" };

const TB: TeamSuggestion = {
  vacancy_id: "v-b1",
  team_id: "t-b",
  team_name: "Club Vicente López",
  crest_path: null,
  city: "Vicente López",
  province: "Buenos Aires",
  category: null,
  position: "mediocampista",
  modality: "futbol_11",
  level: "intermedio",
  description: null,
  distance_km: 6.6,
  applied: false,
};

function ok(rows: TeamSuggestion[], total = rows.length): SuggestTeamsResult {
  return { ok: true, rows, total };
}

describe("suggestionsView", () => {
  it("una cuenta que no es de jugador ve el 404", () => {
    expect(
      suggestionsView({ radius: 25, page: 1 }, { ok: false, reason: "playersOnly" }, null),
    ).toEqual({ kind: "notFound" });
  });

  it("sin ficha o sin posición pide completar la posición", () => {
    expect(
      suggestionsView({ radius: 25, page: 1 }, { ok: false, reason: "completeProfile" }, null),
    ).toEqual({
      kind: "profileIncomplete",
      message: "Completá tu posición para recibir sugerencias.",
    });
  });

  it("sin ubicación pide completar la ubicación", () => {
    expect(
      suggestionsView({ radius: 25, page: 1 }, { ok: false, reason: "missingLocation" }, P3),
    ).toEqual({
      kind: "profileIncomplete",
      message: "Completá tu ubicación para recibir sugerencias.",
    });
  });

  it("una página fuera de rango vuelve a la 1 conservando el radio", () => {
    expect(suggestionsView({ radius: 50, page: 2 }, ok([], 0), P3)).toEqual({
      kind: "redirect",
      href: "/sugerencias?radio=50&pagina=1",
    });
  });

  it("sin resultados con radio menor a 200 ofrece probar con 200 km", () => {
    expect(suggestionsView({ radius: 25, page: 1 }, ok([]), P3)).toEqual({
      kind: "empty",
      subtitle: "0 equipos buscan tu posición (Mediocampista) a menos de 25 km de San Isidro.",
      maxRadiusHref: "/sugerencias?radio=200",
    });
  });

  it("sin resultados con radio 200 no ofrece el enlace", () => {
    const view = suggestionsView({ radius: 200, page: 1 }, ok([]), P3);

    expect(view).toMatchObject({ kind: "empty", maxRadiusHref: null });
  });

  it("con resultados devuelve las filas, el subtítulo y las páginas", () => {
    expect(suggestionsView({ radius: 25, page: 1 }, ok([TB], 11), P3)).toEqual({
      kind: "results",
      subtitle: "11 equipos buscan tu posición (Mediocampista) a menos de 25 km de San Isidro.",
      rows: [TB],
      totalPages: 2,
    });
  });

  it("sin ficha del jugador el subtítulo sale igual, sin la posición", () => {
    const view = suggestionsView({ radius: 25, page: 1 }, ok([TB]), null);

    expect(view).toMatchObject({
      kind: "results",
      subtitle: "1 equipo busca tu posición a menos de 25 km de tu ubicación.",
    });
  });
});
