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

  it("con tres o más palabras, usa las dos primeras", () => {
    expect(initialsOf("Juan Martín Pérez")).toBe("JM");
  });

  it("devuelve string vacío para un nombre vacío", () => {
    expect(initialsOf("")).toBe("");
  });

  it("devuelve las iniciales de un nombre y apellido simples", () => {
    expect(initialsOf("Ana Gómez")).toBe("AG");
  });

  it("no parte un emoji en la segunda palabra", () => {
    expect(initialsOf("Ana 😀")).toBe("A😀");
  });

  it("no parte un emoji en la primera palabra", () => {
    expect(initialsOf("😀 Ana")).toBe("😀A");
  });

  it("no parte un emoji cuando es el único nombre", () => {
    expect(initialsOf("😀")).toBe("😀");
  });

  it("ignora un emoji que queda en la tercera palabra", () => {
    expect(initialsOf("QA Dod25 😀")).toBe("QD");
  });
});
