// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/equipos/mi-equipo",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/(auth)/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
  }),
}));
vi.mock("@/lib/data/profiles", () => ({
  getProfileById: async () => ({
    kind: "found",
    profile: { id: "u1", full_name: "Carlos Delegado", role: "delegate" },
  }),
}));
vi.mock("@/components/nav/unreadCounts", () => ({
  getUnreadCounts: async () => ({ notifications: 0, messages: 0 }),
}));

const { default: AppShell } = await import("@/components/nav/AppShell");

async function renderShell() {
  const container = document.createElement("div");
  container.innerHTML = renderToString(await AppShell({ children: <p>contenido</p> }));
  return container;
}

// Un elemento `absolute` (los `sr-only` de las filas de Seguidores y
// Postulaciones, por ejemplo) se ubica contra su ancestro posicionado más
// cercano. Si las columnas que scrollean no lo son, ese ancestro es el
// `<body>`: el elemento queda donde estaría sin scrollear, estira la página y
// aparece un segundo scroll con una franja en blanco abajo. jsdom no calcula
// layout, así que el test exige la condición y no mide el scroll.
describe("AppShell: las columnas que scrollean contienen a sus elementos absolute", () => {
  it("el área de contenido es un contenedor posicionado", async () => {
    const main = (await renderShell()).querySelector("main")!;

    expect(main.className).toContain("overflow-y-auto");
    expect(main.className.split(" ")).toContain("relative");
  });

  it("la barra de pestañas de mobile, que scrollea en horizontal, también", async () => {
    const nav = (await renderShell()).querySelector("header nav")!;

    expect(nav.className).toContain("overflow-x-auto");
    expect(nav.className.split(" ")).toContain("relative");
  });

  it("el sidebar también", async () => {
    const aside = (await renderShell()).querySelector("aside")!;

    expect(aside.className).toContain("overflow-y-auto");
    expect(aside.className.split(" ")).toContain("relative");
  });
});
