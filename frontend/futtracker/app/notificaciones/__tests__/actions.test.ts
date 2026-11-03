import { beforeEach, describe, expect, it, vi } from "vitest";

const markNotificationsReadMock = vi.fn();
const revalidatePathMock = vi.fn();
const redirectMock = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});

vi.mock("@/lib/data/notifications", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/notifications")>(
    "@/lib/data/notifications",
  );
  return {
    ...actual,
    markNotificationsRead: (...args: unknown[]) => markNotificationsReadMock(...args),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({}),
}));

const NOTIFICATION = "1a000001-0000-4000-8000-000000000142";
const CONVERSATION = "0e000001-0000-4000-8000-000000000134";
const VACANCY = "0a000002-0000-4000-8000-000000000120";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("openNotificationAction", () => {
  it("marca el aviso de mensaje y lleva al hilo", async () => {
    const { openNotificationAction } = await import("@/app/notificaciones/actions");
    markNotificationsReadMock.mockResolvedValue(1);

    await expect(
      openNotificationAction({ id: NOTIFICATION, type: "new_message", conversationId: CONVERSATION }),
    ).rejects.toThrow(`NEXT_REDIRECT /mensajes/${CONVERSATION}`);
    expect(markNotificationsReadMock).toHaveBeenCalledWith({}, [NOTIFICATION]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/notificaciones");
  });

  it("una postulación lleva a la pestaña Postulaciones del equipo", async () => {
    const { openNotificationAction } = await import("@/app/notificaciones/actions");
    markNotificationsReadMock.mockResolvedValue(1);

    await expect(
      openNotificationAction({ id: NOTIFICATION, type: "new_application", vacancyId: VACANCY }),
    ).rejects.toThrow(`NEXT_REDIRECT /equipos/mi-equipo?tab=postulaciones&vacante=${VACANCY}`);
  });

  it.each([
    [{ id: "x", type: "new_message", conversationId: CONVERSATION }],
    [{ id: NOTIFICATION, type: "new_message", conversationId: "https://evil.example" }],
    [{ id: NOTIFICATION, type: "otro", conversationId: CONVERSATION }],
    [null],
  ])("un destino inválido %o no llega a la base ni redirige", async (target) => {
    const { openNotificationAction } = await import("@/app/notificaciones/actions");

    expect(await openNotificationAction(target)).toEqual({ ok: false, error: "generic" });
    expect(markNotificationsReadMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: "42501", message: "denied" }, "forbidden"],
    [new Error("boom"), "generic"],
  ])("si falla la marca, devuelve la clave %s y no redirige", async (error, key) => {
    const { openNotificationAction } = await import("@/app/notificaciones/actions");
    markNotificationsReadMock.mockRejectedValue(error);

    expect(
      await openNotificationAction({ id: NOTIFICATION, type: "new_message", conversationId: CONVERSATION }),
    ).toEqual({ ok: false, error: key });
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("markAllNotificationsReadAction", () => {
  it("marca todas sin ids y revalida la lista", async () => {
    const { markAllNotificationsReadAction } = await import("@/app/notificaciones/actions");
    markNotificationsReadMock.mockResolvedValue(1);

    expect(await markAllNotificationsReadAction()).toEqual({ ok: true });
    expect(markNotificationsReadMock).toHaveBeenCalledWith({});
    expect(revalidatePathMock).toHaveBeenCalledWith("/notificaciones");
  });

  it("si falla, devuelve la clave y no revalida", async () => {
    const { markAllNotificationsReadAction } = await import("@/app/notificaciones/actions");
    markNotificationsReadMock.mockRejectedValue({ code: "XX000", message: "boom" });

    expect(await markAllNotificationsReadAction()).toEqual({ ok: false, error: "generic" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
