// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import type { NotificationActionResult } from "@/app/notificaciones/actions";
import NotificationRow from "@/components/notifications/NotificationRow";
import { cleanup, click, flush, render } from "@/components/player/__tests__/dialogTestUtils";
import type { Notification } from "@/lib/data/notifications";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const NOW = new Date("2026-10-28T18:00:00Z");

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "1a000001-0000-4000-8000-000000000142",
    type: "new_message",
    created_at: "2026-10-28T16:00:00Z",
    read_at: null,
    conversation_id: "0e000001-0000-4000-8000-000000000134",
    vacancy_id: null,
    vacancy_position: null,
    actor: { id: "66666666-6666-4666-8666-666666666666", full_name: "Carlos Delegado", avatar_path: null },
    ...overrides,
  };
}

const application = notification({
  id: "1a000003-0000-4000-8000-000000000142",
  type: "new_application",
  created_at: "2026-10-27T18:00:00Z",
  read_at: "2026-10-27T22:00:00Z",
  conversation_id: null,
  vacancy_id: "0a000002-0000-4000-8000-000000000120",
  vacancy_position: "arquero",
  actor: { id: "33333333-3333-4333-8333-333333333333", full_name: "Sofía Ramírez", avatar_path: null },
});

const unreadDot = () =>
  Array.from(document.querySelectorAll(".sr-only")).find((el) => el.textContent === "Sin leer");

afterEach(cleanup);

describe("NotificationRow", () => {
  it("un mensaje sin leer: texto, fecha relativa, iniciales y punto de sin leer", () => {
    render(<NotificationRow notification={notification()} avatarUrl={null} open={vi.fn()} now={NOW} />);

    const button = document.querySelector("li > button")!;
    expect(button.textContent).toContain("Carlos Delegado te envió un mensaje");
    expect(button.textContent).toContain("hace 2 h");
    expect(button.textContent).toContain("CD");
    expect(unreadDot()).toBeDefined();
  });

  it("una postulación leída: texto con la posición, 'ayer' y sin punto", () => {
    render(<NotificationRow notification={application} avatarUrl={null} open={vi.fn()} now={NOW} />);

    const button = document.querySelector("li > button")!;
    expect(button.textContent).toContain("Sofía Ramírez se postuló a tu vacante de arquero");
    expect(button.textContent).toContain("ayer");
    expect(unreadDot()).toBeUndefined();
  });

  it("si el actor ya no existe, dice 'Alguien'", () => {
    render(
      <NotificationRow notification={notification({ actor: null })} avatarUrl={null} open={vi.fn()} now={NOW} />,
    );

    expect(document.body.textContent).toContain("Alguien te envió un mensaje");
  });

  it("con foto, muestra la URL firmada", () => {
    render(
      <NotificationRow
        notification={notification()}
        avatarUrl="https://example.supabase.co/signed/avatar.jpg"
        open={vi.fn()}
        now={NOW}
      />,
    );

    expect(document.querySelector("img")!.getAttribute("src")).toBe(
      "https://example.supabase.co/signed/avatar.jpg",
    );
  });

  it("la fila es un único botón que abre el aviso", async () => {
    const open = vi.fn().mockResolvedValue({ ok: true });
    render(<NotificationRow notification={notification()} avatarUrl={null} open={open} now={NOW} />);

    expect(document.querySelectorAll("li button, li a")).toHaveLength(1);
    click(document.querySelector("li > button")!);
    await flush();

    expect(open).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["devuelve un error", (): Promise<NotificationActionResult> => Promise.resolve({ ok: false, error: "generic" })],
    ["se cae la red", (): Promise<NotificationActionResult> => Promise.reject(new Error("fetch failed"))],
  ])("si la acción %s, muestra el toast sin texto crudo", async (_, impl) => {
    render(<NotificationRow notification={notification()} avatarUrl={null} open={vi.fn(impl)} now={NOW} />);

    click(document.querySelector("li > button")!);
    await flush();

    expect(document.querySelector('[role="alert"]')!.textContent).toBe(
      "No pudimos actualizar tus notificaciones. Probá de nuevo.",
    );
  });
});
