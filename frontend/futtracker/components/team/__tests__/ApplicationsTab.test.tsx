// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ApplicationsTab from "@/components/team/ApplicationsTab";
import {
  loadTeamApplications,
  type ApplicationRow,
  type TeamApplicationsResult,
} from "@/components/team/teamApplications";
import { listVacancyApplications } from "@/lib/data/applications";
import { getAvatarSignedUrls } from "@/lib/data/players";
import type { Vacancy } from "@/lib/data/vacancies";

vi.mock("@/lib/data/applications", () => ({
  listVacancyApplications: vi.fn(),
  countApplicationsByVacancy: vi.fn(),
}));
vi.mock("@/lib/data/players", () => ({ getAvatarSignedUrls: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const TEAM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const V1 = "11111111-1111-4111-8111-111111111111";
const V2 = "22222222-2222-4222-8222-222222222222";
const V3 = "33333333-3333-4333-8333-333333333333";
const V4 = "44444444-4444-4444-8444-444444444444";

function vacancy(overrides: Partial<Vacancy>): Vacancy {
  return {
    id: V1,
    team_id: TEAM_ID,
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

const VACANCIES = [
  vacancy({ id: V2, position: "arquero" }),
  vacancy({ id: V1, position: "mediocampista" }),
  vacancy({ id: V3, position: "defensor", status: "closed" }),
];

function application(overrides: Partial<ApplicationRow>): ApplicationRow {
  return {
    id: "a1",
    vacancy_id: V1,
    vacancy: { position: "mediocampista", status: "open" },
    player_id: "pj1",
    full_name: "Juan Pérez",
    avatar_path: null,
    avatarUrl: null,
    position: "delantero",
    city: "Rosario",
    age: 22,
    created_at: "2026-08-03T15:00:00Z",
    ...overrides,
  };
}

const SEED = [
  application({ id: "a1", player_id: "pj1", full_name: "Juan Pérez" }),
  application({ id: "a2", player_id: "pj2", full_name: "Lucas Gómez", age: null }),
];

describe("loadTeamApplications", () => {
  const vacancies = Promise.resolve({ ok: true as const, vacancies: VACANCIES });

  beforeEach(() => {
    vi.mocked(listVacancyApplications).mockReset().mockResolvedValue([]);
    vi.mocked(getAvatarSignedUrls).mockReset().mockResolvedValue({});
  });

  async function load(requested: string | undefined) {
    return loadTeamApplications({} as never, TEAM_ID, vacancies, requested);
  }

  test("sin vacante en la URL lista solo por equipo", async () => {
    await expect(load(undefined)).resolves.toMatchObject({ ok: true, vacancyId: null });
    expect(listVacancyApplications).toHaveBeenCalledWith({}, { teamId: TEAM_ID, vacancyId: undefined });
  });

  test("con una vacante del equipo filtra por ella", async () => {
    await expect(load(V2)).resolves.toMatchObject({ ok: true, vacancyId: V2 });
    expect(listVacancyApplications).toHaveBeenCalledWith({}, { teamId: TEAM_ID, vacancyId: V2 });
  });

  test.each([
    ["de otro equipo", V4],
    ["que no es un uuid", "abc"],
  ])("ignora una vacante %s", async (_, requested) => {
    await expect(load(requested)).resolves.toMatchObject({ ok: true, vacancyId: null });
    expect(listVacancyApplications).toHaveBeenCalledWith({}, { teamId: TEAM_ID, vacancyId: undefined });
  });

  test("firma los avatares y deja null a quien no tiene", async () => {
    vi.mocked(listVacancyApplications).mockResolvedValue([
      application({ id: "a1", avatar_path: "pj1/a.png" }),
      application({ id: "a2", avatar_path: null }),
    ]);
    vi.mocked(getAvatarSignedUrls).mockResolvedValue({ "pj1/a.png": "https://signed/a" });

    const result = await load(undefined);

    expect(result.ok && result.applications.map((row) => row.avatarUrl)).toEqual([
      "https://signed/a",
      null,
    ]);
  });

  test("si falla la firma muestra la lista igual, con iniciales", async () => {
    vi.mocked(listVacancyApplications).mockResolvedValue([application({ avatar_path: "pj1/a.png" })]);
    vi.mocked(getAvatarSignedUrls).mockRejectedValue(new Error("storage"));

    const result = await load(undefined);

    expect(result.ok && result.applications[0].avatarUrl).toBeNull();
  });

  test("si falla la consulta devuelve error", async () => {
    vi.mocked(listVacancyApplications).mockRejectedValue(new Error("fetch failed"));

    await expect(load(undefined)).resolves.toEqual({ ok: false });
  });

  test("si fallaron las vacantes devuelve error sin consultar", async () => {
    await expect(
      loadTeamApplications({} as never, TEAM_ID, Promise.resolve({ ok: false }), undefined),
    ).resolves.toEqual({ ok: false });
    expect(listVacancyApplications).not.toHaveBeenCalled();
  });
});

describe("ApplicationsTab", () => {
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

  async function renderTab(result: TeamApplicationsResult) {
    render(await ApplicationsTab({ result: Promise.resolve(result) }));
  }

  function items() {
    return Array.from(container.querySelectorAll("li"));
  }

  test("muestra el total y las filas en el orden recibido", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T12:00:00Z"));
    await renderTab({ ok: true, applications: SEED, vacancies: VACANCIES, vacancyId: null });

    expect(container.textContent).toContain("2 en total.");
    expect(items().map((item) => item.querySelector("p")?.textContent)).toEqual([
      "Juan Pérez",
      "Lucas Gómez",
    ]);
    expect(items()[0].textContent).toContain("22 años · Rosario · Delantero");
    expect(items()[0].textContent).toContain("Postulado a: Mediocampista");
    expect(items()[0].textContent).toContain("Se postuló el 3 ago");
    vi.useRealTimers();
  });

  test("sin edad la omite en vez de mostrar un hueco", async () => {
    await renderTab({ ok: true, applications: SEED, vacancies: VACANCIES, vacancyId: null });

    expect(items()[1].textContent).not.toContain("años");
    expect(items()[1].textContent).toContain("Rosario · Delantero");
  });

  test("Ver perfil lleva al perfil del jugador", async () => {
    await renderTab({ ok: true, applications: SEED, vacancies: VACANCIES, vacancyId: null });

    expect(
      items().map((item) => item.querySelector("a")?.getAttribute("href")),
    ).toEqual(["/jugadores/pj1", "/jugadores/pj2"]);
  });

  test("sin avatar muestra las iniciales", async () => {
    await renderTab({ ok: true, applications: SEED, vacancies: VACANCIES, vacancyId: null });

    expect(items()[0].querySelector("img")).toBeNull();
    expect(items()[0].textContent).toContain("JP");
  });

  test("el select ofrece todas las vacantes con su estado y marca la elegida", async () => {
    await renderTab({ ok: true, applications: [], vacancies: VACANCIES, vacancyId: V1 });

    const select = container.querySelector<HTMLSelectElement>('select[name="vacante"]')!;
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      "Todas las vacantes",
      "Arquero · Abierta",
      "Mediocampista · Abierta",
      "Defensor · Cerrada",
    ]);
    expect(select.value).toBe(V1);
    expect(container.querySelector('form input[name="tab"]')?.getAttribute("value")).toBe(
      "postulaciones",
    );
  });

  test("sin postulaciones muestra el estado vacío", async () => {
    await renderTab({ ok: true, applications: [], vacancies: VACANCIES, vacancyId: null });

    expect(container.textContent).toContain("0 en total.");
    expect(container.textContent).toContain("Todavía no recibiste postulaciones.");
    expect(container.querySelector("ul")).toBeNull();
  });

  test("si la carga falla muestra el error con Reintentar", async () => {
    await renderTab({ ok: false });

    expect(container.textContent).toContain("No pudimos cargar las postulaciones.");
    expect(container.textContent).toContain("Reintentar");
    expect(container.querySelector("select")).toBeNull();
  });
});
