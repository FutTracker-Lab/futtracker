// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanup, render } from "@/components/player/__tests__/dialogTestUtils";
import AlertDialog from "@/components/ui/AlertDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

function button(label: string) {
  return [...document.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) => candidate.textContent === label,
  )!;
}

afterEach(() => {
  cleanup();
});

describe("AlertDialog", () => {
  it("al abrir, el foco entra por Cancelar", () => {
    render(
      <AlertDialog title="¿Seguro?" description="" confirmLabel="Sí" onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );

    expect(document.activeElement).toBe(button("Cancelar"));
  });

  it("Escape cancela", () => {
    const onCancel = vi.fn();
    render(<AlertDialog title="¿Seguro?" description="" confirmLabel="Sí" onCancel={onCancel} onConfirm={vi.fn()} />);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("mientras confirma, Escape no cancela", () => {
    const onCancel = vi.fn();
    render(
      <AlertDialog
        title="¿Seguro?"
        description=""
        confirmLabel="Sí"
        isPending
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onCancel).not.toHaveBeenCalled();
  });
});

// La regresión que encontró la revisión de FUT-158: al extraer AlertDialog, el
// foco dejaba de volver a Cancelar cuando la confirmación fallaba.
describe("ConfirmDialog", () => {
  it("si la confirmación falla, muestra el error y el foco vuelve a Cancelar", async () => {
    render(
      <ConfirmDialog
        triggerLabel="Eliminar"
        title="¿Eliminar?"
        description=""
        onConfirm={async () => "No se pudo eliminar."}
      />,
    );
    act(() => button("Eliminar").click());

    // Un clic de verdad enfoca el botón; `.click()` desde código no.
    const confirm = [...document.querySelectorAll<HTMLButtonElement>("[role=alertdialog] button")].at(-1)!;
    await act(async () => {
      confirm.focus();
      confirm.click();
    });

    expect(document.querySelector("[role=alertdialog] [role=alert]")?.textContent).toBe(
      "No se pudo eliminar.",
    );
    expect(document.activeElement).toBe(button("Cancelar"));
  });

  it("al cancelar, el foco vuelve al botón que lo abrió", () => {
    render(
      <ConfirmDialog triggerLabel="Eliminar" title="¿Eliminar?" description="" onConfirm={vi.fn()} />,
    );
    act(() => button("Eliminar").click());

    act(() => button("Cancelar").click());

    expect(document.querySelector("[role=alertdialog]")).toBeNull();
    expect(document.activeElement).toBe(button("Eliminar"));
  });
});
