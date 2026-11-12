import { describe, expect, it } from "vitest";

import {
  dayLabel,
  groupByDay,
  previewText,
  relativeTimeLabel,
  roleLabel,
  timeLabel,
  unreadLabel,
} from "@/lib/format/messageLabels";

// Martes 28/10/2026, 15:00 en Buenos Aires (18:00 UTC).
const NOW = new Date("2026-10-28T18:00:00Z");

describe("relativeTimeLabel", () => {
  it.each([
    ["hace segundos", "2026-10-28T17:59:40Z", "ahora"],
    ["hace 5 minutos", "2026-10-28T17:55:00Z", "hace 5 min"],
    ["hace 2 horas", "2026-10-28T16:00:00Z", "hace 2 h"],
    ["esta mañana", "2026-10-28T03:30:00Z", "hace 14 h"],
    ["ayer", "2026-10-27T20:00:00Z", "ayer"],
    ["anteayer", "2026-10-26T15:00:00Z", "26 oct"],
    ["el año pasado", "2025-12-31T15:00:00Z", "31 dic 2025"],
  ])("%s → %s", (_caso, timestamp, expected) => {
    expect(relativeTimeLabel(timestamp, NOW)).toBe(expected);
  });

  it("cuenta los días en hora de Argentina, no en UTC", () => {
    // 01:00 UTC del 28 son las 22:00 del 27 en Buenos Aires: fue ayer.
    expect(relativeTimeLabel("2026-10-28T01:00:00Z", NOW)).toBe("ayer");
  });

  it("de anoche a la madrugada es 'ayer', no 'hace 2 h'", () => {
    const earlyMorning = new Date("2026-10-28T04:00:00Z"); // 01:00 en Buenos Aires
    expect(relativeTimeLabel("2026-10-28T02:00:00Z", earlyMorning)).toBe("ayer");
  });
});

describe("dayLabel", () => {
  it("Hoy, Ayer o la fecha", () => {
    expect(dayLabel("2026-10-28T12:00:00Z", NOW)).toBe("Hoy");
    expect(dayLabel("2026-10-27T12:00:00Z", NOW)).toBe("Ayer");
    expect(dayLabel("2026-10-20T12:00:00Z", NOW)).toBe("20 oct");
  });
});

describe("timeLabel", () => {
  it("la hora en Buenos Aires, en 24 horas", () => {
    expect(timeLabel("2026-10-28T18:05:00Z")).toBe("15:05");
    expect(timeLabel("2026-10-28T02:30:00Z")).toBe("23:30");
  });
});

describe("previewText", () => {
  const ME = "me";

  it("antepone 'Vos: ' a lo que mandó el usuario", () => {
    expect(previewText({ body: "Hola", sender_id: ME }, ME)).toBe("Vos: Hola");
  });

  it("deja tal cual lo que mandó el otro", () => {
    expect(previewText({ body: "Hola", sender_id: "otro" }, ME)).toBe("Hola");
  });

  it("sin mensajes, lo dice", () => {
    expect(previewText(null, ME)).toBe("Sin mensajes todavía");
  });
});

describe("unreadLabel y roleLabel", () => {
  it("singular y plural", () => {
    expect(unreadLabel(1)).toBe("1 mensaje sin leer");
    expect(unreadLabel(3)).toBe("3 mensajes sin leer");
  });

  it("los dos roles", () => {
    expect(roleLabel("player")).toBe("Jugador");
    expect(roleLabel("delegate")).toBe("Delegado");
  });
});

describe("groupByDay", () => {
  it("agrupa consecutivos del mismo día de Argentina, en el orden recibido", () => {
    const groups = groupByDay([
      { id: "1", created_at: "2026-10-27T12:00:00Z" },
      { id: "2", created_at: "2026-10-28T01:00:00Z" }, // 27 a las 22 en Buenos Aires
      { id: "3", created_at: "2026-10-28T12:00:00Z" },
    ]);

    expect(groups.map((g) => g.messages.map((m) => m.id))).toEqual([["1", "2"], ["3"]]);
  });
});
