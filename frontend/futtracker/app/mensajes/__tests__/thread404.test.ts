import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// El criterio del hilo ajeno pide **status 404**. Depende de dos cosas que nada
// más verifica: que el chequeo esté en el layout del hilo, y que ningún
// loading.tsx envuelva ese layout. Si alguien mueve el `notFound()` a page.tsx
// o pone un loading.tsx en /mensajes, el 404 pasa a salir con status 200 y
// estos tests fallan.

const getThreadMock = vi.fn();

vi.mock("@/app/mensajes/access", () => ({
  getThread: (...args: unknown[]) => getThreadMock(...args),
}));

const { default: ThreadLayout } = await import("../[id]/layout");

const APP = join(process.cwd(), "app", "mensajes");

function layoutProps(id: string) {
  return {
    children: "hilo",
    params: Promise.resolve({ id }),
  } as unknown as Parameters<typeof ThreadLayout>[0];
}

describe("el 404 del hilo", () => {
  it("una conversación ajena o inexistente corta con notFound() en el layout", async () => {
    getThreadMock.mockResolvedValue(null);

    await expect(ThreadLayout(layoutProps("0e000001-0000-4000-8000-000000000134"))).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });
  });

  it("una conversación propia deja pasar al hilo", async () => {
    getThreadMock.mockResolvedValue({ id: "c" });

    expect(await ThreadLayout(layoutProps("0e000001-0000-4000-8000-000000000134"))).toBe("hilo");
  });

  it("no hay loading.tsx en /mensajes que envuelva al layout del hilo", () => {
    expect(existsSync(join(APP, "loading.tsx"))).toBe(false);
    // Los esqueletos están, pero adentro de cada ruta.
    expect(existsSync(join(APP, "(bandeja)", "loading.tsx"))).toBe(true);
    expect(existsSync(join(APP, "[id]", "loading.tsx"))).toBe(true);
  });
});
