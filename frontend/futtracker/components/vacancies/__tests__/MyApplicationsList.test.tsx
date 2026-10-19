// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { withdrawApplicationAction } from "@/app/vacantes/actions";
import {
  byLabel,
  byText,
  cleanup,
  click,
  flush,
  render,
} from "@/components/player/__tests__/dialogTestUtils";
import MyApplicationsList, {
  type MyApplicationItem,
} from "@/components/vacancies/MyApplicationsList";

vi.mock("@/app/vacantes/actions", () => ({ withdrawApplicationAction: vi.fn() }));

const withdrawMock = vi.mocked(withdrawApplicationAction);

function application(id: string, position: string, status = "open"): MyApplicationItem {
  return {
    id,
    created_at: "2026-10-01T12:00:00Z",
    crestUrl: null,
    vacancy: {
      id: `v-${id}`,
      position,
      modality: "futbol_11",
      level: "competitivo",
      status,
      team: { id: "e1", name: "Los Pumas", city: "Pilar", crest_path: null },
    },
  };
}

const pageText = () => document.body.textContent ?? "";
const rows = () => document.querySelectorAll("li");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MyApplicationsList", () => {
  it("una fila por postulación, en el orden recibido, con el chip de cerrada", () => {
    render(
      <MyApplicationsList
        applications={[application("a1", "mediocampista", "closed"), application("a4", "delantero")]}
      />,
    );

    expect(rows()).toHaveLength(2);
    expect(rows()[0].textContent).toContain("Mediocampista");
    expect(rows()[0].textContent).toContain("Vacante cerrada");
    expect(rows()[0].textContent).toContain("Te postulaste el");
    expect(rows()[1].textContent).toContain("Delantero");
    expect(rows()[1].textContent).not.toContain("Vacante cerrada");
  });

  it("vacía: invita a ver vacantes", () => {
    render(<MyApplicationsList applications={[]} />);

    expect(pageText()).toContain("Todavía no te postulaste a ninguna vacante.");
    expect(document.querySelector("a")?.getAttribute("href")).toBe("/vacantes");
  });

  it("retirar abre el diálogo y cancelar deja la fila", () => {
    render(<MyApplicationsList applications={[application("a1", "mediocampista")]} />);

    click(byLabel("Retirar postulación a Los Pumas")!);

    expect(pageText()).toContain("¿Retirar tu postulación a Los Pumas?");
    expect(pageText()).toContain("Vas a poder volver a postularte si la vacante sigue abierta.");

    click(byText("Cancelar")!);

    expect(withdrawMock).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(1);
  });

  it("confirmar retira la fila y muestra el toast", async () => {
    withdrawMock.mockResolvedValue({ ok: true });
    render(<MyApplicationsList applications={[application("a1", "mediocampista")]} />);

    click(byLabel("Retirar postulación a Los Pumas")!);
    click(byText("Retirar")!);
    await flush();

    expect(withdrawMock).toHaveBeenCalledWith("a1");
    expect(rows()).toHaveLength(0);
    expect(document.querySelector('[role="status"]')?.textContent).toBe("Postulación retirada.");
  });

  it("si falla, el diálogo queda abierto con el error", async () => {
    withdrawMock.mockResolvedValue({ ok: false });
    render(<MyApplicationsList applications={[application("a1", "mediocampista")]} />);

    click(byLabel("Retirar postulación a Los Pumas")!);
    click(byText("Retirar")!);
    await flush();

    expect(rows()).toHaveLength(1);
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      "No pudimos retirar tu postulación. Probá de nuevo.",
    );
  });
});
