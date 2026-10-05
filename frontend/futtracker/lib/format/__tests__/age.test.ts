import { afterEach, describe, expect, it, vi } from "vitest";

import { calculateAge } from "@/lib/format/age";

describe("calculateAge", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve null si no hay fecha de nacimiento", () => {
    expect(calculateAge(null)).toBeNull();
  });

  it("resta un año si todavía no llegó el cumpleaños de este año", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 28)); // 28 de febrero de 2026
    expect(calculateAge("2001-03-01")).toBe(24);
  });

  it("suma el año si el cumpleaños ya pasó", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 2)); // 2 de marzo de 2026
    expect(calculateAge("2001-03-01")).toBe(25);
  });

  it("cumple años justo hoy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 1)); // 1 de marzo de 2026
    expect(calculateAge("2001-03-01")).toBe(25);
  });

  it("no se ve afectado por timezones con offset negativo (bug de PR #9)", () => {
    // Antes del fix, `new Date("2001-03-01")` se interpretaba en UTC
    // (2001-03-01T00:00:00Z), que en un runtime en ART (UTC-3) sigue siendo
    // 2001-02-28 en hora local — corriendo el mes de comparación un día.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 28)); // 28 de febrero, un día antes
    expect(calculateAge("2001-03-01")).toBe(24);
  });
});
