import { describe, expect, it } from "vitest";

import { parseVacancyForm } from "@/components/team/vacancyFormValues";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/data/vacancies";

const BASE = { position: "delantero", modality: "futbol_11", level: "intermedio" };

// FUT-157: el contador del formulario mide el texto tal como está escrito, con
// los espacios de los bordes. El schema tiene que medir lo mismo; si el
// formulario recortara antes de mandarlo, aceptaría textos que el contador
// marca como demasiado largos (observación de QA en la #64).
describe("parseVacancyForm: la descripción", () => {
  it("se mide sin recortar, igual que el contador", () => {
    const description = `${"a".repeat(DESCRIPTION_MAX_LENGTH)}  `;

    const result = parseVacancyForm({ ...BASE, description });

    expect(result).toEqual({
      ok: false,
      errors: { description: `La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres.` },
    });
  });

  it("si entra, se guarda recortada", () => {
    const result = parseVacancyForm({ ...BASE, description: "  Buscamos un 9  " });

    expect(result.ok && result.input.description).toBe("Buscamos un 9");
  });
});
