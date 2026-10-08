import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// jsdom no implementa `showModal`/`close` de <dialog>: alcanza con el atributo `open`.
HTMLDialogElement.prototype.showModal = function showModal() {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function close() {
  this.removeAttribute("open");
};

let container: HTMLDivElement | null = null;
let root: Root | null = null;

export function render(ui: ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
}

export function cleanup() {
  act(() => root?.unmount());
  container?.remove();
}

export function click(element: Element) {
  act(() => {
    (element as HTMLElement).focus();
    (element as HTMLElement).click();
  });
}

// Es lo que manda el navegador al apretar Esc sobre un diálogo modal.
export function pressEscape() {
  act(() => {
    document
      .querySelector("dialog[open]")
      ?.dispatchEvent(new Event("cancel", { cancelable: true }));
  });
}

export function byLabel(label: string) {
  return document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
}

export function byText(text: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("button, p, h2, span")).find(
    (element) => element.textContent?.trim() === text,
  );
}

export async function flush() {
  await act(async () => {});
}
