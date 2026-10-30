import type { MessageErrorKey } from "@/lib/data/messages";
import { formatShortDate } from "@/lib/format/dates";

// ---------------------------------------------------------------------------
// Textos y formatos de la mensajería (FUT-140). Funciones puras: se testean
// sin renderizar, con un `now` fijo.
// ---------------------------------------------------------------------------

/** Requisito 7. Nunca el texto crudo de Postgres. */
export const MESSAGE_ERROR_TEXT: Record<MessageErrorKey, string> = {
  invalidBody: "El mensaje tiene que tener entre 1 y 2000 caracteres.",
  selfConversation: "No podés mandarte mensajes a vos mismo.",
  recipientNotFound: "Esta cuenta ya no existe.",
  forbidden: "No pudimos enviar el mensaje. Probá de nuevo.",
  unexpected: "No pudimos enviar el mensaje. Probá de nuevo.",
};

export function roleLabel(role: string): string {
  return role === "delegate" ? "Delegado" : "Jugador";
}

/** El extracto de la bandeja, con "Vos: " si el último mensaje es propio. */
export function previewText(
  lastMessage: { body: string; sender_id: string } | null,
  myId: string,
): string {
  if (!lastMessage) {
    return "Sin mensajes todavía";
  }

  return lastMessage.sender_id === myId ? `Vos: ${lastMessage.body}` : lastMessage.body;
}

/** Texto accesible del badge de no leídos (requisito 11). */
export function unreadLabel(count: number): string {
  return count === 1 ? "1 mensaje sin leer" : `${count} mensajes sin leer`;
}

// Los días se cuentan en hora de Argentina: un mensaje de las 23:30 del lunes
// es del lunes, aunque en UTC ya sea martes.
const ARGENTINA_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const ARGENTINA_TIME = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DAY_MS = 24 * 60 * 60 * 1000;

function argentinaDayKey(date: Date): string {
  return ARGENTINA_DAY.format(date);
}

function isYesterday(date: Date, now: Date): boolean {
  return argentinaDayKey(date) === argentinaDayKey(new Date(now.getTime() - DAY_MS));
}

/** "HH:MM" en hora de Argentina, para cada burbuja. */
export function timeLabel(timestamp: string): string {
  return ARGENTINA_TIME.format(new Date(timestamp));
}

/**
 * La fecha de la bandeja (requisito 2): "ahora", "hace 5 min", "hace 2 h",
 * "ayer" o la fecha corta ("12 oct", con el año si no es el actual).
 *
 * "hace N h" solo mientras siga siendo el mismo día: un mensaje de anoche a
 * las 23 visto hoy a la 1 es "ayer", no "hace 2 h".
 */
export function relativeTimeLabel(timestamp: string, now: Date = new Date()): string {
  const date = new Date(timestamp);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);

  if (argentinaDayKey(date) === argentinaDayKey(now)) {
    if (minutes < 1) return "ahora";
    if (minutes < 60) return `hace ${minutes} min`;
    return `hace ${Math.floor(minutes / 60)} h`;
  }

  if (isYesterday(date, now)) {
    return "ayer";
  }

  return formatShortDate(timestamp, now);
}

/** El separador por día del hilo (requisito 5): "Hoy", "Ayer" o la fecha. */
export function dayLabel(timestamp: string, now: Date = new Date()): string {
  const date = new Date(timestamp);

  if (argentinaDayKey(date) === argentinaDayKey(now)) return "Hoy";
  if (isYesterday(date, now)) return "Ayer";

  return formatShortDate(timestamp, now);
}

/** Agrupa mensajes consecutivos por día de Argentina, en el orden recibido. */
export function groupByDay<T extends { created_at: string }>(
  messages: T[],
): { day: string; messages: T[] }[] {
  const groups: { day: string; messages: T[] }[] = [];

  for (const message of messages) {
    const day = argentinaDayKey(new Date(message.created_at));
    const last = groups[groups.length - 1];

    if (last && last.day === day) {
      last.messages.push(message);
    } else {
      groups.push({ day, messages: [message] });
    }
  }

  return groups;
}
