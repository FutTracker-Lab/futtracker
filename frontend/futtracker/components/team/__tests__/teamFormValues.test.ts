import { describe, expect, it } from "vitest";

import { teamInputSchema, type Team } from "@/lib/data/teams";
import {
  fieldErrorsFrom,
  initialValuesFrom,
  toTeamInput,
} from "@/components/team/teamFormValues";

const TEAM: Team = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  owner_id: "66666666-6666-4666-8666-666666666666",
  name: "Club Atlético Pilar",
  club_name: "Club Atlético Pilar",
  category: "Primera",
  league: "Liga de Pilar",
  city: "Pilar",
  province: "Buenos Aires",
  country: "AR",
  latitude: -34.4583,
  longitude: -58.9142,
  founded_year: 1954,
  crest_path: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/escudo.png",
  bio: "Club de barrio con cancha propia.",
  contact_email: "delegado@example.com",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

describe("initialValuesFrom", () => {
  it("precarga los valores de la fila como strings de formulario", () => {
    const values = initialValuesFrom(TEAM);

    expect(values.name).toBe("Club Atlético Pilar");
    expect(values.foundedYear).toBe("1954");
    expect(values.country).toBe("AR");
  });

  it("usa vacíos y el país por defecto al crear", () => {
    const values = initialValuesFrom(null);

    expect(values.name).toBe("");
    expect(values.foundedYear).toBe("");
    expect(values.country).toBe("AR");
  });
});

describe("toTeamInput", () => {
  it("produce un input válido para el schema con la fila completa", () => {
    const input = toTeamInput(initialValuesFrom(TEAM), TEAM);

    expect(input.founded_year).toBe(1954);
    expect(teamInputSchema.safeParse(input).success).toBe(true);
  });

  it("convierte los vacíos a null", () => {
    const values = { ...initialValuesFrom(null), name: "Racing" };
    const input = toTeamInput(values, null);

    expect(input.city).toBeNull();
    expect(input.founded_year).toBeNull();
    expect(input.contact_email).toBeNull();
    expect(teamInputSchema.safeParse(input).success).toBe(true);
  });

  // El formulario no edita ni la geolocalización ni `club_name` (decisión 4
  // de las discrepancias). Si los mandara en null, cada guardado los borraría.
  it("arrastra club_name, latitude y longitude de la fila", () => {
    const input = toTeamInput(initialValuesFrom(TEAM), TEAM);

    expect(input.club_name).toBe("Club Atlético Pilar");
    expect(input.latitude).toBe(-34.4583);
    expect(input.longitude).toBe(-58.9142);
  });

  it("recorta los espacios del nombre, que es lo que compara el índice único", () => {
    const values = { ...initialValuesFrom(null), name: "  Racing  " };

    expect(toTeamInput(values, null).name).toBe("Racing");
  });
});

describe("fieldErrorsFrom", () => {
  it("devuelve un mensaje en español por cada campo inválido", () => {
    const parsed = teamInputSchema.safeParse({
      ...toTeamInput(initialValuesFrom(null), null),
      name: "A",
      contact_email: "no-es-un-email",
    });

    if (parsed.success) {
      throw new Error("el input de prueba tenía que ser inválido");
    }

    const errors = fieldErrorsFrom(parsed.error);

    expect(errors.name).toBe("El nombre tiene que tener entre 2 y 80 caracteres.");
    expect(errors.contact_email).toBe("Ingresá un email válido.");
  });

  it("reporta todos los campos con error, no solo el primero", () => {
    const parsed = teamInputSchema.safeParse({
      ...toTeamInput(initialValuesFrom(null), null),
      name: "",
      founded_year: 1700,
      contact_email: "roto",
    });

    if (parsed.success) {
      throw new Error("el input de prueba tenía que ser inválido");
    }

    expect(Object.keys(fieldErrorsFrom(parsed.error)).sort()).toEqual([
      "contact_email",
      "founded_year",
      "name",
    ]);
  });
});
