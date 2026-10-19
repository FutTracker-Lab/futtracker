import { describe, expect, it, vi } from "vitest";

import {
  ConfigError,
  KPIS,
  REQUEST_TIMEOUT_MS,
  SEARCHES,
  SEARCH_ROUNDS,
  buildMeasurements,
  p95,
  percent,
  previousDayInBuenosAires,
  readReportConfig,
  runReport,
  sendMeasurements,
  syncCatalog,
  type DailyCounts,
  type Deps,
  type MeasurementRow,
  type ReportConfig,
  type ReporterDb,
  type RunCopy,
} from "../kpis.mjs";

// =====================================================================
// Andamiaje
// =====================================================================

const PLATFORM = "https://plataforma.test";
const OURS = "https://nuestro.supabase.test";
const APP = "https://app.test";

const CONFIG: ReportConfig = {
  env: "dev",
  apiUrl: PLATFORM,
  publishableKey: "publishable-de-prueba",
  projectKey: "project-de-prueba",
  supabaseUrl: OURS,
  supabaseKey: "sb_publishable_test",
  reporterEmail: "reporter@example.com",
  reporterPassword: "x",
  appUrl: APP,
  date: "2026-10-13",
};

const COUNTS: DailyCounts = {
  players_registered: 8,
  players_following: 3,
  complete_profiles: 6,
  contacts_started: 0,
  contacts_successful: 0,
  errors_5xx: 1,
};

type Route = (url: string, init?: RequestInit) => Response | Promise<Response>;

/**
 * `fetch` falso: health y auth responden 200 salvo que se pise la ruta, y el
 * envío a la plataforma responde lo que diga `measurement`.
 */
function fakeFetch(routes: { health?: Route; auth?: Route; measurement?: Route } = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];

  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });

    if (url === `${APP}/api/health`) {
      return (routes.health ?? (() => new Response("{}", { status: 200 })))(url, init);
    }
    if (url === `${OURS}/auth/v1/health`) {
      return (routes.auth ?? (() => new Response("{}", { status: 200 })))(url, init);
    }
    if (url.startsWith(`${PLATFORM}/rest/v1/measurement`)) {
      return (routes.measurement ?? (() => new Response(null, { status: 201 })))(url, init);
    }
    throw new Error(`fetch inesperado: ${url}`);
  });

  const measurementCalls = () => calls.filter((c) => c.url.startsWith(`${PLATFORM}/rest/v1/measurement`));

  return { impl: impl as unknown as typeof fetch, calls, measurementCalls };
}

function fakeDb(overrides: Partial<ReporterDb> = {}) {
  const copies: RunCopy[] = [];
  const db: ReporterDb = {
    ping: async () => true,
    counts: async () => COUNTS,
    read: async () => {},
    search: async () => {},
    saveCopy: async (copy) => {
      copies.push(copy);
    },
    ...overrides,
  };
  return { db, copies };
}

function deps(
  fetchImpl: typeof fetch,
  db: ReporterDb | Error,
): Deps & { lines: string[]; sleeps: number[] } {
  const lines: string[] = [];
  const sleeps: number[] = [];
  let clock = 0;

  return {
    fetch: fetchImpl,
    // Cada lectura del reloj avanza 10 ms: toda operación mide 10 ms.
    now: () => (clock += 10),
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    log: (line) => lines.push(line),
    connectDb: async () => {
      if (db instanceof Error) throw db;
      return db;
    },
    lines,
    sleeps,
  };
}

function sentBody(call: { init?: RequestInit }): MeasurementRow[] {
  return JSON.parse(String(call.init?.body));
}

function valueOf(body: MeasurementRow[], id: string): number | undefined {
  return body.find((row) => row.kpi_id === id)?.value;
}

// =====================================================================
// Cálculos
// =====================================================================

describe("cálculos", () => {
  it("p95 por rango más cercano", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(p95(twenty)).toBe(19);
    expect(p95([5, 1, 4, 2, 3])).toBe(5);
    expect(p95([12.6])).toBe(13);
  });

  it("porcentajes con 2 decimales y 0 sin denominador", () => {
    expect(percent(1, 3)).toBe(33.33);
    expect(percent(2, 3)).toBe(66.67);
    expect(percent(0, 0)).toBe(0);
  });

  it("el día anterior se calcula en Buenos Aires, no en UTC", () => {
    // 02:00 UTC del 14 son las 23:00 del 13 en Buenos Aires.
    expect(previousDayInBuenosAires(new Date("2026-10-14T02:00:00Z"))).toBe("2026-10-12");
    // 06:00 UTC, la hora del cron: ya es el 14 en Buenos Aires.
    expect(previousDayInBuenosAires(new Date("2026-10-14T06:00:00Z"))).toBe("2026-10-13");
    expect(previousDayInBuenosAires(new Date("2026-03-01T12:00:00Z"))).toBe("2026-02-28");
  });

  it("siempre arma las 10 filas y anota los valores de reemplazo", () => {
    const { body, fallbacks } = buildMeasurements(
      { api_alcanzable: 1, perfiles_completos: Number.NaN },
      { date: "2026-10-13", env: "dev", runId: "r" },
    );

    expect(body.map((row) => row.kpi_id)).toEqual(KPIS.map((kpi) => kpi.id));
    expect(fallbacks).toHaveLength(9);
    expect(fallbacks).toContain("perfiles_completos");
    expect(valueOf(body, "api_alcanzable")).toBe(1);
    expect(valueOf(body, "latencia_p95")).toBe(10_000);
    expect(valueOf(body, "busquedas_fallidas")).toBe(5);
    expect(body.every((row) => typeof row.value === "number")).toBe(true);
  });

  it("el catálogo tiene 10 KPIs con ids, kinds y agregaciones válidos", () => {
    expect(KPIS).toHaveLength(10);
    expect(new Set(KPIS.map((kpi) => kpi.id)).size).toBe(10);
    for (const kpi of KPIS) {
      expect(kpi.id).toMatch(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/);
      expect(kpi.unit).toMatch(/^\S+$/);
      expect(kpi.description.length).toBeGreaterThanOrEqual(5);
      expect(kpi.description.length).toBeLessThanOrEqual(500);
    }
    expect(SEARCHES).toHaveLength(5);
  });
});

// =====================================================================
// Configuración
// =====================================================================

describe("readReportConfig", () => {
  const ENV = {
    KPI_ENV: "dev",
    KPI_API_URL: "https://plataforma-dev.supabase.co/",
    KPI_SUPABASE_PUBLISHABLE_KEY: "p",
    KPI_PROJECT_KEY: "k",
    NEXT_PUBLIC_SUPABASE_URL: "https://nuestro.supabase.co/",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
    KPI_REPORTER_EMAIL: "r@example.com",
    KPI_REPORTER_PASSWORD: "x",
    KPI_APP_URL: "https://app.vercel.app",
  };
  const NOW = new Date("2026-10-14T06:00:00Z");

  it("arma la config con el día anterior y las URLs sin barra final", () => {
    const config = readReportConfig(ENV, NOW);
    expect(config.date).toBe("2026-10-13");
    expect(config.apiUrl).toBe("https://plataforma-dev.supabase.co");
    expect(config.supabaseUrl).toBe("https://nuestro.supabase.co");
  });

  it("falla si falta una variable", () => {
    expect(() => readReportConfig({ ...ENV, KPI_PROJECT_KEY: "" }, NOW)).toThrow(/KPI_PROJECT_KEY/);
  });

  it("no tiene una URL de la cátedra por defecto: cada ambiente tiene la suya", () => {
    expect(() => readReportConfig({ ...ENV, KPI_API_URL: undefined }, NOW)).toThrow(/KPI_API_URL/);
  });

  it("rechaza un env que no existe", () => {
    expect(() => readReportConfig({ ...ENV, KPI_ENV: "staging" }, NOW)).toThrow(ConfigError);
  });

  it("no deja confundir nuestra base con la de la cátedra", () => {
    expect(() =>
      readReportConfig({ ...ENV, KPI_API_URL: "https://nuestro.supabase.co" }, NOW),
    ).toThrow(/mismo proyecto/);
  });

  it("no reporta a prod midiendo el stack local", () => {
    expect(() =>
      readReportConfig({ ...ENV, KPI_ENV: "prod", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" }, NOW),
    ).toThrow(/prod/);
  });

  it("acepta KPI_DATE y rechaza una fecha futura", () => {
    expect(readReportConfig({ ...ENV, KPI_DATE: "2026-10-01" }, NOW).date).toBe("2026-10-01");
    expect(() => readReportConfig({ ...ENV, KPI_DATE: "2026-10-15" }, NOW)).toThrow(/futura/);
    expect(() => readReportConfig({ ...ENV, KPI_DATE: "13/10/2026" }, NOW)).toThrow(/YYYY-MM-DD/);
  });

  it.each(["2026-02-30", "2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10"])(
    "rechaza %s, que tiene la forma pero no existe",
    (date) => {
      expect(() => readReportConfig({ ...ENV, KPI_DATE: date }, NOW)).toThrow(/YYYY-MM-DD/);
    },
  );

  it("acepta un 29 de febrero de un año bisiesto", () => {
    const later = new Date("2028-03-05T12:00:00Z");
    expect(readReportConfig({ ...ENV, KPI_DATE: "2028-02-29" }, later).date).toBe("2028-02-29");
  });
});

// =====================================================================
// Envío
// =====================================================================

describe("sendMeasurements", () => {
  const BODY = buildMeasurements({}, { date: "2026-10-13", env: "dev", runId: "r" }).body;

  it("manda un solo request con el contrato de la plataforma", async () => {
    const fake = fakeFetch();
    const d = deps(fake.impl, fakeDb().db);

    const result = await sendMeasurements(CONFIG, BODY, d);

    expect(result).toMatchObject({ ok: true, status: 201, attempts: 1 });
    const [call] = fake.measurementCalls();
    expect(call.url).toBe(`${PLATFORM}/rest/v1/measurement?on_conflict=project_id,kpi_id,date,env`);
    expect(call.init?.method).toBe("POST");
    expect(call.init?.headers).toMatchObject({
      apikey: "publishable-de-prueba",
      "X-Project-Key": "project-de-prueba",
      Prefer: "resolution=ignore-duplicates",
      "Content-Type": "application/json",
    });
    expect(sentBody(call)).toHaveLength(10);
  });

  it.each([
    [401, /no pertenece a este ambiente/],
    [403, /inválida, fue revocada/],
    [409, /no está en el catálogo/],
  ])("ante %i termina en error con 1 solo intento", async (status, reason) => {
    const fake = fakeFetch({ measurement: () => new Response("{}", { status }) });
    const d = deps(fake.impl, fakeDb().db);

    const result = await sendMeasurements(CONFIG, BODY, d);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(status);
    expect(result.attempts).toBe(1);
    expect(result.detail).toMatch(reason);
    expect(fake.measurementCalls()).toHaveLength(1);
    expect(d.sleeps).toEqual([]);
  });

  it("ante una falla de red persistente hace 4 intentos con espera creciente", async () => {
    const fake = fakeFetch({
      measurement: () => {
        throw new TypeError("fetch failed");
      },
    });
    const d = deps(fake.impl, fakeDb().db);

    const result = await sendMeasurements(CONFIG, BODY, d);

    expect(result).toMatchObject({ ok: false, status: null, attempts: 4 });
    expect(fake.measurementCalls()).toHaveLength(4);
    expect(d.sleeps).toEqual([1000, 2000, 4000]);
  });

  it("ante un 5xx reintenta y se recupera", async () => {
    let n = 0;
    const fake = fakeFetch({
      measurement: () => new Response(null, { status: n++ === 0 ? 503 : 201 }),
    });

    const result = await sendMeasurements(CONFIG, BODY, deps(fake.impl, fakeDb().db));

    expect(result).toMatchObject({ ok: true, status: 201, attempts: 2 });
  });
});

// =====================================================================
// Ejecución completa
// =====================================================================

describe("runReport", () => {
  it("mide los 10 KPIs, los manda y guarda la copia", async () => {
    const fake = fakeFetch();
    const { db, copies } = fakeDb();

    const code = await runReport(CONFIG, deps(fake.impl, db));

    expect(code).toBe(0);
    const body = sentBody(fake.measurementCalls()[0]);
    expect(body).toHaveLength(10);
    expect(new Set(body.map((row) => row.run_id)).size).toBe(1);
    expect(body.every((row) => row.date === "2026-10-13" && row.env === "dev")).toBe(true);
    expect(valueOf(body, "tasa_conexion_jugador_club")).toBe(37.5);
    expect(valueOf(body, "perfiles_completos")).toBe(6);
    expect(valueOf(body, "tasa_contactos_exitosos")).toBe(0);
    expect(valueOf(body, "errores_5xx")).toBe(1);
    expect(valueOf(body, "latencia_p95")).toBe(10);
    expect(valueOf(body, "latencia_busqueda")).toBe(10);
    expect(valueOf(body, "busquedas_fallidas")).toBe(0);
    expect(valueOf(body, "api_alcanzable")).toBe(1);
    expect(valueOf(body, "db_alcanzable")).toBe(1);
    expect(valueOf(body, "auth_alcanzable")).toBe(1);

    expect(copies).toHaveLength(1);
    expect(copies[0]).toEqual({
      run_id: body[0].run_id,
      env: "dev",
      kpi_date: "2026-10-13",
      payload: body,
      response_status: 201,
      attempts: 1,
      fallbacks: [],
    });
  });

  it("con la API caída, api_alcanzable vale 0 y se envían los 10", async () => {
    const fake = fakeFetch({
      health: () => {
        throw new TypeError("connect ECONNREFUSED");
      },
    });

    const code = await runReport(CONFIG, deps(fake.impl, fakeDb().db));

    expect(code).toBe(0);
    const body = sentBody(fake.measurementCalls()[0]);
    expect(body).toHaveLength(10);
    expect(valueOf(body, "api_alcanzable")).toBe(0);
  });

  it("un health que no responde 200 también es 0", async () => {
    const fake = fakeFetch({ health: () => new Response(null, { status: 503 }) });

    await runReport(CONFIG, deps(fake.impl, fakeDb().db));

    expect(valueOf(sentBody(fake.measurementCalls()[0]), "api_alcanzable")).toBe(0);
  });

  it("con el endpoint de lectura sin responder, latencia_p95 vale 10000", async () => {
    const fake = fakeFetch();
    const { db } = fakeDb({
      read: async () => {
        throw new Error("timeout");
      },
    });

    await runReport(CONFIG, deps(fake.impl, db));

    expect(valueOf(sentBody(fake.measurementCalls()[0]), "latencia_p95")).toBe(REQUEST_TIMEOUT_MS);
  });

  it("cuenta las búsquedas fallidas y las mide como timeout", async () => {
    const fake = fakeFetch();
    const { db } = fakeDb({
      search: async (search) => {
        if (search.position === "arquero" || search.position === null) throw new Error("x");
      },
    });

    await runReport(CONFIG, deps(fake.impl, db));

    const body = sentBody(fake.measurementCalls()[0]);
    expect(valueOf(body, "busquedas_fallidas")).toBe(2);
    expect(valueOf(body, "latencia_busqueda")).toBe(REQUEST_TIMEOUT_MS);
  });

  it("repite el set de búsquedas en 4 rondas: 20 muestras", async () => {
    const fake = fakeFetch();
    const calls: string[] = [];
    const { db } = fakeDb({
      search: async (search) => {
        calls.push(`${search.position}/${search.radiusKm}`);
      },
    });

    await runReport(CONFIG, deps(fake.impl, db));

    expect(calls).toHaveLength(SEARCHES.length * SEARCH_ROUNDS);
    // Por rondas: la segunda vuelta arranca después de la quinta búsqueda.
    expect(calls.slice(0, 5)).toEqual(calls.slice(5, 10));
  });

  it("una búsqueda lenta una sola vez no define el p95, pero su combinación cuenta como fallida", async () => {
    const fake = fakeFetch();
    let arqueros = 0;
    const { db } = fakeDb({
      search: async (search) => {
        if (search.position === "arquero" && arqueros++ === 0) throw new Error("timeout");
      },
    });

    await runReport(CONFIG, deps(fake.impl, db));

    const body = sentBody(fake.measurementCalls()[0]);
    // 1 timeout en 20 muestras: el p95 (muestra 19 de 20) no es el máximo.
    expect(valueOf(body, "latencia_busqueda")).toBe(10);
    expect(valueOf(body, "busquedas_fallidas")).toBe(1);
  });

  it("con una base sin jugadores, tasa_conexion_jugador_club vale 0", async () => {
    const fake = fakeFetch();
    const { db } = fakeDb({
      counts: async () => ({ ...COUNTS, players_registered: 0, players_following: 0 }),
    });

    await runReport(CONFIG, deps(fake.impl, db));

    expect(valueOf(sentBody(fake.measurementCalls()[0]), "tasa_conexion_jugador_club")).toBe(0);
  });

  it("sin conexión a la base manda los 10 con reemplazo, pero termina en error porque no hay copia", async () => {
    const fake = fakeFetch();
    const d = deps(fake.impl, new Error("Invalid login credentials"));

    const code = await runReport(CONFIG, d);

    expect(code).toBe(1);
    const body = sentBody(fake.measurementCalls()[0]);
    expect(body).toHaveLength(10);
    expect(valueOf(body, "db_alcanzable")).toBe(0);
    expect(valueOf(body, "latencia_p95")).toBe(10_000);
    expect(valueOf(body, "busquedas_fallidas")).toBe(5);
    expect(d.lines.join("\n")).toMatch(/No se pudo guardar la copia/);
  });

  it("si fallan los conteos, los 4 KPIs de la base van con reemplazo y anotados", async () => {
    const fake = fakeFetch();
    const { db, copies } = fakeDb({
      counts: async () => {
        throw new Error("boom");
      },
    });

    expect(await runReport(CONFIG, deps(fake.impl, db))).toBe(0);
    expect(copies[0].fallbacks).toEqual([
      "tasa_conexion_jugador_club",
      "perfiles_completos",
      "tasa_contactos_exitosos",
      "errores_5xx",
    ]);
  });

  it("un rechazo de la plataforma termina en error y la copia guarda el código", async () => {
    const fake = fakeFetch({ measurement: () => new Response("{}", { status: 409 }) });
    const { db, copies } = fakeDb();

    const code = await runReport(CONFIG, deps(fake.impl, db));

    expect(code).toBe(1);
    expect(fake.measurementCalls()).toHaveLength(1);
    expect(copies[0]).toMatchObject({ response_status: 409, attempts: 1 });
  });

  it("si no se puede guardar la copia, termina en error", async () => {
    const fake = fakeFetch();
    const { db } = fakeDb({
      saveCopy: async () => {
        throw new Error("42501");
      },
    });

    expect(await runReport(CONFIG, deps(fake.impl, db))).toBe(1);
  });

  it("cada ejecución usa un run_id nuevo", async () => {
    const fake = fakeFetch();
    const { db, copies } = fakeDb();

    await runReport(CONFIG, deps(fake.impl, db));
    await runReport(CONFIG, deps(fake.impl, db));

    expect(copies[0].run_id).not.toBe(copies[1].run_id);
  });
});

// =====================================================================
// Catálogo
// =====================================================================

/** Plataforma falsa con estado: lo que se da de alta queda en `rows`. */
function fakeCatalog(options: { env?: string; rows?: Record<string, unknown>[] } = {}) {
  const rows: Record<string, unknown>[] = options.rows ?? [];
  const calls: { method: string; url: string; body?: unknown }[] = [];

  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, body });

    if (url.endsWith("/rest/v1/rpc/current_project")) {
      return Response.json([{ team_number: 1, name: "FutTracker", env: options.env ?? "dev" }]);
    }
    if (url.includes("/rest/v1/kpi_catalog") && method === "GET") {
      return Response.json(rows);
    }
    if (url.endsWith("/rest/v1/kpi_catalog") && method === "POST") {
      for (const row of body) rows.push({ ...row, deprecated_at: null });
      return new Response(null, { status: 201 });
    }
    if (url.includes("/rest/v1/kpi_catalog?id=eq.") && method === "PATCH") {
      const id = url.split("id=eq.")[1];
      Object.assign(rows.find((row) => row.id === id)!, body);
      return new Response(null, { status: 204 });
    }
    throw new Error(`fetch inesperado: ${method} ${url}`);
  });

  return { impl: impl as unknown as typeof fetch, rows, calls };
}

describe("syncCatalog", () => {
  const log = () => {};

  it("dos corridas seguidas dejan exactamente 10 KPIs activos, cada uno con su agregación", async () => {
    const fake = fakeCatalog();

    expect(await syncCatalog(CONFIG, { fetch: fake.impl, log })).toBe(0);
    expect(await syncCatalog(CONFIG, { fetch: fake.impl, log })).toBe(0);

    const active = fake.rows.filter((row) => row.deprecated_at === null);
    expect(active).toHaveLength(10);
    for (const kpi of KPIS) {
      expect(active.find((row) => row.id === kpi.id)).toMatchObject({ aggregation: kpi.aggregation });
    }
    // Un solo alta en total: la segunda corrida no escribe nada.
    const writes = fake.calls.filter((c) => c.url.includes("/kpi_catalog") && c.method !== "GET");
    expect(writes).toHaveLength(1);
  });

  it("corrige la descripción, la agregación y el retiro de uno existente", async () => {
    const kpi = KPIS[0];
    const fake = fakeCatalog({
      rows: [
        { id: kpi.id, kind: kpi.kind, unit: kpi.unit, description: "vieja", aggregation: null, deprecated_at: "2026-10-01" },
      ],
    });

    expect(await syncCatalog(CONFIG, { fetch: fake.impl, log })).toBe(0);

    const patch = fake.calls.find((c) => c.method === "PATCH");
    expect(patch?.url).toBe(`${PLATFORM}/rest/v1/kpi_catalog?id=eq.${kpi.id}`);
    expect(patch?.body).toEqual({ description: kpi.description, aggregation: kpi.aggregation, deprecated_at: null });
  });

  it("no edita un KPI que cambió de unidad: es un KPI nuevo", async () => {
    const kpi = KPIS[3];
    const fake = fakeCatalog({
      rows: [{ id: kpi.id, kind: kpi.kind, unit: "s", description: kpi.description, aggregation: kpi.aggregation, deprecated_at: null }],
    });

    expect(await syncCatalog(CONFIG, { fetch: fake.impl, log })).toBe(1);
    const writes = fake.calls.filter((c) => c.url.includes("/kpi_catalog") && c.method !== "GET");
    expect(writes).toEqual([]);
  });

  it("no toca nada si la clave es de otro ambiente", async () => {
    const fake = fakeCatalog({ env: "prod" });

    expect(await syncCatalog(CONFIG, { fetch: fake.impl, log })).toBe(1);
    expect(fake.calls).toHaveLength(1);
  });
});
