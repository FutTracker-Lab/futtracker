import { beforeAll, describe, expect, it } from "vitest";

import {
  IS_LOCAL,
  newClient,
  signUpUser,
  type Client,
  type TestUser,
} from "@/lib/supabase/__tests__/rls-client";
import { dateInBuenosAires } from "@/scripts/kpis/kpis.mjs";

// T22 · tablas y funciones del reporter de KPIs.
//
// `api_error_log` y `kpi_report_runs` son de solo inserción y nadie las lee
// de forma directa. El log se escribe solo por `log_api_error`, la copia solo
// la inserta la cuenta del reporter (la del seed, con
// `app_metadata.kpi_reporter`), y los conteos salen solo por
// `kpi_daily_counts`, que únicamente atiende al reporter.
//
// Ninguna de las dos tablas tiene filas que limpiar entre corridas: no hay
// `delete`. Los casos comparan conteos antes y después, nunca absolutos.
const REPORTER_EMAIL = "kpi.reporter@example.com";
const SEED_PASSWORD = "password123";

async function signInReporter(): Promise<Client> {
  const client = newClient();
  const { error } = await client.auth.signInWithPassword({
    email: REPORTER_EMAIL,
    password: SEED_PASSWORD,
  });

  if (error) {
    throw new Error(`No se pudo iniciar sesión como el reporter: ${error.message}`);
  }

  return client;
}

function copy(overrides: Record<string, unknown> = {}) {
  return {
    run_id: crypto.randomUUID(),
    env: "dev",
    kpi_date: "2026-10-13",
    payload: [{ kpi_id: "api_alcanzable", value: 1 }],
    response_status: 201,
    attempts: 1,
    fallbacks: [],
    ...overrides,
  };
}

async function errorsOn(reporter: Client, date: string): Promise<number> {
  const { data, error } = await reporter.rpc("kpi_daily_counts", { p_date: date });

  if (error || !data?.[0]) {
    throw new Error(`kpi_daily_counts falló: ${error?.message}`);
  }

  return data[0].errors_5xx;
}

describe.skipIf(!IS_LOCAL)("T22 · reporter de KPIs", () => {
  let anon: Client;
  let player: TestUser;
  let reporter: Client;

  beforeAll(async () => {
    anon = newClient();
    player = await signUpUser("player");
    reporter = await signInReporter();
  });

  describe("is_kpi_reporter", () => {
    it("es true para la cuenta marcada y false para una cuenta común", async () => {
      expect((await reporter.rpc("is_kpi_reporter")).data).toBe(true);
      expect((await player.client.rpc("is_kpi_reporter")).data).toBe(false);
    });

    it("la marca no se la puede poner un usuario a sí mismo", async () => {
      const user = await signUpUser("player");
      // `data` del usuario es user_metadata, que sí es editable. app_metadata no.
      const { error } = await user.client.auth.updateUser({ data: { kpi_reporter: true } });
      expect(error).toBeNull();
      await user.client.auth.refreshSession();

      expect((await user.client.rpc("is_kpi_reporter")).data).toBe(false);
    });
  });

  describe("log_api_error", () => {
    it("un 500 sin sesión queda registrado y suma en errores_5xx del día", async () => {
      const today = dateInBuenosAires(new Date());
      const before = await errorsOn(reporter, today);

      const { error } = await anon.rpc("log_api_error", {
        p_route: "/api/health",
        p_method: "GET",
        p_status: 500,
      });

      expect(error).toBeNull();
      expect(await errorsOn(reporter, today)).toBe(before + 1);
    });

    it("un usuario logueado también puede registrar", async () => {
      const { error } = await player.client.rpc("log_api_error", {
        p_route: "/auth/callback",
        p_method: "GET",
        p_status: 503,
      });

      expect(error).toBeNull();
    });

    it.each([
      ["un código que no es 5xx", "/api/health", "GET", 404],
      ["un código fuera de rango", "/api/health", "GET", 600],
      ["una ruta fuera de la lista", "/api/otra", "GET", 500],
      ["un path real en vez del patrón", "/auth/callback?code=abc", "GET", 500],
      ["un método inválido", "/api/health", "get", 500],
    ])("rechaza %s con 22023", async (_case, route, method, status) => {
      const { error } = await anon.rpc("log_api_error", {
        p_route: route,
        p_method: method,
        p_status: status,
      });

      expect(error?.code).toBe("22023");
    });
  });

  describe("api_error_log", () => {
    // El criterio dice "0 filas"; sin grant es 42501 (ver la PR).
    it("sin sesión, el select falla con 42501", async () => {
      const { data, error } = await anon.from("api_error_log").select("*");
      expect(error?.code).toBe("42501");
      expect(data).toBeNull();
    });

    it.each([
      ["un usuario común", () => player.client],
      ["el reporter", () => reporter],
    ])("%s no la lee directo (42501)", async (_who, client) => {
      const { error } = await client().from("api_error_log").select("*");
      expect(error?.code).toBe("42501");
    });

    it("un usuario logueado no inserta directo (42501)", async () => {
      const { error } = await player.client
        .from("api_error_log")
        .insert({ route: "/api/health", method: "GET", status: 500 });
      expect(error?.code).toBe("42501");
    });

    it("un usuario logueado no modifica ni borra (42501)", async () => {
      const update = await player.client.from("api_error_log").update({ status: 501 }).gte("id", 0);
      const remove = await player.client.from("api_error_log").delete().gte("id", 0);

      expect(update.error?.code).toBe("42501");
      expect(remove.error?.code).toBe("42501");
    });
  });

  describe("kpi_report_runs", () => {
    it("el reporter inserta la copia", async () => {
      const { error } = await reporter.from("kpi_report_runs").insert(copy());
      expect(error).toBeNull();
    });

    it("también sin código de respuesta, cuando falló la red", async () => {
      const { error } = await reporter
        .from("kpi_report_runs")
        .insert(copy({ response_status: null, attempts: 4 }));
      expect(error).toBeNull();
    });

    it("el mismo run_id no entra dos veces (23505)", async () => {
      const row = copy();
      await reporter.from("kpi_report_runs").insert(row);

      const { error } = await reporter.from("kpi_report_runs").insert(row);
      expect(error?.code).toBe("23505");
    });

    it("el reporter no fija created_at (42501)", async () => {
      const { error } = await reporter
        .from("kpi_report_runs")
        .insert({ ...copy(), created_at: "2020-01-01T00:00:00Z" });
      expect(error?.code).toBe("42501");
    });

    it("un usuario común no inserta (42501)", async () => {
      const { error } = await player.client.from("kpi_report_runs").insert(copy());
      expect(error?.code).toBe("42501");
    });

    it("sin sesión no inserta (42501)", async () => {
      const { error } = await anon.from("kpi_report_runs").insert(copy());
      expect(error?.code).toBe("42501");
    });

    it("sin sesión, el select falla con 42501", async () => {
      const { data, error } = await anon.from("kpi_report_runs").select("*");
      expect(error?.code).toBe("42501");
      expect(data).toBeNull();
    });

    it("nadie la lee, ni el reporter (42501)", async () => {
      const own = await reporter.from("kpi_report_runs").select("*");
      const common = await player.client.from("kpi_report_runs").select("*");

      expect(own.error?.code).toBe("42501");
      expect(common.error?.code).toBe("42501");
    });

    it.each([
      ["un usuario común", () => player.client],
      ["el reporter", () => reporter],
    ])("%s no modifica ni borra (42501)", async (_who, client) => {
      const update = await client()
        .from("kpi_report_runs")
        .update({ attempts: 2 })
        .eq("env", "dev");
      const remove = await client().from("kpi_report_runs").delete().eq("env", "dev");

      expect(update.error?.code).toBe("42501");
      expect(remove.error?.code).toBe("42501");
    });

    it("rechaza un env o una cantidad de intentos inválidos (23514)", async () => {
      const env = await reporter.from("kpi_report_runs").insert(copy({ env: "staging" }));
      const attempts = await reporter.from("kpi_report_runs").insert(copy({ attempts: 5 }));

      expect(env.error?.code).toBe("23514");
      expect(attempts.error?.code).toBe("23514");
    });
  });

  describe("kpi_daily_counts", () => {
    it("un usuario común no la puede llamar (42501)", async () => {
      const { error } = await player.client.rpc("kpi_daily_counts", { p_date: "2026-10-13" });
      expect(error?.code).toBe("42501");
    });

    it("sin sesión no la puede llamar (42501)", async () => {
      const { error } = await anon.rpc("kpi_daily_counts", { p_date: "2026-10-13" });
      expect(error?.code).toBe("42501");
    });

    it("el día de hoy cuenta a los jugadores y las fichas del seed", async () => {
      const { data, error } = await reporter.rpc("kpi_daily_counts", {
        p_date: dateInBuenosAires(new Date()),
      });

      expect(error).toBeNull();
      const [row] = data!;
      // Todo jugador del seed tiene ficha, pero el `beforeAll` da de alta uno
      // sin ella: las cuentas superan a las fichas, y las dos se cuentan aparte.
      expect(row.players_registered).toBeGreaterThan(row.complete_profiles);
      expect(row.complete_profiles).toBeGreaterThan(0);
      expect(row.contacts_started).toBe(0);
      expect(row.contacts_successful).toBe(0);
    });

    it("cuenta a cada jugador que sigue al menos un equipo una sola vez", async () => {
      // Seed de T13a: PJ1 sigue a E1 y E2, PJ2 sigue a E1. Son 2 jugadores,
      // no 3 seguimientos.
      const today = dateInBuenosAires(new Date());
      const before = (await reporter.rpc("kpi_daily_counts", { p_date: today })).data![0];
      expect(before.players_following).toBeGreaterThanOrEqual(2);

      const follower = await signUpUser("player");
      const { error } = await follower.client.from("team_follows").insert([
        { follower_id: follower.id, team_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        { follower_id: follower.id, team_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
      ]);
      expect(error).toBeNull();

      const after = (await reporter.rpc("kpi_daily_counts", { p_date: today })).data![0];
      expect(after.players_following).toBe(before.players_following + 1);
      expect(after.players_registered).toBe(before.players_registered + 1);
    });

    it("una fecha anterior a todo da una base sin jugadores", async () => {
      const { data, error } = await reporter.rpc("kpi_daily_counts", { p_date: "2000-01-01" });

      expect(error).toBeNull();
      expect(data).toEqual([
        {
          players_registered: 0,
          players_following: 0,
          complete_profiles: 0,
          contacts_started: 0,
          contacts_successful: 0,
          errors_5xx: 0,
        },
      ]);
    });

    it("un jugador recién registrado suma en el acumulado de hoy", async () => {
      const today = dateInBuenosAires(new Date());
      const before = (await reporter.rpc("kpi_daily_counts", { p_date: today })).data![0];

      await signUpUser("player");

      const after = (await reporter.rpc("kpi_daily_counts", { p_date: today })).data![0];
      expect(after.players_registered).toBe(before.players_registered + 1);
    });
  });
});
