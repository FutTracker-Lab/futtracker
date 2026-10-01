import { beforeAll, describe, expect, it } from "vitest";

import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

const BUCKET = "highlights";
const DAY_IN_SECONDS = 60 * 60 * 24;

// Un mp4 de mentira: al bucket le importa el `contentType` declarado y el
// tamaño, no el contenido real del archivo.
const CLIP = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);

// La ficha de `players` no la crea el alta: la FK de `player_highlights` y el
// `exists` de las políticas de storage la exigen, así que cada jugador de
// prueba la carga primero.
async function ensurePlayerRow(player: TestUser) {
  const { error } = await player.client
    .from("players")
    .insert({ id: player.id, position: "delantero" });

  if (error) {
    throw new Error(`No se pudo preparar la ficha: ${error.message}`);
  }
}

function upload(client: Client, path: string, contentType = "video/mp4") {
  return client.storage
    .from(BUCKET)
    .upload(path, CLIP, { contentType, upsert: true });
}

describe.skipIf(!IS_LOCAL)("RLS de player_highlights", () => {
  let anon: Client;
  let playerA: TestUser;
  let playerB: TestUser;
  let delegate: TestUser;
  let highlightB: string;

  beforeAll(async () => {
    anon = newClient();
    playerA = await signUpUser("player");
    playerB = await signUpUser("player");
    delegate = await signUpUser("delegate");

    await ensurePlayerRow(playerA);
    await ensurePlayerRow(playerB);

    const { data, error } = await playerB.client
      .from("player_highlights")
      .insert({
        player_id: playerB.id,
        title: "Clip de B",
        storage_path: `${playerB.id}/b1.mp4`,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`No se pudo sembrar el highlight de B: ${error.message}`);
    }

    highlightB = data.id;
  });

  describe("lectura", () => {
    it("sin sesión no devuelve filas", async () => {
      const { data, error } = await anon.from("player_highlights").select("id");

      // Sin policy para `anon` la consulta no falla: devuelve vacío. Es a
      // propósito, para no filtrar la existencia de la tabla.
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("cualquier usuario con sesión ve los highlights de otro", async () => {
      const { data, error } = await playerA.client
        .from("player_highlights")
        .select("id")
        .eq("id", highlightB);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe("escritura", () => {
    it("un jugador inserta un highlight propio", async () => {
      const { error } = await playerA.client.from("player_highlights").insert({
        player_id: playerA.id,
        title: "Gol de A",
        storage_path: `${playerA.id}/a1.mp4`,
      });

      expect(error).toBeNull();
    });

    it("NO puede insertar uno a nombre de otro jugador", async () => {
      const { error } = await playerA.client.from("player_highlights").insert({
        player_id: playerB.id,
        title: "Hack",
        storage_path: `${playerB.id}/hack.mp4`,
      });

      expect(error?.code).toBe("42501");
    });

    // El check ata el path a la carpeta del dueño: sin él, A podía registrar
    // como propio un clip guardado en la carpeta de B.
    it("NO puede registrar un path que cuelga de la carpeta de otro", async () => {
      const { error } = await playerA.client.from("player_highlights").insert({
        player_id: playerA.id,
        title: "Hack",
        storage_path: `${playerB.id}/hack.mp4`,
      });

      expect(error?.code).toBe("23514");
    });

    it("un delegado es rebotado por la foránea: no tiene fila en players", async () => {
      const { error } = await delegate.client.from("player_highlights").insert({
        player_id: delegate.id,
        title: "Hack",
        storage_path: `${delegate.id}/x.mp4`,
      });

      expect(error?.code).toBe("23503");
    });

    it("el quinto highlight lo rechaza el trigger", async () => {
      const player = await signUpUser("player");
      await ensurePlayerRow(player);

      for (let i = 1; i <= 4; i += 1) {
        const { error } = await player.client.from("player_highlights").insert({
          player_id: player.id,
          title: `Clip ${i}`,
          storage_path: `${player.id}/c${i}.mp4`,
        });

        expect(error).toBeNull();
      }

      const { error } = await player.client.from("player_highlights").insert({
        player_id: player.id,
        title: "Quinto",
        storage_path: `${player.id}/c5.mp4`,
      });

      expect(error?.code).toBe("23514");
      expect(error?.message).toContain("highlight_limit_reached");
    });

    // Sin policy NI grant de update, el título no se edita: se borra el clip y
    // se sube de nuevo. Rebota el grant antes que la RLS, así que es 42501 y
    // no un update de 0 filas. El criterio del ticket dice 0 filas: está
    // escrito contra un stack que expone las tablas de más (ver la PR).
    it("NO puede editar el título de un highlight propio", async () => {
      const { error } = await playerA.client
        .from("player_highlights")
        .update({ title: "Otro" })
        .eq("player_id", playerA.id)
        .select("id");

      expect(error?.code).toBe("42501");
    });

    it("sin sesión no puede insertar", async () => {
      const { error } = await anon.from("player_highlights").insert({
        player_id: playerA.id,
        title: "Anonimo",
        storage_path: `${playerA.id}/anon.mp4`,
      });

      expect(error?.code).toBe("42501");
    });

    it("NO puede borrar el highlight de otro", async () => {
      const { data } = await playerA.client
        .from("player_highlights")
        .delete()
        .eq("id", highlightB)
        .select("id");

      expect(data).toEqual([]);
    });
  });
});

describe.skipIf(!IS_LOCAL)("Storage del bucket highlights", () => {
  let anon: Client;
  let playerA: TestUser;
  let playerB: TestUser;
  let delegate: TestUser;
  let pathB: string;

  beforeAll(async () => {
    anon = newClient();
    playerA = await signUpUser("player");
    playerB = await signUpUser("player");
    delegate = await signUpUser("delegate");
    pathB = `${playerB.id}/clip.mp4`;

    await ensurePlayerRow(playerA);
    await ensurePlayerRow(playerB);

    const { error } = await upload(playerB.client, pathB);

    if (error) {
      throw new Error(`No se pudo subir el clip de B: ${error.message}`);
    }
  });

  it("un jugador sube a su propia carpeta", async () => {
    const { error } = await upload(playerA.client, `${playerA.id}/clip.mp4`);

    expect(error).toBeNull();
  });

  it("NO puede subir a la carpeta de otro", async () => {
    const { error } = await upload(playerA.client, `${playerB.id}/hack.mp4`);

    expect(error).not.toBeNull();
  });

  // A diferencia de la tabla, acá no hay foránea que rebote al delegado: sin
  // el `exists` sobre `players` podría llenar el bucket de archivos que
  // ninguna fila referencia.
  it("un delegado NO puede subir, aunque sea a su propia carpeta", async () => {
    const { error } = await upload(delegate.client, `${delegate.id}/x.mp4`);

    expect(error).not.toBeNull();
  });

  it("rechaza un archivo que no es video", async () => {
    const { error } = await upload(
      playerA.client,
      `${playerA.id}/doc.pdf`,
      "application/pdf",
    );

    expect(error).not.toBeNull();
  });

  it("sin sesión no se puede descargar un clip", async () => {
    const { data, error } = await anon.storage.from(BUCKET).download(pathB);

    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("con sesión se puede descargar el clip de otro", async () => {
    const { data, error } = await playerA.client.storage
      .from(BUCKET)
      .download(pathB);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it("la URL firmada vence a las 24 horas", async () => {
    const { data, error } = await playerB.client.storage
      .from(BUCKET)
      .createSignedUrl(pathB, DAY_IN_SECONDS);

    expect(error).toBeNull();

    const token = data?.signedUrl.split("token=")[1] ?? "";
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64").toString(),
    );
    const hours = (payload.exp - Math.floor(Date.now() / 1000)) / 3600;

    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThanOrEqual(24);
  });
});
