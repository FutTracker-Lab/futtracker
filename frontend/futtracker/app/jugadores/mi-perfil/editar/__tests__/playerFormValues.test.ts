import { describe, expect, it } from "vitest";

import { playerInputSchema, type Player } from "@/lib/data/players";
import type { Zone } from "@/lib/data/zones";
import {
  fieldErrorsFrom,
  initialValuesFrom,
  toPlayerInput,
} from "@/app/jugadores/mi-perfil/editar/playerFormValues";

const PLAYER: Player = {
  id: "11111111-1111-4111-8111-111111111111",
  birth_date: "2001-03-01",
  position: "delantero",
  preferred_foot: "derecha",
  height_cm: 178,
  weight_kg: 72,
  city: "Pilar",
  province: "Buenos Aires",
  country: "AR",
  latitude: -34.45,
  longitude: -58.91,
  zone_id: "pilar",
  bio: "Nueve de área.",
  phone: "+54 9 11 4000-0001",
  is_seeking_team: true,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const ZONES: Zone[] = [
  { id: "pilar", name: "Pilar", province: "Buenos Aires" },
  { id: "san-isidro", name: "San Isidro", province: "Buenos Aires" },
];

describe("initialValuesFrom", () => {
  it("precarga los valores de la fila como strings de formulario", () => {
    const values = initialValuesFrom("Lucía Fernández", PLAYER, ZONES);

    expect(values.fullName).toBe("Lucía Fernández");
    expect(values.heightCm).toBe("178");
    expect(values.position).toBe("delantero");
    expect(values.zoneId).toBe("pilar");
    expect(values.isSeekingTeam).toBe(true);
  });

  it("arranca sin zona si la fila no tiene una de la lista", () => {
    expect(initialValuesFrom("L", { ...PLAYER, zone_id: null }, ZONES).zoneId).toBe("");
    // Una zona desactivada se trata como un perfil sin zona.
    expect(initialValuesFrom("L", { ...PLAYER, zone_id: "vieja" }, ZONES).zoneId).toBe("");
  });

  it("usa vacíos y los defaults cuando todavía no hay ficha", () => {
    const values = initialValuesFrom("Nuevo Jugador", null, ZONES);

    expect(values.heightCm).toBe("");
    expect(values.position).toBe("");
    expect(values.zoneId).toBe("");
    // Los dos defaults del formulario para un perfil recién creado.
    expect(values.country).toBe("AR");
    expect(values.isSeekingTeam).toBe(true);
  });
});

describe("toPlayerInput", () => {
  it("convierte los vacíos a null y los números a number", () => {
    const values = { ...initialValuesFrom("Nuevo Jugador", null, ZONES), zoneId: "pilar" };
    const input = toPlayerInput(values);

    expect(input.height_cm).toBeNull();
    expect(input.position).toBeNull();
    expect(input.birth_date).toBeNull();
    expect(playerInputSchema.safeParse(input).success).toBe(true);
  });

  it("produce un input válido para el schema con la fila completa", () => {
    const values = initialValuesFrom("Lucía Fernández", PLAYER, ZONES);
    const input = toPlayerInput(values);

    expect(input.height_cm).toBe(178);
    expect(playerInputSchema.safeParse(input).success).toBe(true);
  });

  it("manda zone_id y no la ciudad, la provincia ni las coordenadas", () => {
    const input = toPlayerInput(initialValuesFrom("Lucía Fernández", PLAYER, ZONES));

    expect(input.zone_id).toBe("pilar");
    expect(input).not.toHaveProperty("city");
    expect(input).not.toHaveProperty("province");
    expect(input).not.toHaveProperty("latitude");
    expect(input).not.toHaveProperty("longitude");
  });
});

describe("fieldErrorsFrom", () => {
  it("devuelve un mensaje en español por cada campo inválido", () => {
    const parsed = playerInputSchema.safeParse({
      ...toPlayerInput(initialValuesFrom("Lucía", PLAYER, ZONES)),
      height_cm: 999,
      phone: "123",
    });

    if (parsed.success) {
      throw new Error("el input de prueba tenía que ser inválido");
    }

    const errors = fieldErrorsFrom(parsed.error);

    expect(errors.height_cm).toBe("La altura tiene que estar entre 100 y 250 cm.");
    expect(errors.phone).toBe("El teléfono tiene que tener entre 6 y 30 caracteres.");
  });

  it("reporta todos los campos con error, no solo el primero", () => {
    const parsed = playerInputSchema.safeParse({
      ...toPlayerInput(initialValuesFrom("Lucía", PLAYER, ZONES)),
      height_cm: 999,
      weight_kg: 5,
      phone: "123",
    });

    if (parsed.success) {
      throw new Error("el input de prueba tenía que ser inválido");
    }

    expect(Object.keys(fieldErrorsFrom(parsed.error)).sort()).toEqual([
      "height_cm",
      "phone",
      "weight_kg",
    ]);
  });

  it("pide elegir una zona de la lista si no hay zona", () => {
    const parsed = playerInputSchema.safeParse(
      toPlayerInput(initialValuesFrom("Lucía", null, ZONES)),
    );

    if (parsed.success) {
      throw new Error("el input de prueba tenía que ser inválido");
    }

    expect(fieldErrorsFrom(parsed.error).zone_id).toBe("Elegí una zona de la lista.");
  });
});
