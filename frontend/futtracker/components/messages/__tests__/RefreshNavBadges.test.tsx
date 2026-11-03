// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RefreshNavBadges from "@/components/messages/RefreshNavBadges";
import { cleanup, render } from "@/components/player/__tests__/dialogTestUtils";

const refreshMock = vi.fn();
const router = { refresh: refreshMock };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

beforeEach(() => {
  refreshMock.mockClear();
});

afterEach(cleanup);

describe("RefreshNavBadges", () => {
  it("con mensajes sin leer refresca el router una sola vez al montar", () => {
    render(<RefreshNavBadges unreadCount={2} />);

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("sin mensajes sin leer no refresca", () => {
    render(<RefreshNavBadges unreadCount={0} />);

    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("cuando el refresh trae el hilo ya leído (0), no vuelve a refrescar", () => {
    // Mismo root, como cuando router.refresh() vuelve a renderizar el hilo.
    const root = createRoot(document.createElement("div"));
    act(() => root.render(<RefreshNavBadges unreadCount={1} />));
    act(() => root.render(<RefreshNavBadges unreadCount={0} />));

    expect(refreshMock).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });
});
