// @vitest-environment jsdom
import { act, type ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import AppMobileNav from "@/components/nav/AppMobileNav";
import AppSidebar from "@/components/nav/AppSidebar";
import type { UnreadCounts } from "@/components/nav/navItems";
import type { Role } from "@/lib/auth/schemas";

vi.mock("next/navigation", () => ({
  usePathname: () => "/jugadores/mi-perfil",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/(auth)/actions", () => ({ signOut: vi.fn() }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function hydrationErrors(element: ReactElement): unknown[] {
  const errors: unknown[] = [];
  const consoleError = vi.spyOn(console, "error").mockImplementation((...args) => {
    errors.push(args);
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root | undefined;

  try {
    // Como en el servidor: con el `window` y el `document` de jsdom no habría diferencia.
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);
    const html = renderToString(element);
    vi.unstubAllGlobals();
    container.innerHTML = html;

    act(() => {
      root = hydrateRoot(container, element, {
        onRecoverableError: (error) => errors.push(error),
      });
    });
  } finally {
    vi.unstubAllGlobals();
    act(() => root?.unmount());
    container.remove();
    consoleError.mockRestore();
  }

  return errors;
}

const roleCases: { role: Role; unread: UnreadCounts }[] = [
  { role: "player", unread: { notifications: 3, messages: 120 } },
  { role: "delegate", unread: { notifications: 0, messages: 0 } },
];

describe("hidratación del shell", () => {
  it.each(roleCases)("AppSidebar de $role hidrata sin diferencias", ({ role, unread }) => {
    expect(
      hydrationErrors(<AppSidebar fullName="Lucía Fernández" role={role} unread={unread} />),
    ).toEqual([]);
  });

  it.each(roleCases)("AppMobileNav de $role hidrata sin diferencias", ({ role, unread }) => {
    expect(hydrationErrors(<AppMobileNav role={role} unread={unread} />)).toEqual([]);
  });
});
