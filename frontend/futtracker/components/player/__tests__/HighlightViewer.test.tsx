// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import HighlightViewer from "@/components/player/HighlightViewer";
import { cleanup, render } from "@/components/player/__tests__/dialogTestUtils";

const TILE = { id: "h-1", title: "Gol vs Racing", dateLabel: "3 ago", url: "https://local/1.mov" };
const UNPLAYABLE = "Este clip no se puede reproducir en este dispositivo.";
const NOT_LOADED = "No pudimos cargar este clip.";

function video() {
  return document.querySelector("video");
}

function text() {
  return document.body.textContent ?? "";
}

// jsdom no decodifica video: el ancho se fija a mano antes de avisar que
// cargaron los metadatos.
function loadMetadata(width: number) {
  const element = video()!;
  Object.defineProperty(element, "videoWidth", { value: width, configurable: true });
  act(() => {
    element.dispatchEvent(new Event("loadedmetadata"));
  });
}

// Los códigos de MediaError; jsdom no define la clase.
const MEDIA_ERR_NETWORK = 2;
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

function failWith(code: number) {
  const element = video()!;
  Object.defineProperty(element, "error", { value: { code }, configurable: true });
  act(() => {
    element.dispatchEvent(new Event("error"));
  });
}

afterEach(() => {
  cleanup();
});

describe("HighlightViewer (FUT-163)", () => {
  it("si el navegador no puede reproducir el clip, lo dice en vez de dejar el video en negro", () => {
    render(<HighlightViewer tile={TILE} onClose={vi.fn()} />);

    failWith(MEDIA_ERR_SRC_NOT_SUPPORTED);

    expect(video()).toBeNull();
    expect(text()).toContain(UNPLAYABLE);
  });

  // Por ejemplo, sin conexión: el clip no tiene nada de malo.
  it("si falla la red, no culpa al dispositivo", () => {
    render(<HighlightViewer tile={TILE} onClose={vi.fn()} />);

    failWith(MEDIA_ERR_NETWORK);

    expect(video()).toBeNull();
    expect(text()).toContain(NOT_LOADED);
    expect(text()).not.toContain(UNPLAYABLE);
  });

  // Chrome sin soporte de HEVC puede cargar el MP4 y reproducir solo el audio:
  // no hay evento de error, pero la pista de video no tiene tamaño.
  it("si carga sin imagen (HEVC en Chrome sin soporte), también lo dice", () => {
    render(<HighlightViewer tile={TILE} onClose={vi.fn()} />);

    loadMetadata(0);

    expect(video()).toBeNull();
    expect(text()).toContain(UNPLAYABLE);
  });

  it("un clip que carga con imagen se sigue viendo", () => {
    render(<HighlightViewer tile={TILE} onClose={vi.fn()} />);

    loadMetadata(1920);

    expect(video()).not.toBeNull();
    expect(text()).not.toContain(UNPLAYABLE);
  });
});
