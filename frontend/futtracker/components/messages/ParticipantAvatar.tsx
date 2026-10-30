import Image from "next/image";

import { initialsOf } from "@/lib/format/initials";

type Props = {
  fullName: string;
  avatarUrl: string | null;
  size?: "sm" | "md";
};

// Foto firmada o, sin foto, las iniciales: mismo criterio que PlayerResultRow.
export default function ParticipantAvatar({ fullName, avatarUrl, size = "md" }: Props) {
  const box = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  const pixels = size === "sm" ? 36 : 44;

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={pixels}
        height={pixels}
        className={`${box} shrink-0 rounded-full object-cover`}
        // Firmada por 24 h: el optimizador de Next no la tiene que cachear.
        unoptimized
      />
    );
  }

  return (
    // `span` y no `div`: también va dentro del botón de una notificación.
    <span
      aria-hidden="true"
      className={`${box} flex shrink-0 items-center justify-center rounded-full bg-brand-tint font-semibold text-brand`}
    >
      {initialsOf(fullName)}
    </span>
  );
}
