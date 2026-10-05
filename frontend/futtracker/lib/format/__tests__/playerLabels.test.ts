import { describe, expect, it } from "vitest";

import { getPositionLabel, getPreferredFootLabel } from "@/lib/format/playerLabels";

describe("getPositionLabel", () => {
  it("traduce un valor conocido", () => {
    expect(getPositionLabel("delantero")).toBe("Delantero");
  });

  it("devuelve null para null", () => {
    expect(getPositionLabel(null)).toBeNull();
  });

  it("devuelve null (no 'undefined') para un valor no contemplado en el mapa", () => {
    // Bug de review en PR #9: antes del fix esto devolvía `undefined` y se
    // renderizaba literalmente en vez de caer al fallback de la UI.
    expect(getPositionLabel("portero")).toBeNull();
  });
});

describe("getPreferredFootLabel", () => {
  it("traduce un valor conocido", () => {
    expect(getPreferredFootLabel("ambidiestro")).toBe("Ambidiestro");
  });

  it("devuelve null para un valor no contemplado en el mapa", () => {
    expect(getPreferredFootLabel("cabeza")).toBeNull();
  });
});
