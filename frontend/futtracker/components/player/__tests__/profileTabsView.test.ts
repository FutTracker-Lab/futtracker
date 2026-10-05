import { describe, expect, it } from "vitest";

import { PROFILE_TABS, resolveProfileTab } from "@/components/player/profileTabsView";

describe("resolveProfileTab", () => {
  it("sin parámetro, activa Resumen", () => {
    expect(resolveProfileTab(undefined)).toBe("resumen");
  });

  it("con un valor válido, activa esa pestaña", () => {
    expect(resolveProfileTab("estadisticas")).toBe("estadisticas");
  });

  it("con un valor inválido, activa Resumen", () => {
    expect(resolveProfileTab("xyz")).toBe("resumen");
  });

  it("con el parámetro repetido, activa Resumen", () => {
    expect(resolveProfileTab(["estadisticas", "resumen"])).toBe("resumen");
  });
});

describe("PROFILE_TABS", () => {
  it("tiene solo Resumen y Estadísticas", () => {
    expect(PROFILE_TABS.map((tab) => tab.id)).toEqual(["resumen", "estadisticas"]);
  });
});
