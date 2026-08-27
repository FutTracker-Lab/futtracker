import { test, expect } from "@playwright/test";

// Smoke test mínimo: no valida ninguna feature todavía (no hay ninguna),
// solo que el pipeline de e2e existe y corre contra un build real. Sirve de
// piso para T03b/T04b, que van a agregar los specs reales de auth y perfil.
test("la home carga y muestra el catálogo traducido, no la clave cruda", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "FutTracker" })).toBeVisible();
  await expect(page.getByText("home.title")).toHaveCount(0);
});
