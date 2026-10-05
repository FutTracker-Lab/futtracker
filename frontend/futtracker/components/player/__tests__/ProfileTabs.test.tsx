import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import ProfileTabs from "@/components/player/ProfileTabs";
import type { ProfileTabId } from "@/components/player/profileTabsView";

function flatten(node: ReactNode): ReactNode[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!isValidElement(node)) return node == null || node === false ? [] : [node];

  const { children } = node.props as { children?: ReactNode };

  return [node, ...flatten(children)];
}

function render(activeTab: ProfileTabId, children: ReactNode = "contenido") {
  return flatten(ProfileTabs({ activeTab, children }));
}

function byRole(nodes: ReactNode[], role: string) {
  return nodes.filter(
    (node) => isValidElement(node) && (node.props as { role?: string }).role === role,
  );
}

function propsOf(node: ReactNode) {
  return isValidElement(node)
    ? (node.props as Record<string, unknown>)
    : {};
}

describe("ProfileTabs", () => {
  it("expone un tablist con las dos pestañas del perfil", () => {
    const nodes = render("resumen");

    expect(byRole(nodes, "tablist")).toHaveLength(1);
    expect(byRole(nodes, "tab").map((tab) => propsOf(tab).children)).toEqual([
      "Resumen",
      "Estadísticas",
    ]);
  });

  it("no renderiza Recomendaciones ni Highlights", () => {
    const labels = byRole(render("resumen"), "tab").map((tab) => propsOf(tab).children);

    expect(labels).not.toContain("Recomendaciones");
    expect(labels).not.toContain("Highlights");
  });

  it("marca como seleccionada la pestaña activa", () => {
    const tabs = byRole(render("resumen"), "tab");

    expect(tabs.map((tab) => propsOf(tab)["aria-selected"])).toEqual([true, false]);
  });

  it("marca Estadísticas cuando es la activa", () => {
    const tabs = byRole(render("estadisticas"), "tab");

    expect(tabs.map((tab) => propsOf(tab)["aria-selected"])).toEqual([false, true]);
  });

  it("cada pestaña linkea a su propio valor de ?tab", () => {
    const tabs = byRole(render("resumen"), "tab");

    expect(tabs.map((tab) => propsOf(tab).href)).toEqual([
      "?tab=resumen",
      "?tab=estadisticas",
    ]);
  });

  it("deja una sola pestaña en el orden de tabulación", () => {
    const tabs = byRole(render("estadisticas"), "tab");

    expect(tabs.map((tab) => propsOf(tab).tabIndex)).toEqual([-1, 0]);
  });

  it("renderiza el contenido recibido dentro del panel", () => {
    const nodes = render("estadisticas", "panel de estadísticas");
    const [panel] = byRole(nodes, "tabpanel");

    expect(propsOf(panel).children).toBe("panel de estadísticas");
  });

  it("solo la pestaña activa apunta al panel", () => {
    const tabs = byRole(render("resumen"), "tab");

    expect(propsOf(tabs[0])["aria-controls"]).toBe("panel-resumen");
    expect(propsOf(tabs[1])["aria-controls"]).toBeUndefined();
  });
});
