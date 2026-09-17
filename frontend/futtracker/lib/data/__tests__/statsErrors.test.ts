import { describe, expect, it } from "vitest";

import { mapStatsError, UNEXPECTED_STATS_ERROR } from "@/lib/data/statsErrors";

function pgError(code: string, message: string) {
  return { code, message };
}

describe("mapStatsError", () => {
  it("mapea el duplicado (23505) a 'Ya cargaste este partido'", () => {
    const result = mapStatsError(
      pgError(
        "23505",
        'duplicate key value violates unique constraint "match_stats_career_entry_id_match_date_opponent_key"',
      ),
    );

    expect(result.error).toBe("Ya cargaste este partido.");
  });

  it("mapea la valla invicta en jugador de campo", () => {
    const result = mapStatsError(
      pgError("23514", "Solo un arquero puede tener valla invicta"),
    );

    expect(result.error).toBe("Solo un arquero puede tener valla invicta.");
    expect(result.field).toBe("clean_sheet");
  });

  it("mapea la fecha fuera del período del club", () => {
    const result = mapStatsError(
      pgError(
        "23514",
        "La fecha del partido está fuera del período de la etapa (2025-02-01 a 2025-12-01)",
      ),
    );

    expect(result.error).toBe("La fecha está fuera del período de este club.");
    expect(result.field).toBe("match_date");
  });

  it("mapea el achique de período que deja partidos fuera de rango", () => {
    const result = mapStatsError(
      pgError("23514", "El nuevo período deja 1 partido(s) fuera de rango"),
    );

    expect(result.field).toBe("end_date");
  });

  it("mapea el cambio de posición con partidos de valla invicta", () => {
    const result = mapStatsError(
      pgError(
        "23514",
        "No se puede cambiar la posición: 1 partido(s) tienen valla invicta",
      ),
    );

    expect(result.field).toBe("position");
  });

  it("mapea un check de rango de minutos como defensa en profundidad", () => {
    const result = mapStatsError(
      pgError(
        "23514",
        'new row for relation "match_stats" violates check constraint "match_stats_minutes_played_check"',
      ),
    );

    expect(result.field).toBe("minutes_played");
  });

  it("nunca deja pasar el texto crudo de Postgres para un error desconocido", () => {
    const result = mapStatsError(pgError("XX000", "algo raro pasó adentro"));

    expect(result).toEqual(UNEXPECTED_STATS_ERROR);
  });

  it("no explota con un error que no tiene forma de error de Postgres", () => {
    expect(mapStatsError(new Error("network down"))).toEqual(
      UNEXPECTED_STATS_ERROR,
    );
    expect(mapStatsError(null)).toEqual(UNEXPECTED_STATS_ERROR);
  });
});
