import { describe, expect, it } from "vitest";

import { initialsOf } from "@/lib/format/initials";

describe("initialsOf", () => {
  it("toma la primera letra del nombre y la primera del apellido", () => {
    expect(initialsOf("Tomás Peralta")).toBe("TP");
  });

  it("mayúsculiza aunque el nombre venga en minúscula", () => {
    expect(initialsOf("juan perez")).toBe("JP");
  });

  it("usa un solo nombre cuando no hay apellido", () => {
    expect(initialsOf("Madonna")).toBe("M");
  });

  it("ignora espacios de más entre nombre y apellido", () => {
    expect(initialsOf("  Ana   García  ")).toBe("AG");
  });

  it("con tres o más palabras, usa la primera y la última (ignora los del medio)", () => {
    expect(initialsOf("Juan Martín Pérez")).toBe("JP");
  });

  it("devuelve string vacío para un nombre vacío", () => {
    expect(initialsOf("")).toBe("");
  });
});
