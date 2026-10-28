import { describe, expect, it } from "vitest";

import { radiusOptionLabel, suggestionsSubtitle } from "@/lib/format/suggestionLabels";

describe("suggestionsSubtitle", () => {
  it("en singular con un equipo", () => {
    expect(suggestionsSubtitle(1, "Mediocampista", 25, "San Isidro")).toBe(
      "1 equipo busca tu posición (Mediocampista) a menos de 25 km de San Isidro.",
    );
  });

  it("en plural con varios", () => {
    expect(suggestionsSubtitle(2, "Mediocampista", 50, "San Isidro")).toBe(
      "2 equipos buscan tu posición (Mediocampista) a menos de 50 km de San Isidro.",
    );
  });

  it("sin ciudad termina en 'de tu ubicación.'", () => {
    expect(suggestionsSubtitle(0, "Arquero", 200, null)).toBe(
      "0 equipos buscan tu posición (Arquero) a menos de 200 km de tu ubicación.",
    );
  });
});

describe("radiusOptionLabel", () => {
  it("dice 'Hasta {n} km'", () => {
    expect(radiusOptionLabel(25)).toBe("Hasta 25 km");
  });
});
