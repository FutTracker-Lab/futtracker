import { describe, expect, it } from "vitest";

import { openVacanciesLabel } from "@/lib/format/vacancyLabels";

describe("openVacanciesLabel", () => {
  it.each([
    [0, "Sin vacantes abiertas"],
    [1, "1 vacante abierta"],
    [2, "2 vacantes abiertas"],
    [3, "3 vacantes abiertas"],
  ])("con %i dice %s", (count, label) => {
    expect(openVacanciesLabel(count)).toBe(label);
  });
});
