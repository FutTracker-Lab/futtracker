import { beforeEach, describe, expect, it, vi } from "vitest";

import { HIGHLIGHT_ERRORS } from "@/lib/data/highlightErrors";

const createHighlightMock = vi.fn();
const deleteHighlightMock = vi.fn();
const revalidatePathMock = vi.fn();
const getUserMock = vi.fn();

vi.mock("@/lib/data/highlights", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/highlights")>(
    "@/lib/data/highlights",
  );
  return {
    ...actual,
    createHighlight: (...args: unknown[]) => createHighlightMock(...args),
    deleteHighlight: (...args: unknown[]) => deleteHighlightMock(...args),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const VALID_INPUT = { title: "Gol vs Racing", storage_path: `${USER_ID}/abc.mp4` };

async function actions() {
  return import("@/app/jugadores/[id]/highlights-actions");
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserMock.mockResolvedValue({ data: { user: { id: USER_ID } } });
  createHighlightMock.mockResolvedValue(undefined);
  deleteHighlightMock.mockResolvedValue(true);
});

describe("addHighlight", () => {
  it("inserta con el usuario de la sesión y revalida los dos perfiles", async () => {
    const { addHighlight } = await actions();

    await expect(addHighlight(VALID_INPUT)).resolves.toEqual({ ok: true });

    expect(createHighlightMock).toHaveBeenCalledWith(expect.anything(), USER_ID, VALID_INPUT);
    expect(revalidatePathMock).toHaveBeenCalledWith("/jugadores/mi-perfil");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/jugadores/${USER_ID}`);
  });

  it("rechaza un path fuera de la carpeta del usuario", async () => {
    const { addHighlight } = await actions();

    const result = await addHighlight({ ...VALID_INPUT, storage_path: "otro/abc.mp4" });

    expect(result).toEqual({ ok: false, error: HIGHLIGHT_ERRORS.unexpected });
    expect(createHighlightMock).not.toHaveBeenCalled();
  });

  it("rechaza un título inválido", async () => {
    const { addHighlight } = await actions();

    const result = await addHighlight({ ...VALID_INPUT, title: "x".repeat(81) });

    expect(result.ok).toBe(false);
    expect(createHighlightMock).not.toHaveBeenCalled();
  });

  it("rechaza sin sesión", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { addHighlight } = await actions();

    await expect(addHighlight(VALID_INPUT)).resolves.toEqual({
      ok: false,
      error: HIGHLIGHT_ERRORS.unexpected,
    });
    expect(createHighlightMock).not.toHaveBeenCalled();
  });

  it("traduce el límite que tira el trigger", async () => {
    createHighlightMock.mockRejectedValue({ code: "23514", message: "highlight_limit_reached" });
    const { addHighlight } = await actions();

    await expect(addHighlight(VALID_INPUT)).resolves.toEqual({
      ok: false,
      error: HIGHLIGHT_ERRORS.limitReached,
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("removeHighlight", () => {
  it("borra y revalida los dos perfiles", async () => {
    const { removeHighlight } = await actions();

    await expect(removeHighlight("h-1")).resolves.toEqual({ ok: true });

    expect(deleteHighlightMock).toHaveBeenCalledWith(expect.anything(), "h-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/jugadores/mi-perfil");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/jugadores/${USER_ID}`);
  });

  // Un id de otro jugador: la RLS deja el delete en 0 filas.
  it("avisa cuando la RLS no dejó borrar", async () => {
    deleteHighlightMock.mockResolvedValue(false);
    const { removeHighlight } = await actions();

    await expect(removeHighlight("de-otro")).resolves.toEqual({
      ok: false,
      error: HIGHLIGHT_ERRORS.deleteFailed,
    });
  });

  it("avisa cuando Supabase falla", async () => {
    deleteHighlightMock.mockRejectedValue(new Error("boom"));
    const { removeHighlight } = await actions();

    await expect(removeHighlight("h-1")).resolves.toEqual({
      ok: false,
      error: HIGHLIGHT_ERRORS.deleteFailed,
    });
  });
});
