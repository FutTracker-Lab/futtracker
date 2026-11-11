import { beforeEach, describe, expect, it, vi } from "vitest";

// Con `requireSession` real: el recorrido entero de una action sin sesión.
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createVacancy: vi.fn(),
  setVacancyStatus: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

vi.mock("@/lib/env/public", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/data/vacancies", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/vacancies")>(
    "@/lib/data/vacancies",
  );
  return { ...actual, createVacancy: mocks.createVacancy, setVacancyStatus: mocks.setVacancyStatus };
});
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: () => "http://localhost:3000/equipos/mi-equipo?tab=vacantes",
  }),
}));

const { createVacancyAction, setVacancyStatusAction } = await import(
  "@/app/equipos/vacancies-actions"
);

const VACANCY = "0a000002-0000-4000-8000-000000000120";
const TEAM = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LOGIN = "/login?redirectTo=%2Fequipos%2Fmi-equipo%3Ftab%3Dvacantes";
const VALID_INPUT = { position: "delantero", modality: "futbol_11", level: "recreativo", description: null };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sin sesión", () => {
  beforeEach(() => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
  });

  it("publicar lleva al login con la pantalla y no publica", async () => {
    await expect(createVacancyAction(VALID_INPUT)).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(LOGIN);
    expect(mocks.createVacancy).not.toHaveBeenCalled();
  });

  it("cerrar lleva al login con la pantalla y no cierra", async () => {
    await expect(setVacancyStatusAction(VACANCY, "closed")).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith(LOGIN);
    expect(mocks.setVacancyStatus).not.toHaveBeenCalled();
  });
});

describe("con sesión", () => {
  beforeEach(() => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("publica como siempre, sin redirigir", async () => {
    mocks.createVacancy.mockResolvedValue({ team_id: TEAM });

    expect(await createVacancyAction(VALID_INPUT)).toEqual({ ok: true });
    expect(mocks.createVacancy).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  // FUT-157: llamada directo, sin el formulario que antes hacía `|| null`.
  it("llamada directo con descripción vacía guarda null", async () => {
    mocks.createVacancy.mockResolvedValue({ team_id: TEAM });

    expect(await createVacancyAction({ ...VALID_INPUT, description: "" })).toEqual({ ok: true });
    expect(mocks.createVacancy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ description: null }),
    );
  });

  it("cierra como siempre, sin redirigir", async () => {
    mocks.setVacancyStatus.mockResolvedValue({ team_id: TEAM });

    expect(await setVacancyStatusAction(VACANCY, "closed")).toEqual({ ok: true });
    expect(mocks.setVacancyStatus).toHaveBeenCalledWith(expect.anything(), VACANCY, "closed");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
