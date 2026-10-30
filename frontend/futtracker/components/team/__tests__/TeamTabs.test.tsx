// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import TeamTabs from "@/components/team/TeamTabs";
import type { ApplicationCountsResult } from "@/components/team/teamApplications";
import type { FollowerCountResult } from "@/components/team/teamFollowers";
import type { TeamVacanciesResult } from "@/components/team/teamVacancies";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function renderTabs(
  applicationCounts: ApplicationCountsResult,
  followerCount: FollowerCountResult = { ok: true, count: 0 },
) {
  const vacancies: TeamVacanciesResult = { ok: true, vacancies: [] };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <TeamTabs
        active="postulaciones"
        vacancies={Promise.resolve(vacancies)}
        applicationCounts={Promise.resolve(applicationCounts)}
        followerCount={Promise.resolve(followerCount)}
      />,
    ),
  );
}

function tabStartingWith(label: string) {
  return Array.from(container.querySelectorAll("a")).find((link) =>
    link.textContent?.startsWith(label),
  )!;
}

const applicationsTab = () => tabStartingWith("Postulaciones");

test("el badge de Postulaciones suma todas las vacantes", async () => {
  await renderTabs({ ok: true, counts: { v1: 2, v2: 0, v3: 3 } });

  expect(applicationsTab().textContent).toBe("Postulaciones(total: 5)");
  expect(applicationsTab().getAttribute("aria-current")).toBe("page");
});

test("si falla el conteo no muestra badge", async () => {
  await renderTabs({ ok: false });

  expect(applicationsTab().textContent).toBe("Postulaciones");
});

test("el badge de Seguidores usa el contador y la pestaña lleva a ?tab=seguidores", async () => {
  await renderTabs({ ok: true, counts: {} }, { ok: true, count: 1103 });

  expect(tabStartingWith("Seguidores").textContent).toBe("Seguidores(total: 1103)");
  expect(tabStartingWith("Seguidores").getAttribute("href")).toBe("/equipos/mi-equipo?tab=seguidores");
});

test("si fallan los seguidores la pestaña queda sin badge", async () => {
  await renderTabs({ ok: true, counts: {} }, { ok: false });

  expect(tabStartingWith("Seguidores").textContent).toBe("Seguidores");
});
