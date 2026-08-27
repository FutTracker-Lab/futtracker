import type { Role } from "@/lib/auth/schemas";
import { publicEnv } from "@/lib/env/public";

/**
 * Constantes y tipos de auth. Viven acá y no en `app/(auth)/actions.ts` porque
 * ese archivo es `"use server"`, donde lo único exportable son funciones async.
 * Desde acá los puede importar también la UI, sin arrastrar las Server Actions.
 */

// Claves de i18n, nunca texto para el usuario. Como unión y no como `string`
// para que un typo lo corte el typecheck y no aparezca crudo en pantalla.
export type AuthErrorKey =
  | "auth.errors.invalidInput"
  | "auth.errors.invalidCredentials"
  | "auth.errors.unexpected";

export type ActionResult =
  | { ok: true; redirectTo?: string }
  | { ok: false; error: AuthErrorKey };

export const INVALID_INPUT: AuthErrorKey = "auth.errors.invalidInput";
export const INVALID_CREDENTIALS: AuthErrorKey =
  "auth.errors.invalidCredentials";
export const UNEXPECTED: AuthErrorKey = "auth.errors.unexpected";

// Piso de duración para que un email registrado y uno nuevo tarden lo mismo.
// Sin esto, la diferencia de tiempos delata cuáles están dados de alta.
export const MINIMUM_DURATION_MS = 700;

export const SIGN_UP_REDIRECT = `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/callback`;
export const PASSWORD_RESET_REDIRECT = `${publicEnv.NEXT_PUBLIC_SITE_URL}/auth/actualizar-password`;

export const REDIRECT_BY_ROLE: Record<Role, string> = {
  player: "/jugadores/mi-perfil",
  delegate: "/equipos/mi-equipo",
};
