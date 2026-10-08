import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  setVacancyStatus,
  vacancyErrorKey,
  vacancyInputSchema,
  VacancyError,
} from "@/lib/data/vacancies";
import type { Database } from "@/lib/supabase/database.types";

const VACANCY_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const TEAM_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

// Que la RLS devuelva 0 filas a quien no es dueño lo prueba T10a contra la base.
function updateClient(rows: unknown[], { userId = "user", team = { id: TEAM_ID } as unknown } = {}) {
  const eqs: [string, string][] = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    from: (table: string) =>
      table === "teams"
        ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: team, error: null }) }) }) }
        : {
            update: () => {
              const chain = {
                eq: (column: string, value: string) => {
                  eqs.push([column, value]);
                  return chain;
                },
                select: async () => ({ data: rows, error: null }),
              };
              return chain;
            },
          },
  };

  return { client: client as unknown as SupabaseClient<Database>, eqs };
}

describe("vacancyErrorKey", () => {
  it.each([
    [
      { code: "23505", message: 'duplicate key value violates unique constraint "vacancies_one_open_per_position"' },
      "duplicateOpenPosition",
    ],
    [{ code: "23514", message: "vacancy_fields_locked" }, "fieldsLocked"],
    [{ code: "42501", message: "new row violates row-level security policy" }, "forbidden"],
    [new VacancyError("forbidden"), "forbidden"],
    [{ code: "23505", message: "otro_constraint" }, "unexpected"],
    [new TypeError("fetch failed"), "unexpected"],
    [null, "unexpected"],
  ])("traduce %o a %s", (error, key) => {
    expect(vacancyErrorKey(error)).toBe(key);
  });
});

describe("setVacancyStatus", () => {
  it("con 0 filas actualizadas falla como forbidden", async () => {
    await expect(
      setVacancyStatus(updateClient([]).client, VACANCY_ID, "closed"),
    ).rejects.toEqual(new VacancyError("forbidden"));
  });

  it("filtra por el equipo de la sesión además del id", async () => {
    const row = { id: VACANCY_ID, team_id: TEAM_ID, status: "closed" };
    const { client, eqs } = updateClient([row]);

    await expect(setVacancyStatus(client, VACANCY_ID, "closed")).resolves.toEqual(row);
    expect(eqs).toEqual([
      ["id", VACANCY_ID],
      ["team_id", TEAM_ID],
    ]);
  });

  it("sin sesión ni equipo falla como forbidden sin escribir", async () => {
    const { client, eqs } = updateClient([], { userId: "", team: null });

    await expect(setVacancyStatus(client, VACANCY_ID, "open")).rejects.toEqual(
      new VacancyError("forbidden"),
    );
    expect(eqs).toEqual([]);
  });
});

describe("vacancyInputSchema", () => {
  const VALID = {
    position: "delantero",
    modality: "futbol_7",
    level: "recreativo",
    description: "Buscamos un 9 rápido",
  };

  it("acepta un input válido", () => {
    expect(vacancyInputSchema.parse(VALID)).toEqual(VALID);
  });

  it.each([
    ["position", "portero"],
    ["modality", "futbol_9"],
    ["level", "pro"],
    ["description", "a".repeat(281)],
    // Mismo largo que muestra el contador: se mide antes de recortar.
    ["description", `${"a".repeat(280)} `],
  ])("rechaza %s = %s", (field, value) => {
    expect(vacancyInputSchema.safeParse({ ...VALID, [field]: value }).success).toBe(false);
  });
});
