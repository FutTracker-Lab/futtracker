import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env/public", () => ({
  publicEnv: {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
  },
}));

// El formulario de verdad trae las Server Actions; acá solo importa qué
// `redirectTo` le llega.
vi.mock("@/components/auth/AuthForm", () => ({
  default: function AuthFormMock() {
    return null;
  },
}));

vi.mock("@/components/auth/AuthBrandPanel", () => ({
  default: function AuthBrandPanelMock() {
    return null;
  },
}));

const { default: LoginPage } = await import("../page");
const { default: AuthForm } = await import("@/components/auth/AuthForm");

type Props = { redirectTo?: string; initialTab?: string };

function findAuthFormProps(node: ReactNode): Props | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findAuthFormProps(child);
      if (found) return found;
    }
    return null;
  }

  const element = node as ReactElement<{ children?: ReactNode } & Props>;

  if (element.type === AuthForm) {
    return element.props;
  }

  return findAuthFormProps(element.props?.children);
}

async function redirectToFor(redirectTo?: string | string[]) {
  const page = await LoginPage({
    searchParams: Promise.resolve(redirectTo === undefined ? {} : { redirectTo }),
    params: Promise.resolve({}),
  } as Parameters<typeof LoginPage>[0]);

  return findAuthFormProps(page)?.redirectTo;
}

describe("LoginPage y redirectTo", () => {
  it("un destino de la app llega al formulario tal cual, con la query", async () => {
    expect(await redirectToFor("/jugadores?radio=50")).toBe("/jugadores?radio=50");
  });

  it.each(["//evil.com", "https://evil.com", "/\\evil.com", "/%2F%2Fevil.com", ""])(
    "%s no llega: el formulario usa el inicio por rol",
    async (redirectTo) => {
      expect(await redirectToFor(redirectTo)).toBeUndefined();
    },
  );

  it("un redirectTo repetido (llega como lista) no llega", async () => {
    expect(await redirectToFor(["/jugadores", "//evil.com"])).toBeUndefined();
  });

  it("sin redirectTo, nada", async () => {
    expect(await redirectToFor()).toBeUndefined();
  });
});
