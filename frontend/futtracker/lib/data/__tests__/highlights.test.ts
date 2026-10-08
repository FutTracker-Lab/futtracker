import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  buildHighlightPath,
  createHighlight,
  deleteHighlight,
  getHighlightSignedUrls,
  highlightInputSchema,
  listHighlights,
} from "@/lib/data/highlights";
import type { Database } from "@/lib/supabase/database.types";

const PLAYER_A = "11111111-1111-4111-8111-111111111111";

function fakeQueryClient(rows: unknown[] = []) {
  const spies = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };

  const builder = {
    select: (columns: string) => {
      spies.select(columns);
      return builder;
    },
    eq: (column: string, value: unknown) => {
      spies.eq(column, value);
      return builder;
    },
    order: (column: string, options: unknown) => {
      spies.order(column, options);
      return Promise.resolve({ data: rows, error: null });
    },
  };

  const client = {
    from: (table: string) => {
      spies.from(table);
      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, spies };
}

describe("listHighlights", () => {
  it("filtra por jugador y ordena del más nuevo al más viejo", async () => {
    const { client, spies } = fakeQueryClient([]);

    await listHighlights(client, PLAYER_A);

    expect(spies.from).toHaveBeenCalledWith("player_highlights");
    expect(spies.eq).toHaveBeenCalledWith("player_id", PLAYER_A);
    expect(spies.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });
});

describe("buildHighlightPath", () => {
  // La primera carpeta es lo que chequean las políticas de storage y el check
  // de `storage_path`: si deja de ser el id del jugador, la subida se rechaza.
  it("cuelga el archivo de la carpeta del jugador", () => {
    const path = buildHighlightPath(PLAYER_A, "gol.mp4", "abc-123");

    expect(path).toBe(`${PLAYER_A}/abc-123.mp4`);
  });

  it("conserva la extensión en minúscula", () => {
    expect(buildHighlightPath(PLAYER_A, "CLIP.MOV", "u")).toBe(
      `${PLAYER_A}/u.mov`,
    );
  });

  it("cae a mp4 cuando el archivo no tiene extensión", () => {
    expect(buildHighlightPath(PLAYER_A, "clip", "u")).toBe(`${PLAYER_A}/u.mp4`);
  });
});

function fakeStorageClient(
  items: { path: string | null; signedUrl: string | null; error: string | null }[],
) {
  const spy = vi.fn();

  const client = {
    storage: {
      from: (bucket: string) => ({
        createSignedUrls: async (paths: string[], expiresIn: number) => {
          spy(bucket, paths, expiresIn);
          return { data: items, error: null };
        },
      }),
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, spy };
}

describe("getHighlightSignedUrls", () => {
  it("firma todos los paths en una sola llamada, con TTL de 24 h", async () => {
    const { client, spy } = fakeStorageClient([
      { path: "a/1.mp4", signedUrl: "https://local/1", error: null },
      { path: "a/2.mp4", signedUrl: "https://local/2", error: null },
    ]);

    const urls = await getHighlightSignedUrls(client, ["a/1.mp4", "a/2.mp4"]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      "highlights",
      ["a/1.mp4", "a/2.mp4"],
      86400,
    );
    expect(urls.get("a/1.mp4")).toBe("https://local/1");
    expect(urls.get("a/2.mp4")).toBe("https://local/2");
  });

  it("no va a storage con la lista vacía", async () => {
    const { client, spy } = fakeStorageClient([]);

    await expect(getHighlightSignedUrls(client, [])).resolves.toEqual(
      new Map(),
    );
    expect(spy).not.toHaveBeenCalled();
  });

  // Un clip cuyo archivo ya no está no puede tumbar la galería entera: los
  // otros tres tienen que seguir viéndose.
  it("saltea los paths que el storage no pudo firmar", async () => {
    const { client } = fakeStorageClient([
      { path: "a/1.mp4", signedUrl: "https://local/1", error: null },
      { path: "a/roto.mp4", signedUrl: null, error: "Object not found" },
    ]);

    const urls = await getHighlightSignedUrls(client, [
      "a/1.mp4",
      "a/roto.mp4",
    ]);

    expect(urls.size).toBe(1);
    expect(urls.has("a/roto.mp4")).toBe(false);
  });
});

function fakeDeleteClient(deletedRows: { storage_path: string }[] | null) {
  const spies = { remove: vi.fn(), eq: vi.fn() };

  const builder = {
    delete: () => builder,
    eq: (column: string, value: unknown) => {
      spies.eq(column, value);
      return builder;
    },
    select: () => Promise.resolve({ data: deletedRows, error: null }),
  };

  const client = {
    from: () => builder,
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          spies.remove(bucket, paths);
          return { error: null };
        },
      }),
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, spies };
}

describe("deleteHighlight", () => {
  it("borra la fila y después el objeto", async () => {
    const { client, spies } = fakeDeleteClient([
      { storage_path: `${PLAYER_A}/clip.mp4` },
    ]);

    await expect(deleteHighlight(client, "highlight-1")).resolves.toBe(true);

    expect(spies.eq).toHaveBeenCalledWith("id", "highlight-1");
    expect(spies.remove).toHaveBeenCalledWith("highlights", [
      `${PLAYER_A}/clip.mp4`,
    ]);
  });

  // Si la RLS rechaza el borrado, el delete afecta 0 filas. Tocar el storage
  // ahí borraría el archivo de un highlight que sigue existiendo.
  it("no toca el storage cuando la RLS no dejó borrar la fila", async () => {
    const { client, spies } = fakeDeleteClient([]);

    await expect(deleteHighlight(client, "de-otro")).resolves.toBe(false);

    expect(spies.remove).not.toHaveBeenCalled();
  });
});

function fakeInsertClient(error: unknown = null) {
  const insert = vi.fn(async () => ({ error }));
  const client = { from: () => ({ insert }) };

  return { client: client as unknown as SupabaseClient<Database>, insert };
}

describe("createHighlight", () => {
  it("inserta la fila con el jugador de la sesión", async () => {
    const { client, insert } = fakeInsertClient();

    await createHighlight(client, PLAYER_A, {
      title: "Gol",
      storage_path: `${PLAYER_A}/abc.mp4`,
    });

    expect(insert).toHaveBeenCalledWith({
      player_id: PLAYER_A,
      title: "Gol",
      storage_path: `${PLAYER_A}/abc.mp4`,
    });
  });

  it("propaga el error de Postgres con su código", async () => {
    const { client } = fakeInsertClient({ code: "23514", message: "highlight_limit_reached" });

    await expect(
      createHighlight(client, PLAYER_A, { title: "Gol", storage_path: `${PLAYER_A}/abc.mp4` }),
    ).rejects.toMatchObject({ code: "23514" });
  });
});

describe("highlightInputSchema", () => {
  it("acepta un alta válida", () => {
    const result = highlightInputSchema.safeParse({
      title: "Gol de tiro libre",
      storage_path: `${PLAYER_A}/abc.mp4`,
    });

    expect(result.success).toBe(true);
  });

  it.each([[""], ["   "], ["x".repeat(81)]])(
    "rechaza el título %j",
    (title) => {
      const result = highlightInputSchema.safeParse({
        title,
        storage_path: `${PLAYER_A}/abc.mp4`,
      });

      expect(result.success).toBe(false);
    },
  );
});
