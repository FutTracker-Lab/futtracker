// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import SearchFiltersDisclosure from "@/components/search/SearchFiltersDisclosure";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

function render(ui: ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(ui));
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderDisclosure(appliedCount = 0) {
  render(
    <SearchFiltersDisclosure appliedCount={appliedCount} clearLink={<span>Limpiar</span>}>
      <button type="submit">Buscar</button>
    </SearchFiltersDisclosure>,
  );
}

function toggleButton() {
  return container.querySelector<HTMLButtonElement>("button[aria-expanded]")!;
}

function spokenText(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[aria-hidden='true']").forEach((node) => node.remove());
  return clone.textContent?.replace(/\s+/g, " ").trim();
}

function panel() {
  return document.getElementById(toggleButton().getAttribute("aria-controls")!)!;
}

test("arranca plegado y el botón lo anuncia", () => {
  renderDisclosure();

  expect(toggleButton().getAttribute("aria-expanded")).toBe("false");
  expect(panel().classList).toContain("hidden");
});

// jsdom no evalúa media queries: lo único que se puede verificar es la clase que lo muestra en desktop.
test("plegado sigue visible desde lg", () => {
  renderDisclosure();

  expect(panel().classList).toContain("lg:block");
});

test("al tocar 'Filtros' se abre y el botón anuncia expandido", () => {
  renderDisclosure();

  act(() => toggleButton().click());

  expect(toggleButton().getAttribute("aria-expanded")).toBe("true");
  expect(panel().classList).not.toContain("hidden");
});

test("el botón dice cuántos filtros hay aplicados", () => {
  renderDisclosure(2);

  expect(spokenText(toggleButton())).toBe("Filtros 2 aplicados");
});

test("con un filtro usa el singular", () => {
  renderDisclosure(1);

  expect(spokenText(toggleButton())).toBe("Filtros 1 aplicado");
});

test("sin filtros aplicados no muestra contador", () => {
  renderDisclosure(0);

  expect(spokenText(toggleButton())).toBe("Filtros");
});

test("un segundo toque lo vuelve a plegar", () => {
  renderDisclosure();

  act(() => toggleButton().click());
  act(() => toggleButton().click());

  expect(toggleButton().getAttribute("aria-expanded")).toBe("false");
});
