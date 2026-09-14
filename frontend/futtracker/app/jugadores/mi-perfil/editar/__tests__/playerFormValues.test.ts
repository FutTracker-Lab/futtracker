import { describe, expect, it } from "vitest";

import { playerInputSchema, type Player } from "@/lib/data/players";
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
  bio: "Nueve de área.",
  phone: "+54 9 11 4000-0001",
  is_seeking_team: true,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

describe("initialValuesFrom", () => {
  it("precarga los valores de la fila como strings de formulario", () => {
    const values = initialValuesFrom("Lucía Fernández", PLAYER);

    expect(values.fullName).toBe("Lucía Fernández");
    expect(values.heightCm).toBe("178");
    expect(values.position).toBe("delantero");
    expect(values.isSeekingTeam).toBe(true);
  });

  it("usa vacíos y los defaults cuando todavía no hay ficha", () => {
    const values = initialValuesFrom("Nuevo Jugador", null);

    expect(values.heightCm).toBe("");
    expect(values.position).toBe("");
    // Los dos defaults del formulario para un perfil recién creado.
    expect(values.country).toBe("AR");
    expect(values.isSeekingTeam).toBe(true);
  });
});

describe("toPlayerInput", () => {
  it("convierte los vacíos a null y los números a number", () => {
    const values = initialValuesFrom("Nuevo Jugador", null);
    const input = toPlayerInput(values, null);

    expect(input.height_cm).toBeNull();
    expect(input.position).toBeNull();
    expect(input.birth_date).toBeNull();
    expect(playerInputSchema.safeParse(input).success).toBe(true);
  });

  it("produce un input válido para el schema con la fila completa", () => {
    const values = initialValuesFrom("Lucía Fernández", PLAYER);
    const input = toPlayerInput(values, PLAYER);

    expect(input.height_cm).toBe(178);
    expect(playerInputSchema.safeParse(input).success).toBe(true);
  });

  // El formulario no edita la geolocalización (supuesto 5: se posterga a
  // T09a). Si mandara null, cada guardado borraría lo que haya en la fila.
  it("arrastra latitude y longitude de la fila en vez de borrarlas", () => {
    const values = initialValuesFrom("Lucía Fernández", PLAYER);
    const input = toPlayerInput(values, PLAYER);

    expect(input.latitude).toBe(-34.45);
    expect(input.longitude).toBe(-58.91);
  });
});

describe("fieldErrorsFrom", () => {
  it("devuelve un mensaje en español por cada campo inválido", () => {
    const parsed = playerInputSchema.safeParse({
      ...toPlayerInput(initialValuesFrom("Lucía", null), null),
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
      ...toPlayerInput(initialValuesFrom("Lucía", null), null),
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
});
