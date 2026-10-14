// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import VacancyForm from "@/components/team/VacancyForm";

const { createVacancyAction } = vi.hoisted(() => ({
  createVacancyAction: vi.fn(),
}));

// El módulo real importa el cliente de Supabase del servidor.
vi.mock("@/app/equipos/vacancies-actions", () => ({ createVacancyAction }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;
const onCancel = vi.fn();
const onPublished = vi.fn();

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(<VacancyForm onCancel={onCancel} onPublished={onPublished} />),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

// React escucha el setter nativo: asignar `.value` a mano no dispara onChange.
function change(element: HTMLSelectElement | HTMLTextAreaElement, value: string) {
  const prototype = Object.getPrototypeOf(element);
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
  act(() => {
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}

function field<T extends HTMLElement>(id: string) {
  return container.querySelector<T>(`#${id}`)!;
}

async function submit() {
  const button = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent === "Publicar",
  )!;
  await act(async () => button.click());
}

function fillValid() {
  change(field<HTMLSelectElement>("vacancy-position"), "delantero");
  change(field<HTMLSelectElement>("vacancy-modality"), "futbol_7");
  change(field<HTMLSelectElement>("vacancy-level"), "recreativo");
}

test("arranca con los tres selects en Elegí… y el foco en la posición", () => {
  for (const id of ["vacancy-position", "vacancy-modality", "vacancy-level"]) {
    const select = field<HTMLSelectElement>(id);
    expect(select.value).toBe("");
    expect(select.selectedOptions[0].textContent).toBe("Elegí…");
  }
  expect(document.activeElement).toBe(field("vacancy-position"));
});

test("sin elegir nada muestra los tres errores y no llama a la Server Action", async () => {
  await submit();

  expect(container.textContent).toContain("Elegí una posición.");
  expect(container.textContent).toContain("Elegí una modalidad.");
  expect(container.textContent).toContain("Elegí un nivel.");
  expect(createVacancyAction).not.toHaveBeenCalled();
});

test("con 281 caracteres marca el error y el contador sin cortar el texto", async () => {
  fillValid();
  change(field<HTMLTextAreaElement>("vacancy-description"), "a".repeat(281));
  await submit();

  expect(container.textContent).toContain(
    "La descripción no puede superar los 280 caracteres.",
  );
  expect(container.textContent).toContain("281 / 280");
  expect(field<HTMLTextAreaElement>("vacancy-description").value).toHaveLength(281);
  expect(createVacancyAction).not.toHaveBeenCalled();
});

test("publica con los valores elegidos y avisa al terminar", async () => {
  createVacancyAction.mockResolvedValue({ ok: true });
  fillValid();
  change(field<HTMLTextAreaElement>("vacancy-description"), "Buscamos un 9 rápido");
  await submit();

  expect(createVacancyAction).toHaveBeenCalledWith({
    position: "delantero",
    modality: "futbol_7",
    level: "recreativo",
    description: "Buscamos un 9 rápido",
  });
  expect(onPublished).toHaveBeenCalled();
});

test("un duplicado se muestra en el formulario y conserva lo escrito", async () => {
  createVacancyAction.mockResolvedValue({
    ok: false,
    error: "Ya tenés una vacante abierta para esa posición.",
  });
  fillValid();
  await submit();

  expect(container.querySelector('[role="alert"]')?.textContent).toBe(
    "Ya tenés una vacante abierta para esa posición.",
  );
  expect(field<HTMLSelectElement>("vacancy-position").value).toBe("delantero");
  expect(onPublished).not.toHaveBeenCalled();
});

test("si la Server Action no responde muestra un error traducido", async () => {
  createVacancyAction.mockRejectedValue(new TypeError("Failed to fetch"));
  fillValid();
  await submit();

  expect(container.textContent).toContain("Ocurrió un error inesperado. Probá de nuevo.");
  expect(container.textContent).not.toContain("Failed to fetch");
});

test("Escape cierra el panel", () => {
  act(() => {
    field("vacancy-position").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });

  expect(onCancel).toHaveBeenCalled();
});
