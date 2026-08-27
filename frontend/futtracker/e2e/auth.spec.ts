import { test, expect } from "@playwright/test";

// Estos specs cubren lo verificable sin una sesión real de Supabase (no hay
// stack local levantado en CI todavía): tabs, validación de cliente y
// render de las pantallas de recuperación. Los caminos que sí llaman a
// Supabase Auth (alta, login, reset real) quedan para cuando T03a esté
// mergeado y haya un proyecto de pruebas disponible en el pipeline.

test.describe("pantalla de login", () => {
  test("arranca en la solapa Entrar y cambia a Crear cuenta", async ({
    page,
  }) => {
    await page.goto("/login");

    const signInTab = page.getByRole("tab", { name: "Entrar" });
    const signUpTab = page.getByRole("tab", { name: "Crear cuenta" });

    await expect(signInTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Email")).toBeVisible();

    await signUpTab.click();

    await expect(signUpTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Nombre completo")).toBeVisible();
  });

  test("?tab=crear-cuenta arranca directo en Crear cuenta", async ({
    page,
  }) => {
    await page.goto("/login?tab=crear-cuenta");
    await expect(
      page.getByRole("tab", { name: "Crear cuenta" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("rechaza el alta si las contraseñas no coinciden, sin request", async ({
    page,
  }) => {
    await page.goto("/login?tab=crear-cuenta");

    await page.getByLabel("Como jugador").check();
    await page.getByLabel("Nombre completo").fill("Jugador de Prueba");
    await page.getByLabel("Email").fill("prueba@futtracker.test");
    await page.getByLabel("Contraseña *", { exact: true }).fill("Abcdefg1");
    await page.getByLabel("Confirmar contraseña").fill("Distinta1");
    await page.getByLabel(/Acepto los términos/).check();
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
  });

  test("exige aceptar los términos para dar de alta", async ({ page }) => {
    await page.goto("/login?tab=crear-cuenta");

    await page.getByLabel("Como jugador").check();
    await page.getByLabel("Nombre completo").fill("Jugador de Prueba");
    await page.getByLabel("Email").fill("prueba@futtracker.test");
    await page.getByLabel("Contraseña *", { exact: true }).fill("Abcdefg1");
    await page.getByLabel("Confirmar contraseña").fill("Abcdefg1");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(
      page.getByText("Tenés que aceptar los términos para continuar."),
    ).toBeVisible();
  });
});

test("la pantalla de recuperar clave pide el email", async ({ page }) => {
  await page.goto("/recuperar-clave");
  await expect(
    page.getByRole("heading", { name: "Recuperar contraseña" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});
