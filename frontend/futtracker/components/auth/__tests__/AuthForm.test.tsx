// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanup, flush, render } from "@/components/player/__tests__/dialogTestUtils";

const signInMock = vi.fn();
const signUpMock = vi.fn();
const pushMock = vi.fn();
const getUserMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser: () => getUserMock() } }),
}));

vi.mock("@/app/(auth)/actions", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  signUp: (...args: unknown[]) => signUpMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/env/public", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  },
}));

const { default: AuthForm } = await import("@/components/auth/AuthForm");

// React escucha `input` y lee el valor con el setter nativo: así se simula tipear.
function type(id: string, value: string) {
  act(() => {
    const input = document.getElementById(id) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submitSignIn() {
  type("signin-email", "jugador@example.com");
  type("signin-password", "Cualquiera1");

  await act(async () => {
    document.querySelector("form")!.requestSubmit();
  });
  await flush();
}

async function submitSignUp() {
  await act(async () => {
    [...document.querySelectorAll<HTMLButtonElement>("[role=tab]")]
      .find((tab) => tab.textContent === "Crear cuenta")!
      .click();
  });

  type("signup-fullname", "Jugador Nuevo");
  type("signup-email", "nuevo@example.com");
  type("signup-password", "Password123");
  type("signup-confirm", "Password123");
  await act(async () => {
    document.querySelector<HTMLInputElement>("input[type=checkbox]")!.click();
  });

  await act(async () => {
    document.querySelector("form")!.requestSubmit();
  });
  await flush();
}

function alertText() {
  return document.querySelector("[role=alert]")?.textContent ?? null;
}

function statusText() {
  return document.querySelector("[role=status]")?.textContent ?? null;
}

afterEach(() => {
  cleanup();
  signInMock.mockReset();
  signUpMock.mockReset();
  pushMock.mockReset();
  getUserMock.mockReset();
});

// Volver a la pestaña del registro después de abrir el link en otra.
async function focusTab() {
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
  await flush();
}

describe("AuthForm", () => {
  it("con demasiados intentos lo dice, en vez del error genérico", async () => {
    signInMock.mockResolvedValue({ ok: false, error: "auth.errors.tooManyRequests" });
    render(<AuthForm />);

    await submitSignIn();

    expect(alertText()).toBe("Hubo demasiados intentos. Esperá unos minutos y probá de nuevo.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("con credenciales incorrectas muestra ese mensaje", async () => {
    signInMock.mockResolvedValue({ ok: false, error: "auth.errors.invalidCredentials" });
    render(<AuthForm />);

    await submitSignIn();

    expect(alertText()).toBe("Email o contraseña incorrectos.");
  });

  // Con la confirmación de email prendida (prod) no hay sesión: antes navegaba
  // al perfil, el proxy lo devolvía a /login y no se veía ningún aviso.
  it("si el alta queda esperando la confirmación, avisa que mandó el mail y no navega", async () => {
    signUpMock.mockResolvedValue({ ok: true, checkEmail: true });
    render(<AuthForm />);

    await submitSignUp();

    expect(statusText()).toContain("nuevo@example.com");
    expect(statusText()).toContain("confirmar");
    expect(alertText()).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
    // El aviso reemplaza al formulario: no queda nada que invite a mandarlo de nuevo.
    expect(document.querySelector("form")).toBeNull();
  });

  // El link del mail abre otra pestaña y crea la sesión ahí. Al volver a la
  // del registro, si la sesión ya existe en este navegador, entra sola.
  it("al volver a la pestaña con la cuenta ya confirmada, entra a la app", async () => {
    signUpMock.mockResolvedValue({ ok: true, checkEmail: true });
    render(<AuthForm />);
    await submitSignUp();

    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    await focusTab();

    expect(pushMock).toHaveBeenCalledWith("/jugadores/mi-perfil");
  });

  // Al volver a la pestaña llegan `focus` y `visibilitychange` juntos.
  it("al volver a la pestaña consulta la sesión una sola vez", async () => {
    signUpMock.mockResolvedValue({ ok: true, checkEmail: true });
    render(<AuthForm />);
    await submitSignUp();

    getUserMock.mockResolvedValue({ data: { user: { id: "u1" } } });
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await flush();

    expect(getUserMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledTimes(1);
  });

  it("al volver a la pestaña sin confirmar todavía, se queda en el aviso", async () => {
    signUpMock.mockResolvedValue({ ok: true, checkEmail: true });
    render(<AuthForm />);
    await submitSignUp();

    getUserMock.mockResolvedValue({ data: { user: null } });
    await focusTab();

    expect(pushMock).not.toHaveBeenCalled();
    expect(statusText()).toContain("nuevo@example.com");
  });

  // Si se confirmó en otro dispositivo no hay sesión acá: el proxy lo manda al
  // login y, después de entrar, sigue al perfil.
  it("el botón del aviso lleva a la app", async () => {
    signUpMock.mockResolvedValue({ ok: true, checkEmail: true });
    render(<AuthForm />);
    await submitSignUp();

    await act(async () => {
      [...document.querySelectorAll<HTMLButtonElement>("button")]
        .find((button) => button.textContent === "Ya la confirmé, entrar")!
        .click();
    });

    expect(pushMock).toHaveBeenCalledWith("/jugadores/mi-perfil");
  });

  it("sin el aviso, volver a la pestaña no consulta la sesión", async () => {
    render(<AuthForm />);

    await focusTab();

    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("si el alta arranca la sesión, navega al perfil", async () => {
    signUpMock.mockResolvedValue({ ok: true, redirectTo: "/jugadores/mi-perfil" });
    render(<AuthForm />);

    await submitSignUp();

    expect(pushMock).toHaveBeenCalledWith("/jugadores/mi-perfil");
    expect(statusText()).toBeNull();
  });
});
