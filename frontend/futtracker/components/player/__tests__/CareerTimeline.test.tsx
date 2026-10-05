import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CareerTimeline from "@/components/player/CareerTimeline";
import CareerTimelineEmptyState from "@/components/player/CareerTimelineEmptyState";
import CareerTimelineError from "@/components/player/CareerTimelineError";
import CareerTimelineItem from "@/components/player/CareerTimelineItem";
import type { CareerTimelineEntry } from "@/lib/data/careerTimeline";

import { flatten } from "./reactTree";

const { getCareerTimelineEntries } = vi.hoisted(() => ({
  getCareerTimelineEntries: vi.fn(),
}));

vi.mock("@/lib/data/careerTimeline", () => ({ getCareerTimelineEntries }));

// El cliente llega hasta el fetcher, que también está mockeado: lo que estos
// tests cubren es el ramificado del render, no el acceso a datos (eso vive en
// `career_entries.rls.test.ts`, que corre aparte con `npm run test:rls`).
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

function entries(count: number): CareerTimelineEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `entry-${index}`,
    player_id: "player-id",
    club_name: `Club ${index}`,
    category: null,
    position: null,
    start_date: "2020-01-01",
    end_date: "2021-06-30",
    is_current: false,
    team_id: null,
    teams: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  }));
}

function countByType(nodes: ReactNode[], type: unknown): number {
  return nodes.filter((node) => isValidElement(node) && node.type === type)
    .length;
}

async function renderNodes() {
  return flatten(await CareerTimeline({ playerId: "player-id", isOwner: true }));
}

describe("CareerTimeline", () => {
  beforeEach(() => {
    getCareerTimelineEntries.mockReset();
  });

  it("muestra el estado de error cuando falla la consulta", async () => {
    getCareerTimelineEntries.mockRejectedValue(new Error("select falló"));

    const nodes = await renderNodes();

    // El `try` también envuelve a `createClient`: sin esto el test pasaría
    // aunque el error viniera de ahí y el fetcher no se llamara nunca.
    expect(getCareerTimelineEntries).toHaveBeenCalled();
    expect(countByType(nodes, CareerTimelineError)).toBe(1);
    expect(countByType(nodes, CareerTimelineItem)).toBe(0);
  });

  it("muestra el estado vacío cuando no hay etapas", async () => {
    getCareerTimelineEntries.mockResolvedValue([]);

    const nodes = await renderNodes();

    expect(countByType(nodes, CareerTimelineEmptyState)).toBe(1);
    expect(countByType(nodes, CareerTimelineItem)).toBe(0);
  });

  it("monta una fila por etapa cuando hay entradas", async () => {
    getCareerTimelineEntries.mockResolvedValue(entries(3));

    const nodes = await renderNodes();

    expect(countByType(nodes, CareerTimelineItem)).toBe(3);
    expect(countByType(nodes, CareerTimelineEmptyState)).toBe(0);
    expect(countByType(nodes, CareerTimelineError)).toBe(0);
  });
});
