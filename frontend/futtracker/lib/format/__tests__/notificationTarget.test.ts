import { describe, expect, it } from "vitest";

import type { Notification } from "@/lib/data/notifications";
import { notificationHref, notificationTarget } from "@/lib/format/notificationTarget";

const CONVERSATION = "0e000001-0000-4000-8000-000000000134";
const VACANCY = "0a000002-0000-4000-8000-000000000120";

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "1a000001-0000-4000-8000-000000000142",
    type: "new_message",
    created_at: "2026-10-28T16:00:00Z",
    read_at: null,
    conversation_id: CONVERSATION,
    vacancy_id: null,
    vacancy_position: null,
    actor: null,
    ...overrides,
  };
}

const application = (overrides: Partial<Notification> = {}) =>
  notification({ type: "new_application", conversation_id: null, vacancy_id: VACANCY, ...overrides });

describe("notificationTarget y notificationHref", () => {
  it("un mensaje nuevo lleva al hilo", () => {
    const target = notificationTarget(notification())!;

    expect(target).toEqual({ id: notification().id, type: "new_message", conversationId: CONVERSATION });
    expect(notificationHref(target)).toBe(`/mensajes/${CONVERSATION}`);
  });

  it("una postulación lleva a la pestaña Postulaciones filtrada por la vacante", () => {
    const target = notificationTarget(application())!;

    expect(notificationHref(target)).toBe(
      `/equipos/mi-equipo?tab=postulaciones&vacante=${VACANCY}`,
    );
  });

  it("sin destino devuelve null", () => {
    expect(notificationTarget(notification({ conversation_id: null }))).toBeNull();
    expect(notificationTarget(application({ vacancy_id: null }))).toBeNull();
  });
});
