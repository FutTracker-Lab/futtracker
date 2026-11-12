// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

import TeamError from "@/app/equipos/error";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("Reintentar llama a retry para volver a pedir los datos", () => {
  const retry = vi.fn();
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(<TeamError error={new Error("falla")} retry={retry} />));

  const button = Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent === "Reintentar",
  );
  act(() => button?.click());

  expect(retry).toHaveBeenCalledOnce();
  act(() => root.unmount());
});
