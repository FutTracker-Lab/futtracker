// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanup, flush, render } from "@/components/player/__tests__/dialogTestUtils";

const signInMock = vi.fn();
const signUpMock = vi.fn();
const pushMock = vi.fn();

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
});

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

  it("desde el aviso se vuelve a Entrar", async () => {
    signUpMock.mockResolvedValue({ ok: true, checkEmail: true });
    render(<AuthForm />);
    await submitSignUp();

    await act(async () => {
      [...document.querySelectorAll<HTMLButtonElement>("button")]
        .find((button) => button.textContent === "Ya la confirmé, ir a Entrar")!
        .click();
    });

    expect(document.getElementById("signin-email")).not.toBeNull();
    expect(statusText()).toBeNull();
  });

  it("si el alta arranca la sesión, navega al perfil", async () => {
    signUpMock.mockResolvedValue({ ok: true, redirectTo: "/jugadores/mi-perfil" });
    render(<AuthForm />);

    await submitSignUp();

    expect(pushMock).toHaveBeenCalledWith("/jugadores/mi-perfil");
    expect(statusText()).toBeNull();
  });
});
