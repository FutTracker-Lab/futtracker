"use client";

import { updateTeamCrestPath } from "@/app/equipos/actions";
import ImageUploader from "@/components/ui/ImageUploader";

// Replican los del bucket (migración 20260903213955_team_crests_bucket.sql):
// 2 MB y JPG/PNG/WebP. El diseño dice "PNG hasta 1 MB" y el ticket agrega
// SVG, pero manda el bucket — es lo que ya está aplicado y lo que rechaza del
// lado del servidor (discrepancia 2 del ticket).
const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type Props = {
  teamId: string;
  teamName: string;
  initialCrestUrl: string | null;
  initialCrestPath: string | null;
};

export default function CrestUploader({
  teamId,
  teamName,
  initialCrestUrl,
  initialCrestPath,
}: Props) {
  return (
    <ImageUploader
      label="Escudo del club"
      bucket="team-crests"
      folder={teamId}
      maxBytes={MAX_BYTES}
      acceptedTypes={ACCEPTED_TYPES}
      hint="JPG, PNG o WebP · hasta 2 MB. Preferentemente con fondo transparente."
      emptyLabel="Ninguna imagen todavía"
      filledLabel="Escudo cargado"
      alt={`Escudo de ${teamName}`}
      initialUrl={initialCrestUrl}
      initialPath={initialCrestPath}
      rounded="md"
      placeholder={
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-brand-tint text-xs font-semibold text-brand"
        >
          Escudo
        </div>
      }
      onUploaded={(path) => updateTeamCrestPath(teamId, path)}
    />
  );
}
