import { beforeEach, describe, expect, it, vi } from "vitest";

// Server Action bajo test: valida con Zod, después hace dos escrituras
// (players vía upsertPlayer, profiles.full_name directo) y revalida rutas.
// Se mockean los tres bordes (Supabase, lib/data/players y next/cache) para
// testear solo la lógica de esta función, no lo que hay del otro lado.
const upsertPlayerMock = vi.fn();
const revalidatePathMock = vi.fn();
const profilesUpdateMock = vi.fn();
const profilesEqMock = vi.fn();

vi.mock("@/lib/data/players", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/players")>(
    "@/lib/data/players",
  );
  return {
    ...actual,
    upsertPlayer: (...args: unknown[]) => upsertPlayerMock(...args),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

const requireSessionMock = vi.fn(async () => ({
  supabase: {
    from: () => ({
      update: (...args: unknown[]) => {
        profilesUpdateMock(...args);
        return { eq: profilesEqMock };
      },
    }),
  },
  user: { id: "user-1" },
}));

vi.mock("@/lib/auth/requireSession", () => ({
  requireSession: () => requireSessionMock(),
}));

const VALID_INPUT = {
  birth_date: null,
  position: "delantero",
  preferred_foot: "derecha",
  height_cm: 180,
  weight_kg: 75,
  zone_id: "san-isidro",
  country: "AR",
  bio: null,
  phone: null,
  is_seeking_team: true,
};

describe("updatePlayerProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilesEqMock.mockResolvedValue({ error: null });
    upsertPlayerMock.mockResolvedValue(undefined);
  });

  it("rechaza un input inválido sin llegar a Supabase", async () => {
    const { updatePlayerProfile } = await import("@/app/jugadores/mi-perfil/editar/actions");

    const result = await updatePlayerProfile({ height_cm: 999 }, "Juan Pérez");

    expect(result).toEqual({ ok: false, error: "Revisá los datos ingresados." });
    expect(upsertPlayerMock).not.toHaveBeenCalled();
  });

  it("sin sesión deja pasar el redirect y no escribe", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    requireSessionMock.mockRejectedValueOnce(redirectError);
    const { updatePlayerProfile } = await import("@/app/jugadores/mi-perfil/editar/actions");

    await expect(updatePlayerProfile(VALID_INPUT, "Juan Pérez")).rejects.toBe(redirectError);
    expect(upsertPlayerMock).not.toHaveBeenCalled();
  });

  it("escribe primero players y recién después profiles.full_name", async () => {
    const { updatePlayerProfile } = await import("@/app/jugadores/mi-perfil/editar/actions");
    const callOrder: string[] = [];
    upsertPlayerMock.mockImplementation(() => {
      callOrder.push("players");
      return Promise.resolve();
    });
    profilesUpdateMock.mockImplementation(() => {
      callOrder.push("profiles");
    });

    const result = await updatePlayerProfile(VALID_INPUT, "Juan Pérez");

    expect(result).toEqual({ ok: true });
    expect(callOrder).toEqual(["players", "profiles"]);
  });

  it("no escribe profiles si upsertPlayer falla", async () => {
    upsertPlayerMock.mockRejectedValue(new Error("db down"));
    const { updatePlayerProfile } = await import("@/app/jugadores/mi-perfil/editar/actions");

    const result = await updatePlayerProfile(VALID_INPUT, "Juan Pérez");

    expect(result.ok).toBe(false);
    expect(profilesUpdateMock).not.toHaveBeenCalled();
  });

  it("apunta al campo zona un zone_id que no existe, sin tocar profiles", async () => {
    upsertPlayerMock.mockRejectedValue({
      code: "23503",
      message:
        'insert or update on table "players" violates foreign key constraint "players_zone_id_fkey"',
    });
    const { updatePlayerProfile } = await import("@/app/jugadores/mi-perfil/editar/actions");

    const result = await updatePlayerProfile({ ...VALID_INPUT, zone_id: "no-existe" }, "Juan Pérez");

    expect(result).toEqual({
      ok: false,
      error: "Elegí una zona de la lista.",
      field: "zone_id",
    });
    expect(profilesUpdateMock).not.toHaveBeenCalled();
  });

  it("revalida las dos rutas de perfil al guardar con éxito", async () => {
    const { updatePlayerProfile } = await import("@/app/jugadores/mi-perfil/editar/actions");

    await updatePlayerProfile(VALID_INPUT, "Juan Pérez");

    expect(revalidatePathMock).toHaveBeenCalledWith("/jugadores/mi-perfil");
    expect(revalidatePathMock).toHaveBeenCalledWith("/jugadores/user-1");
  });
});

describe("updateAvatarPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilesEqMock.mockResolvedValue({ error: null });
  });

  it("guarda el path y revalida las rutas del perfil", async () => {
    const { updateAvatarPath } = await import("@/app/jugadores/mi-perfil/editar/actions");

    const result = await updateAvatarPath("user-1/avatar-123.png");

    expect(result).toEqual({ ok: true });
    expect(profilesUpdateMock).toHaveBeenCalledWith({
      avatar_path: "user-1/avatar-123.png",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/jugadores/user-1");
  });

  // Una Server Action es un endpoint POST publico: se puede invocar con un
  // path arbitrario sin pasar por el uploader. Sin este chequeo, un perfil
  // podria quedar apuntando al avatar de otro usuario.
  it("rechaza un path que apunta a la carpeta de otro usuario", async () => {
    const { updateAvatarPath } = await import("@/app/jugadores/mi-perfil/editar/actions");

    const result = await updateAvatarPath("otro-usuario/avatar.png");

    expect(result.ok).toBe(false);
    expect(profilesUpdateMock).not.toHaveBeenCalled();
  });

  it("rechaza un path con subcarpetas", async () => {
    const { updateAvatarPath } = await import("@/app/jugadores/mi-perfil/editar/actions");

    const result = await updateAvatarPath("user-1/../otro/avatar.png");

    expect(result.ok).toBe(false);
    expect(profilesUpdateMock).not.toHaveBeenCalled();
  });

  it("sin sesión deja pasar el redirect y no escribe", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    requireSessionMock.mockRejectedValueOnce(redirectError);
    const { updateAvatarPath } = await import("@/app/jugadores/mi-perfil/editar/actions");

    await expect(updateAvatarPath("user-1/avatar.png")).rejects.toBe(redirectError);
    expect(profilesUpdateMock).not.toHaveBeenCalled();
  });
});
