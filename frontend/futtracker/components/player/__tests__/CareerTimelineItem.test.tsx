import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import CareerTimelineItem from "@/components/player/CareerTimelineItem";
import type { CareerTimelineEntry } from "@/lib/data/careerTimeline";

function entry(overrides: Partial<CareerTimelineEntry> = {}): CareerTimelineEntry {
  return {
    id: "entry-id",
    player_id: "player-id",
    club_name: "Club de prueba",
    category: null,
    position: null,
    start_date: "2020-01-01",
    end_date: "2021-06-30",
    is_current: false,
    team_id: null,
    teams: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// El repo no tiene testing-library ni jsdom (vitest corre en `environment:
// "node"`), pero un componente sincrónico es una función que devuelve un
// árbol de elementos de React, que son objetos planos. Recorrerlo alcanza
// para verificar qué se monta y dónde, sin sumar una dependencia nueva ni
// un DOM.
function flatten(node: ReactNode): ReactNode[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!isValidElement(node)) return node == null || node === false ? [] : [node];

  const { children } = node.props as { children?: ReactNode };

  return [node, ...flatten(children)];
}

describe("CareerTimelineItem", () => {
  // Criterio de aceptación de FUT-91: "dado contenido pasado al slot de
  // estadísticas de una fila, cuando se renderiza, entonces aparece dentro
  // de esa fila".
  it("monta el contenido del slot de estadísticas dentro de la fila", () => {
    const slot = <span data-testid="stats">2025 · 12 PJ</span>;

    const nodes = flatten(CareerTimelineItem({ entry: entry(), statsSlot: slot }));

    expect(nodes).toContain(slot);
  });

  it("no deja el contenedor del slot cuando no se pasa nada", () => {
    const nodes = flatten(CareerTimelineItem({ entry: entry() }));

    // Sin slot no queda un <div> vacío ocupando espacio en la fila: el
    // contenedor solo existe cuando hay algo que mostrar.
    const containers = nodes.filter(
      (node) =>
        isValidElement(node) &&
        typeof node.props === "object" &&
        node.props !== null &&
        "className" in node.props &&
        node.props.className === "flex flex-wrap gap-2 pt-1",
    );

    expect(containers).toHaveLength(0);
  });

  it("linkea el club cuando la entrada tiene equipo vinculado", () => {
    const nodes = flatten(
      CareerTimelineItem({ entry: entry({ team_id: "team-uuid" }) }),
    );

    const links = nodes.filter(
      (node) =>
        isValidElement(node) &&
        typeof node.props === "object" &&
        node.props !== null &&
        "href" in node.props &&
        node.props.href === "/equipos/team-uuid",
    );

    expect(links).toHaveLength(1);
  });

  it("muestra el badge Actual solo cuando la etapa está en curso", () => {
    const conBadge = flatten(
      CareerTimelineItem({ entry: entry({ is_current: true, end_date: null }) }),
    );
    const sinBadge = flatten(CareerTimelineItem({ entry: entry() }));

    expect(conBadge).toContain("Actual");
    expect(sinBadge).not.toContain("Actual");
  });
});
