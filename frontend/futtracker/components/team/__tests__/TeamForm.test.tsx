// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanup, flush, render } from "@/components/player/__tests__/dialogTestUtils";
import type { Team } from "@/lib/data/teams";
import type { Zone } from "@/lib/data/zones";

const pushMock = vi.fn();
const updateTeamActionMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

vi.mock("@/app/equipos/actions", () => ({
  createTeamAction: vi.fn(),
  updateTeamAction: (...args: unknown[]) => updateTeamActionMock(...args),
}));

// Sube el escudo contra Storage: no participa del aviso de cambios.
vi.mock("@/components/team/CrestUploader", () => ({ default: () => null }));

const { default: TeamForm } = await import("@/components/team/TeamForm");

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
  crest_path: null,
  bio: "Club de barrio con cancha propia.",
  contact_email: "delegado@example.com",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

const ZONES: Zone[] = [{ id: "pilar", name: "Pilar", province: "Buenos Aires" }];
const VACANCIES_TAB = "/equipos/mi-equipo?tab=vacantes";

// Lo que renderiza TeamTabs: un link marcado para el aviso.
function renderWithTabs() {
  render(
    <>
      <a href={VACANCIES_TAB} data-unsaved-guard="">
        Vacantes
      </a>
      <TeamForm team={TEAM} initialCrestUrl={null} zones={ZONES} />
    </>,
  );
}

function type(id: string, value: string) {
  act(() => {
    const input = document.getElementById(id) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

// Devuelve si la navegación por defecto del link quedó frenada.
function clickTab(): boolean {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
  act(() => {
    document.querySelector(`a[href="${VACANCIES_TAB}"]`)!.dispatchEvent(event);
  });
  return event.defaultPrevented;
}

function dialog() {
  return document.querySelector("[role=alertdialog]");
}

function clickButton(label: string) {
  act(() => {
    [...document.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === label)!
      .click();
  });
}

afterEach(() => {
  cleanup();
  pushMock.mockReset();
  updateTeamActionMock.mockReset();
});

describe("TeamForm: cambios sin guardar", () => {
  it("sin cambios, cambiar de pestaña navega sin preguntar", () => {
    renderWithTabs();

    expect(clickTab()).toBe(false);
    expect(dialog()).toBeNull();
  });

  it("con cambios, cambiar de pestaña pide confirmación y no navega", () => {
    renderWithTabs();
    type("name", "Club Atlético Pilar Norte");

    expect(clickTab()).toBe(true);
    expect(dialog()?.textContent).toContain("Salir sin guardar");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("al cancelar sigue en Datos del club con sus cambios", () => {
    renderWithTabs();
    type("name", "Club Atlético Pilar Norte");
    clickTab();

    clickButton("Seguir editando");

    expect(dialog()).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
    expect((document.getElementById("name") as HTMLInputElement).value).toBe(
      "Club Atlético Pilar Norte",
    );
  });

  it("al confirmar va a la pestaña elegida", () => {
    renderWithTabs();
    type("name", "Club Atlético Pilar Norte");
    clickTab();

    clickButton("Salir sin guardar");

    expect(pushMock).toHaveBeenCalledWith(VACANCIES_TAB);
  });

  it("si vuelve al valor original, ya no pregunta", () => {
    renderWithTabs();
    type("name", "Otro nombre");
    type("name", TEAM.name);

    expect(clickTab()).toBe(false);
  });

  it("después de guardar, cambiar de pestaña no pregunta", async () => {
    updateTeamActionMock.mockResolvedValue({ ok: true, teamId: TEAM.id });
    renderWithTabs();
    type("name", "Club Atlético Pilar Norte");

    await act(async () => {
      document.querySelector("form")!.requestSubmit();
    });
    await flush();

    expect(updateTeamActionMock).toHaveBeenCalled();
    expect(clickTab()).toBe(false);
  });
});
