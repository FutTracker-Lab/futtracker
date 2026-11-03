import { describe, expect, it } from "vitest";

import type { Notification } from "@/lib/data/notifications";
import {
  NOTIFICATIONS_PAGE_SIZE,
  notificationsView,
  parseBeforeParam,
} from "@/lib/notifications/view";

// Del más nuevo al más viejo, una hora entre cada uno, como los devuelve listNotifications.
function rows(count: number): Notification[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `1a${String(i).padStart(6, "0")}-0000-4000-8000-000000000143`,
    type: "new_message",
    created_at: new Date(Date.UTC(2026, 9, 28, 23 - i)).toISOString(),
    read_at: null,
    conversation_id: "0e000001-0000-4000-8000-000000000134",
    vacancy_id: null,
    vacancy_position: null,
    actor: null,
  }));
}

describe("parseBeforeParam", () => {
  it("acepta el created_at que devuelve PostgREST, con microsegundos y offset", () => {
    expect(parseBeforeParam("2026-10-28T01:33:07.279588+00:00")).toBe(
      "2026-10-28T01:33:07.279588+00:00",
    );
  });

  it.each([
    [undefined],
    [""],
    ["ayer"],
    ["2026-10-28"],
    ["2026-10-28T01:33:07"],
    [["2026-10-28T01:33:07Z", "2026-10-27T01:33:07Z"]],
    ["2026-10-28T01:33:07Z' or 1=1--"],
  ])("cualquier otra cosa (%o) es la primera página", (value) => {
    expect(parseBeforeParam(value)).toBeUndefined();
  });
});

describe("notificationsView", () => {
  it("sin avisos: lista vacía, sin 'Ver anteriores' ni 'Marcar todas'", () => {
    expect(notificationsView([], 0)).toEqual({
      notifications: [],
      nextBefore: null,
      showMarkAll: false,
    });
  });

  it("con 20 justos no hay otra página", () => {
    const view = notificationsView(rows(NOTIFICATIONS_PAGE_SIZE), 0);

    expect(view.notifications).toHaveLength(20);
    expect(view.nextBefore).toBeNull();
  });

  it("con 21 (la sonda) muestra 20 y el cursor es el created_at del vigésimo", () => {
    const all = rows(NOTIFICATIONS_PAGE_SIZE + 1);
    const view = notificationsView(all, 0);

    expect(view.notifications).toEqual(all.slice(0, 20));
    expect(view.nextBefore).toBe(all[19].created_at);
  });

  it("conserva el orden en que llegan", () => {
    const all = rows(5);

    expect(notificationsView(all, 0).notifications.map((n) => n.id)).toEqual(all.map((n) => n.id));
  });

  it("'Marcar todas' depende del total sin leer, no de la página", () => {
    expect(notificationsView([], 3).showMarkAll).toBe(true);
    expect(notificationsView(rows(2), 0).showMarkAll).toBe(false);
  });
});
