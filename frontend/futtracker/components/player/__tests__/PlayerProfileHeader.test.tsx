import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import PlayerProfileHeader from "@/components/player/PlayerProfileHeader";
import type { Player } from "@/lib/data/players";
import type { Tables } from "@/lib/supabase/database.types";

function profile(
  overrides: Partial<Tables<"profiles">> = {},
): Tables<"profiles"> {
  return {
    id: "profile-id",
    full_name: "Jugador de prueba",
    avatar_path: null,
    role: "player",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: "player-id",
    bio: null,
    birth_date: "2000-05-10",
    city: "Rosario",
    country: null,
    height_cm: null,
    is_seeking_team: false,
    latitude: null,
    longitude: null,
    phone: null,
    position: "mediocampista",
    preferred_foot: "derecha",
    province: "Santa Fe",
    weight_kg: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// Mismo recorrido del árbol que `CareerTimelineItem.test.tsx`: evita sumar
// jsdom y testing-library solo para esto.
function flatten(node: ReactNode): ReactNode[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (!isValidElement(node)) return node == null || node === false ? [] : [node];

  const { children } = node.props as { children?: ReactNode };

  return [node, ...flatten(children)];
}

function actionsContainers(nodes: ReactNode[]) {
  return nodes.filter(
    (node) =>
      isValidElement(node) &&
      typeof node.props === "object" &&
      node.props !== null &&
      "className" in node.props &&
      node.props.className === "shrink-0",
  );
}

describe("PlayerProfileHeader", () => {
  it("muestra el badge Vos y las acciones cuando lo mira el dueño", () => {
    const actions = <button data-testid="edit">Editar perfil</button>;

    const nodes = flatten(
      PlayerProfileHeader({
        profile: profile(),
        player: player(),
        isOwner: true,
        avatarUrl: null,
        actions,
      }),
    );

    expect(nodes).toContain("Vos");
    expect(nodes).toContain(actions);
  });

  it("no muestra el badge Vos ni las acciones cuando lo mira un tercero", () => {
    const nodes = flatten(
      PlayerProfileHeader({
        profile: profile(),
        player: player(),
        isOwner: false,
        avatarUrl: null,
      }),
    );

    expect(nodes).not.toContain("Vos");
    expect(actionsContainers(nodes)).toHaveLength(0);
  });

  it("monta las acciones que recibe aunque no sea el dueño", () => {
    // El componente no decide quién ve acciones, solo ocupa el slot: la
    // decisión vive en la página (`app/jugadores/[id]/page.tsx`).
    const actions = <button data-testid="follow">Seguir</button>;

    const nodes = flatten(
      PlayerProfileHeader({
        profile: profile(),
        player: player(),
        isOwner: false,
        avatarUrl: null,
        actions,
      }),
    );

    expect(nodes).toContain(actions);
    expect(actionsContainers(nodes)).toHaveLength(1);
  });

  it("cambia el aviso de ficha incompleta según quién mira", () => {
    const owner = flatten(
      PlayerProfileHeader({
        profile: profile(),
        player: null,
        isOwner: true,
        avatarUrl: null,
      }),
    );
    const visitor = flatten(
      PlayerProfileHeader({
        profile: profile(),
        player: null,
        isOwner: false,
        avatarUrl: null,
      }),
    );

    expect(owner).toContain("Todavía no completaste tu perfil.");
    expect(visitor).toContain("Este jugador todavía no completó su perfil.");
  });
});
