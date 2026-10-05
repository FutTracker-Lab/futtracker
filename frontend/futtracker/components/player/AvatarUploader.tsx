"use client";

import { updateAvatarPath } from "@/app/jugadores/mi-perfil/editar/actions";
import ImageUploader from "@/components/ui/ImageUploader";
import { initialsOf } from "@/lib/format/initials";

// Replican los del bucket (migración 20260831214715_avatars_bucket.sql).
const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type Props = {
  // La carpeta del path es el uid del dueño, que es lo que exige la política
  // de storage. Viene resuelto del servidor en vez de pedirle la sesión otra
  // vez al cliente.
  userId: string;
  fullName: string;
  initialAvatarUrl: string | null;
  initialAvatarPath: string | null;
};

export default function AvatarUploader({
  userId,
  fullName,
  initialAvatarUrl,
  initialAvatarPath,
}: Props) {
  return (
    <ImageUploader
      label="Foto de perfil"
      bucket="avatars"
      folder={userId}
      maxBytes={MAX_BYTES}
      acceptedTypes={ACCEPTED_TYPES}
      hint="JPG, PNG o WebP · hasta 2 MB."
      emptyLabel="Ninguna imagen todavía"
      filledLabel="Foto cargada"
      alt={`Foto de perfil de ${fullName}`}
      initialUrl={initialAvatarUrl}
      initialPath={initialAvatarPath}
      rounded="full"
      placeholder={
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-tint text-lg font-semibold text-brand"
        >
          {initialsOf(fullName)}
        </div>
      }
      onUploaded={updateAvatarPath}
    />
  );
}
