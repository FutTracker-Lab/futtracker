import { describe, expect, it } from "vitest";

import {
  formatCareerPeriod,
  formatDayMonthYear,
  formatMonthYear,
  formatShortDate,
} from "@/lib/format/dates";

describe("formatMonthYear", () => {
  it("formatea el mes y año sin corrimiento de timezone", () => {
    // Trampa de FUT-91: `new Date("2025-02-01")` en UTC-3 (ART) cae en enero
    // si se lee con getters locales. `formatMonthYear` parsea el string a
    // mano, así que tiene que decir "feb 2025", nunca "ene 2025".
    expect(formatMonthYear("2025-02-01")).toBe("feb 2025");
  });

  it("cubre los 12 meses", () => {
    expect(formatMonthYear("2024-01-15")).toBe("ene 2024");
    expect(formatMonthYear("2024-12-15")).toBe("dic 2024");
  });
});

describe("formatDayMonthYear", () => {
  it("formatea día, mes abreviado y año, sin corrimiento de timezone", () => {
    expect(formatDayMonthYear("2025-04-12")).toBe("12 abr 2025");
  });

  it("no agrega ceros a la izquierda del día", () => {
    expect(formatDayMonthYear("2025-04-05")).toBe("5 abr 2025");
  });
});

describe("formatCareerPeriod", () => {
  it("cierra con Actualidad cuando is_current es true, aunque haya end_date", () => {
    expect(formatCareerPeriod("2023-03-01", null, true)).toBe(
      "mar 2023 – Actualidad",
    );
    expect(formatCareerPeriod("2023-03-01", "2024-01-10", true)).toBe(
      "mar 2023 – Actualidad",
    );
  });

  it("cierra con el mes/año de end_date cuando la etapa terminó", () => {
    expect(formatCareerPeriod("2021-08-01", "2023-02-15", false)).toBe(
      "ago 2021 – feb 2023",
    );
  });

  it("cae a un guion si una etapa cerrada no tiene end_date (dato inconsistente)", () => {
    expect(formatCareerPeriod("2021-08-01", null, false)).toBe("ago 2021 – —");
  });
});

describe("formatShortDate", () => {
  const NOW = new Date("2026-10-05T15:00:00Z");

  it("omite el año cuando es el actual", () => {
    expect(formatShortDate("2026-08-03T15:00:00Z", NOW)).toBe("3 ago");
  });

  it("agrega el año cuando no es el actual", () => {
    expect(formatShortDate("2025-08-03T15:00:00Z", NOW)).toBe("3 ago 2025");
  });

  // 01:00 UTC del 4 todavía es el 3 a la noche en Argentina.
  it("toma el día en hora de Argentina", () => {
    expect(formatShortDate("2026-08-04T01:00:00Z", NOW)).toBe("3 ago");
  });

  it("toma el año en hora de Argentina", () => {
    expect(
      formatShortDate("2026-01-01T02:00:00Z", new Date("2026-01-01T12:00:00Z")),
    ).toBe("31 dic 2025");
  });
});
