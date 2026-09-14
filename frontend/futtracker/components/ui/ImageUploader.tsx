"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export type UploadResult = { ok: true } | { ok: false; error: string };

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type Props = {
  label: string;
  // Bucket y carpeta de destino. El path final es `<folder>/<archivo>` con un
  // solo nivel, que es lo que exigen las políticas de storage de los dos
  // buckets (la carpeta es el uid del dueño o el id del equipo).
  bucket: string;
  folder: string;
  maxBytes: number;
  acceptedTypes: readonly string[];
  hint: string;
  emptyLabel: string;
  filledLabel: string;
  alt: string;
  initialUrl: string | null;
  initialPath: string | null;
  // Qué mostrar mientras no hay imagen (iniciales del jugador, placeholder
  // del escudo...). El uploader no sabe nada del dominio.
  placeholder: ReactNode;
  rounded: "full" | "md";
  // Persiste el path recién subido. Es una Server Action distinta para cada
  // caso (perfil o equipo), así que entra por prop.
  onUploaded: (path: string) => Promise<UploadResult>;
};

/**
 * Subida de una imagen a un bucket privado de Supabase: valida, sube desde el
 * cliente, persiste el path por la Server Action que le pasen y borra el
 * archivo anterior.
 *
 * Genérico porque el avatar del jugador y el escudo del equipo son el mismo
 * flujo con otro bucket y otras etiquetas — antes de extraerlo, la segunda
 * pantalla habría copiado esta lógica entera.
 */
export default function ImageUploader({
  label,
  bucket,
  folder,
  maxBytes,
  acceptedTypes,
  hint,
  emptyLabel,
  filledLabel,
  alt,
  initialUrl,
  initialPath,
  placeholder,
  rounded,
  onUploaded,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(initialUrl);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const maxMb = Math.round(maxBytes / 1024 / 1024);
  const shapeClass = rounded === "full" ? "rounded-full" : "rounded-md";

  async function handleFile(file: File) {
    setError(null);

    // El bucket ya rechaza tipo y tamaño del lado del servidor; validarlo acá
    // es lo que permite mostrar el error sin gastar una subida.
    if (!acceptedTypes.includes(file.type)) {
      setError("El archivo tiene que ser JPG, PNG o WebP.");
      return;
    }

    if (file.size > maxBytes) {
      setError(`La imagen no puede pesar más de ${maxMb} MB.`);
      return;
    }

    setIsUploading(true);

    try {
      const supabase = createClient();
      // El timestamp evita que la URL firmada anterior (24 h de TTL) siga
      // mostrando la imagen vieja después de reemplazarla.
      const extension = EXTENSION_BY_TYPE[file.type];
      const path = `${folder}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        setError("No pudimos subir la imagen. Probá de nuevo.");
        return;
      }

      const result = await onUploaded(path);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // La anterior queda huérfana si no se borra. Es best-effort: si falla,
      // la fila ya apunta bien a la nueva y no hay nada que mostrarle al
      // usuario.
      if (currentPath && currentPath !== path) {
        await supabase.storage.from(bucket).remove([currentPath]);
      }

      setCurrentPath(path);
      setPreviewUrl(URL.createObjectURL(file));
      router.refresh();
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-zinc-900">{label}</span>
      <div className="flex flex-col items-start gap-4 rounded-lg border border-zinc-200 p-4 sm:flex-row sm:items-center">
        {previewUrl ? (
          // `blob:` del preview local o URL firmada de un bucket privado:
          // ninguna gana nada pasando por el optimizador de Next, y el preview
          // ni siquiera existe fuera de esta pestaña.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={alt}
            className={`h-16 w-16 shrink-0 object-cover ${shapeClass}`}
          />
        ) : (
          placeholder
        )}

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-zinc-900">
            {previewUrl ? filledLabel : emptyLabel}
          </p>
          <p className="text-xs text-zinc-500">{hint}</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="mt-1 w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
          >
            {isUploading ? "Subiendo…" : "Elegir archivo"}
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        className="sr-only"
        aria-label={label}
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Se limpia el input para que elegir el mismo archivo dos veces
          // seguidas vuelva a disparar el change.
          event.target.value = "";
          if (file) {
            void handleFile(file);
          }
        }}
      />

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
