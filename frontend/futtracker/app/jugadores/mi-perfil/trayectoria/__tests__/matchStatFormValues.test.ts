import { describe, expect, it } from "vitest";

import { matchStatInputSchema } from "@/lib/data/stats";
import {
  fieldErrorsFrom,
  initialValuesFrom,
  isCleanSheetVisible,
  toMatchStatInput,
} from "@/app/jugadores/mi-perfil/trayectoria/matchStatFormValues";

const ENTRY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("isCleanSheetVisible", () => {
  it("solo es visible para la posición arquero (requisito 4 de FUT-92)", () => {
    expect(isCleanSheetVisible("arquero")).toBe(true);
    expect(isCleanSheetVisible("defensor")).toBe(false);
    expect(isCleanSheetVisible("mediocampista")).toBe(false);
    expect(isCleanSheetVisible(null)).toBe(false);
  });
});

describe("toMatchStatInput", () => {
  it("produce un input válido para el schema de T06a", () => {
    const values = {
      ...initialValuesFrom(null),
      matchDate: "2025-04-12",
      opponent: "Villa Crespo",
    };

    const input = toMatchStatInput(values, ENTRY_ID, "arquero");

    expect(matchStatInputSchema.safeParse(input).success).toBe(true);
    expect(input.career_entry_id).toBe(ENTRY_ID);
  });

  it("nunca manda clean_sheet=true si la posición de la entrada no es arquero", () => {
    const values = {
      ...initialValuesFrom(null),
      matchDate: "2025-04-12",
      opponent: "Villa Crespo",
      cleanSheet: true,
    };

    const input = toMatchStatInput(values, ENTRY_ID, "defensor");

    expect(input.clean_sheet).toBe(false);
  });

  it("manda clean_sheet=true en un arquero si está tildado", () => {
    const values = {
      ...initialValuesFrom(null),
      matchDate: "2025-04-12",
      opponent: "Villa Crespo",
      cleanSheet: true,
    };

    const input = toMatchStatInput(values, ENTRY_ID, "arquero");

    expect(input.clean_sheet).toBe(true);
  });

  it("convierte la competencia vacía a null", () => {
    const values = {
      ...initialValuesFrom(null),
      matchDate: "2025-04-12",
      opponent: "Villa Crespo",
      competition: "  ",
    };

    expect(toMatchStatInput(values, ENTRY_ID, "arquero").competition).toBeNull();
  });
});

describe("fieldErrorsFrom", () => {
  it("traduce el error de minutos fuera de rango", () => {
    const input = toMatchStatInput(
      {
        ...initialValuesFrom(null),
        matchDate: "2025-04-12",
        opponent: "Villa Crespo",
        minutesPlayed: "200",
      },
      ENTRY_ID,
      "arquero",
    );

    const parsed = matchStatInputSchema.safeParse(input);

    if (parsed.success) {
      throw new Error("el input de prueba tenía que ser inválido");
    }

    expect(fieldErrorsFrom(parsed.error).minutes_played).toBe(
      "Los minutos jugados tienen que estar entre 0 y 130.",
    );
  });
});
