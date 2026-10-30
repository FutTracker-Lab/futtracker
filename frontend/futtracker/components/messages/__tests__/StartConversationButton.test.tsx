// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import StartConversationButton from "@/components/messages/StartConversationButton";
import { cleanup, flush, render } from "@/components/player/__tests__/dialogTestUtils";

const startMock = vi.fn();

vi.mock("@/app/mensajes/actions", () => ({
  startConversationAction: (...args: unknown[]) => startMock(...args),
}));

const OTHER = "66666666-6666-4666-8666-666666666666";

function button() {
  return document.querySelector("button")!;
}

afterEach(() => {
  cleanup();
  startMock.mockReset();
});

describe("StartConversationButton", () => {
  it("abre la conversación con la cuenta del perfil", async () => {
    startMock.mockResolvedValue(undefined);
    render(<StartConversationButton otherProfileId={OTHER} />);

    await act(async () => button().click());

    expect(startMock).toHaveBeenCalledWith(OTHER);
    // Con éxito Next navega: no hay toast.
    expect(document.querySelector("[role=alert]")).toBeNull();
  });

  it("queda deshabilitado mientras abre", async () => {
    let finish: (value: unknown) => void = () => {};
    startMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    render(<StartConversationButton otherProfileId={OTHER} />);

    act(() => button().click());

    expect(button().disabled).toBe(true);
    expect(button().textContent).toBe("Abriendo…");
    await act(async () => finish(undefined));
  });

  it.each([
    ["selfConversation", "No podés mandarte mensajes a vos mismo."],
    ["recipientNotFound", "Esta cuenta ya no existe."],
    ["unexpected", "No pudimos enviar el mensaje. Probá de nuevo."],
  ])("%s → toast '%s'", async (error, text) => {
    startMock.mockResolvedValue({ ok: false, error });
    render(<StartConversationButton otherProfileId={OTHER} />);

    await act(async () => button().click());

    expect(document.querySelector("[role=alert]")?.textContent).toBe(text);
    expect(button().disabled).toBe(false);
  });

  it("si la acción tira (la red), toast genérico y no rompe la página", async () => {
    startMock.mockRejectedValue(new TypeError("fetch failed"));
    render(<StartConversationButton otherProfileId={OTHER} />);

    await act(async () => button().click());
    await flush();

    expect(document.querySelector("[role=alert]")?.textContent).toBe(
      "No pudimos enviar el mensaje. Probá de nuevo.",
    );
  });
});
