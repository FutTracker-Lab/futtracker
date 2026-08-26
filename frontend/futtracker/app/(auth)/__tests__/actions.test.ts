import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "../actions";

const SITE_URL = "http://127.0.0.1:3000";
const MINIMUM_DURATION_MS = 700;

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  single: vi.fn(),
}));

vi.mock("@/lib/env/public", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    NEXT_PUBLIC_SITE_URL: SITE_URL,
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
      signOut: mocks.signOut,
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: mocks.single }),
      }),
    }),
  }),
}));

const { requestPasswordReset, signIn, signOut, signUp, updatePassword } =
  await import("../actions");

const ALTA_PLAYER = {
  email: "nuevo@example.com",
  password: "password123",
  fullName: "Jugador Nuevo",
  role: "player",
};

const USUARIO_YA_EXISTE = {
  code: "user_already_exists",
  status: 422,
  message: "User already registered",
};

/**
 * Las actions tienen un piso de 700 ms deliberado. Con timers reales cada caso
 * pagaría esa espera; se adelanta el reloj en su lugar.
 */
async function correr(promesa: Promise<ActionResult>): Promise<ActionResult> {
  await vi.advanceTimersByTimeAsync(MINIMUM_DURATION_MS);

  return promesa;
}

describe("actions de auth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mocks.signUp.mockResolvedValue({ data: { user: null }, error: null });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("signUp", () => {
    it("da de alta un player y lo manda a su perfil", async () => {
      const resultado = await correr(signUp(ALTA_PLAYER));

      expect(resultado).toEqual({
        ok: true,
        redirectTo: "/jugadores/mi-perfil",
      });

      expect(mocks.signUp).toHaveBeenCalledWith({
        email: ALTA_PLAYER.email,
        password: ALTA_PLAYER.password,
        options: {
          data: { full_name: "Jugador Nuevo", role: "player" },
          emailRedirectTo: `${SITE_URL}/auth/callback`,
        },
      });
    });

    it("manda al delegate a su equipo", async () => {
      const resultado = await correr(
        signUp({ ...ALTA_PLAYER, role: "delegate" }),
      );

      expect(resultado).toEqual({
        ok: true,
        redirectTo: "/equipos/mi-equipo",
      });
    });

    /**
     * Requisito 9d: un email ya registrado no se puede distinguir de un alta
     * nueva. Si esta aserción cambia, se filtra qué emails existen en la base.
     */
    it("con un email ya registrado responde igual que con uno nuevo", async () => {
      mocks.signUp.mockResolvedValue({
        data: { user: null },
        error: USUARIO_YA_EXISTE,
      });

      const repetido = await correr(signUp(ALTA_PLAYER));

      mocks.signUp.mockResolvedValue({ data: { user: null }, error: null });

      const nuevo = await correr(signUp(ALTA_PLAYER));

      expect(repetido).toEqual(nuevo);
      expect(repetido).toEqual({
        ok: true,
        redirectTo: "/jugadores/mi-perfil",
      });
    });
  });

  describe("signIn", () => {
    const CREDENCIALES = { email: "alguien@example.com", password: "password123" };

    it("con password incorrecto devuelve la clave genérica", async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { code: "invalid_credentials", message: "Invalid login credentials" },
      });

      const resultado = await correr(signIn(CREDENCIALES));

      expect(resultado).toEqual({
        ok: false,
        error: "auth.errors.invalidCredentials",
      });
    });

    /**
     * Mismo par de aserciones que el caso anterior, a propósito: password malo
     * y email inexistente tienen que ser indistinguibles desde el cliente.
     */
    it("con un email inexistente devuelve exactamente la misma clave", async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { code: "invalid_credentials", message: "Invalid login credentials" },
      });

      const inexistente = await correr(
        signIn({ ...CREDENCIALES, email: "fantasma@example.com" }),
      );

      expect(inexistente).toEqual({
        ok: false,
        error: "auth.errors.invalidCredentials",
      });
    });

    it("con credenciales válidas redirige según el rol del perfil", async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: { id: "uuid-del-delegate" } },
        error: null,
      });
      mocks.single.mockResolvedValue({
        data: { role: "delegate" },
        error: null,
      });

      const resultado = await correr(signIn(CREDENCIALES));

      expect(resultado).toEqual({
        ok: true,
        redirectTo: "/equipos/mi-equipo",
      });
    });
  });

  describe("requestPasswordReset", () => {
    it("con un email inexistente devuelve ok igual", async () => {
      mocks.resetPasswordForEmail.mockResolvedValue({
        error: { code: "user_not_found", message: "User not found" },
      });

      const resultado = await correr(
        requestPasswordReset({ email: "fantasma@example.com" }),
      );

      expect(resultado).toEqual({ ok: true });
      expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
        "fantasma@example.com",
        { redirectTo: `${SITE_URL}/auth/actualizar-password` },
      );
    });
  });

  describe("input inválido", () => {
    const INVALIDO = { ok: false, error: "auth.errors.invalidInput" };

    it("signUp rechaza un rol que no existe", async () => {
      const resultado = await correr(
        signUp({ ...ALTA_PLAYER, role: "arbitro" }),
      );

      expect(resultado).toEqual(INVALIDO);
      expect(mocks.signUp).not.toHaveBeenCalled();
    });

    it("signUp rechaza una password corta", async () => {
      const resultado = await correr(
        signUp({ ...ALTA_PLAYER, password: "corta" }),
      );

      expect(resultado).toEqual(INVALIDO);
      expect(mocks.signUp).not.toHaveBeenCalled();
    });

    it("signIn rechaza un email que no es email", async () => {
      const resultado = await correr(
        signIn({ email: "no-soy-un-email", password: "password123" }),
      );

      expect(resultado).toEqual(INVALIDO);
      expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    });

    it("requestPasswordReset rechaza un email que no es email", async () => {
      const resultado = await correr(
        requestPasswordReset({ email: "no-soy-un-email" }),
      );

      expect(resultado).toEqual(INVALIDO);
      expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("updatePassword rechaza una password corta", async () => {
      const resultado = await correr(updatePassword({ password: "corta" }));

      expect(resultado).toEqual(INVALIDO);
      expect(mocks.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("acciones sin input", () => {
    it("signOut cierra la sesión", async () => {
      const resultado = await correr(signOut());

      expect(resultado).toEqual({ ok: true });
      expect(mocks.signOut).toHaveBeenCalled();
    });

    it("updatePassword aplica la password nueva", async () => {
      const resultado = await correr(
        updatePassword({ password: "password-nueva" }),
      );

      expect(resultado).toEqual({ ok: true });
      expect(mocks.updateUser).toHaveBeenCalledWith({
        password: "password-nueva",
      });
    });
  });
});
