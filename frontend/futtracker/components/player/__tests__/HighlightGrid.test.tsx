// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import HighlightGrid from "@/components/player/HighlightGrid";
import {
  byLabel,
  byText,
  cleanup,
  click,
  flush,
  pressEscape,
  render,
} from "@/components/player/__tests__/dialogTestUtils";
import { HIGHLIGHT_ERRORS } from "@/lib/data/highlightErrors";
import type { HighlightTile } from "@/lib/data/highlightGallery";

const removeHighlightMock = vi.fn();

vi.mock("@/app/jugadores/[id]/highlights-actions", () => ({
  addHighlight: vi.fn(),
  removeHighlight: (...args: unknown[]) => removeHighlightMock(...args),
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

const TILES: HighlightTile[] = [
  { id: "h-1", title: "Gol vs Racing", dateLabel: "3 ago", url: "https://local/1.mp4" },
  { id: "h-2", title: "Gol de tiro libre", dateLabel: "13 jul", url: "https://local/2.mp4" },
];

afterEach(() => {
  cleanup();
  removeHighlightMock.mockReset();
});

describe("HighlightGrid", () => {
  it("muestra un tile por clip con título y fecha, en el orden recibido", () => {
    render(<HighlightGrid tiles={TILES} isOwner={false} playerId="p1" />);

    const tiles = Array.from(document.querySelectorAll('[aria-label^="Reproducir"]'));
    expect(tiles.map((tile) => tile.textContent)).toEqual([
      "Gol vs Racing · 3 ago",
      "Gol de tiro libre · 13 jul",
    ]);
  });

  it("no monta ningún <video> antes de abrir un tile", () => {
    render(<HighlightGrid tiles={TILES} isOwner={false} playerId="p1" />);

    expect(document.querySelector("video")).toBeNull();
  });

  it("al abrir un tile monta un video con controles y sin autoplay", () => {
    render(<HighlightGrid tiles={TILES} isOwner={false} playerId="p1" />);

    click(byLabel("Reproducir Gol vs Racing")!);

    const videos = document.querySelectorAll("video");
    expect(videos).toHaveLength(1);
    expect(videos[0].controls).toBe(true);
    expect(videos[0].autoplay).toBe(false);
    expect(videos[0].getAttribute("preload")).toBe("metadata");
    expect(videos[0].getAttribute("src")).toBe("https://local/1.mp4");
  });

  it("Esc cierra el visor y devuelve el foco al tile", () => {
    render(<HighlightGrid tiles={TILES} isOwner={false} playerId="p1" />);
    const tile = byLabel("Reproducir Gol vs Racing")!;

    click(tile);
    pressEscape();

    expect(document.querySelector("video")).toBeNull();
    expect(document.activeElement).toBe(tile);
  });

  it("el botón cerrar también cierra el visor", () => {
    render(<HighlightGrid tiles={TILES} isOwner={false} playerId="p1" />);

    click(byLabel("Reproducir Gol vs Racing")!);
    click(byLabel("Cerrar")!);

    expect(document.querySelector("video")).toBeNull();
  });

  it("el visitante no ve el tile libre ni los botones de borrar", () => {
    render(<HighlightGrid tiles={TILES} isOwner={false} playerId="p1" />);

    expect(byText("Espacio para un clip más")).toBeUndefined();
    expect(document.querySelector('[aria-label^="Borrar highlight"]')).toBeNull();
  });

  it("el dueño ve el tile libre y un botón de borrar por clip", () => {
    render(<HighlightGrid tiles={TILES} isOwner playerId="p1" />);

    expect(byText("Espacio para un clip más")).toBeDefined();
    expect(byLabel("Borrar highlight Gol vs Racing")).not.toBeNull();
    expect(byLabel("Borrar highlight Gol de tiro libre")).not.toBeNull();
  });

  it("con 4 clips el dueño no ve el tile libre", () => {
    const four = [...TILES, ...TILES].map((tile, i) => ({ ...tile, id: `h-${i}` }));
    render(<HighlightGrid tiles={four} isOwner playerId="p1" />);

    expect(byText("Espacio para un clip más")).toBeUndefined();
  });

  it("borrar pide confirmación con el título", () => {
    render(<HighlightGrid tiles={TILES} isOwner playerId="p1" />);

    click(byLabel("Borrar highlight Gol vs Racing")!);

    expect(byText("¿Borrar «Gol vs Racing»?")).toBeDefined();
    expect(byText("Esta acción no se puede deshacer.")).toBeDefined();
  });

  it("cancelar no borra", () => {
    render(<HighlightGrid tiles={TILES} isOwner playerId="p1" />);

    click(byLabel("Borrar highlight Gol vs Racing")!);
    click(byText("Cancelar")!);

    expect(removeHighlightMock).not.toHaveBeenCalled();
    expect(document.querySelector("dialog[open]")).toBeNull();
  });

  it("confirmar llama a la Server Action con el id", async () => {
    removeHighlightMock.mockResolvedValue({ ok: true });
    render(<HighlightGrid tiles={TILES} isOwner playerId="p1" />);

    click(byLabel("Borrar highlight Gol vs Racing")!);
    click(byText("Borrar")!);
    await flush();

    expect(removeHighlightMock).toHaveBeenCalledWith("h-1");
    expect(document.querySelector("dialog[open]")).toBeNull();
  });

  it("si el servidor no deja borrar, muestra el error traducido", async () => {
    removeHighlightMock.mockResolvedValue({ ok: false, error: HIGHLIGHT_ERRORS.deleteFailed });
    render(<HighlightGrid tiles={TILES} isOwner playerId="p1" />);

    click(byLabel("Borrar highlight Gol vs Racing")!);
    click(byText("Borrar")!);
    await flush();

    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      HIGHLIGHT_ERRORS.deleteFailed,
    );
  });
});
