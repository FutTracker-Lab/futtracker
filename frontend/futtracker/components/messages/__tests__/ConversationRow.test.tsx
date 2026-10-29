// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import ConversationRow from "@/components/messages/ConversationRow";
import MessageBubble from "@/components/messages/MessageBubble";
import { cleanup, render } from "@/components/player/__tests__/dialogTestUtils";
import type { ConversationSummary } from "@/lib/data/messages";

// En jsdom no hay optimizador de imágenes: alcanza con un <img> que conserve el `src`.
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const ME = "11111111-1111-4111-8111-111111111111";
const DE1 = "66666666-6666-4666-8666-666666666666";
const NOW = new Date("2026-10-28T18:00:00Z");

function conversation(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: "0e000001-0000-4000-8000-000000000134",
    created_at: "2026-10-26T18:00:00Z",
    last_message_at: "2026-10-28T16:00:00Z",
    other: { id: DE1, full_name: "Carlos Delegado", avatar_path: null, role: "delegate" },
    last_message: { body: "A las 20 en la cancha", created_at: "2026-10-28T16:00:00Z", sender_id: DE1 },
    unread_count: 0,
    ...overrides,
  };
}

afterEach(cleanup);

describe("ConversationRow", () => {
  it("muestra nombre, rol, extracto y la fecha relativa, y lleva al hilo", () => {
    render(<ConversationRow conversation={conversation()} avatarUrl={null} myId={ME} now={NOW} />);

    const link = document.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("/mensajes/0e000001-0000-4000-8000-000000000134");
    expect(link.textContent).toContain("Carlos Delegado");
    expect(link.textContent).toContain("Delegado");
    expect(link.textContent).toContain("A las 20 en la cancha");
    expect(link.textContent).toContain("hace 2 h");
  });

  it("si el último mensaje es propio, antepone 'Vos: '", () => {
    render(
      <ConversationRow
        conversation={conversation({
          last_message: { body: "Hola, ¿cuándo es la prueba?", created_at: "2026-10-28T16:00:00Z", sender_id: ME },
        })}
        avatarUrl={null}
        myId={ME}
        now={NOW}
      />,
    );

    expect(document.body.textContent).toContain("Vos: Hola, ¿cuándo es la prueba?");
  });

  it("sin no leídos, no hay badge", () => {
    render(<ConversationRow conversation={conversation()} avatarUrl={null} myId={ME} now={NOW} />);

    expect(document.body.textContent).not.toContain("sin leer");
  });

  it("con no leídos, badge con el número y texto accesible", () => {
    render(
      <ConversationRow
        conversation={conversation({ unread_count: 1 })}
        avatarUrl={null}
        myId={ME}
        now={NOW}
      />,
    );

    const badge = document.querySelector(".sr-only")!;
    expect(badge.textContent).toBe("1 mensaje sin leer");
    expect(badge.previousElementSibling?.textContent).toBe("1");
  });

  it("sin foto, las iniciales; con foto, la imagen", () => {
    render(<ConversationRow conversation={conversation()} avatarUrl={null} myId={ME} now={NOW} />);
    expect(document.body.textContent).toContain("CD");
    cleanup();

    render(
      <ConversationRow conversation={conversation()} avatarUrl="https://local/a.png" myId={ME} now={NOW} />,
    );
    expect(document.querySelector("img")?.getAttribute("src")).toBe("https://local/a.png");
  });
});

describe("MessageBubble", () => {
  it("muestra HTML como texto literal, nunca lo interpreta", () => {
    render(<MessageBubble body="<b>hola</b>" createdAt="2026-10-28T18:00:00Z" mine />);

    expect(document.querySelector("b")).toBeNull();
    expect(document.body.textContent).toContain("<b>hola</b>");
  });

  it("respeta los saltos de línea", () => {
    render(<MessageBubble body={"línea 1\nlínea 2"} createdAt="2026-10-28T18:00:00Z" mine={false} />);

    const paragraph = document.querySelector("p")!;
    expect(paragraph.textContent).toBe("línea 1\nlínea 2");
    expect(paragraph.className).toContain("whitespace-pre-wrap");
  });

  it("los propios a la derecha y los del otro a la izquierda", () => {
    // `querySelector("div")` agarraría el contenedor del render, no la burbuja.
    render(<MessageBubble body="mío" createdAt="2026-10-28T18:00:00Z" mine />);
    expect(document.querySelector(".justify-end")?.textContent).toContain("mío");
    expect(document.querySelector(".justify-start")).toBeNull();
    cleanup();

    render(<MessageBubble body="del otro" createdAt="2026-10-28T18:00:00Z" mine={false} />);
    expect(document.querySelector(".justify-start")?.textContent).toContain("del otro");
    expect(document.querySelector(".justify-end")).toBeNull();
  });
});
