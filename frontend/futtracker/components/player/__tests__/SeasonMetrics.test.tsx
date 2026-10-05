import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import SeasonMetrics from "@/components/player/SeasonMetrics";
import type { SeasonTotals } from "@/components/player/seasonTotalsView";

// Sin jsdom: los subcomponentes se ejecutan a mano para llegar a sus textos.
function expand(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return node.map(expand);
  if (!isValidElement(node)) return node;

  const { type, props } = node as { type: unknown; props: Record<string, unknown> };
  if (typeof type === "function") {
    return expand((type as (p: unknown) => ReactNode)(props));
  }

  return { ...node, props: { ...props, children: expand(props.children as ReactNode) } };
}

function flatten(node: ReactNode): ReactNode[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!isValidElement(node)) return node == null || node === false ? [] : [node];

  const { children } = node.props as { children?: ReactNode };

  return [node, ...flatten(children)];
}

// Une el texto directo de cada elemento: la interpolación de JSX lo parte.
function texts(nodes: ReactNode[]): string[] {
  return nodes.flatMap((node) => {
    if (!isValidElement(node)) return [];
    const { children } = node.props as { children?: ReactNode };
    const parts = (Array.isArray(children) ? children : [children]).filter(
      (child) => typeof child === "string" || typeof child === "number",
    );

    return parts.length > 0 ? [parts.join("")] : [];
  });
}

function season(year: number, matches: number, goals: number, assists: number): SeasonTotals {
  return {
    year,
    matchesPlayed: matches,
    goals,
    assists,
    goalsPerMatch: goals / matches,
    assistsPerMatch: assists / matches,
  };
}

function render(seasons: SeasonTotals[]) {
  return texts(flatten(expand(SeasonMetrics({ seasons }))));
}

describe("SeasonMetrics", () => {
  it("muestra el año más reciente y sus tres bloques", () => {
    const all = render([season(2025, 3, 1, 1), season(2026, 4, 2, 3)]);

    expect(all).toContain("Temporada 2026");
    expect(all).toContain("Sólo partidos con planilla cargada.");
    expect(all).toEqual(
      expect.arrayContaining([
        "4",
        "Partidos",
        "2",
        "Goles · 0,50 por partido",
        "3",
        "Asistencias · 0,75 por partido",
      ]),
    );
  });

  it("usa 2025 si es el único año con partidos", () => {
    const all = render([season(2025, 3, 1, 1)]);

    expect(all).toContain("Temporada 2025");
    expect(all).not.toContain("Temporada 2026");
  });

  it("no renderiza Victorias ni '+N este mes'", () => {
    const all = render([season(2026, 4, 2, 3)]).join(" ");

    expect(all).not.toContain("Victorias");
    expect(all).not.toContain("este mes");
  });

  it("devuelve null sin temporadas", () => {
    expect(SeasonMetrics({ seasons: [] })).toBeNull();
  });
});
