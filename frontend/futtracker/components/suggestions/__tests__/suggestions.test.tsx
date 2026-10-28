import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { flatten } from "@/components/player/__tests__/reactTree";
import SuggestedTeamCard from "@/components/suggestions/SuggestedTeamCard";
import SuggestionFilters from "@/components/suggestions/SuggestionFilters";
import ApplyButton from "@/components/vacancies/ApplyButton";
import type { TeamSuggestion } from "@/lib/data/suggestions";
import { suggestionsSubtitle } from "@/lib/format/suggestionLabels";

vi.mock("@/app/vacantes/actions", () => ({ applyToVacancyAction: vi.fn() }));

type Props = Record<string, unknown> & { children?: ReactNode };

function elements(node: ReactNode): ReactElement<Props>[] {
  return flatten(node).filter(isValidElement) as ReactElement<Props>[];
}

function text(node: ReactNode): string {
  return flatten(node)
    .filter((item) => typeof item === "string" || typeof item === "number")
    .join(" ");
}

function suggestion(overrides: Partial<TeamSuggestion> = {}): TeamSuggestion {
  return {
    vacancy_id: "v-b1",
    team_id: "t-b",
    team_name: "Club TB",
    crest_path: null,
    city: "San Isidro",
    province: "Buenos Aires",
    category: "Primera",
    position: "mediocampista",
    modality: "futbol_11",
    level: "intermedio",
    description: "Buscamos un 5 con llegada.",
    distance_km: 2.9,
    applied: false,
    ...overrides,
  };
}

function applyButtonOf(node: ReactNode) {
  return elements(node).find((element) => element.type === ApplyButton);
}

describe("suggestionsSubtitle", () => {
  it("en singular con un equipo", () => {
    expect(suggestionsSubtitle(1, "Mediocampista", 25, "San Isidro")).toBe(
      "1 equipo busca tu posición (Mediocampista) a menos de 25 km de San Isidro.",
    );
  });

  it("en plural con varios", () => {
    expect(suggestionsSubtitle(2, "Mediocampista", 50, "San Isidro")).toBe(
      "2 equipos buscan tu posición (Mediocampista) a menos de 50 km de San Isidro.",
    );
  });

  it("sin ciudad termina en 'de tu ubicación.'", () => {
    expect(suggestionsSubtitle(0, "Arquero", 200, null)).toBe(
      "0 equipos buscan tu posición (Arquero) a menos de 200 km de tu ubicación.",
    );
  });
});

describe("SuggestedTeamCard", () => {
  it("muestra equipo, vacante y distancia con coma decimal", () => {
    const card = SuggestedTeamCard({ suggestion: suggestion(), crestUrl: null });

    expect(text(card)).toContain("Club TB");
    expect(text(card)).toContain("San Isidro · Primera");
    expect(text(card)).toContain("Busca Mediocampista");
    expect(text(card)).toContain("Fútbol 11");
    expect(text(card)).toContain("Intermedio avanzado");
    expect(text(card)).toContain("Buscamos un 5 con llegada.");
    expect(text(card)).toContain("2,9 km");
  });

  it("sin ciudad, categoría ni descripción no los muestra", () => {
    const card = SuggestedTeamCard({
      suggestion: suggestion({ city: null, category: null, description: null }),
      crestUrl: null,
    });

    expect(text(card)).not.toContain("San Isidro");
    expect(text(card)).not.toContain("Primera");
    expect(text(card)).not.toContain("Buscamos");
  });

  it("'Ver equipo' lleva al perfil del equipo", () => {
    const link = elements(SuggestedTeamCard({ suggestion: suggestion(), crestUrl: null })).find(
      (element) => element.props.href === "/equipos/t-b",
    );

    expect(link && text(link.props.children)).toBe("Ver equipo");
  });

  it("'Postularme' es el ApplyButton de la vacante, con el nombre accesible que necesita", () => {
    const button = applyButtonOf(SuggestedTeamCard({ suggestion: suggestion(), crestUrl: null }));

    expect(button?.props).toEqual({
      vacancyId: "v-b1",
      positionLabel: "Mediocampista",
      teamName: "Club TB",
      applied: false,
    });
  });

  it("con applied le pasa el estado 'Postulado' al botón", () => {
    const button = applyButtonOf(
      SuggestedTeamCard({ suggestion: suggestion({ applied: true }), crestUrl: null }),
    );

    expect(button?.props.applied).toBe(true);
  });

  it("con escudo usa la URL firmada", () => {
    const card = SuggestedTeamCard({ suggestion: suggestion(), crestUrl: "https://firmada" });
    const crest = elements(card).find((element) => element.props.crestUrl === "https://firmada");

    expect(crest).toBeDefined();
  });
});

describe("SuggestionFilters", () => {
  it("envía por GET a /sugerencias con el radio elegido y 'Limpiar' va sin parámetros", () => {
    const filters = SuggestionFilters({ radius: 50 });
    const select = elements(filters).find((element) => element.props.name === "radio");

    expect(filters.props.action).toBe("/sugerencias");
    expect(select?.props.defaultValue).toBe("50");
    expect(
      (select?.props.options as { label: string }[]).map((option) => option.label),
    ).toEqual(["Hasta 10 km", "Hasta 25 km", "Hasta 50 km", "Hasta 100 km", "Hasta 200 km"]);
    expect(elements(filters).some((element) => element.props.href === "/sugerencias")).toBe(true);
  });
});
