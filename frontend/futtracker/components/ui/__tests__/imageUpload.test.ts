import { describe, expect, it, vi } from "vitest";

import {
  buildObjectPath,
  runImageUpload,
  validateImageFile,
  type ImageUploadPort,
} from "@/components/ui/imageUpload";

const RULES = {
  maxBytes: 2 * 1024 * 1024,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
};

const NOW = 1_757_000_000_000;

// `File` real no hace falta: la subida solo mira tipo y tamaño, y el blob se
// pasa tal cual al puerto.
function fakeFile(type: string, size: number) {
  return { type, size } as unknown as File;
}

function fakePort(overrides: Partial<ImageUploadPort> = {}): ImageUploadPort {
  return {
    upload: vi.fn(async () => ({ error: null })),
    remove: vi.fn(async () => undefined),
    persist: vi.fn(async () => ({ ok: true }) as const),
    ...overrides,
  };
}

describe("validateImageFile", () => {
  it("rechaza un tipo que el bucket no acepta", () => {
    expect(validateImageFile(fakeFile("image/gif", 1000), RULES)).toBe(
      "El archivo tiene que ser JPG, PNG o WebP.",
    );
  });

  it("rechaza un archivo más pesado que el máximo, en MB", () => {
    expect(validateImageFile(fakeFile("image/png", 3 * 1024 * 1024), RULES)).toBe(
      "La imagen no puede pesar más de 2 MB.",
    );
  });

  it("acepta un archivo justo en el límite", () => {
    expect(validateImageFile(fakeFile("image/png", RULES.maxBytes), RULES)).toBeNull();
  });
});

describe("buildObjectPath", () => {
  // Las políticas de storage exigen un solo nivel bajo la carpeta del dueño.
  it("arma <folder>/<timestamp>.<ext> con la extensión del tipo", () => {
    expect(buildObjectPath("equipo-1", "image/jpeg", NOW)).toBe(
      `equipo-1/${NOW}.jpg`,
    );
  });
});

describe("runImageUpload", () => {
  it("sube, persiste el path y borra el anterior", async () => {
    const port = fakePort();

    const result = await runImageUpload(fakeFile("image/png", 1000), {
      folder: "equipo-1",
      previousPath: "equipo-1/viejo.png",
      rules: RULES,
      port,
      now: NOW,
    });

    expect(result).toEqual({ ok: true, path: `equipo-1/${NOW}.png` });
    expect(port.persist).toHaveBeenCalledWith(`equipo-1/${NOW}.png`);
    expect(port.remove).toHaveBeenCalledWith("equipo-1/viejo.png");
  });

  it("no sube nada si el archivo no pasa la validación", async () => {
    const port = fakePort();

    const result = await runImageUpload(fakeFile("image/gif", 1000), {
      folder: "equipo-1",
      previousPath: null,
      rules: RULES,
      port,
    });

    expect(result.ok).toBe(false);
    expect(port.upload).not.toHaveBeenCalled();
  });

  // Hallazgo de review: sin esto, cada reintento fallido deja otra copia
  // inalcanzable en el bucket.
  it("borra lo recién subido si falla la persistencia", async () => {
    const port = fakePort({
      persist: vi.fn(async () => ({ ok: false, error: "No se pudo guardar." }) as const),
    });

    const result = await runImageUpload(fakeFile("image/png", 1000), {
      folder: "equipo-1",
      previousPath: "equipo-1/viejo.png",
      rules: RULES,
      port,
      now: NOW,
    });

    expect(result).toEqual({ ok: false, error: "No se pudo guardar." });
    expect(port.remove).toHaveBeenCalledWith(`equipo-1/${NOW}.png`);
    // El anterior sigue siendo el que referencia la fila: borrarlo dejaría el
    // perfil apuntando a un archivo que ya no está.
    expect(port.remove).not.toHaveBeenCalledWith("equipo-1/viejo.png");
  });

  it("no borra el anterior si falla la subida", async () => {
    const port = fakePort({ upload: vi.fn(async () => ({ error: new Error("red") })) });

    const result = await runImageUpload(fakeFile("image/png", 1000), {
      folder: "equipo-1",
      previousPath: "equipo-1/viejo.png",
      rules: RULES,
      port,
    });

    expect(result).toEqual({
      ok: false,
      error: "No pudimos subir la imagen. Probá de nuevo.",
    });
    expect(port.remove).not.toHaveBeenCalled();
  });

  it("devuelve un error en vez de propagar una excepción", async () => {
    const port = fakePort({
      persist: vi.fn(async () => {
        throw new Error("Server Action rechazada");
      }),
    });

    const result = await runImageUpload(fakeFile("image/png", 1000), {
      folder: "equipo-1",
      previousPath: null,
      rules: RULES,
      port,
    });

    expect(result).toEqual({
      ok: false,
      error: "No pudimos subir la imagen. Probá de nuevo.",
    });
  });

  // Si el borrado del huérfano también falla, el usuario tiene que seguir
  // viendo el error de la persistencia y no el genérico.
  it("mantiene el error original aunque falle la limpieza", async () => {
    const port = fakePort({
      persist: vi.fn(async () => ({ ok: false, error: "No se pudo guardar." }) as const),
      remove: vi.fn(async () => {
        throw new Error("storage caido");
      }),
    });

    const result = await runImageUpload(fakeFile("image/png", 1000), {
      folder: "equipo-1",
      previousPath: null,
      rules: RULES,
      port,
    });

    expect(result).toEqual({ ok: false, error: "No se pudo guardar." });
  });
});
