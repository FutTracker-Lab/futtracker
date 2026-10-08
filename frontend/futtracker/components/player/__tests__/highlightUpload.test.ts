import { describe, expect, it, vi } from "vitest";

import {
  runHighlightUpload,
  validateHighlightDuration,
  validateHighlightFile,
  validateHighlightTitle,
  type HighlightUploadPort,
} from "@/components/player/highlightUpload";
import { HIGHLIGHT_ERRORS } from "@/lib/data/highlightErrors";

const MB = 1024 * 1024;
const PATH = "11111111-1111-4111-8111-111111111111/abc.mp4";

function fakeFile(type: string, size: number) {
  return { type, size } as File;
}

function fakePort(overrides: Partial<HighlightUploadPort> = {}) {
  return {
    upload: vi.fn(async () => ({ error: null })),
    remove: vi.fn(async () => undefined),
    persist: vi.fn(async () => ({ ok: true as const })),
    ...overrides,
  };
}

describe("validateHighlightFile", () => {
  it.each([
    ["video/mp4", 30],
    ["video/webm", 1],
    ["video/quicktime", 1],
    ["video/mp4", 50],
  ])("acepta %s de %i MB", (type, sizeMb) => {
    expect(validateHighlightFile(fakeFile(type, sizeMb * MB))).toBeNull();
  });

  it("rechaza un PDF", () => {
    expect(validateHighlightFile(fakeFile("application/pdf", MB))).toBe(
      "Formato no permitido. Subí un video MP4, WebM o MOV.",
    );
  });

  it("rechaza un MP4 de 60 MB", () => {
    expect(validateHighlightFile(fakeFile("video/mp4", 60 * MB))).toBe(
      "El video pesa más de 50 MB. Comprimilo e intentá de nuevo.",
    );
  });
});

describe("validateHighlightDuration", () => {
  // `null`: el navegador no pudo leerla (MOV en HEVC en Chrome).
  it.each([90, 120, null])("acepta %s segundos", (seconds) => {
    expect(validateHighlightDuration(seconds)).toBeNull();
  });

  it("rechaza 130 segundos", () => {
    expect(validateHighlightDuration(130)).toBe("El video dura más de 2 minutos.");
  });
});

describe("validateHighlightTitle", () => {
  it.each(["", "   "])("pide un título para %j", (title) => {
    expect(validateHighlightTitle(title)).toBe("Ingresá un título.");
  });

  it("rechaza 81 caracteres", () => {
    expect(validateHighlightTitle("x".repeat(81))).toBe(
      "El título no puede superar los 80 caracteres.",
    );
  });

  it("acepta 80 caracteres", () => {
    expect(validateHighlightTitle("x".repeat(80))).toBeNull();
  });
});

describe("runHighlightUpload", () => {
  const file = fakeFile("video/mp4", 30 * MB);

  it("sube y persiste el título recortado con el path", async () => {
    const port = fakePort();

    const result = await runHighlightUpload({ file, title: " Gol vs Racing ", path: PATH, port });

    expect(result).toEqual({ ok: true });
    expect(port.upload).toHaveBeenCalledWith(PATH, file);
    expect(port.persist).toHaveBeenCalledWith({ title: "Gol vs Racing", storage_path: PATH });
    expect(port.remove).not.toHaveBeenCalled();
  });

  it("no persiste si la subida falla", async () => {
    const port = fakePort({
      upload: vi.fn(async () => ({ error: { statusCode: "413" } })),
    });

    const result = await runHighlightUpload({ file, title: "Gol", path: PATH, port });

    expect(result).toEqual({ ok: false, error: HIGHLIGHT_ERRORS.tooLarge });
    expect(port.persist).not.toHaveBeenCalled();
  });

  it("borra el objeto si el servidor rechaza el alta por el límite", async () => {
    const port = fakePort({
      persist: vi.fn(async () => ({ ok: false as const, error: HIGHLIGHT_ERRORS.limitReached })),
    });

    const result = await runHighlightUpload({ file, title: "Gol", path: PATH, port });

    expect(result).toEqual({ ok: false, error: HIGHLIGHT_ERRORS.limitReached });
    expect(port.remove).toHaveBeenCalledWith(PATH);
  });

  it("borra el objeto y avisa de la red si la Server Action no responde", async () => {
    const port = fakePort({
      persist: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    });

    const result = await runHighlightUpload({ file, title: "Gol", path: PATH, port });

    expect(result).toEqual({ ok: false, error: HIGHLIGHT_ERRORS.network });
    expect(port.remove).toHaveBeenCalledWith(PATH);
  });

  it("avisa de la red si la subida tira", async () => {
    const port = fakePort({
      upload: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    });

    const result = await runHighlightUpload({ file, title: "Gol", path: PATH, port });

    expect(result).toEqual({ ok: false, error: HIGHLIGHT_ERRORS.network });
    expect(port.remove).not.toHaveBeenCalled();
  });
});
