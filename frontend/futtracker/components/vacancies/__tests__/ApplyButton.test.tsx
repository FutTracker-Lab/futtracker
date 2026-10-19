// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { applyToVacancyAction } from "@/app/vacantes/actions";
import { byLabel, cleanup, click, flush, render } from "@/components/player/__tests__/dialogTestUtils";
import ApplyButton from "@/components/vacancies/ApplyButton";
import VacancyApplyControl from "@/components/vacancies/VacancyApplyControl";

vi.mock("@/app/vacantes/actions", () => ({ applyToVacancyAction: vi.fn() }));

const applyMock = vi.mocked(applyToVacancyAction);
const LABEL = "Postularme a la vacante de Arquero en Los Pumas";

function renderButton(applied = false) {
  render(
    <ApplyButton vacancyId="v2" positionLabel="Arquero" teamName="Los Pumas" applied={applied} />,
  );
}

const pageText = () => document.body.textContent ?? "";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ApplyButton", () => {
  it("ya postulado: chip sin botón", () => {
    renderButton(true);

    expect(pageText()).toContain("Postulado");
    expect(byLabel(LABEL)).toBeNull();
  });

  it("mientras envía queda deshabilitado con 'Enviando…'", async () => {
    let resolve!: (value: { ok: true }) => void;
    applyMock.mockReturnValue(new Promise((r) => (resolve = r)));
    renderButton();

    click(byLabel(LABEL)!);
    await flush();

    expect(byLabel(LABEL)?.textContent).toBe("Enviando…");
    expect((byLabel(LABEL) as HTMLButtonElement).disabled).toBe(true);

    resolve({ ok: true });
    await flush();
  });

  it("en éxito muestra 'Postulado' y el toast", async () => {
    applyMock.mockResolvedValue({ ok: true });
    renderButton();

    click(byLabel(LABEL)!);
    await flush();

    expect(applyMock).toHaveBeenCalledWith("v2");
    expect(byLabel(LABEL)).toBeNull();
    expect(pageText()).toContain("Postulado");
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      "Te postulaste a la vacante de Arquero en Los Pumas.",
    );
  });

  it("ya postulado en otra pestaña: pasa a 'Postulado' y avisa", async () => {
    applyMock.mockResolvedValue({ ok: false, error: "alreadyApplied" });
    renderButton();

    click(byLabel(LABEL)!);
    await flush();

    expect(pageText()).toContain("Postulado");
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      "Ya te postulaste a esta vacante.",
    );
  });

  it("vacante cerrada: avisa y deja de ofrecer el botón", async () => {
    applyMock.mockResolvedValue({ ok: false, error: "vacancyClosed" });
    renderButton();

    click(byLabel(LABEL)!);
    await flush();

    expect(byLabel(LABEL)).toBeNull();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      "Esta vacante ya está cerrada.",
    );
  });

  it("perfil incompleto: muestra el enlace al perfil", async () => {
    applyMock.mockResolvedValue({ ok: false, error: "profileIncomplete" });
    renderButton();

    click(byLabel(LABEL)!);
    await flush();

    const link = document.querySelector("a");
    expect(link?.textContent).toBe("Completá tu perfil para postularte.");
    expect(link?.getAttribute("href")).toBe("/jugadores/mi-perfil/editar");
  });

  it("cualquier otro error: toast genérico y el botón sigue", async () => {
    applyMock.mockRejectedValue(new Error("red"));
    renderButton();

    click(byLabel(LABEL)!);
    await flush();

    expect(byLabel(LABEL)?.textContent).toBe("Postularme");
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      "No pudimos enviar tu postulación. Probá de nuevo.",
    );
  });
});

describe("VacancyApplyControl", () => {
  it("sin fila en players no ofrece el botón", () => {
    render(
      <VacancyApplyControl
        vacancyId="v2"
        positionLabel="Arquero"
        teamName="Los Pumas"
        applied={false}
        hasPlayerProfile={false}
      />,
    );

    expect(byLabel(LABEL)).toBeNull();
    expect(pageText()).toContain("Completá tu perfil para postularte.");
  });
});
