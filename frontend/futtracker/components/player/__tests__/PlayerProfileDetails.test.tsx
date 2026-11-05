import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import PlayerProfileDetails from "@/components/player/PlayerProfileDetails";
import type { Player } from "@/lib/data/players";

import { flatten } from "./reactTree";

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: "player-id",
    bio: null,
    birth_date: "2000-05-10",
    city: null,
    country: null,
    height_cm: null,
    is_seeking_team: false,
    latitude: null,
    longitude: null,
    zone_id: null,
    phone: null,
    position: null,
    preferred_foot: null,
    province: null,
    weight_kg: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function paragraphs(nodes: ReactNode[]) {
  return nodes.filter(
    (node): node is ReactElement<{ className: string; children: string }> =>
      isValidElement(node) && node.type === "p",
  );
}

describe("PlayerProfileDetails", () => {
  it("corta una bio con una palabra larga sin cambiar el resto del estilo", () => {
    const bio = "a".repeat(600);

    const [paragraph] = paragraphs(
      flatten(PlayerProfileDetails({ player: player({ bio }) })),
    );

    expect(paragraph.props.children).toBe(bio);
    expect(paragraph.props.className.split(" ").sort()).toEqual([
      "break-words",
      "text-sm",
      "text-zinc-700",
    ]);
  });

  it("no renderiza el párrafo si no hay bio", () => {
    const nodes = flatten(PlayerProfileDetails({ player: player() }));

    expect(paragraphs(nodes)).toHaveLength(0);
  });
});
