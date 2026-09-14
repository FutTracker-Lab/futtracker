export type UploadResult = { ok: true } | { ok: false; error: string };

export type ImageUploadOutcome =
  | { ok: true; path: string }
  | { ok: false; error: string };

export const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ImageRules = {
  maxBytes: number;
  acceptedTypes: readonly string[];
};

/**
 * El puerto contra el que corre la subida. El componente lo arma con Supabase
 * Storage y la Server Action que corresponda; los tests lo arman con dobles,
 * que es lo que permite cubrir la limpieza de archivos sin un bucket real.
 */
export type ImageUploadPort = {
  upload: (path: string, file: File) => Promise<{ error: unknown }>;
  remove: (path: string) => Promise<unknown>;
  persist: (path: string) => Promise<UploadResult>;
};

const GENERIC_ERROR = "No pudimos subir la imagen. Probá de nuevo.";

/**
 * Valida el archivo antes de gastar una subida. El bucket ya rechaza tipo y
 * tamaño del lado del servidor; esto es lo que permite mostrar el error
 * inline sin ida y vuelta.
 */
export function validateImageFile(
  file: Pick<File, "type" | "size">,
  { maxBytes, acceptedTypes }: ImageRules,
): string | null {
  if (!acceptedTypes.includes(file.type)) {
    return "El archivo tiene que ser JPG, PNG o WebP.";
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / 1024 / 1024);
    return `La imagen no puede pesar más de ${maxMb} MB.`;
  }

  return null;
}

/**
 * `<folder>/<timestamp>.<ext>`: un solo nivel, que es lo que exigen las
 * políticas de storage de los dos buckets (la carpeta es el uid del dueño o
 * el id del equipo). El timestamp evita que la URL firmada anterior (24 h de
 * TTL) siga mostrando la imagen vieja después de reemplazarla.
 */
export function buildObjectPath(
  folder: string,
  type: string,
  now: number = Date.now(),
): string {
  return `${folder}/${now}.${EXTENSION_BY_TYPE[type]}`;
}

/**
 * Sube la imagen, persiste el path y deja el bucket sin huérfanos: si la
 * persistencia falla borra lo recién subido, y si sale bien borra lo anterior.
 */
export async function runImageUpload(
  file: File,
  {
    folder,
    previousPath,
    rules,
    port,
    now,
  }: {
    folder: string;
    previousPath: string | null;
    rules: ImageRules;
    port: ImageUploadPort;
    now?: number;
  },
): Promise<ImageUploadOutcome> {
  const invalid = validateImageFile(file, rules);

  if (invalid) {
    return { ok: false, error: invalid };
  }

  const path = buildObjectPath(folder, file.type, now);

  try {
    const { error: uploadError } = await port.upload(path, file);

    if (uploadError) {
      return { ok: false, error: GENERIC_ERROR };
    }

    const persisted = await port.persist(path);

    if (!persisted.ok) {
      // El archivo ya está en el bucket pero nadie lo referencia: sin esto,
      // cada reintento fallido deja otra copia inalcanzable.
      await port.remove(path).catch(() => undefined);
      return { ok: false, error: persisted.error };
    }

    // La anterior queda huérfana si no se borra. Es best-effort: si falla, la
    // fila ya apunta bien a la nueva y no hay nada que mostrarle al usuario.
    if (previousPath && previousPath !== path) {
      await port.remove(previousPath).catch(() => undefined);
    }

    return { ok: true, path };
  } catch {
    // Quien llama descarta la promesa, así que una excepción acá (red caída,
    // Server Action rechazada) dejaría al usuario sin ningún mensaje.
    return { ok: false, error: GENERIC_ERROR };
  }
}
