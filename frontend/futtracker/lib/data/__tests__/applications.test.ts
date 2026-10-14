import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  countApplicationsByVacancy,
  listVacancyApplications,
} from "@/lib/data/applications";
import type { Database } from "@/lib/supabase/database.types";

const TEAM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const V1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const V2 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

// Que la RLS solo le muestre al dueño las de su equipo lo prueba T11a contra la base.
function queryClient(result: { data: unknown; error: unknown }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain = new Proxy(
    {},
    {
      get(_, method: string) {
        if (method === "then") {
          return (resolve: (value: unknown) => void) => resolve(result);
        }
        return (...args: unknown[]) => {
          calls.push({ method, args });
          return chain;
        };
      },
    },
  );
  const client = { from: (table: string) => (calls.push({ method: "from", args: [table] }), chain) };

  return { client: client as unknown as SupabaseClient<Database>, calls };
}

function applicationRow(overrides: { id: string; birth_date: string | null }) {
  return {
    id: overrides.id,
    vacancy_id: V1,
    player_id: `player-${overrides.id}`,
    created_at: "2026-10-08T10:00:00Z",
    vacancies: { id: V1, position: "mediocampista", status: "open", team_id: TEAM_ID },
    players: {
      birth_date: overrides.birth_date,
      position: "delantero",
      city: "Rosario",
      profiles: { full_name: "Juan Pérez", avatar_path: "player-1/avatar.png" },
    },
  };
}

describe("listVacancyApplications", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("aplana la fila con la edad calculada y sin birth_date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 8));
    const { client } = queryClient({
      data: [applicationRow({ id: "a1", birth_date: "2000-05-10" })],
      error: null,
    });

    const [row] = await listVacancyApplications(client, { teamId: TEAM_ID });

    expect(row).toEqual({
      id: "a1",
      vacancy_id: V1,
      vacancy: { position: "mediocampista", status: "open" },
      player_id: "player-a1",
      full_name: "Juan Pérez",
      avatar_path: "player-1/avatar.png",
      position: "delantero",
      city: "Rosario",
      age: 26,
      created_at: "2026-10-08T10:00:00Z",
    });
    expect(JSON.stringify(row)).not.toContain("birth_date");
  });

  it("sin fecha de nacimiento la edad queda en null", async () => {
    const { client } = queryClient({
      data: [applicationRow({ id: "a1", birth_date: null })],
      error: null,
    });

    const [row] = await listVacancyApplications(client, { teamId: TEAM_ID });

    expect(row.age).toBeNull();
  });

  it("filtra por equipo y ordena de la más reciente a la más vieja", async () => {
    const { client, calls } = queryClient({ data: [], error: null });

    await listVacancyApplications(client, { teamId: TEAM_ID });

    expect(calls).toContainEqual({ method: "eq", args: ["vacancies.team_id", TEAM_ID] });
    expect(calls).toContainEqual({ method: "order", args: ["created_at", { ascending: false }] });
    expect(calls.some((call) => call.args[0] === "vacancy_id")).toBe(false);
  });

  it("con vacancyId filtra también por la vacante", async () => {
    const { client, calls } = queryClient({ data: [], error: null });

    await listVacancyApplications(client, { teamId: TEAM_ID, vacancyId: V1 });

    expect(calls).toContainEqual({ method: "eq", args: ["vacancy_id", V1] });
  });

  it("propaga el error de la consulta", async () => {
    const error = { code: "PGRST000", message: "fetch failed" };
    const { client } = queryClient({ data: null, error });

    await expect(listVacancyApplications(client, { teamId: TEAM_ID })).rejects.toBe(error);
  });
});

describe("countApplicationsByVacancy", () => {
  it("devuelve la cantidad por vacante, con 0 en las que no tienen", async () => {
    const { client, calls } = queryClient({
      data: [
        { id: V1, vacancy_applications: [{ count: 2 }] },
        { id: V2, vacancy_applications: [{ count: 0 }] },
      ],
      error: null,
    });

    await expect(countApplicationsByVacancy(client, TEAM_ID)).resolves.toEqual({
      [V1]: 2,
      [V2]: 0,
    });
    expect(calls).toContainEqual({ method: "eq", args: ["team_id", TEAM_ID] });
  });

  it("propaga el error de la consulta", async () => {
    const error = { code: "PGRST000", message: "fetch failed" };
    const { client } = queryClient({ data: null, error });

    await expect(countApplicationsByVacancy(client, TEAM_ID)).rejects.toBe(error);
  });
});
