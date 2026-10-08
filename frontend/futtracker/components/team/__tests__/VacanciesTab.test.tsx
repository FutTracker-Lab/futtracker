// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { setVacancyStatusAction } from "@/app/equipos/vacancies-actions";
import OpenVacanciesChip from "@/components/team/OpenVacanciesChip";
import VacanciesTab from "@/components/team/VacanciesTab";
import VacancyRowMenu from "@/components/team/VacancyRowMenu";
import type { Vacancy } from "@/lib/data/vacancies";

vi.mock("@/app/equipos/vacancies-actions", () => ({
  createVacancyAction: vi.fn(),
  setVacancyStatusAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

function render(ui: ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(ui));
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function vacancy(overrides: Partial<Vacancy>): Vacancy {
  return {
    id: "id",
    team_id: "team",
    position: "mediocampista",
    modality: "futbol_11",
    level: "competitivo",
    description: null,
    status: "open",
    created_at: "2026-10-01T12:00:00Z",
    updated_at: "2026-10-01T12:00:00Z",
    ...overrides,
  };
}

const SEED = [
  vacancy({ id: "v2", position: "arquero" }),
  vacancy({ id: "v1", position: "mediocampista" }),
  vacancy({ id: "v3", position: "defensor", level: "recreativo", status: "closed" }),
];

type TabProps = Parameters<typeof VacanciesTab>[0];

async function renderTab(
  result: TabProps["result"],
  applicationCounts: TabProps["applicationCounts"] = Promise.resolve({ ok: true, counts: {} }),
) {
  render(await VacanciesTab({ result, applicationCounts }));
}

function rows() {
  return Array.from(container.querySelectorAll("tbody tr"));
}

function openMenu(position: string) {
  const trigger = container.querySelector<HTMLButtonElement>(
    `[aria-label="Acciones de la vacante de ${position}"]`,
  )!;
  act(() => trigger.click());

  return Array.from(container.querySelectorAll('[role="menuitem"]')).map(
    (item) => item.textContent,
  );
}

test("muestra las vacantes en el orden recibido con sus etiquetas", async () => {
  await renderTab(Promise.resolve({ ok: true, vacancies: SEED }));

  expect(rows().map((row) => row.querySelector("th")?.textContent)).toEqual([
    "Arquero",
    "Mediocampista",
    "Defensor",
  ]);
  expect(rows()[1].textContent).toContain("Fútbol 11");
  expect(rows()[1].textContent).toContain("Competitivo amateur");
  expect(rows()[1].textContent).toContain("Abierta");
  expect(rows()[2].textContent).toContain("Cerrada");
});

test("la columna Postulaciones enlaza la cantidad a la pestaña filtrada", async () => {
  await renderTab(
    Promise.resolve({ ok: true, vacancies: SEED }),
    Promise.resolve({ ok: true, counts: { v1: 2, v2: 0, v3: 0 } }),
  );

  const links = rows().map((row) =>
    row.querySelector<HTMLAnchorElement>('a[href*="tab=postulaciones"]'),
  );
  expect(links.map((link) => link?.textContent)).toEqual(["0", "2", "0"]);
  expect(links[1]?.getAttribute("href")).toBe("/equipos/mi-equipo?tab=postulaciones&vacante=v1");
  expect(links[1]?.getAttribute("aria-label")).toBe("2 postulaciones a Mediocampista");
});

test("si el conteo falla la columna muestra un guion y no un 0", async () => {
  await renderTab(Promise.resolve({ ok: true, vacancies: SEED }), Promise.resolve({ ok: false }));

  expect(container.querySelector('a[href*="tab=postulaciones"]')).toBeNull();
  expect(rows()[0].textContent).toContain("Postulaciones: —");
});

test("una abierta ofrece cerrar y no reabrir", async () => {
  await renderTab(Promise.resolve({ ok: true, vacancies: SEED }));

  expect(openMenu("Mediocampista")).toEqual(["Cerrar vacante"]);
});

test("una cerrada ofrece reabrir y no cerrar", async () => {
  await renderTab(Promise.resolve({ ok: true, vacancies: SEED }));

  expect(openMenu("Defensor")).toEqual(["Reabrir vacante"]);
});

test("sin vacantes muestra el estado vacío y el botón de publicar", async () => {
  await renderTab(Promise.resolve({ ok: true, vacancies: [] }));

  expect(container.textContent).toContain("Todavía no publicaste vacantes.");
  expect(container.textContent).toContain("Publicar vacante");
  expect(container.querySelector("table")).toBeNull();
});

test("si la carga falla muestra el error con Reintentar", async () => {
  await renderTab(Promise.resolve({ ok: false }));

  expect(container.textContent).toContain("No pudimos cargar las vacantes.");
  expect(container.textContent).toContain("Reintentar");
  expect(container.textContent).not.toContain("Publicar vacante");
});

test("el chip cuenta solo las abiertas", async () => {
  render(await OpenVacanciesChip({ result: Promise.resolve({ ok: true, vacancies: SEED }) }));

  expect(container.textContent).toBe("2 vacantes abiertas");
});

test("el chip dice Sin vacantes abiertas con 0", async () => {
  render(await OpenVacanciesChip({ result: Promise.resolve({ ok: true, vacancies: [] }) }));

  expect(container.textContent).toBe("Sin vacantes abiertas");
});

test("Escape cierra el panel y devuelve el foco a Publicar vacante", async () => {
  await renderTab(Promise.resolve({ ok: true, vacancies: [] }));
  const openButton = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "Publicar vacante",
  )!;

  act(() => openButton.click());
  act(() => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });

  expect(container.querySelector("#vacancy-form-title")).toBeNull();
  expect(document.activeElement).toBe(openButton);
});

test("el diálogo de cierre atrapa el foco con Tab", async () => {
  await renderTab(Promise.resolve({ ok: true, vacancies: SEED }));
  openMenu("Mediocampista");
  const closeOption = Array.from(container.querySelectorAll('[role="menuitem"]')).find(
    (item) => item.textContent === "Cerrar vacante",
  ) as HTMLButtonElement;
  act(() => closeOption.click());

  const buttons = Array.from(
    container.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'),
  );
  const last = buttons[buttons.length - 1];
  act(() => last.focus());
  act(() => {
    last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  });

  expect(document.activeElement).toBe(buttons[0]);
});

test("al cambiar de estado el menú se cierra y el foco vuelve a su botón", async () => {
  vi.mocked(setVacancyStatusAction).mockResolvedValue({ ok: true });
  render(<VacancyRowMenu vacancyId="v1" positionLabel="Mediocampista" isOpen />);
  openMenu("Mediocampista");
  act(() => (container.querySelector('[role="menuitem"]') as HTMLButtonElement).click());
  const confirm = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "Cerrar",
  )!;
  await act(async () => confirm.click());

  // La revalidación vuelve a renderizar la fila ya cerrada.
  act(() => root.render(<VacancyRowMenu vacancyId="v1" positionLabel="Mediocampista" isOpen={false} />));

  expect(container.querySelector('[role="menu"]')).toBeNull();
  expect(document.activeElement?.getAttribute("aria-label")).toBe(
    "Acciones de la vacante de Mediocampista",
  );
});
