// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MessageThread from "@/components/messages/MessageThread";
import { compareMessages, mergeMessages } from "@/components/messages/mergeMessages";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const loadOlderMock = vi.fn();

vi.mock("@/app/mensajes/actions", () => ({
  loadOlderMessagesAction: (...args: unknown[]) => loadOlderMock(...args),
}));

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "66666666-6666-4666-8666-666666666666";
const CONVERSATION = "0e000001-0000-4000-8000-000000000134";

// Un mensaje por minuto a partir de las 15:00 del 28/10 en Buenos Aires.
function message(n: number, mine = false) {
  const minute = String(n).padStart(2, "0");
  return {
    id: `0f0000${minute}-0000-4000-8000-000000000140`,
    sender_id: mine ? ME : OTHER,
    body: `m${n}`,
    created_at: `2026-10-28T18:${minute}:00+00:00`,
  };
}

let container: HTMLDivElement;
let root: Root;

function renderThread(props: { messages: ReturnType<typeof message>[]; hasMore: boolean }) {
  act(() =>
    root.render(
      <MessageThread
        conversationId={CONVERSATION}
        messages={props.messages}
        hasMore={props.hasMore}
        myId={ME}
        otherName="Carlos Delegado"
      />,
    ),
  );
}

function bodies() {
  return [...document.querySelectorAll("[role=log] p.whitespace-pre-wrap")].map((p) => p.textContent);
}

function loadOlderButton() {
  return [...document.querySelectorAll("button")].find((b) =>
    ["Ver mensajes anteriores", "Cargando…"].includes(b.textContent ?? ""),
  );
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  loadOlderMock.mockReset();
});

describe("mergeMessages", () => {
  it("une sin repetidos, del más viejo al más nuevo", () => {
    expect(mergeMessages([message(2), message(3)], [message(3), message(1)]).map((m) => m.body)).toEqual([
      "m1",
      "m2",
      "m3",
    ]);
  });

  it("con la misma fecha, desempata por id como la base", () => {
    const a = { id: "a0000000-0000-4000-8000-000000000000", created_at: "2026-10-28T18:00:00+00:00" };
    const b = { id: "b0000000-0000-4000-8000-000000000000", created_at: "2026-10-28T18:00:00+00:00" };

    expect(mergeMessages([b], [a]).map((m) => m.id)).toEqual([a.id, b.id]);
  });

  it("ordena por microsegundos dentro del mismo milisegundo", () => {
    const later = { id: "a", created_at: "2026-10-28T18:00:00.123457+00:00" };
    const earlier = { id: "b", created_at: "2026-10-28T18:00:00.123456+00:00" };

    expect(compareMessages(earlier, later)).toBeLessThan(0);
  });
});

describe("MessageThread", () => {
  it("muestra los mensajes en orden, los propios a la derecha", () => {
    renderThread({ messages: [message(1), message(2, true)], hasMore: false });

    expect(bodies()).toEqual(["m1", "m2"]);
    expect(document.querySelector(".justify-end")?.textContent).toContain("m2");
    expect(document.querySelector("[role=log]")?.getAttribute("aria-live")).toBe("polite");
  });

  it("sin mensajes, invita a escribir", () => {
    renderThread({ messages: [], hasMore: false });

    expect(document.body.textContent).toContain(
      "Escribile a Carlos Delegado para empezar la conversación.",
    );
  });

  it("'Ver mensajes anteriores' aparece solo si hay más", () => {
    renderThread({ messages: [message(1)], hasMore: false });
    expect(loadOlderButton()).toBeUndefined();

    act(() => root.unmount());
    root = createRoot(container);
    renderThread({ messages: [message(1)], hasMore: true });
    expect(loadOlderButton()).toBeDefined();
  });

  // La review de la #50: al enviar, el servidor manda la ventana de 50 corrida
  // un lugar, y el mensaje que salía de la ventana desaparecía.
  it("al llegar la ventana corrida, el que sale sigue en el hilo y no se repite nada", () => {
    renderThread({ messages: [message(1), message(2), message(3)], hasMore: false });

    // El servidor ahora manda los "últimos 3": sin m1, con el nuevo m4.
    renderThread({ messages: [message(2), message(3), message(4, true)], hasMore: true });

    expect(bodies()).toEqual(["m1", "m2", "m3", "m4"]);
    // m1 es el primero de la conversación: no hay nada antes que cargar.
    expect(loadOlderButton()).toBeUndefined();
  });

  it("carga los anteriores desde el más viejo (fecha e id) y los agrega arriba", async () => {
    loadOlderMock.mockResolvedValue({ ok: true, messages: [message(1), message(2)], hasMore: false });
    renderThread({ messages: [message(3), message(4)], hasMore: true });

    await act(async () => loadOlderButton()!.click());

    expect(loadOlderMock).toHaveBeenCalledWith(CONVERSATION, {
      created_at: message(3).created_at,
      id: message(3).id,
    });
    expect(bodies()).toEqual(["m1", "m2", "m3", "m4"]);
    expect(loadOlderButton()).toBeUndefined();
  });

  it("después de cargar anteriores y enviar, no queda ningún hueco", async () => {
    loadOlderMock.mockResolvedValue({ ok: true, messages: [message(1), message(2)], hasMore: false });
    renderThread({ messages: [message(3), message(4)], hasMore: true });
    await act(async () => loadOlderButton()!.click());

    renderThread({ messages: [message(4), message(5, true)], hasMore: true });

    expect(bodies()).toEqual(["m1", "m2", "m3", "m4", "m5"]);
  });

  it("si la carga falla, avisa y deja el botón para reintentar", async () => {
    loadOlderMock.mockResolvedValue({ ok: false });
    renderThread({ messages: [message(3)], hasMore: true });

    await act(async () => loadOlderButton()!.click());

    expect(document.querySelector("[role=alert]")?.textContent).toBe(
      "No pudimos cargar los mensajes anteriores.",
    );
    expect(loadOlderButton()).toBeDefined();
    expect(bodies()).toEqual(["m3"]);
  });
});
