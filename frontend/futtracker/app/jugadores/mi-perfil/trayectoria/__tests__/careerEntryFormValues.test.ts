import { describe, expect, it } from "vitest";

import { careerEntryInputSchema, type CareerEntry } from "@/lib/data/careerEntries";
import {
  fieldErrorsFrom,
  initialValuesFrom,
  toCareerEntryInput,
} from "@/app/jugadores/mi-perfil/trayectoria/careerEntryFormValues";

const ENTRY: CareerEntry = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  player_id: "66666666-6666-4666-8666-666666666666",
  team_id: null,
  club_name: "Villa Crespo",
  category: "Primera",
  position: "arquero",
  start_date: "2024-02-01",
  end_date: "2024-12-01",
  is_current: false,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

describe("toCareerEntryInput", () => {
  it("produce un input válido para el schema", () => {
    const input = toCareerEntryInput(initialValuesFrom(ENTRY));

    expect(careerEntryInputSchema.safeParse(input).success).toBe(true);
    expect(input.end_date).toBe("2024-12-01");
  });

  it("con 'Sigo jugando acá' prendido, manda end_date null pase lo que pase en el campo", () => {
    const values = { ...initialValuesFrom(ENTRY), isCurrent: true, endDate: "2024-12-01" };
    const input = toCareerEntryInput(values);

    expect(input.end_date).toBeNull();
    expect(input.is_current).toBe(true);
    expect(careerEntryInputSchema.safeParse(input).success).toBe(true);
  });

  it("convierte la categoría vacía a null", () => {
    const values = { ...initialValuesFrom(null), clubName: "Racing", category: "  " };
    const input = toCareerEntryInput(values);

    expect(input.category).toBeNull();
  });
});

describe("careerEntryInputSchema", () => {
  it("rechaza una fecha de fin anterior a la de inicio", () => {
    const input = toCareerEntryInput({
      ...initialValuesFrom(null),
      clubName: "Racing",
      startDate: "2024-06-01",
      endDate: "2024-01-01",
    });

    expect(careerEntryInputSchema.safeParse(input).success).toBe(false);
  });

  it("rechaza is_current=true con end_date presente (defensa en profundidad)", () => {
    const result = careerEntryInputSchema.safeParse({
      club_name: "Racing",
      team_id: null,
      category: null,
      position: null,
      start_date: "2024-01-01",
      end_date: "2024-06-01",
      is_current: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("fieldErrorsFrom", () => {
  it("traduce los errores de club_name y start_date", () => {
    const parsed = careerEntryInputSchema.safeParse({
      club_name: "A",
      team_id: null,
      category: null,
      position: null,
      start_date: "no-es-fecha",
      end_date: null,
      is_current: false,
    });

    if (parsed.success) {
      throw new Error("el input de prueba tenía que ser inválido");
    }

    const errors = fieldErrorsFrom(parsed.error);

    expect(errors.club_name).toBe("El club tiene que tener entre 2 y 120 caracteres.");
    expect(errors.start_date).toBe("Ingresá una fecha de inicio válida.");
  });
});
