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

function findElement(
  node: ReactNode,
  matches: (element: ReactElement<Record<string, unknown>>) => boolean,
): ReactElement<Record<string, unknown>> | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, matches);
      if (found) return found;
    }
    return null;
  }

  const element = node as ReactElement<Record<string, unknown>>;

  if (matches(element)) {
    return element;
  }

  return findElement(element.props?.children as ReactNode, matches);
}

function textOf(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return "";
  if (Array.isArray(node)) return node.map(textOf).join("");
  return textOf((node as ReactElement<{ children?: ReactNode }>).props?.children);
}

async function renderWith(searchParams: Record<string, string | string[]>) {
  return LoginPage({
    searchParams: Promise.resolve(searchParams),
    params: Promise.resolve({}),
  } as Parameters<typeof LoginPage>[0]);
}

async function redirectToFor(redirectTo?: string | string[]) {
  const page = await renderWith(redirectTo === undefined ? {} : { redirectTo });

  return (findElement(page, (element) => element.type === AuthForm)?.props as Props | undefined)
    ?.redirectTo;
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

const findNotice = (page: ReactNode) => findElement(page, (element) => element.props?.role === "status");

describe("LoginPage y el aviso de servicio no disponible", () => {
  it("con aviso=servicio muestra el aviso con Reintentar hacia el destino", async () => {
    const page = await renderWith({ aviso: "servicio", redirectTo: "/sugerencias?radio=50" });

    const notice = findNotice(page);
    expect(textOf(notice)).toContain("El servicio no está disponible en este momento.");
    const retry = findElement(notice, (element) => textOf(element) === "Reintentar" && "href" in element.props);
    expect(retry?.props.href).toBe("/sugerencias?radio=50");
  });

  it("sin un destino válido, el aviso sale sin Reintentar", async () => {
    const page = await renderWith({ aviso: "servicio", redirectTo: "//evil.com" });

    const notice = findNotice(page);
    expect(notice).not.toBeNull();
    expect(textOf(notice)).not.toContain("Reintentar");
  });

  it.each<Record<string, string>>([{}, { aviso: "otra-cosa" }])("con %o no hay aviso", async (searchParams) => {
    expect(findNotice(await renderWith(searchParams))).toBeNull();
  });
});
