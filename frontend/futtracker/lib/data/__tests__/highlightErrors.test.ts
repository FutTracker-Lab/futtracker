import { describe, expect, it } from "vitest";

import {
  HIGHLIGHT_ERRORS,
  mapHighlightInsertError,
  mapHighlightUploadError,
} from "@/lib/data/highlightErrors";

describe("mapHighlightInsertError", () => {
  it("traduce el límite del trigger", () => {
    expect(
      mapHighlightInsertError({ code: "23514", message: "highlight_limit_reached" }),
    ).toBe(HIGHLIGHT_ERRORS.limitReached);
  });

  // El check de `storage_path` también es 23514, pero no es el límite.
  it("no confunde otro check con el límite", () => {
    expect(
      mapHighlightInsertError({
        code: "23514",
        message: 'violates check constraint "player_highlights_storage_path_check"',
      }),
    ).toBe(HIGHLIGHT_ERRORS.unexpected);
  });

  it("traduce la falta de fila en players", () => {
    expect(mapHighlightInsertError({ code: "23503", message: "fk" })).toBe(
      HIGHLIGHT_ERRORS.profileIncomplete,
    );
  });

  it("nunca devuelve el texto crudo", () => {
    expect(mapHighlightInsertError({ code: "42501", message: "permission denied" })).toBe(
      HIGHLIGHT_ERRORS.unexpected,
    );
  });
});

describe("mapHighlightUploadError", () => {
  it("traduce el rechazo de tamaño del bucket", () => {
    expect(mapHighlightUploadError({ statusCode: "413", message: "too large" })).toBe(
      HIGHLIGHT_ERRORS.tooLarge,
    );
  });

  it("cae en el genérico para el resto", () => {
    expect(mapHighlightUploadError({ statusCode: "403", message: "denied" })).toBe(
      HIGHLIGHT_ERRORS.uploadFailed,
    );
  });
});
