import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SeasonMetrics from "@/components/player/SeasonMetrics";
import SeasonStatsEmptyState from "@/components/player/SeasonStatsEmptyState";
import SeasonStatsError from "@/components/player/SeasonStatsError";
import SeasonStatsPanel from "@/components/player/SeasonStatsPanel";
import type { SeasonStats } from "@/lib/data/stats";
import { RouteConstants } from "@/lib/routes";

const getSeasonStatsMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

vi.mock("@/lib/data/stats", () => ({
  getSeasonStats: (...args: unknown[]) => getSeasonStatsMock(...args),
}));

function flatten(node: ReactNode): ReactNode[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!isValidElement(node)) return node == null || node === false ? [] : [node];

  const { children } = node.props as { children?: ReactNode };

  return [node, ...flatten(children)];
}

function propsOf(node: ReactNode) {
  return isValidElement(node) ? (node.props as Record<string, unknown>) : {};
}

function seasonRow(year: number, matches: number): SeasonStats {
  return {
    season_year: year,
    matches_played: matches,
    goals: 0,
    assists: 0,
  } as SeasonStats;
}

async function renderPanel(isOwner: boolean) {
  return (await SeasonStatsPanel({ playerId: "p1", isOwner })) as ReactElement;
}

describe("SeasonStatsPanel", () => {
  beforeEach(() => {
    getSeasonStatsMock.mockReset();
  });

  it("muestra las métricas cuando hay partidos", async () => {
    getSeasonStatsMock.mockResolvedValue([seasonRow(2026, 4)]);

    const panel = await renderPanel(false);

    expect(panel.type).toBe(SeasonMetrics);
  });

  it("sin filas muestra el estado vacío y ningún bloque", async () => {
    getSeasonStatsMock.mockResolvedValue([]);

    const panel = await renderPanel(true);

    expect(panel.type).toBe(SeasonStatsEmptyState);
    expect(propsOf(panel).isOwner).toBe(true);
  });

  it("si falla la lectura muestra el error acotado al bloque", async () => {
    getSeasonStatsMock.mockRejectedValue(new Error("supabase caído"));

    const panel = await renderPanel(false);

    expect(panel.type).toBe(SeasonStatsError);
  });
});

describe("SeasonStatsEmptyState", () => {
  function render(isOwner: boolean) {
    return flatten(SeasonStatsEmptyState({ isOwner }));
  }

  function ctaOf(nodes: ReactNode[]) {
    return nodes.find((node) => propsOf(node).href === RouteConstants.profile.career);
  }

  it("muestra el mensaje a cualquier visitante", () => {
    const texts = render(false).map((node) => propsOf(node).children);

    expect(texts).toContain("Todavía no hay estadísticas para mostrar.");
  });

  it("el dueño ve el CTA hacia su trayectoria", () => {
    const cta = ctaOf(render(true));

    expect(propsOf(cta).children).toBe("Cargá tu primer partido");
  });

  it("un tercero no ve el CTA", () => {
    expect(ctaOf(render(false))).toBeUndefined();
  });

  it("no renderiza ningún bloque de métricas", () => {
    const texts = render(true).map((node) => propsOf(node).children);

    expect(texts).not.toContain("Partidos");
    expect(texts.join(" ")).not.toContain("por partido");
  });
});
