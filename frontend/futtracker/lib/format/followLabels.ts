import { formatCount } from "@/lib/format/numbers";

// Sin i18n (next-intl descartado): los textos de `follows.*` viven acá.
export const FOLLOW_ERROR_MESSAGES = {
  teamNotFound: "Este equipo ya no existe.",
  unexpected: "No pudimos actualizar el seguimiento. Probá de nuevo.",
} as const;

export type FollowActionErrorKey = keyof typeof FOLLOW_ERROR_MESSAGES;

export function followerCountLabel(count: number): string {
  return formatCount(count, "seguidor", "seguidores");
}

export function followSuccessMessage(teamName: string): string {
  return `Ahora seguís a ${teamName}.`;
}

export function unfollowSuccessMessage(teamName: string): string {
  return `Dejaste de seguir a ${teamName}.`;
}

export function unfollowButtonLabel(teamName: string): string {
  return `Dejar de seguir a ${teamName}`;
}
