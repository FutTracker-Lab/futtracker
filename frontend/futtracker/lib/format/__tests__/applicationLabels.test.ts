import { describe, expect, it } from "vitest";

import { applyButtonLabel, applySuccessMessage, openVacanciesSubtitle } from "@/lib/format/applicationLabels";

describe("applicationLabels", () => {
  it("subtítulo en singular y plural", () => {
    expect(openVacanciesSubtitle(1)).toBe("1 vacante abierta.");
    expect(openVacanciesSubtitle(11)).toBe("11 vacantes abiertas.");
    expect(openVacanciesSubtitle(0)).toBe("0 vacantes abiertas.");
  });

  it("nombra posición y equipo", () => {
    expect(applySuccessMessage("Arquero", "Los Pumas")).toBe(
      "Te postulaste a la vacante de Arquero en Los Pumas.",
    );
    expect(applyButtonLabel("Arquero", "Los Pumas")).toBe(
      "Postularme a la vacante de Arquero en Los Pumas",
    );
  });
});
