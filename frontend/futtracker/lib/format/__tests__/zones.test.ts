import { describe, expect, it } from "vitest";

import type { Zone } from "@/lib/data/zones";
import { previousLocationHint, zoneGroupsFrom } from "@/lib/format/zones";

const ZONES: Zone[] = [
  { id: "pilar", name: "Pilar", province: "Buenos Aires" },
  { id: "villa-urquiza", name: "Villa Urquiza", province: "CABA" },
  { id: "rosario", name: "Rosario", province: "Santa Fe" },
  { id: "agronomia", name: "Agronomía", province: "CABA" },
  { id: "san-isidro", name: "San Isidro", province: "Buenos Aires" },
  { id: "almagro", name: "Almagro", province: "CABA" },
];

describe("zoneGroupsFrom", () => {
  it("arma CABA primero y Gran Buenos Aires después, cada uno alfabético", () => {
    expect(zoneGroupsFrom(ZONES)).toEqual([
      {
        label: "CABA",
        options: [
          { value: "agronomia", label: "Agronomía" },
          { value: "almagro", label: "Almagro" },
          { value: "villa-urquiza", label: "Villa Urquiza" },
        ],
      },
      {
        label: "Gran Buenos Aires",
        options: [
          { value: "pilar", label: "Pilar" },
          { value: "san-isidro", label: "San Isidro" },
        ],
      },
    ]);
  });

  it("deja afuera las zonas de otras provincias", () => {
    const values = zoneGroupsFrom(ZONES).flatMap((group) =>
      group.options.map((option) => option.value),
    );

    expect(values).not.toContain("rosario");
  });

  it("no devuelve grupos vacíos", () => {
    expect(zoneGroupsFrom([{ id: "pilar", name: "Pilar", province: "Buenos Aires" }])).toEqual([
      { label: "Gran Buenos Aires", options: [{ value: "pilar", label: "Pilar" }] },
    ]);
    expect(zoneGroupsFrom([])).toEqual([]);
  });
});

describe("previousLocationHint", () => {
  it("muestra ciudad y provincia de un perfil anterior al cambio", () => {
    expect(
      previousLocationHint({ zone_id: null, city: "Pilar", province: "Buenos Aires" }, ZONES),
    ).toBe("Antes cargaste: Pilar, Buenos Aires. Elegí la zona más cercana.");
  });

  it("muestra solo la ciudad si no hay provincia", () => {
    expect(previousLocationHint({ zone_id: null, city: "Pilar", province: null }, ZONES)).toBe(
      "Antes cargaste: Pilar. Elegí la zona más cercana.",
    );
  });

  it("no muestra nada si la fila ya tiene una zona de la lista", () => {
    expect(
      previousLocationHint({ zone_id: "pilar", city: "Pilar", province: "Buenos Aires" }, ZONES),
    ).toBeNull();
  });

  // Una zona desactivada no está en la lista: se trata como un perfil sin zona.
  it("trata una zona que no está en la lista como un perfil sin zona", () => {
    expect(
      previousLocationHint({ zone_id: "vieja", city: "Vieja", province: "Buenos Aires" }, ZONES),
    ).toBe("Antes cargaste: Vieja, Buenos Aires. Elegí la zona más cercana.");
  });

  it("no muestra nada sin fila o sin ciudad", () => {
    expect(previousLocationHint(null, ZONES)).toBeNull();
    expect(previousLocationHint({ zone_id: null, city: null, province: null }, ZONES)).toBeNull();
  });
});
