import { beforeEach, describe, expect, it, vi } from "vitest";

// Server Actions bajo test: validan, delegan en lib/data/teams y traducen los
// errores de Postgres. Se mockean los bordes (Supabase, la capa de datos y
// next/cache) para testear solo esa lógica.
const createTeamMock = vi.fn();
const updateTeamMock = vi.fn();
const getMyTeamMock = vi.fn();
const updateCrestPathMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/data/teams", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/teams")>(
    "@/lib/data/teams",
  );
  return {
    ...actual,
    createTeam: (...args: unknown[]) => createTeamMock(...args),
    updateTeam: (...args: unknown[]) => updateTeamMock(...args),
    getMyTeam: (...args: unknown[]) => getMyTeamMock(...args),
    updateCrestPath: (...args: unknown[]) => updateCrestPathMock(...args),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({}),
}));

const TEAM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const VALID_INPUT = {
  name: "Racing",
  club_name: null,
  category: "Primera",
  league: null,
  city: "Pilar",
  province: "Buenos Aires",
  country: "AR",
  latitude: null,
  longitude: null,
  founded_year: 1954,
  bio: null,
  contact_email: null,
};

// Lo que tira supabase-js ante una violación de unicidad.
function uniqueViolation(constraint: string) {
  return {
    code: "23505",
    message: `duplicate key value violates unique constraint "${constraint}"`,
  };
}

describe("createTeamAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createTeamMock.mockResolvedValue({ id: TEAM_ID });
  });

  it("crea el equipo y devuelve su id", async () => {
    const { createTeamAction } = await import("@/app/equipos/actions");

    const result = await createTeamAction(VALID_INPUT);

    expect(result).toEqual({ ok: true, teamId: TEAM_ID });
    expect(revalidatePathMock).toHaveBeenCalledWith(`/equipos/${TEAM_ID}`);
  });

  it("rechaza un input inválido sin llegar a la base", async () => {
    const { createTeamAction } = await import("@/app/equipos/actions");

    const result = await createTeamAction({ ...VALID_INPUT, name: "A" });

    expect(result).toEqual({ ok: false, error: "Revisá los datos ingresados." });
    expect(createTeamMock).not.toHaveBeenCalled();
  });

  // Los dos constraints llegan con el mismo código 23505 y hay que
  // distinguirlos por nombre, o el usuario ve el error crudo del driver.
  it("traduce el duplicado de nombre+ciudad y lo apunta al campo", async () => {
    createTeamMock.mockRejectedValue(uniqueViolation("teams_name_city_unique"));
    const { createTeamAction } = await import("@/app/equipos/actions");

    const result = await createTeamAction(VALID_INPUT);

    expect(result).toEqual({
      ok: false,
      error: "Ya existe un equipo con ese nombre en esa ciudad.",
      field: "name",
    });
  });

  it("traduce el duplicado de dueño sin apuntar a ningún campo", async () => {
    createTeamMock.mockRejectedValue(uniqueViolation("teams_owner_id_key"));
    const { createTeamAction } = await import("@/app/equipos/actions");

    const result = await createTeamAction(VALID_INPUT);

    expect(result).toEqual({ ok: false, error: "Ya tenés un equipo creado." });
  });

  it("no confunde un error cualquiera con un duplicado", async () => {
    createTeamMock.mockRejectedValue({ code: "42501", message: "denied" });
    const { createTeamAction } = await import("@/app/equipos/actions");

    const result = await createTeamAction(VALID_INPUT);

    expect(result).toEqual({
      ok: false,
      error: "Ocurrió un error inesperado. Probá de nuevo.",
    });
  });
});

describe("updateTeamAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMyTeamMock.mockResolvedValue({ id: TEAM_ID });
    updateTeamMock.mockResolvedValue({ id: TEAM_ID });
  });

  it("actualiza el equipo propio", async () => {
    const { updateTeamAction } = await import("@/app/equipos/actions");

    const result = await updateTeamAction(TEAM_ID, VALID_INPUT);

    expect(result).toEqual({ ok: true, teamId: TEAM_ID });
    expect(updateTeamMock).toHaveBeenCalled();
  });

  // La RLS ya lo impide en la base; el chequeo acá es para que el usuario vea
  // un mensaje y no el error genérico de "0 filas afectadas".
  it("no escribe el equipo de otro delegado", async () => {
    getMyTeamMock.mockResolvedValue({ id: "otro-equipo" });
    const { updateTeamAction } = await import("@/app/equipos/actions");

    const result = await updateTeamAction(TEAM_ID, VALID_INPUT);

    expect(result.ok).toBe(false);
    expect(updateTeamMock).not.toHaveBeenCalled();
  });

  it("no escribe si el delegado todavía no tiene equipo", async () => {
    getMyTeamMock.mockResolvedValue(null);
    const { updateTeamAction } = await import("@/app/equipos/actions");

    const result = await updateTeamAction(TEAM_ID, VALID_INPUT);

    expect(result.ok).toBe(false);
    expect(updateTeamMock).not.toHaveBeenCalled();
  });
});

describe("updateTeamCrestPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMyTeamMock.mockResolvedValue({ id: TEAM_ID });
    updateCrestPathMock.mockResolvedValue({ id: TEAM_ID });
  });

  it("guarda el path del escudo propio", async () => {
    const { updateTeamCrestPath } = await import("@/app/equipos/actions");

    const result = await updateTeamCrestPath(TEAM_ID, `${TEAM_ID}/escudo.png`);

    expect(result).toEqual({ ok: true });
    expect(revalidatePathMock).toHaveBeenCalledWith(`/equipos/${TEAM_ID}`);
  });

  // El teamId llega del cliente y una Server Action es un endpoint público.
  it("rechaza el escudo de un equipo ajeno", async () => {
    getMyTeamMock.mockResolvedValue({ id: "otro-equipo" });
    const { updateTeamCrestPath } = await import("@/app/equipos/actions");

    const result = await updateTeamCrestPath(TEAM_ID, `${TEAM_ID}/escudo.png`);

    expect(result.ok).toBe(false);
    expect(updateCrestPathMock).not.toHaveBeenCalled();
  });
});
