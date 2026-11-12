import { describe, expect, it } from "vitest";

import type { Notification } from "@/lib/data/notifications";
import { notificationText, unreadNotificationsLabel } from "@/lib/format/notificationLabels";

const DE1 = { id: "66666666-6666-4666-8666-666666666666", full_name: "Carlos Delegado", avatar_path: null };
const PJ3 = { id: "33333333-3333-4333-8333-333333333333", full_name: "Sofía Ramírez", avatar_path: null };
const CONVERSATION = "0e000001-0000-4000-8000-000000000134";

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "1a000001-0000-4000-8000-000000000142",
    type: "new_message",
    created_at: "2026-10-28T16:00:00Z",
    read_at: null,
    conversation_id: CONVERSATION,
    vacancy_id: null,
    vacancy_position: null,
    actor: DE1,
    ...overrides,
  };
}

const application = (overrides: Partial<Notification> = {}) =>
  notification({
    type: "new_application",
    conversation_id: null,
    vacancy_id: "0a000002-0000-4000-8000-000000000120",
    vacancy_position: "arquero",
    actor: PJ3,
    ...overrides,
  });

describe("unreadNotificationsLabel", () => {
  it("usa singular y plural", () => {
    expect(unreadNotificationsLabel(1)).toBe("1 notificación sin leer");
    expect(unreadNotificationsLabel(3)).toBe("3 notificaciones sin leer");
  });
});

describe("notificationText", () => {
  it("arma el texto de un mensaje nuevo", () => {
    expect(notificationText(notification())).toBe("Carlos Delegado te envió un mensaje");
  });

  it("arma el texto de una postulación con la posición", () => {
    expect(notificationText(application())).toBe("Sofía Ramírez se postuló a tu vacante de arquero");
  });

  it("dice 'Alguien' si el actor ya no existe", () => {
    expect(notificationText(notification({ actor: null }))).toBe("Alguien te envió un mensaje");
    expect(notificationText(application({ actor: null }))).toBe(
      "Alguien se postuló a tu vacante de arquero",
    );
  });

  it("sin posición conocida, omite la posición", () => {
    expect(notificationText(application({ vacancy_position: null }))).toBe(
      "Sofía Ramírez se postuló a tu vacante",
    );
  });
});
