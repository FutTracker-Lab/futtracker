// @vitest-environment jsdom
// El entorno va acá y no en la config: `environmentMatchGlobs` se quitó en
// Vitest 4, y el resto de los tests del repo corren en node.

import { act, useState, type MouseEvent, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import ActionsMenu from "@/components/ui/ActionsMenu";

// React lo exige para permitir `act` fuera de un renderer de test. Va por
// `Object.assign` porque `globalThis` no tiene esta propiedad tipada.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const TRIGGER_LABEL = "Acciones de prueba";

let container: HTMLDivElement;
let root: Root;

// El componente escucha en `document`, así que el árbol tiene que estar
// montado de verdad en la página y no en un nodo suelto.
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

// Un click real manda `mousedown` antes que `click` —el menú usa el primero
// para cerrarse cuando es afuera— y enfoca el elemento por el camino, que es
// lo único de los tres que jsdom no hace solo.
function click(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    element.focus();
    element.click();
  });
}

function press(key: string) {
  act(() => {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true }),
    );
  });
}

function trigger() {
  return container.querySelector<HTMLButtonElement>(
    `[aria-label="${TRIGGER_LABEL}"]`,
  )!;
}

function items() {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'));
}

function menu() {
  return document.querySelector('[role="menu"]');
}

function renderMenu() {
  render(
    <>
      <button type="button" id="afuera">
        Afuera
      </button>
      <ActionsMenu label={TRIGGER_LABEL}>
        <button type="button" role="menuitem">
          Editar
        </button>
        <button type="button" role="menuitem">
          Partidos
        </button>
        <button type="button" role="menuitem">
          Eliminar
        </button>
      </ActionsMenu>
    </>,
  );
}

test("al abrir, el foco va a la primera opción", () => {
  renderMenu();

  click(trigger());

  expect(document.activeElement).toBe(items()[0]);
});

test("la flecha abajo pasa a la siguiente opción", () => {
  renderMenu();
  click(trigger());

  press("ArrowDown");

  expect(document.activeElement).toBe(items()[1]);
});

test("la flecha abajo en la última opción vuelve a la primera", () => {
  renderMenu();
  click(trigger());

  press("ArrowDown");
  press("ArrowDown");
  press("ArrowDown");

  expect(document.activeElement).toBe(items()[0]);
});

test("la flecha arriba pasa a la anterior y da la vuelta desde la primera", () => {
  renderMenu();
  click(trigger());
  press("ArrowDown");

  press("ArrowUp");
  expect(document.activeElement).toBe(items()[0]);

  press("ArrowUp");
  expect(document.activeElement).toBe(items()[2]);
});

test("Home va a la primera opción y End a la última", () => {
  renderMenu();
  click(trigger());
  press("ArrowDown");

  press("End");
  expect(document.activeElement).toBe(items()[2]);

  press("Home");
  expect(document.activeElement).toBe(items()[0]);
});

test("Escape cierra el menú y devuelve el foco al disparador", () => {
  renderMenu();
  click(trigger());

  press("Escape");

  expect(menu()).toBeNull();
  expect(document.activeElement).toBe(trigger());
});

// jsdom no mueve el foco con Tab: eso lo hace el navegador. Acá solo se
// puede afirmar que el menú se cerró; que el foco caiga en el disparador de
// la fila siguiente está verificado a mano en Chrome.
test("Tab cierra el menú", () => {
  renderMenu();
  click(trigger());

  press("Tab");

  expect(menu()).toBeNull();
});

test("solo la opción enfocada es tabulable", () => {
  renderMenu();
  click(trigger());

  expect(items().map((item) => item.tabIndex)).toEqual([0, -1, -1]);

  press("ArrowDown");

  expect(items().map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
});

// Con un <a href>, que es lo que son "Editar" y "Partidos": la barra no
// activa un link, así que el menú tiene que suplirlo.
test("Espacio activa la opción enfocada", () => {
  // Sin el `preventDefault`, jsdom se queja de que no implementa navegación.
  const onActivate = vi.fn((event: MouseEvent<HTMLAnchorElement>) =>
    event.preventDefault(),
  );

  render(
    <ActionsMenu label={TRIGGER_LABEL}>
      <a href="#editar" role="menuitem" onClick={onActivate}>
        Editar
      </a>
      <a href="#partidos" role="menuitem">
        Partidos
      </a>
    </ActionsMenu>,
  );

  click(trigger());
  press(" ");

  expect(onActivate).toHaveBeenCalledTimes(1);
});

// Pasa de verdad: confirmar un borrado cierra el diálogo sin devolver el
// foco, y el menú queda abierto con el foco en el <body>.
test("con el foco fuera de las opciones, las flechas entran por el extremo", () => {
  renderMenu();
  click(trigger());
  (document.activeElement as HTMLElement).blur();

  press("ArrowUp");
  expect(document.activeElement).toBe(items()[2]);

  (document.activeElement as HTMLElement).blur();

  press("ArrowDown");
  expect(document.activeElement).toBe(items()[0]);
});

test("el click afuera cierra el menú sin tocar el foco", () => {
  renderMenu();
  click(trigger());

  const outside = container.querySelector<HTMLButtonElement>("#afuera")!;
  click(outside);

  expect(menu()).toBeNull();
  expect(document.activeElement).toBe(outside);
});

// El item "Eliminar" monta su confirmación adentro del menú, así que las
// teclas del diálogo le llegan igual al menú.
function DialogItem() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" role="menuitem" onClick={() => setOpen(true)}>
        Eliminar
      </button>
      {open ? (
        <div role="alertdialog">
          <button type="button" id="cancelar">
            Cancelar
          </button>
        </div>
      ) : null}
    </>
  );
}

test("con un diálogo abierto adentro, el menú no maneja las teclas", () => {
  render(
    <ActionsMenu label={TRIGGER_LABEL}>
      <button type="button" role="menuitem">
        Editar
      </button>
      <DialogItem />
    </ActionsMenu>,
  );

  click(trigger());
  click(items()[1]);

  const cancel = container.querySelector<HTMLButtonElement>("#cancelar")!;
  cancel.focus();

  press("ArrowDown");
  expect(document.activeElement).toBe(cancel);

  press("Escape");
  expect(menu()).not.toBeNull();
});
