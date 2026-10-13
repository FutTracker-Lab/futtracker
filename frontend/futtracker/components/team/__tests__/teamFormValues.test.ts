import { describe, expect, it } from "vitest";

import { teamInputSchema, type Team } from "@/lib/data/teams";
import type { Zone } from "@/lib/data/zones";
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
  zone_id: "pilar",
  founded_year: 1954,
  crest_path: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/escudo.png",
  bio: "Club de barrio con cancha propia.",
  contact_email: "delegado@example.com",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const ZONES: Zone[] = [{ id: "pilar", name: "Pilar", province: "Buenos Aires" }];

describe("initialValuesFrom", () => {
  it("precarga los valores de la fila como strings de formulario", () => {
    const values = initialValuesFrom(TEAM, ZONES);

    expect(values.name).toBe("Club Atlético Pilar");
    expect(values.foundedYear).toBe("1954");
    expect(values.zoneId).toBe("pilar");
    expect(values.country).toBe("AR");
  });

  it("arranca sin zona si la fila no tiene una de la lista", () => {
    expect(initialValuesFrom({ ...TEAM, zone_id: null }, ZONES).zoneId).toBe("");
    expect(initialValuesFrom({ ...TEAM, zone_id: "vieja" }, ZONES).zoneId).toBe("");
  });

  it("usa vacíos y el país por defecto al crear", () => {
    const values = initialValuesFrom(null, ZONES);

    expect(values.name).toBe("");
    expect(values.zoneId).toBe("");
    expect(values.foundedYear).toBe("");
    expect(values.country).toBe("AR");
  });
});

describe("toTeamInput", () => {
  it("produce un input válido para el schema con la fila completa", () => {
    const input = toTeamInput(initialValuesFrom(TEAM, ZONES), TEAM);

    expect(input.founded_year).toBe(1954);
    expect(teamInputSchema.safeParse(input).success).toBe(true);
  });

  it("convierte los vacíos a null", () => {
    const values = { ...initialValuesFrom(null, ZONES), name: "Racing", zoneId: "pilar" };
    const input = toTeamInput(values, null);

    expect(input.league).toBeNull();
    expect(input.founded_year).toBeNull();
    expect(input.contact_email).toBeNull();
    expect(teamInputSchema.safeParse(input).success).toBe(true);
  });

  // El formulario no edita `club_name` (decisión 4 de las discrepancias). Si
  // lo mandara en null, cada guardado lo borraría.
  it("arrastra club_name de la fila", () => {
    const input = toTeamInput(initialValuesFrom(TEAM, ZONES), TEAM);

    expect(input.club_name).toBe("Club Atlético Pilar");
  });

  it("manda zone_id y no la ciudad, la provincia ni las coordenadas", () => {
    const input = toTeamInput(initialValuesFrom(TEAM, ZONES), TEAM);

    expect(input.zone_id).toBe("pilar");
    expect(input).not.toHaveProperty("city");
    expect(input).not.toHaveProperty("province");
    expect(input).not.toHaveProperty("latitude");
    expect(input).not.toHaveProperty("longitude");
  });

  it("recorta los espacios del nombre, que es lo que compara el índice único", () => {
    const values = { ...initialValuesFrom(null, ZONES), name: "  Racing  " };

    expect(toTeamInput(values, null).name).toBe("Racing");
  });
});

describe("fieldErrorsFrom", () => {
  it("devuelve un mensaje en español por cada campo inválido", () => {
    const parsed = teamInputSchema.safeParse({
      ...toTeamInput(initialValuesFrom(TEAM, ZONES), TEAM),
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
      ...toTeamInput(initialValuesFrom(TEAM, ZONES), TEAM),
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

  it("pide elegir una zona de la lista si no hay zona", () => {
    const values = { ...initialValuesFrom(null, ZONES), name: "Racing" };
    const parsed = teamInputSchema.safeParse(toTeamInput(values, null));

    if (parsed.success) {
      throw new Error("el input de prueba tenía que ser inválido");
    }

    expect(fieldErrorsFrom(parsed.error).zone_id).toBe("Elegí una zona de la lista.");
  });
});
