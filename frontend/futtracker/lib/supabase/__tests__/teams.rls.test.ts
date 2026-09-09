import { beforeAll, describe, expect, it } from "vitest";

import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";

// El índice único de duplicados es global y la base no se resetea entre
// corridas: con un nombre fijo, la segunda corrida chocaría contra el equipo
// que dejó la primera.
const RUN = crypto.randomUUID().slice(0, 8);
const DUP_NAME = `Racing ${RUN}`;

// A través de PostgREST y no de psql: es el único camino que también pasa por
// los grants.
describe.skipIf(!IS_LOCAL)("RLS de public.teams", () => {
  let anon: Client;
  let delegateD: TestUser;
  let delegateE: TestUser;
  let playerP: TestUser;
  let teamD: string;

  beforeAll(async () => {
    anon = newClient();
    delegateD = await signUpUser("delegate");
    delegateE = await signUpUser("delegate");
    playerP = await signUpUser("player");
  });

  describe("sin sesión", () => {
    // Se assertea el código y no solo `data` vacío: sin sesión el corte lo hace
    // el grant, antes que RLS, y las dos cosas devuelven cero filas. Si algún
    // día aparece un `grant select to anon`, esta aserción lo marca.
    it("no lee ninguna fila, aunque el seed tenga equipos", async () => {
      const { data, error } = await anon.from("teams").select("id");

      expect(error?.code).toBe("42501");
      expect(data ?? []).toHaveLength(0);
    });

    it("no puede insertar", async () => {
      const { error } = await anon
        .from("teams")
        .insert({ owner_id: delegateD.id, name: `Anon ${RUN}` });

      expect(error?.code).toBe("42501");
    });
  });

  describe("cuenta de delegado, sobre su equipo", () => {
    it("puede crear el suyo", async () => {
      const { data, error } = await delegateD.client
        .from("teams")
        .insert({
          owner_id: delegateD.id,
          name: `Primero ${RUN}`,
          city: "Pilar",
        })
        .select("id, name")
        .single();

      expect(error).toBeNull();
      expect(data?.name).toBe(`Primero ${RUN}`);

      teamD = data!.id;
    });

    // El `unique` de `owner_id` es lo que fija "un equipo por delegado". Como
    // no es una política, el error llega como violación de constraint y no
    // como 42501.
    it("NO puede crear un segundo", async () => {
      const { error } = await delegateD.client
        .from("teams")
        .insert({
          owner_id: delegateD.id,
          name: `Segundo ${RUN}`,
          city: "Escobar",
        });

      expect(error?.code).toBe("23505");
    });

    it("puede borrar el suyo y crear otro", async () => {
      const { error: deleteError } = await delegateD.client
        .from("teams")
        .delete()
        .eq("id", teamD);

      expect(deleteError).toBeNull();

      const { data, error } = await delegateD.client
        .from("teams")
        .insert({
          owner_id: delegateD.id,
          name: `Tercero ${RUN}`,
          city: "Escobar",
        })
        .select("id")
        .single();

      expect(error).toBeNull();

      teamD = data!.id;
    });
  });

  /**
   * Sin el `exists` sobre `profiles` en la política de insert, `auth.uid() =
   * owner_id` alcanzaría: dice que la fila es propia, no que la cuenta sea de
   * delegado.
   */
  describe("cuenta de jugador", () => {
    it("NO puede crear un equipo, ni siquiera a nombre propio", async () => {
      const { error } = await playerP.client
        .from("teams")
        .insert({ owner_id: playerP.id, name: `De un jugador ${RUN}` });

      expect(error?.code).toBe("42501");
    });

    it("puede leer los equipos: el listado no es solo para delegados", async () => {
      const { data } = await playerP.client
        .from("teams")
        .select("id")
        .eq("id", teamD)
        .single();

      expect(data?.id).toBe(teamD);
    });
  });

  describe("sobre el equipo de otro", () => {
    // El update que no matchea la política no da error: filtra y afecta cero
    // filas. Por eso lo que se assertea es el largo de `data`.
    it("un delegado ajeno no lo edita: cero filas", async () => {
      const { data } = await delegateE.client
        .from("teams")
        .update({ name: `Editado por otro ${RUN}` })
        .eq("id", teamD)
        .select();

      expect(data ?? []).toHaveLength(0);
    });

    it("el dueño sí lo edita: una fila", async () => {
      const { data } = await delegateD.client
        .from("teams")
        .update({ name: `Tercero editado ${RUN}` })
        .eq("id", teamD)
        .select();

      expect(data ?? []).toHaveLength(1);
    });
  });

  /**
   * El índice va sobre `lower(btrim(...))` de nombre y ciudad. Cada caso usa
   * un delegado nuevo porque el `unique` de `owner_id` deja un equipo por
   * cuenta y si no el segundo insert fallaría por el motivo equivocado.
   */
  describe("duplicados por nombre y ciudad", () => {
    beforeAll(async () => {
      const owner = await signUpUser("delegate");

      const { error } = await owner.client
        .from("teams")
        .insert({ owner_id: owner.id, name: DUP_NAME, city: "Pilar" });

      if (error) {
        throw new Error(`No se pudo preparar el duplicado: ${error.message}`);
      }
    });

    it("rechaza el mismo nombre en minúscula, misma ciudad", async () => {
      const other = await signUpUser("delegate");

      const { error } = await other.client
        .from("teams")
        .insert({
          owner_id: other.id,
          name: DUP_NAME.toLowerCase(),
          city: "Pilar",
        });

      expect(error?.code).toBe("23505");
    });

    it("rechaza el mismo nombre con la ciudad en minúscula", async () => {
      const other = await signUpUser("delegate");

      const { error } = await other.client
        .from("teams")
        .insert({ owner_id: other.id, name: DUP_NAME, city: "pilar" });

      expect(error?.code).toBe("23505");
    });

    it("acepta el mismo nombre en otra ciudad", async () => {
      const other = await signUpUser("delegate");

      const { error } = await other.client
        .from("teams")
        .insert({ owner_id: other.id, name: DUP_NAME, city: "San Isidro" });

      expect(error).toBeNull();
    });
  });

  describe("checks de la tabla", () => {
    it("rechaza un founded_year de 1700", async () => {
      const { error } = await delegateD.client
        .from("teams")
        .update({ founded_year: 1700 })
        .eq("id", teamD);

      expect(error?.code).toBe("23514");
    });
  });

  /**
   * El `with check` del update es lo que ata el escudo al equipo. Sin la regex,
   * el dueño podría apuntar su `crest_path` a la carpeta de otro y mostrar el
   * escudo ajeno como propio.
   */
  describe("crest_path", () => {
    it("el dueño NO lo puede apuntar a la carpeta de otro equipo", async () => {
      const { error } = await delegateD.client
        .from("teams")
        .update({ crest_path: `${delegateE.id}/escudo.png` })
        .eq("id", teamD);

      expect(error?.code).toBe("42501");
    });

    it("el dueño sí lo apunta a la carpeta de su equipo", async () => {
      const { error } = await delegateD.client
        .from("teams")
        .update({ crest_path: `${teamD}/escudo.png` })
        .eq("id", teamD);

      expect(error).toBeNull();
    });
  });
});
