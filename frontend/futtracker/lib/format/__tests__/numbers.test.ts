import { describe, expect, it } from "vitest";

import {
  formatCount,
  formatGoalsPerMatch,
  formatInteger,
} from "@/lib/format/numbers";

describe("formatGoalsPerMatch", () => {
  it("usa coma decimal, es-AR (criterio de aceptación de FUT-92)", () => {
    expect(formatGoalsPerMatch(20 / 40)).toBe("0,50");
  });

  it("redondea a dos decimales", () => {
    expect(formatGoalsPerMatch(11 / 52)).toBe("0,21");
  });

  it("trata null/undefined como cero", () => {
    expect(formatGoalsPerMatch(null)).toBe("0,00");
    expect(formatGoalsPerMatch(undefined)).toBe("0,00");
  });
});

describe("formatInteger", () => {
  it("formatea con el separador de miles de es-AR", () => {
    expect(formatInteger(1234)).toBe("1.234");
  });

  it("trata null como cero", () => {
    expect(formatInteger(null)).toBe("0");
  });
});

describe("formatCount", () => {
  it("usa el singular con 1", () => {
    expect(formatCount(1, "partido", "partidos")).toBe("1 partido");
  });

  it("usa el plural con 0 y con más de 1", () => {
    expect(formatCount(0, "partido", "partidos")).toBe("0 partidos");
    expect(formatCount(3, "partido", "partidos")).toBe("3 partidos");
  });
});
