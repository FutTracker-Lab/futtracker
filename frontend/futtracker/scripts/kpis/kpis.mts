/**
 * Reporter diario de KPIs para la plataforma de LAB4 (T22, FUT-132).
 *
 *   node scripts/kpis/kpis.mts catalog   alta idempotente de los 10 KPIs (R4)
 *   node scripts/kpis/kpis.mts report    mide, envía y guarda la copia (R2)
 *
 * Lo corre el workflow `.github/workflows/kpi-report.yml`. En local, con las
 * claves en un `.env.kpi` gitignoreado (ver docs/kpis.md):
 *
 *   node --env-file=.env.local --env-file=.env.kpi scripts/kpis/kpis.mts report
 *
 * OJO, hay dos proyectos de Supabase en juego y no se mezclan:
 *
 *   NEXT_PUBLIC_SUPABASE_*  el nuestro: lo que se mide.
 *   KPI_*                   el de la cátedra: adonde se envía.
 *
 * Es un solo archivo a propósito: Node lo ejecuta directo (type stripping,
 * Node >= 22.18) sin sumar dependencias, y un import relativo entre `.mts`
 * obligaría a tocar el tsconfig de la app. Por eso tampoco hay enums ni
 * imports con el alias `@/`.
 */
import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";

import type { Database } from "../../lib/supabase/database.types";

// =====================================================================
// Definición de los KPIs
// =====================================================================

export const KPI_ENVS = ["dev", "qa", "prod"] as const;
export type KpiEnv = (typeof KPI_ENVS)[number];

type KpiDefinition = {
  id: string;
  kind: "business" | "technical" | "health";
  unit: string;
  aggregation: "sum" | "avg" | "min" | "max" | "last" | "count";
  name: string;
  description: string;
  source: string;
  justification: string;
  /** Lo que se envía si no se puede medir (R2.5). Nunca se omite un KPI. */
  fallback: number;
};

/** Tope de cada request medido: un timeout cuenta como esta latencia. */
export const REQUEST_TIMEOUT_MS = 10_000;
export const HEALTH_TIMEOUT_MS = 5_000;
export const LATENCY_SAMPLES = 20;
export const MAX_RETRIES = 3;

/**
 * El set fijo de búsquedas para `latencia_busqueda` y `busquedas_fallidas`.
 *
 * El ticket habla de "zona + posición", pero `search_players` no recibe zona:
 * toma el origen del equipo de quien busca. Cambiar de zona sería escribir el
 * equipo del reporter cinco veces por día. Se varía el radio, que es el otro
 * parámetro de la búsqueda, y el origen queda fijo en el equipo del reporter.
 */
export const SEARCHES = [
  { position: "arquero", radiusKm: 10 },
  { position: "defensor", radiusKm: 25 },
  { position: "mediocampista", radiusKm: 50 },
  { position: "delantero", radiusKm: 100 },
  { position: null, radiusKm: 200 },
] as const;

export type Search = (typeof SEARCHES)[number];

export const KPIS = [
  {
    id: "tasa_conexion_jugador_club",
    kind: "business",
    unit: "%",
    aggregation: "last",
    name: "Tasa de conexión jugador-club",
    description:
      "Porcentaje de jugadores registrados que siguen al menos a un club, acumulado al cierre del día.",
    source: "Base transaccional de FutTracker (team_follows, profiles)",
    justification:
      "Mide si los jugadores encuentran clubes que les interesan, que es la propuesta central de la plataforma.",
    fallback: 0,
  },
  {
    id: "perfiles_completos",
    kind: "business",
    unit: "{perfil}",
    aggregation: "last",
    name: "Perfiles completos",
    description:
      "Cantidad de jugadores con la ficha de jugador creada, acumulado al cierre del día.",
    source: "Base transaccional de FutTracker (players)",
    justification:
      "Sin ficha un jugador no aparece en las búsquedas: es la oferta real que ven los clubes.",
    fallback: 0,
  },
  {
    id: "tasa_contactos_exitosos",
    kind: "business",
    unit: "%",
    aggregation: "last",
    name: "Tasa de contactos exitosos",
    description:
      "Contactos jugador-equipo con al menos dos mensajes, uno de cada parte, sobre los contactos iniciados, acumulado.",
    source: "Base transaccional de FutTracker (mensajería directa)",
    justification:
      "Mide si los contactos que facilita la plataforma se convierten en conversaciones reales.",
    fallback: 0,
  },
  {
    id: "latencia_p95",
    kind: "technical",
    unit: "ms",
    aggregation: "avg",
    name: "Latencia p95 de lectura",
    description: `Percentil 95 de ${LATENCY_SAMPLES} lecturas del listado de equipos, medido al correr el reporter.`,
    source: "Reporter diario contra la API de datos de FutTracker",
    justification:
      "Una lectura lenta se nota en todas las pantallas: es el piso de la experiencia del usuario.",
    fallback: REQUEST_TIMEOUT_MS,
  },
  {
    id: "latencia_busqueda",
    kind: "technical",
    unit: "ms",
    aggregation: "avg",
    name: "Latencia p95 de búsqueda",
    description:
      "Percentil 95 del set fijo de 5 búsquedas de jugadores (posición y radio), medido al correr el reporter.",
    source: "Reporter diario contra search_players",
    justification:
      "La búsqueda de jugadores es la consulta más pesada y la que más usan los clubes.",
    fallback: REQUEST_TIMEOUT_MS,
  },
  {
    id: "errores_5xx",
    kind: "technical",
    unit: "{request}",
    aggregation: "sum",
    name: "Errores 5xx",
    description: "Respuestas 5xx de la API de FutTracker registradas durante el día.",
    source: "Tabla api_error_log de FutTracker",
    justification:
      "Cada 5xx es una operación que el usuario no pudo completar por una falla nuestra.",
    fallback: 0,
  },
  {
    id: "busquedas_fallidas",
    kind: "technical",
    unit: "{request}",
    aggregation: "sum",
    name: "Búsquedas fallidas",
    description: `Búsquedas del set fijo que terminaron con error o tardaron más de ${REQUEST_TIMEOUT_MS} ms.`,
    source: "Reporter diario contra search_players",
    justification:
      "Distingue una búsqueda lenta de una que directamente no responde.",
    fallback: SEARCHES.length,
  },
  {
    id: "api_alcanzable",
    kind: "health",
    unit: "1",
    aggregation: "avg",
    name: "API alcanzable",
    description: `1 si el health de la app responde 200 en menos de ${HEALTH_TIMEOUT_MS} ms; si no, 0.`,
    source: "Reporter diario contra /api/health",
    justification: "Detecta una caída del deploy de la app.",
    fallback: 0,
  },
  {
    id: "db_alcanzable",
    kind: "health",
    unit: "1",
    aggregation: "avg",
    name: "Base alcanzable",
    description: "1 si una consulta trivial a la base de FutTracker responde; si no, 0.",
    source: "Reporter diario contra la API de datos de FutTracker",
    justification: "Detecta una caída de la base, independiente de la app.",
    fallback: 0,
  },
  {
    id: "auth_alcanzable",
    kind: "health",
    unit: "1",
    aggregation: "avg",
    name: "Auth alcanzable",
    description: "1 si /auth/v1/health de Supabase responde 200; si no, 0.",
    source: "Reporter diario contra Supabase Auth",
    justification: "Sin Auth nadie puede iniciar sesión, aunque la app y la base anden.",
    fallback: 0,
  },
] as const satisfies readonly KpiDefinition[];

export type KpiId = (typeof KPIS)[number]["id"];
export type Measured = Partial<Record<KpiId, number>>;

export type MeasurementRow = {
  kpi_id: KpiId;
  date: string;
  env: KpiEnv;
  value: number;
  run_id: string;
};

// =====================================================================
// Cálculos
// =====================================================================

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Porcentaje con 2 decimales; 0 cuando no hay denominador. */
export function percent(part: number, total: number): number {
  return total > 0 ? round2((part / total) * 100) : 0;
}

/** Percentil 95 por rango más cercano, en ms enteros. */
export function p95(samples: readonly number[]): number {
  if (samples.length === 0) {
    throw new Error("p95 de una lista vacía");
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.ceil(0.95 * sorted.length);

  return Math.round(sorted[rank - 1]);
}

const BUENOS_AIRES = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha calendario (YYYY-MM-DD) en Buenos Aires. */
export function dateInBuenosAires(now: Date): string {
  return BUENOS_AIRES.format(now);
}

/** El día anterior en Buenos Aires: el `date` de cada medición (R2.2). */
export function previousDayInBuenosAires(now: Date): string {
  const today = new Date(`${dateInBuenosAires(now)}T00:00:00Z`);
  today.setUTCDate(today.getUTCDate() - 1);

  return today.toISOString().slice(0, 10);
}

/**
 * Las 10 filas en el orden del catálogo. Lo que no se midió viaja con su valor
 * de reemplazo y queda anotado en `fallbacks`.
 */
export function buildMeasurements(
  measured: Measured,
  run: { date: string; env: KpiEnv; runId: string },
): { body: MeasurementRow[]; fallbacks: KpiId[] } {
  const fallbacks: KpiId[] = [];

  const body = KPIS.map((kpi): MeasurementRow => {
    let value = measured[kpi.id];

    if (value === undefined || !Number.isFinite(value)) {
      fallbacks.push(kpi.id);
      value = kpi.fallback;
    }

    return {
      kpi_id: kpi.id,
      date: run.date,
      env: run.env,
      value,
      run_id: run.runId,
    };
  });

  return { body, fallbacks };
}

// =====================================================================
// Configuración
// =====================================================================

export type PlatformConfig = {
  env: KpiEnv;
  apiUrl: string;
  publishableKey: string;
  projectKey: string;
};

export type ReportConfig = PlatformConfig & {
  supabaseUrl: string;
  supabaseKey: string;
  reporterEmail: string;
  reporterPassword: string;
  appUrl: string;
  date: string;
};

type Env = Record<string, string | undefined>;

export class ConfigError extends Error {}

function required(env: Env, name: string): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new ConfigError(`Falta la variable ${name}.`);
  }

  return value;
}

function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function isLocal(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url);
}

export function readPlatformConfig(env: Env): PlatformConfig {
  const kpiEnv = required(env, "KPI_ENV");

  if (!(KPI_ENVS as readonly string[]).includes(kpiEnv)) {
    throw new ConfigError(`KPI_ENV tiene que ser dev, qa o prod (llegó "${kpiEnv}").`);
  }

  return {
    env: kpiEnv as KpiEnv,
    // Sin valor por defecto: la cátedra tiene un proyecto de Supabase por
    // ambiente, cada uno con su clave pública. Un default mandaría las
    // mediciones de prod a la plataforma de dev, que no cuenta para la nota.
    apiUrl: withoutTrailingSlash(required(env, "KPI_API_URL")),
    publishableKey: required(env, "KPI_SUPABASE_PUBLISHABLE_KEY"),
    projectKey: required(env, "KPI_PROJECT_KEY"),
  };
}

export function readReportConfig(env: Env, now: Date): ReportConfig {
  const platform = readPlatformConfig(env);
  const supabaseUrl = withoutTrailingSlash(required(env, "NEXT_PUBLIC_SUPABASE_URL"));
  const appUrl = withoutTrailingSlash(required(env, "KPI_APP_URL"));

  // La confusión que más cuesta: mandarle las mediciones a nuestra propia base,
  // o medir la de la cátedra.
  if (new URL(supabaseUrl).host === new URL(platform.apiUrl).host) {
    throw new ConfigError(
      "NEXT_PUBLIC_SUPABASE_URL y KPI_API_URL apuntan al mismo proyecto: la primera es la nuestra, la segunda la de la cátedra.",
    );
  }

  if (platform.env === "prod" && (isLocal(supabaseUrl) || isLocal(appUrl))) {
    throw new ConfigError("A prod solo se reporta midiendo producción, nunca el stack local.");
  }

  const date = env.KPI_DATE?.trim() || previousDayInBuenosAires(now);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new ConfigError(`KPI_DATE tiene que ser YYYY-MM-DD (llegó "${date}").`);
  }

  if (date > dateInBuenosAires(now)) {
    throw new ConfigError(`KPI_DATE no puede ser futura (llegó ${date}).`);
  }

  return {
    ...platform,
    supabaseUrl,
    supabaseKey: required(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    reporterEmail: required(env, "KPI_REPORTER_EMAIL"),
    reporterPassword: required(env, "KPI_REPORTER_PASSWORD"),
    appUrl,
    date,
  };
}

// =====================================================================
// Nuestra base, vista por el reporter
// =====================================================================

export type DailyCounts = {
  players_registered: number;
  players_following: number;
  complete_profiles: number;
  contacts_started: number;
  contacts_successful: number;
  errors_5xx: number;
};

export type RunCopy = {
  run_id: string;
  env: KpiEnv;
  kpi_date: string;
  payload: MeasurementRow[];
  response_status: number | null;
  attempts: number;
  fallbacks: KpiId[];
};

/** Lo que el reporter hace contra nuestra base. Los tests lo reemplazan. */
export interface ReporterDb {
  /** Consulta trivial: `db_alcanzable`. */
  ping(): Promise<boolean>;
  counts(date: string): Promise<DailyCounts>;
  /** Una lectura representativa, para `latencia_p95`. Tira si falla. */
  read(): Promise<void>;
  /** Una búsqueda del set fijo. Tira si falla. */
  search(search: Search): Promise<void>;
  saveCopy(copy: RunCopy): Promise<void>;
}

function fetchWithTimeout(fetchImpl: typeof fetch, timeoutMs: number): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;

    return fetchImpl(input, { ...init, signal });
  };
}

/**
 * Inicia sesión con la cuenta del reporter. Es una cuenta común, sin
 * `service_role`: lo que puede hacer de más se lo da la marca
 * `app_metadata.kpi_reporter` (ver la migración del reporter). Tira si no
 * puede iniciar sesión.
 */
export async function connectReporterDb(
  config: ReportConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ReporterDb> {
  const supabase = createClient<Database>(config.supabaseUrl, config.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout(fetchImpl, REQUEST_TIMEOUT_MS) },
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: config.reporterEmail,
    password: config.reporterPassword,
  });

  if (signInError) {
    throw new Error(`no se pudo iniciar sesión con la cuenta del reporter: ${signInError.message}`);
  }

  const readTeams = () =>
    supabase.from("teams").select("id, name, city, province").order("name").limit(20);

  return {
    async ping() {
      const { error } = await supabase.from("teams").select("id").limit(1);
      return !error;
    },
    async counts(date) {
      const { data, error } = await supabase.rpc("kpi_daily_counts", { p_date: date });
      const row = data?.[0];

      if (error || !row) {
        throw new Error(`kpi_daily_counts: ${error?.message ?? "sin filas"}`);
      }

      return row;
    },
    async read() {
      const { error } = await readTeams();
      if (error) throw new Error(error.message);
    },
    async search(search) {
      const { error } = await supabase.rpc("search_players", {
        p_radius_km: search.radiusKm,
        p_position: search.position ?? undefined,
        p_seeking_only: false,
      });
      if (error) throw new Error(error.message);
    },
    async saveCopy(copy) {
      const { error } = await supabase.from("kpi_report_runs").insert(copy);
      if (error) throw new Error(`${error.code}: ${error.message}`);
    },
  };
}

// =====================================================================
// Medición
// =====================================================================

export type Deps = {
  fetch: typeof fetch;
  /** Reloj monotónico en ms, para las latencias. */
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
  connectDb: (config: ReportConfig) => Promise<ReporterDb>;
};

/** Latencia de una operación; si falla o pasa el tope, cuenta como el tope. */
async function timed(
  now: () => number,
  operation: () => Promise<void>,
): Promise<{ ok: boolean; ms: number }> {
  const start = now();

  try {
    await operation();
  } catch {
    return { ok: false, ms: REQUEST_TIMEOUT_MS };
  }

  const ms = now() - start;

  return ms > REQUEST_TIMEOUT_MS ? { ok: false, ms: REQUEST_TIMEOUT_MS } : { ok: true, ms };
}

/** 1 si la URL responde 200 dentro del tope; 0 si no. Nunca tira. */
async function probe(
  deps: Deps,
  url: string,
  headers: Record<string, string> = {},
): Promise<number> {
  const start = deps.now();

  try {
    const response = await deps.fetch(url, {
      headers,
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    await response.arrayBuffer().catch(() => undefined);

    return response.status === 200 && deps.now() - start < HEALTH_TIMEOUT_MS ? 1 : 0;
  } catch {
    return 0;
  }
}

export async function measure(
  config: ReportConfig,
  deps: Deps,
): Promise<{ measured: Measured; db: ReporterDb | null }> {
  const measured: Measured = {};

  const [api, auth] = await Promise.all([
    probe(deps, `${config.appUrl}/api/health`),
    probe(deps, `${config.supabaseUrl}/auth/v1/health`, { apikey: config.supabaseKey }),
  ]);
  measured.api_alcanzable = api;
  measured.auth_alcanzable = auth;

  let db: ReporterDb;

  try {
    db = await deps.connectDb(config);
  } catch (error) {
    deps.log(`! Sin conexión a la base: ${message(error)}. Los KPIs que dependen de ella van con su valor de reemplazo.`);
    return { measured, db: null };
  }

  measured.db_alcanzable = (await db.ping().catch(() => false)) ? 1 : 0;

  try {
    const counts = await db.counts(config.date);
    measured.tasa_conexion_jugador_club = percent(counts.players_following, counts.players_registered);
    measured.perfiles_completos = counts.complete_profiles;
    measured.tasa_contactos_exitosos = percent(counts.contacts_successful, counts.contacts_started);
    measured.errores_5xx = counts.errors_5xx;
  } catch (error) {
    deps.log(`! No se pudieron leer los conteos: ${message(error)}.`);
  }

  // En serie: en paralelo se medirían entre sí.
  const reads: number[] = [];
  for (let i = 0; i < LATENCY_SAMPLES; i++) {
    reads.push((await timed(deps.now, () => db.read())).ms);
  }
  measured.latencia_p95 = p95(reads);

  const searches: number[] = [];
  let failed = 0;
  for (const search of SEARCHES) {
    const result = await timed(deps.now, () => db.search(search));
    searches.push(result.ms);
    if (!result.ok) failed++;
  }
  measured.latencia_busqueda = p95(searches);
  measured.busquedas_fallidas = failed;

  return { measured, db };
}

// =====================================================================
// Envío a la plataforma
// =====================================================================

function platformHeaders(config: PlatformConfig): Record<string, string> {
  return {
    apikey: config.publishableKey,
    "X-Project-Key": config.projectKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Lo que significa cada rechazo sin reintento (R2.7). */
const NOT_RETRYABLE: Record<number, string> = {
  400: "la plataforma rechazó la forma del lote",
  401: "la clave no pertenece a este ambiente (¿clave de dev con env prod?)",
  403: "la clave es inválida, fue revocada o el proyecto está inactivo",
  409: "hay un KPI que no está en el catálogo de este ambiente (correr `catalog`)",
};

export type SendResult = {
  ok: boolean;
  status: number | null;
  attempts: number;
  detail: string;
};

/**
 * Un solo request con los 10 valores (R2.3). Reintenta hasta 3 veces, con
 * espera creciente, solo ante falla de red o 5xx (R2.6); cualquier 4xx corta
 * en el primer intento (R2.7). Un reenvío del mismo día responde 201 y la
 * plataforma ignora los duplicados (R2.8).
 */
export async function sendMeasurements(
  config: PlatformConfig,
  body: MeasurementRow[],
  deps: Pick<Deps, "fetch" | "sleep" | "log">,
): Promise<SendResult> {
  const url = `${config.apiUrl}/rest/v1/measurement?on_conflict=project_id,kpi_id,date,env`;
  let status: number | null = null;
  let detail = "";

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    if (attempt > 1) {
      const wait = 1000 * 2 ** (attempt - 2);
      deps.log(`  reintento ${attempt - 1} de ${MAX_RETRIES} en ${wait} ms`);
      await deps.sleep(wait);
    }

    try {
      const response = await deps.fetch(url, {
        method: "POST",
        headers: { ...platformHeaders(config), Prefer: "resolution=ignore-duplicates" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      status = response.status;
      detail = (await response.text().catch(() => "")).slice(0, 500);

      if (response.ok) {
        return { ok: true, status, attempts: attempt, detail };
      }

      if (status < 500) {
        return {
          ok: false,
          status,
          attempts: attempt,
          detail: `${NOT_RETRYABLE[status] ?? "rechazo de la plataforma"}. ${detail}`.trim(),
        };
      }
    } catch (error) {
      status = null;
      detail = `falla de red: ${message(error)}`;
    }

    deps.log(`  intento ${attempt}: ${status ?? "sin respuesta"} ${detail}`.trimEnd());
  }

  return { ok: false, status, attempts: MAX_RETRIES + 1, detail };
}

// =====================================================================
// Comando `report`
// =====================================================================

/** Devuelve el exit code: 0 si la plataforma aceptó el lote y la copia quedó guardada. */
export async function runReport(config: ReportConfig, deps: Deps): Promise<number> {
  const runId = crypto.randomUUID();
  deps.log(`Reporte ${runId}: date ${config.date}, env ${config.env}`);

  const { measured, db } = await measure(config, deps);
  const { body, fallbacks } = buildMeasurements(measured, {
    date: config.date,
    env: config.env,
    runId,
  });

  for (const row of body) {
    const mark = fallbacks.includes(row.kpi_id) ? "  (sin medir: valor de reemplazo)" : "";
    deps.log(`  ${row.kpi_id.padEnd(28)} ${row.value}${mark}`);
  }

  const result = await sendMeasurements(config, body, deps);
  deps.log(
    result.ok
      ? `Plataforma: ${result.status} en ${result.attempts} intento(s).`
      : `X Plataforma: ${result.status ?? "sin respuesta"} tras ${result.attempts} intento(s): ${result.detail}`,
  );

  let copySaved = false;

  if (db) {
    try {
      await db.saveCopy({
        run_id: runId,
        env: config.env,
        kpi_date: config.date,
        payload: body,
        response_status: result.status,
        attempts: result.attempts,
        fallbacks,
      });
      copySaved = true;
      deps.log("Copia guardada en kpi_report_runs.");
    } catch (error) {
      deps.log(`X No se pudo guardar la copia: ${message(error)}`);
    }
  } else {
    deps.log("X No se pudo guardar la copia: no hay conexión con la base.");
  }

  return result.ok && copySaved ? 0 : 1;
}

// =====================================================================
// Comando `catalog` (R4)
// =====================================================================

type CatalogRow = {
  id: string;
  kind: string;
  unit: string;
  description: string;
  aggregation: string | null;
  deprecated_at: string | null;
};

async function platformJson(
  config: PlatformConfig,
  fetchImpl: typeof fetch,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const response = await fetchImpl(`${config.apiUrl}${path}`, {
    ...init,
    headers: { ...platformHeaders(config), ...(init.headers as Record<string, string>) },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();

  if (!response.ok) {
    const reason = NOT_RETRYABLE[response.status] ?? "error de la plataforma";
    throw new Error(`${init.method ?? "GET"} ${path}: ${response.status}, ${reason}. ${text.slice(0, 500)}`);
  }

  return text ? JSON.parse(text) : null;
}

/**
 * Deja los 10 KPIs dados de alta y al día. Correrlo dos veces no cambia nada:
 * da de alta los que faltan y corrige descripción, agregación o retiro de los
 * que difieren.
 *
 * La plataforma no deja editar `kind` ni `unit`, y un KPI no se renombra
 * (R4.3): si cambian, es un KPI nuevo y el script lo avisa en vez de pisarlo.
 */
export async function syncCatalog(
  config: PlatformConfig,
  deps: Pick<Deps, "fetch" | "log">,
): Promise<number> {
  const project = (await platformJson(config, deps.fetch, "/rest/v1/rpc/current_project", {
    method: "POST",
    body: "{}",
  })) as { name: string; env: string }[];

  if (!project[0]) {
    deps.log("X La plataforma no reconoce la clave (inválida o revocada).");
    return 1;
  }

  if (project[0].env !== config.env) {
    deps.log(`X La clave es de ${project[0].env} y KPI_ENV dice ${config.env}.`);
    return 1;
  }

  deps.log(`Catálogo de ${project[0].name} (${project[0].env})`);

  const existing = (await platformJson(
    config,
    deps.fetch,
    "/rest/v1/kpi_catalog?select=id,kind,unit,description,aggregation,deprecated_at&order=id.asc",
  )) as CatalogRow[];
  const byId = new Map(existing.map((row) => [row.id, row]));

  const conflicts = KPIS.filter((kpi) => {
    const row = byId.get(kpi.id);
    return row && (row.kind !== kpi.kind || row.unit !== kpi.unit);
  });

  if (conflicts.length > 0) {
    for (const kpi of conflicts) {
      deps.log(`X ${kpi.id} ya existe con otro kind o unit: es un KPI nuevo, no se edita.`);
    }
    return 1;
  }

  const missing = KPIS.filter((kpi) => !byId.has(kpi.id));

  if (missing.length > 0) {
    await platformJson(config, deps.fetch, "/rest/v1/kpi_catalog", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(
        missing.map((kpi) => ({
          id: kpi.id,
          kind: kpi.kind,
          unit: kpi.unit,
          description: kpi.description,
          name: kpi.name,
          source: kpi.source,
          aggregation: kpi.aggregation,
          justification: kpi.justification,
        })),
      ),
    });
    deps.log(`  alta: ${missing.map((kpi) => kpi.id).join(", ")}`);
  }

  for (const kpi of KPIS) {
    const row = byId.get(kpi.id);

    if (
      !row ||
      (row.description === kpi.description &&
        row.aggregation === kpi.aggregation &&
        row.deprecated_at === null)
    ) {
      continue;
    }

    await platformJson(config, deps.fetch, `/rest/v1/kpi_catalog?id=eq.${kpi.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        description: kpi.description,
        aggregation: kpi.aggregation,
        deprecated_at: null,
      }),
    });
    deps.log(`  actualizado: ${kpi.id}`);
  }

  const ours = new Set<string>(KPIS.map((kpi) => kpi.id));
  const strays = existing.filter((row) => !ours.has(row.id) && row.deprecated_at === null);

  for (const row of strays) {
    deps.log(`! ${row.id} está activo y no es de este script: retiralo con deprecated_at si no va más.`);
  }

  deps.log(`Listo: ${KPIS.length} KPIs del reporter al día.`);
  return 0;
}

// =====================================================================
// Entrada
// =====================================================================

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function main(command: string | undefined): Promise<number> {
  const log = (line: string) => console.log(line);

  try {
    if (command === "catalog") {
      return await syncCatalog(readPlatformConfig(process.env), { fetch, log });
    }

    if (command === "report") {
      const config = readReportConfig(process.env, new Date());
      return await runReport(config, {
        fetch,
        log,
        now: () => performance.now(),
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        connectDb: (cfg) => connectReporterDb(cfg),
      });
    }

    console.error("Uso: node scripts/kpis/kpis.mts <catalog|report>");
    return 2;
  } catch (error) {
    console.error(`X ${message(error)}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2]).then((code) => {
    process.exitCode = code;
  });
}
