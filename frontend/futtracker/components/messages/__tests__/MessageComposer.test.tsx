// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MessageComposer from "@/components/messages/MessageComposer";
import { cleanup, flush, render } from "@/components/player/__tests__/dialogTestUtils";

const sendMessageActionMock = vi.fn();

vi.mock("@/app/mensajes/actions", () => ({
  sendMessageAction: (...args: unknown[]) => sendMessageActionMock(...args),
}));

const CONVERSATION = "0e000001-0000-4000-8000-000000000134";

function textarea() {
  return document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Escribí un mensaje"]')!;
}

function sendButton() {
  return Array.from(document.querySelectorAll("button")).find((b) =>
    ["Enviar", "Enviando…"].includes(b.textContent ?? ""),
  )!;
}

function counter() {
  return document.querySelector(`[id="${textarea().getAttribute("aria-describedby")?.split(" ")[0]}"]`)!
    .textContent;
}

// React escucha `input` y lee el valor con el setter nativo: así se simula tipear.
function type(value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setter.call(textarea(), value);
    textarea().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function pressEnter(shiftKey = false) {
  act(() => {
    textarea().dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", shiftKey, bubbles: true, cancelable: true }),
    );
  });
}

afterEach(() => {
  cleanup();
  sendMessageActionMock.mockReset();
});

describe("MessageComposer", () => {
  it("el contador sigue lo escrito", () => {
    render(<MessageComposer conversationId={CONVERSATION} />);
    expect(counter()).toBe("0/2000");

    type("Hola");
    expect(counter()).toBe("4/2000");
  });

  it.each([
    ["vacía", ""],
    ["solo espacios", "     "],
    ["2001 caracteres", "a".repeat(2001)],
  ])("con la caja %s, Enviar está deshabilitado", (_caso, value) => {
    render(<MessageComposer conversationId={CONVERSATION} />);
    type(value);

    expect(sendButton().disabled).toBe(true);
  });

  it("con 2001 caracteres el contador muestra 2001/2000", () => {
    render(<MessageComposer conversationId={CONVERSATION} />);
    type("a".repeat(2001));

    expect(counter()).toBe("2001/2000");
  });

  it("Enter envía, vacía la caja y devuelve el foco", async () => {
    sendMessageActionMock.mockResolvedValue({ ok: true });
    render(<MessageComposer conversationId={CONVERSATION} />);
    type("Hola, ¿cuándo es la prueba?");

    pressEnter();
    await flush();

    expect(sendMessageActionMock).toHaveBeenCalledWith(CONVERSATION, "Hola, ¿cuándo es la prueba?");
    expect(textarea().value).toBe("");
    expect(document.activeElement).toBe(textarea());
  });

  it("Shift+Enter no envía", () => {
    render(<MessageComposer conversationId={CONVERSATION} />);
    type("primera línea");

    pressEnter(true);

    expect(sendMessageActionMock).not.toHaveBeenCalled();
  });

  it("Enter con la caja vacía no envía", () => {
    render(<MessageComposer conversationId={CONVERSATION} />);
    type("   ");

    pressEnter();

    expect(sendMessageActionMock).not.toHaveBeenCalled();
  });

  it("si falla, avisa con un toast y el texto se queda en la caja", async () => {
    sendMessageActionMock.mockResolvedValue({ ok: false, error: "unexpected" });
    render(<MessageComposer conversationId={CONVERSATION} />);
    type("Hola");

    pressEnter();
    await flush();

    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      "No pudimos enviar el mensaje. Probá de nuevo.",
    );
    expect(textarea().value).toBe("Hola");
  });

  it("si la acción tira (la red), también: toast y el texto se queda", async () => {
    sendMessageActionMock.mockRejectedValue(new TypeError("fetch failed"));
    render(<MessageComposer conversationId={CONVERSATION} />);
    type("Hola");

    pressEnter();
    await flush();

    expect(document.querySelector('[role="alert"]')).not.toBeNull();
    expect(textarea().value).toBe("Hola");
  });

  it("invalidBody se muestra bajo la caja, no como toast", async () => {
    sendMessageActionMock.mockResolvedValue({ ok: false, error: "invalidBody" });
    render(<MessageComposer conversationId={CONVERSATION} />);
    type("Hola");

    pressEnter();
    await flush();

    expect(document.body.textContent).toContain(
      "El mensaje tiene que tener entre 1 y 2000 caracteres.",
    );
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it.each([
    ["selfConversation", "No podés mandarte mensajes a vos mismo."],
    ["recipientNotFound", "Esta cuenta ya no existe."],
    ["forbidden", "No pudimos enviar el mensaje. Probá de nuevo."],
  ])("%s → toast '%s'", async (error, text) => {
    sendMessageActionMock.mockResolvedValue({ ok: false, error });
    render(<MessageComposer conversationId={CONVERSATION} />);
    type("Hola");

    pressEnter();
    await flush();

    expect(document.querySelector('[role="alert"]')?.textContent).toBe(text);
  });
});
