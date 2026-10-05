import { beforeAll, describe, expect, it } from "vitest";

import { publicEnv } from "@/lib/env/public";
import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

const BUCKET = "team-crests";
const DAY_IN_SECONDS = 60 * 60 * 24;

const RUN = crypto.randomUUID().slice(0, 8);

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

async function createTeam(owner: TestUser, name: string) {
  const { data, error } = await owner.client
    .from("teams")
    .insert({ owner_id: owner.id, name })
    .select("id")
    .single();

  if (error) {
    throw new Error(`No se pudo preparar el equipo ${name}: ${error.message}`);
  }

  return data.id;
}

describe.skipIf(!IS_LOCAL)("Storage del bucket team-crests", () => {
  let anon: Client;
  let ownerT: TestUser;
  let ownerOther: TestUser;
  let teamT: string;
  let pathT: string;

  beforeAll(async () => {
    anon = newClient();
    ownerT = await signUpUser("delegate");
    ownerOther = await signUpUser("delegate");

    teamT = await createTeam(ownerT, `Equipo T ${RUN}`);
    await createTeam(ownerOther, `Equipo O ${RUN}`);

    pathT = `${teamT}/escudo.png`;

    const { error } = await upload(ownerT.client, pathT);

    if (error) {
      throw new Error(`No se pudo subir el escudo de T: ${error.message}`);
    }
  });

  describe("escritura", () => {
    it("el dueño sube a la carpeta de su equipo", async () => {
      const { error } = await upload(ownerT.client, pathT);

      expect(error).toBeNull();
    });

    it("el dueño de otro equipo NO puede subir ahí", async () => {
      const { error } = await upload(ownerOther.client, `${teamT}/hack.png`);

      expect(error).not.toBeNull();
    });

    it("NO puede subir en la raíz del bucket, fuera de toda carpeta", async () => {
      const { error } = await upload(ownerT.client, "suelto.png");

      expect(error).not.toBeNull();
    });

    /**
     * La política castea el primer segmento del path a uuid. Sin `safe_uuid`,
     * una carpeta que no es un uuid revienta el cast con 22P02 y el usuario se
     * lleva un 500 en vez de un 403: el 500 es lo que se assertea acá.
     */
    it("NO puede subir bajo una carpeta que no es un uuid, y no rompe con 22P02", async () => {
      const { error } = await upload(ownerT.client, "hack/escudo.png");

      expect(error).not.toBeNull();

      const {
        data: { session },
      } = await ownerT.client.auth.getSession();

      const response = await fetch(
        `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/hack/escudo.png`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session!.access_token}`,
            "Content-Type": "image/png",
          },
          body: PNG,
        },
      );

      expect(response.status).not.toBe(500);
      expect([400, 403]).toContain(response.status);
    });
  });

  describe("lectura", () => {
    it("un usuario con sesión lee el escudo de otro equipo: los escudos son visibles", async () => {
      const { data, error } = await ownerOther.client.storage
        .from(BUCKET)
        .download(pathT);

      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });

    it("sin sesión no lee nada", async () => {
      const { data, error } = await anon.storage.from(BUCKET).download(pathT);

      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });

    it("la URL directa sin firma no devuelve la imagen", async () => {
      const response = await fetch(
        `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${pathT}`,
      );

      expect(response.ok).toBe(false);
      expect([400, 403]).toContain(response.status);
    });
  });

  describe("signed URLs", () => {
    it("la firma dura 24 horas", async () => {
      const { data, error } = await ownerOther.client.storage
        .from(BUCKET)
        .createSignedUrl(pathT, DAY_IN_SECONDS);

      expect(error).toBeNull();

      const token = new URL(data!.signedUrl).searchParams.get("token")!;
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString(),
      );

      expect(payload.exp - payload.iat).toBe(DAY_IN_SECONDS);
    });

    it("la URL firmada sí devuelve la imagen", async () => {
      const { data } = await ownerOther.client.storage
        .from(BUCKET)
        .createSignedUrl(pathT, DAY_IN_SECONDS);

      const response = await fetch(data!.signedUrl);

      expect(response.status).toBe(200);
    });
  });

  describe("límites del bucket", () => {
    it("rechaza un archivo que no es imagen", async () => {
      const { error } = await ownerT.client.storage
        .from(BUCKET)
        .upload(`${teamT}/nota.txt`, new Blob(["hola"]), {
          contentType: "text/plain",
          upsert: true,
        });

      expect(error).not.toBeNull();
    });

    it("rechaza una imagen de más de 2 MB", async () => {
      const tooBig = new Uint8Array(2 * 1024 * 1024 + 1);

      const { error } = await ownerT.client.storage
        .from(BUCKET)
        .upload(`${teamT}/gigante.png`, tooBig, {
          contentType: "image/png",
          upsert: true,
        });

      expect(error).not.toBeNull();
    });
  });
});
