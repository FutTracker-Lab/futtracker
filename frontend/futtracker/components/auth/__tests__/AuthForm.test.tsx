// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanup, flush, render } from "@/components/player/__tests__/dialogTestUtils";

const signInMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/app/(auth)/actions", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  signUp: vi.fn(),
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

function alertText() {
  return document.querySelector("[role=alert]")?.textContent ?? null;
}

afterEach(() => {
  cleanup();
  signInMock.mockReset();
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
});
