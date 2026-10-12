export const HIGHLIGHT_ERRORS = {
  limitReached: "Llegaste al máximo de 4 highlights. Borrá uno para subir otro.",
  profileIncomplete: "Completá tu perfil para subir highlights.",
  tooLarge: "El video pesa más de 50 MB. Comprimilo e intentá de nuevo.",
  uploadFailed: "No pudimos subir el clip. Probá de nuevo.",
  deleteFailed: "No pudimos borrar el highlight. Probá de nuevo.",
  network: "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.",
  unexpected: "Ocurrió un error inesperado. Probá de nuevo.",
} as const;

type PostgresError = { code?: string; message?: string };
type StorageError = { statusCode?: string; message?: string };

export function mapHighlightInsertError(error: PostgresError): string {
  // El trigger del límite y el check de `storage_path` comparten el 23514.
  if (error.code === "23514" && error.message?.includes("highlight_limit_reached")) {
    return HIGHLIGHT_ERRORS.limitReached;
  }

  if (error.code === "23503") {
    return HIGHLIGHT_ERRORS.profileIncomplete;
  }

  return HIGHLIGHT_ERRORS.unexpected;
}

export function mapHighlightUploadError(error: StorageError): string {
  return error.statusCode === "413"
    ? HIGHLIGHT_ERRORS.tooLarge
    : HIGHLIGHT_ERRORS.uploadFailed;
}
