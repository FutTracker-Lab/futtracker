import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HighlightGrid from "@/components/player/HighlightGrid";
import HighlightsError from "@/components/player/HighlightsError";
import HighlightsTab from "@/components/player/HighlightsTab";
import HighlightUploadButton from "@/components/player/HighlightUploadButton";
import { flatten } from "@/components/player/__tests__/reactTree";
import { HIGHLIGHT_ERRORS } from "@/lib/data/highlightErrors";
import type { HighlightTile } from "@/lib/data/highlightGallery";
import { RouteConstants } from "@/lib/routes";

const getHighlightGalleryMock = vi.fn();

vi.mock("@/lib/data/highlightGallery", () => ({
  getHighlightGallery: (...args: unknown[]) => getHighlightGalleryMock(...args),
}));

vi.mock("@/app/jugadores/[id]/highlights-actions", () => ({
  addHighlight: vi.fn(),
  removeHighlight: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

function propsOf(node: ReactNode) {
  return isValidElement(node) ? (node.props as Record<string, unknown>) : {};
}

function tiles(count: number): HighlightTile[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `h-${i}`,
    title: `Clip ${i}`,
    dateLabel: "3 ago",
    url: `https://local/${i}.mp4`,
  }));
}

async function renderTab(isOwner: boolean, hasPlayerRow = true) {
  const tab = (await HighlightsTab({ playerId: "p1", isOwner, hasPlayerRow })) as ReactElement;
  return { tab, nodes: flatten(tab) };
}

function ofType(nodes: ReactNode[], type: unknown) {
  return nodes.filter((node) => isValidElement(node) && node.type === type);
}

function text(nodes: ReactNode[]) {
  return nodes.filter((node) => typeof node === "string").join(" ");
}

describe("HighlightsTab", () => {
  beforeEach(() => {
    getHighlightGalleryMock.mockReset();
  });

  it("al visitante le muestra la galería sin acciones de dueño", async () => {
    getHighlightGalleryMock.mockResolvedValue(tiles(3));

    const { nodes } = await renderTab(false);

    const [grid] = ofType(nodes, HighlightGrid);
    expect(propsOf(grid).tiles).toHaveLength(3);
    expect(propsOf(grid).isOwner).toBe(false);
    expect(ofType(nodes, HighlightUploadButton)).toHaveLength(0);
  });

  it("al dueño le habilita la subida con menos de 4 clips", async () => {
    getHighlightGalleryMock.mockResolvedValue(tiles(3));

    const { nodes } = await renderTab(true);

    const [upload] = ofType(nodes, HighlightUploadButton);
    expect(propsOf(upload).label).toBe("Subir clip");
    expect(propsOf(upload).disabled).toBe(false);
    expect(propsOf(ofType(nodes, HighlightGrid)[0]).isOwner).toBe(true);
    expect(text(nodes)).not.toContain(HIGHLIGHT_ERRORS.limitReached);
  });

  it("con 4 clips deshabilita la subida y avisa el máximo", async () => {
    getHighlightGalleryMock.mockResolvedValue(tiles(4));

    const { nodes } = await renderTab(true);

    expect(propsOf(ofType(nodes, HighlightUploadButton)[0]).disabled).toBe(true);
    expect(text(nodes)).toContain(HIGHLIGHT_ERRORS.limitReached);
  });

  it("sin clips, el visitante ve el vacío y ningún botón de subida", async () => {
    getHighlightGalleryMock.mockResolvedValue([]);

    const { nodes } = await renderTab(false);

    expect(text(nodes)).toContain("Este jugador todavía no subió highlights.");
    expect(ofType(nodes, HighlightUploadButton)).toHaveLength(0);
  });

  it("sin clips, el dueño ve su vacío y el botón Subir clip", async () => {
    getHighlightGalleryMock.mockResolvedValue([]);

    const { nodes } = await renderTab(true);

    expect(text(nodes)).toContain("Todavía no subiste highlights.");
    expect(propsOf(ofType(nodes, HighlightUploadButton)[0]).label).toBe("Subir clip");
  });

  it("sin fila en players, pide completar el perfil en vez de subir", async () => {
    getHighlightGalleryMock.mockResolvedValue([]);

    const { nodes } = await renderTab(true, false);

    const link = nodes.find((node) => propsOf(node).href === RouteConstants.profile.edit);
    expect(propsOf(link).children).toBe(HIGHLIGHT_ERRORS.profileIncomplete);
    expect(ofType(nodes, HighlightUploadButton)).toHaveLength(0);
  });

  it("si falla la carga muestra el error en vez de tirar", async () => {
    getHighlightGalleryMock.mockRejectedValue(new Error("down"));

    const { tab } = await renderTab(false);

    expect(tab.type).toBe(HighlightsError);
  });
});
