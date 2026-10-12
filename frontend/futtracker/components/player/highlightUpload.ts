import {
  HIGHLIGHT_ERRORS,
  mapHighlightUploadError,
} from "@/lib/data/highlightErrors";
import {
  HIGHLIGHT_MAX_BYTES,
  HIGHLIGHT_MIME_TYPES,
  HIGHLIGHT_TITLE_MAX,
  type HighlightActionResult,
  type HighlightInput,
} from "@/lib/data/highlights";

export const HIGHLIGHT_MAX_SECONDS = 120;

export type HighlightUploadPort = {
  upload: (path: string, file: File) => Promise<{ error: unknown }>;
  remove: (path: string) => Promise<unknown>;
  persist: (input: HighlightInput) => Promise<HighlightActionResult>;
};

export function validateHighlightFile(file: Pick<File, "type" | "size">): string | null {
  if (!(HIGHLIGHT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Formato no permitido. Subí un video MP4, WebM o MOV.";
  }

  if (file.size > HIGHLIGHT_MAX_BYTES) {
    return HIGHLIGHT_ERRORS.tooLarge;
  }

  return null;
}

// `null` (duración ilegible) pasa: es validación de cliente, no de seguridad.
export function validateHighlightDuration(seconds: number | null): string | null {
  return seconds !== null && seconds > HIGHLIGHT_MAX_SECONDS
    ? "El video dura más de 2 minutos."
    : null;
}

export function validateHighlightTitle(title: string): string | null {
  const trimmed = title.trim();

  if (!trimmed) {
    return "Ingresá un título.";
  }

  if (trimmed.length > HIGHLIGHT_TITLE_MAX) {
    return "El título no puede superar los 80 caracteres.";
  }

  return null;
}

export async function runHighlightUpload({
  file,
  title,
  path,
  port,
}: {
  file: File;
  title: string;
  path: string;
  port: HighlightUploadPort;
}): Promise<HighlightActionResult> {
  try {
    const { error } = await port.upload(path, file);

    if (error) {
      return {
        ok: false,
        error: mapHighlightUploadError(error as { statusCode?: string }),
      };
    }
  } catch {
    return { ok: false, error: HIGHLIGHT_ERRORS.network };
  }

  let persisted: HighlightActionResult;

  try {
    persisted = await port.persist({ title: title.trim(), storage_path: path });
  } catch {
    persisted = { ok: false, error: HIGHLIGHT_ERRORS.network };
  }

  if (!persisted.ok) {
    await port.remove(path).catch(() => undefined);
  }

  return persisted;
}
