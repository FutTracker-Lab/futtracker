import { beforeEach, describe, expect, it, vi } from "vitest";

const countUnreadNotificationsMock = vi.fn();
const listConversationsMock = vi.fn();

vi.mock("@/lib/data/notifications", () => ({
  countUnreadNotifications: (...args: unknown[]) => countUnreadNotificationsMock(...args),
}));

vi.mock("@/lib/data/messages", () => ({
  listConversations: (...args: unknown[]) => listConversationsMock(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({}),
}));

const conversations = (...unread: number[]) => unread.map((unread_count) => ({ unread_count }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUnreadCounts", () => {
  it("devuelve los avisos sin leer y suma los mensajes sin leer de cada conversación", async () => {
    const { getUnreadCounts } = await import("@/components/nav/unreadCounts");
    countUnreadNotificationsMock.mockResolvedValue(2);
    listConversationsMock.mockResolvedValue(conversations(1, 0, 3));

    expect(await getUnreadCounts()).toEqual({ notifications: 2, messages: 4 });
  });

  it("sin conversaciones, mensajes en 0", async () => {
    const { getUnreadCounts } = await import("@/components/nav/unreadCounts");
    countUnreadNotificationsMock.mockResolvedValue(0);
    listConversationsMock.mockResolvedValue([]);

    expect(await getUnreadCounts()).toEqual({ notifications: 0, messages: 0 });
  });

  it("si falla el conteo de avisos, solo ese queda en 0", async () => {
    const { getUnreadCounts } = await import("@/components/nav/unreadCounts");
    countUnreadNotificationsMock.mockRejectedValue({ code: "42501", message: "denied" });
    listConversationsMock.mockResolvedValue(conversations(1));

    expect(await getUnreadCounts()).toEqual({ notifications: 0, messages: 1 });
  });

  it("si falla la bandeja, solo mensajes queda en 0", async () => {
    const { getUnreadCounts } = await import("@/components/nav/unreadCounts");
    countUnreadNotificationsMock.mockResolvedValue(1);
    listConversationsMock.mockRejectedValue(new Error("fetch failed"));

    expect(await getUnreadCounts()).toEqual({ notifications: 1, messages: 0 });
  });
});
