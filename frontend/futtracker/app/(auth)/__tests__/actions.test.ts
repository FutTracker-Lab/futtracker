import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/auth/constants";

const SITE_URL = "http://127.0.0.1:3000";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
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

vi.mock("@/lib/auth/requireSession", () => ({ requireSession: mocks.requireSession }));

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

// Dinámico y no estático: un import estático de este módulo correría el mock de
// `@/lib/env/public` antes de que `SITE_URL` esté inicializada.
const { MINIMUM_DURATION_MS } = await import("@/lib/auth/constants");

const PLAYER_SIGN_UP = {
  email: "nuevo@example.com",
  password: "password123",
  fullName: "Jugador Nuevo",
  role: "player",
};

const USER_ALREADY_EXISTS = {
  code: "user_already_exists",
  status: 422,
  message: "User already registered",
};

// Lo que devuelve `auth.signUp` sin error, según el caso. Con la confirmación
// de email prendida no hay sesión, y un email ya registrado vuelve igual pero
// con `identities` vacío (Supabase no avisa que existe).
const NEW_USER_WITH_SESSION = {
  data: { user: { id: "u1", identities: [{ id: "i1" }] }, session: { access_token: "t" } },
  error: null,
};

const NEW_USER_PENDING_CONFIRMATION = {
  data: { user: { id: "u1", identities: [{ id: "i1" }] }, session: null },
  error: null,
};

const EXISTING_USER_PENDING_CONFIRMATION = {
  data: { user: { id: "u0", identities: [] }, session: null },
  error: null,
};

// Lo que devuelve Supabase Auth con los límites de `Rate Limits` alcanzados
// (copiado de los logs de dev).
const EMAIL_RATE_LIMIT = {
  code: "over_email_send_rate_limit",
  status: 429,
  message: "email rate limit exceeded",
};

const REQUEST_RATE_LIMIT = {
  code: "over_request_rate_limit",
  status: 429,
  message: "Request rate limit reached",
};

/**
 * Las actions tienen un piso de duración deliberado. Con timers reales cada
 * caso pagaría esa espera; se adelanta el reloj en su lugar.
 */
async function run(promise: Promise<ActionResult>): Promise<ActionResult> {
  await vi.advanceTimersByTimeAsync(MINIMUM_DURATION_MS);

  return promise;
}

describe("actions de auth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Alta nueva con la confirmación de email apagada (local, dev): la sesión
    // arranca en el momento.
    mocks.signUp.mockResolvedValue(NEW_USER_WITH_SESSION);
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("signUp", () => {
    it("da de alta un player y lo manda a su perfil", async () => {
      const result = await run(signUp(PLAYER_SIGN_UP));

      expect(result).toEqual({
        ok: true,
        redirectTo: "/jugadores/mi-perfil",
      });

      expect(mocks.signUp).toHaveBeenCalledWith({
        email: PLAYER_SIGN_UP.email,
        password: PLAYER_SIGN_UP.password,
        options: {
          data: { full_name: "Jugador Nuevo", role: "player" },
          emailRedirectTo: `${SITE_URL}/auth/callback`,
        },
      });
    });

    it("manda al delegate a su equipo", async () => {
      const result = await run(
        signUp({ ...PLAYER_SIGN_UP, role: "delegate" }),
      );

      expect(result).toEqual({
        ok: true,
        redirectTo: "/equipos/mi-equipo",
      });
    });

    // Con la confirmación de email prendida (prod) no hay sesión hasta abrir el
    // link del mail: redirigir al perfil terminaba en /login sin ningún aviso.
    it("con la confirmación de email prendida avisa que mandó el mail", async () => {
      mocks.signUp.mockResolvedValue(NEW_USER_PENDING_CONFIRMATION);

      const result = await run(signUp(PLAYER_SIGN_UP));

      expect(result).toEqual({ ok: true, checkEmail: true });
    });

    /**
     * Requisito 9d: un email ya registrado no se puede distinguir de un alta
     * nueva. Si estas aserciones cambian, se filtra qué emails existen en la
     * base. Supabase lo reporta distinto según la confirmación de email
     * (ver docs/auth.md), así que va un caso por cada modo.
     */
    it("con la confirmación apagada, un email ya registrado responde igual que uno nuevo", async () => {
      mocks.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: USER_ALREADY_EXISTS,
      });

      const alreadyRegistered = await run(signUp(PLAYER_SIGN_UP));

      mocks.signUp.mockResolvedValue(NEW_USER_WITH_SESSION);

      const brandNew = await run(signUp(PLAYER_SIGN_UP));

      expect(alreadyRegistered).toEqual(brandNew);
      expect(alreadyRegistered).toEqual({
        ok: true,
        redirectTo: "/jugadores/mi-perfil",
      });
    });

    it("con la confirmación prendida, un email ya registrado responde igual que uno nuevo", async () => {
      mocks.signUp.mockResolvedValue(EXISTING_USER_PENDING_CONFIRMATION);

      const alreadyRegistered = await run(signUp(PLAYER_SIGN_UP));

      mocks.signUp.mockResolvedValue(NEW_USER_PENDING_CONFIRMATION);

      const brandNew = await run(signUp(PLAYER_SIGN_UP));

      expect(alreadyRegistered).toEqual(brandNew);
      expect(alreadyRegistered).toEqual({ ok: true, checkEmail: true });
    });

    // Con la confirmación de email prendida, cada alta manda un mail, y el
    // SMTP por defecto de Supabase deja 2 por hora para todo el proyecto.
    it("con el límite de mails alcanzado devuelve demasiados intentos", async () => {
      mocks.signUp.mockResolvedValue({
        data: { user: null },
        error: EMAIL_RATE_LIMIT,
      });

      const result = await run(signUp(PLAYER_SIGN_UP));

      expect(result).toEqual({ ok: false, error: "auth.errors.tooManyRequests" });
    });

    it("con el límite de pedidos alcanzado devuelve demasiados intentos", async () => {
      mocks.signUp.mockResolvedValue({
        data: { user: null },
        error: REQUEST_RATE_LIMIT,
      });

      const result = await run(signUp(PLAYER_SIGN_UP));

      expect(result).toEqual({ ok: false, error: "auth.errors.tooManyRequests" });
    });

    it("otro error sigue siendo inesperado", async () => {
      mocks.signUp.mockResolvedValue({
        data: { user: null },
        error: { code: "unexpected_failure", status: 500, message: "boom" },
      });

      const result = await run(signUp(PLAYER_SIGN_UP));

      expect(result).toEqual({ ok: false, error: "auth.errors.unexpected" });
    });
  });

  describe("signIn", () => {
    const CREDENTIALS = { email: "alguien@example.com", password: "password123" };

    it("con password incorrecto devuelve la clave genérica", async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { code: "invalid_credentials", message: "Invalid login credentials" },
      });

      const result = await run(signIn(CREDENTIALS));

      expect(result).toEqual({
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

      const unknownEmail = await run(
        signIn({ ...CREDENTIALS, email: "fantasma@example.com" }),
      );

      expect(unknownEmail).toEqual({
        ok: false,
        error: "auth.errors.invalidCredentials",
      });
    });

    // El límite de logins es por IP, no por email: decirlo no revela qué
    // cuentas existen. "Email o contraseña incorrectos" acá sería mentira.
    it("con el límite de pedidos alcanzado devuelve demasiados intentos", async () => {
      mocks.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: REQUEST_RATE_LIMIT,
      });

      const result = await run(
        signIn({ email: PLAYER_SIGN_UP.email, password: "cualquiera" }),
      );

      expect(result).toEqual({ ok: false, error: "auth.errors.tooManyRequests" });
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

      const result = await run(signIn(CREDENTIALS));

      expect(result).toEqual({
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

      const result = await run(
        requestPasswordReset({ email: "fantasma@example.com" }),
      );

      expect(result).toEqual({ ok: true });
      expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
        "fantasma@example.com",
        { redirectTo: `${SITE_URL}/auth/actualizar-password` },
      );
    });
  });

  describe("input inválido", () => {
    const INVALID_INPUT_RESULT = { ok: false, error: "auth.errors.invalidInput" };

    it("signUp rechaza un rol que no existe", async () => {
      const result = await run(
        signUp({ ...PLAYER_SIGN_UP, role: "arbitro" }),
      );

      expect(result).toEqual(INVALID_INPUT_RESULT);
      expect(mocks.signUp).not.toHaveBeenCalled();
    });

    it("signUp rechaza una password corta", async () => {
      const result = await run(
        signUp({ ...PLAYER_SIGN_UP, password: "corta" }),
      );

      expect(result).toEqual(INVALID_INPUT_RESULT);
      expect(mocks.signUp).not.toHaveBeenCalled();
    });

    it("signIn rechaza un email que no es email", async () => {
      const result = await run(
        signIn({ email: "no-soy-un-email", password: "password123" }),
      );

      expect(result).toEqual(INVALID_INPUT_RESULT);
      expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    });

    it("requestPasswordReset rechaza un email que no es email", async () => {
      const result = await run(
        requestPasswordReset({ email: "no-soy-un-email" }),
      );

      expect(result).toEqual(INVALID_INPUT_RESULT);
      expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("updatePassword rechaza una password corta", async () => {
      const result = await run(updatePassword({ password: "corta" }));

      expect(result).toEqual(INVALID_INPUT_RESULT);
      expect(mocks.updateUser).not.toHaveBeenCalled();
    });
  });

  describe("acciones sin input", () => {
    it("signOut cierra la sesión", async () => {
      const result = await run(signOut());

      expect(result).toEqual({ ok: true });
      expect(mocks.signOut).toHaveBeenCalled();
    });

    it("updatePassword aplica la password nueva", async () => {
      const result = await run(
        updatePassword({ password: "password-nueva" }),
      );

      expect(result).toEqual({ ok: true });
      expect(mocks.updateUser).toHaveBeenCalledWith({
        password: "password-nueva",
      });
    });
  });
});

describe("ensureSessionAction", () => {
  it("sin sesión deja pasar el redirect", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    mocks.requireSession.mockRejectedValueOnce(redirectError);
    const { ensureSessionAction } = await import("@/app/(auth)/actions");

    await expect(ensureSessionAction()).rejects.toBe(redirectError);
  });

  it("con sesión no hace nada más", async () => {
    mocks.requireSession.mockResolvedValueOnce({});
    const { ensureSessionAction } = await import("@/app/(auth)/actions");

    await expect(ensureSessionAction()).resolves.toBeUndefined();
  });
});
