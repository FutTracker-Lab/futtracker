import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import ActiveFilterChips from "@/components/search/ActiveFilterChips";
import PlayerResultRow from "@/components/search/PlayerResultRow";
import SearchPagination from "@/components/search/SearchPagination";
import { flatten } from "@/components/player/__tests__/reactTree";
import type { PlayerSearchRow } from "@/lib/data/playerSearch";
import { DEFAULT_SEARCH_FILTERS } from "@/lib/search/params";

type Props = Record<string, unknown> & { children?: ReactNode };

function elements(node: ReactNode): ReactElement<Props>[] {
  return flatten(node).filter(isValidElement) as ReactElement<Props>[];
}

function text(node: ReactNode): string {
  return flatten(node)
    .filter((item) => typeof item === "string" || typeof item === "number")
    .join("");
}

function hrefs(node: ReactNode): string[] {
  return elements(node)
    .map((element) => element.props.href)
    .filter((href): href is string => typeof href === "string");
}

function player(overrides: Partial<PlayerSearchRow> = {}): PlayerSearchRow {
  return {
    player_id: "p2",
    full_name: "Pablo Segundo",
    avatar_path: null,
    position: "delantero",
    age: null,
    city: "San Isidro",
    province: "Buenos Aires",
    matches_played: 0,
    is_seeking_team: true,
    distance_km: 35.4,
    total_count: 3,
    ...overrides,
  };
}

describe("PlayerResultRow", () => {
  it("muestra nombre, estado, ciudad, distancia, partidos y posición", () => {
    const row = PlayerResultRow({ player: player(), avatarUrl: null });

    expect(text(row)).toContain("Pablo Segundo");
    expect(text(row)).toContain("Agente libre · San Isidro · 35,4 km · 0 partidos");
    expect(text(row)).toContain("Delantero");
    expect(text(row)).toContain("Ver perfil");
  });

  it("'Ver perfil' lleva al perfil de ese jugador", () => {
    expect(hrefs(PlayerResultRow({ player: player(), avatarUrl: null }))).toEqual([
      "/jugadores/p2",
    ]);
  });

  it("sin foto muestra las iniciales", () => {
    expect(text(PlayerResultRow({ player: player(), avatarUrl: null }))).toContain("PS");
  });

  it("con foto usa la URL firmada y no las iniciales", () => {
    const row = PlayerResultRow({ player: player(), avatarUrl: "https://firmada" });

    expect(elements(row).some((element) => element.props.src === "https://firmada")).toBe(
      true,
    );
    expect(text(row)).not.toContain("PS");
  });

  it("dice 'No busca equipo' si el jugador no busca", () => {
    const row = PlayerResultRow({
      player: player({ is_seeking_team: false }),
      avatarUrl: null,
    });

    expect(text(row)).toContain("No busca equipo");
  });

  it("usa el singular con un partido", () => {
    const row = PlayerResultRow({ player: player({ matches_played: 1 }), avatarUrl: null });

    expect(text(row)).toContain("1 partido");
    expect(text(row)).not.toContain("1 partidos");
  });

  it("no muestra la edad", () => {
    const row = PlayerResultRow({ player: player({ age: 25 }), avatarUrl: null });

    expect(text(row)).not.toContain("25");
  });
});

describe("ActiveFilterChips", () => {
  it("la × de cada chip dice qué filtro quita", () => {
    const chips = ActiveFilterChips({
      chips: [{ label: "Mediocampista", removeHref: "/jugadores?radio=50" }],
    });

    const link = elements(chips).find((element) => element.props.href);

    expect(link?.props["aria-label"]).toBe("Quitar filtro Mediocampista");
    expect(link?.props.href).toBe("/jugadores?radio=50");
  });

  it("sin chips no renderiza nada", () => {
    expect(ActiveFilterChips({ chips: [] })).toBeNull();
  });
});

describe("SearchPagination", () => {
  const filters = { ...DEFAULT_SEARCH_FILTERS, radius: 50 as const, status: "todos" as const };

  it("con una sola página no muestra controles", () => {
    expect(SearchPagination({ filters, totalPages: 1 })).toBeNull();
  });

  it("en la página 1 'Anterior' está deshabilitado", () => {
    const nav = SearchPagination({ filters, totalPages: 2 });

    expect(hrefs(nav)).toEqual(["/jugadores?radio=50&estado=todos&pagina=2"]);
  });

  it("en la última 'Siguiente' está deshabilitado y 'Anterior' conserva los filtros", () => {
    const nav = SearchPagination({ filters: { ...filters, page: 2 }, totalPages: 2 });

    expect(hrefs(nav)).toEqual(["/jugadores?radio=50&estado=todos&pagina=1"]);
  });
});
