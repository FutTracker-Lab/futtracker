import { beforeAll, describe, expect, it } from "vitest";

import { publicEnv } from "@/lib/env/public";
import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

const BUCKET = "avatars";
const DAY_IN_SECONDS = 60 * 60 * 24;

const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

function upload(client: Client, path: string) {
  return client.storage
    .from(BUCKET)
    .upload(path, PNG, { contentType: "image/png", upsert: true });
}

describe.skipIf(!IS_LOCAL)("Storage del bucket avatars", () => {
  let anon: Client;
  let playerA: TestUser;
  let playerB: TestUser;
  let pathB: string;

  beforeAll(async () => {
    anon = newClient();
    playerA = await signUpUser("player");
    playerB = await signUpUser("player");
    pathB = `${playerB.id}/avatar.png`;

    const { error } = await upload(playerB.client, pathB);

    if (error) {
      throw new Error(`No se pudo subir el avatar de B: ${error.message}`);
    }
  });

  describe("escritura", () => {
    it("un jugador sube a su propia carpeta", async () => {
      const { error } = await upload(playerA.client, `${playerA.id}/avatar.png`);

      expect(error).toBeNull();
    });

    it("NO puede subir a la carpeta de otro", async () => {
      const { error } = await upload(playerA.client, `${playerB.id}/hack.png`);

      expect(error).not.toBeNull();
    });

    it("NO puede borrar el avatar de otro", async () => {
      // El delete de storage no falla cuando RLS no matchea: filtra y borra
      // cero filas. Por eso lo que se assertea es que el archivo sigue estando.
      await playerA.client.storage.from(BUCKET).remove([pathB]);

      const { data, error } = await playerB.client.storage
        .from(BUCKET)
        .download(pathB);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });

    it("NO puede subir en la raíz del bucket, fuera de toda carpeta", async () => {
      const { error } = await upload(playerA.client, "suelto.png");

      expect(error).not.toBeNull();
    });
  });

  describe("lectura", () => {
    it("un jugador con sesión lee el avatar de otro: los perfiles son visibles", async () => {
      const { data, error } = await playerA.client.storage
        .from(BUCKET)
        .download(pathB);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });

    it("sin sesión no lee nada", async () => {
      const { data, error } = await anon.storage.from(BUCKET).download(pathB);

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it("la URL directa sin firma no devuelve la imagen", async () => {
      const response = await fetch(
        `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${pathB}`,
      );

      expect(response.ok).toBe(false);
      expect([400, 403]).toContain(response.status);
    });
  });

  describe("signed URLs", () => {
    it("la firma dura 24 horas", async () => {
      const { data, error } = await playerA.client.storage
        .from(BUCKET)
        .createSignedUrl(pathB, DAY_IN_SECONDS);

      expect(error).toBeNull();

      const token = new URL(data!.signedUrl).searchParams.get("token")!;
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString(),
      );

      expect(payload.exp - payload.iat).toBe(DAY_IN_SECONDS);
    });

    it("la URL firmada sí devuelve la imagen", async () => {
      const { data } = await playerA.client.storage
        .from(BUCKET)
        .createSignedUrl(pathB, DAY_IN_SECONDS);

      const response = await fetch(data!.signedUrl);

      expect(response.status).toBe(200);
    });
  });

  describe("límites del bucket", () => {
    it("rechaza un archivo que no es imagen", async () => {
      const { error } = await playerA.client.storage
        .from(BUCKET)
        .upload(`${playerA.id}/nota.txt`, new Blob(["hola"]), {
          contentType: "text/plain",
          upsert: true,
        });

      expect(error).not.toBeNull();
    });

    it("rechaza una imagen de más de 2 MB", async () => {
      const tooBig = new Uint8Array(2 * 1024 * 1024 + 1);

      const { error } = await playerA.client.storage
        .from(BUCKET)
        .upload(`${playerA.id}/gigante.png`, tooBig, {
          contentType: "image/png",
          upsert: true,
        });

      expect(error).not.toBeNull();
    });
  });
});
