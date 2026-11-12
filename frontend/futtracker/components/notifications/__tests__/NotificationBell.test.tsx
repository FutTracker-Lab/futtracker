// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import NotificationBell from "@/components/notifications/NotificationBell";
import { cleanup, render } from "@/components/player/__tests__/dialogTestUtils";

afterEach(cleanup);

describe("NotificationBell", () => {
  it("lleva a /notificaciones", () => {
    render(<NotificationBell count={0} isActive={false} />);

    expect(document.querySelector("a")!.getAttribute("href")).toBe("/notificaciones");
  });

  it("sin avisos sin leer no muestra badge y se anuncia como 'Notificaciones'", () => {
    render(<NotificationBell count={0} isActive={false} />);

    const link = document.querySelector("a")!;
    expect(link.querySelector(".bg-brand")).toBeNull();
    expect(link.textContent).toBe("Notificaciones");
  });

  it("muestra el número y el texto accesible", () => {
    render(<NotificationBell count={1} isActive={false} />);

    const link = document.querySelector("a")!;
    expect(link.querySelector('[aria-hidden="true"]:not(svg)')!.textContent).toBe("1");
    expect(link.querySelector(".sr-only")!.textContent).toBe("1 notificación sin leer");
  });

  it("desde 100 muestra '99+' pero anuncia el número real", () => {
    render(<NotificationBell count={150} isActive={false} />);

    const link = document.querySelector("a")!;
    expect(link.querySelector('[aria-hidden="true"]:not(svg)')!.textContent).toBe("99+");
    expect(link.querySelector(".sr-only")!.textContent).toBe("150 notificaciones sin leer");
  });

  it("queda marcada como página actual en /notificaciones", () => {
    render(<NotificationBell count={0} isActive />);

    expect(document.querySelector("a")!.getAttribute("aria-current")).toBe("page");
  });
});
