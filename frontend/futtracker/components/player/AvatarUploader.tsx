"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { updateAvatarPath } from "@/app/jugadores/mi-perfil/editar/actions";
import { initialsOf } from "@/lib/format/initials";
import { createClient } from "@/lib/supabase/client";

// Los tres valores replican los del bucket (migración
// 20260831214715_avatars_bucket.sql): el bucket ya los rechaza del lado del
// servidor, pero validarlos acá es lo que permite mostrar el error sin
// gastar una subida — el criterio de aceptación pide que un PNG de 3 MB ni
// siquiera arranque el upload.
const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type Props = {
  fullName: string;
  initialAvatarUrl: string | null;
  initialAvatarPath: string | null;
};

export default function AvatarUploader({
  fullName,
  initialAvatarUrl,
  initialAvatarPath,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(initialAvatarUrl);
  const [currentPath, setCurrentPath] = useState(initialAvatarPath);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(file: File) {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
      setError("El archivo tiene que ser JPG, PNG o WebP.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("La imagen no puede pesar más de 2 MB.");
      return;
    }

    setIsUploading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Se cerró la sesión. Volvé a entrar para subir la foto.");
        return;
      }

      // El path tiene que ser `<uid>/<archivo>` con un solo nivel: así lo
      // exige la política de storage y el check de `profiles.avatar_path`.
      // El timestamp evita que la URL firmada anterior (24 h de TTL) siga
      // mostrando la foto vieja después de reemplazarla.
      const extension = EXTENSION_BY_TYPE[file.type];
      const path = `${user.id}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        setError("No pudimos subir la imagen. Probá de nuevo.");
        return;
      }

      const result = await updateAvatarPath(path);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // La anterior queda huérfana si no se borra. Es best-effort: si falla,
      // el perfil ya apunta bien a la nueva y no hay nada que mostrarle al
      // usuario.
      if (currentPath && currentPath !== path) {
        await supabase.storage.from("avatars").remove([currentPath]);
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
      <span className="text-sm font-medium text-zinc-900">Foto de perfil</span>
      <div className="flex flex-col items-start gap-4 rounded-lg border border-zinc-200 p-4 sm:flex-row sm:items-center">
        {previewUrl ? (
          // `blob:` del preview local o URL firmada del bucket privado:
          // ninguna de las dos gana nada pasando por el optimizador de Next,
          // y el preview ni siquiera existe fuera de esta pestaña.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`Foto de perfil de ${fullName}`}
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-tint text-lg font-semibold text-brand"
          >
            {initialsOf(fullName)}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-zinc-900">
            {previewUrl ? "Foto cargada" : "Ninguna imagen todavía"}
          </p>
          <p className="text-xs text-zinc-500">
            JPG, PNG o WebP · hasta 2 MB.
          </p>
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
        accept={ACCEPT_ATTR}
        className="sr-only"
        aria-label="Elegir foto de perfil"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Se limpia el input para que elegir el mismo archivo dos veces
          // seguidas vuelva a disparar el change.
          event.target.value = "";
          if (file) {
            void handleFileChange(file);
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
