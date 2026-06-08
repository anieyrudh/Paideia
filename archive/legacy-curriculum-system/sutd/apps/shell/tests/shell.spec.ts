import { expect, test } from "@playwright/test";

test("renders the first SUTD curriculum wrapper container", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "SUTD Learning Map" })).toBeVisible();
  await expect(page.getByRole("link", { name: "All curricula" })).toHaveAttribute("href", "../");
  const status = page.getByLabel("SUTD shell status");
  await expect(status.getByText("interactive concepts", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /EPD/ }).click();
  await expect(page.getByRole("heading", { name: "PID Step Response" })).toBeVisible();

  await page.getByRole("button", { name: /ESD/ }).click();
  await expect(page.getByRole("heading", { name: "Linear Programming Feasible Region" })).toBeVisible();

  await page.getByRole("button", { name: /ISTD\/CSD/ }).click();
  await expect(page.getByRole("heading", { name: "Graph Search and Shortest Paths" })).toBeVisible();

  await page.getByRole("button", { name: /Freshmore/ }).click();
  await expect(page.getByRole("heading", { name: "Vector Transformations" })).toBeVisible();

  await page.getByRole("button", { name: /DAI/ }).click();
  await expect(page.getByRole("heading", { name: "Trust Calibration" })).toBeVisible();

  await page.getByRole("button", { name: /ASD/ }).click();
  await expect(page.getByRole("heading", { name: "Load Path and Daylight Tradeoff" })).toBeVisible();

  await page.getByRole("button", { name: /SMT/ }).click();
  await expect(page.getByRole("heading", { name: "ODE Phase Portrait" })).toBeVisible();
});

test("links back to the all-curricula page", async ({ page }) => {
  await page.goto("/#sutd/epd/pid-step-response");

  await page.getByRole("link", { name: "All curricula" }).click();

  await expect(page).toHaveURL(/\/$/);
});

test("maps concept clusters across all SUTD pillars", async ({ page }) => {
  await page.goto("/");

  const pillars = page.getByRole("complementary", { name: "SUTD pillars" });
  await expect(pillars).toContainText("Freshmore");
  await expect(pillars).toContainText("EPD");
  await expect(pillars).toContainText("ESD");
  await expect(pillars).toContainText("ISTD/CSD");
  await expect(pillars).toContainText("ASD");
  await expect(pillars).toContainText("DAI");
  await expect(pillars).toContainText("SMT");

  await page.getByRole("button", { name: /ISTD\/CSD/ }).click();
  await expect(page.getByRole("heading", { name: "ISTD/CSD" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Graph Search and Shortest Paths/ })).toBeVisible();

  await page.getByRole("button", { name: /EPD/ }).click();
  await expect(page.getByRole("heading", { name: "EPD" })).toBeVisible();
  await expect(page.getByRole("link", { name: /PID Step Response/ })).toBeVisible();

  await page.getByRole("button", { name: /Freshmore/ }).click();
  await expect(page.getByRole("heading", { name: "Freshmore" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Vector Transformations/ })).toBeVisible();

  await page.getByRole("button", { name: /DAI/ }).click();
  await expect(page.getByRole("heading", { name: "DAI" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Trust Calibration/ })).toBeVisible();

  await page.getByRole("button", { name: /ASD/ }).click();
  await expect(page.getByRole("heading", { name: "ASD" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Load Path and Daylight Tradeoff/ })).toBeVisible();

  await page.getByRole("button", { name: /SMT/ }).click();
  await expect(page.getByRole("heading", { name: "SMT" })).toBeVisible();
  await expect(page.getByRole("link", { name: /ODE Phase Portrait/ })).toBeVisible();
});

test("searches SUTD concepts without exposing internal IDs", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /ISTD\/CSD/ }).click();
  await page.getByLabel("Search SUTD concepts").fill("graph");

  await expect(page.getByRole("link", { name: /Graph Search and Shortest Paths/ })).toBeVisible();
  await expect(page.getByText(/sutd\.[a-z0-9.-]+/)).toHaveCount(0);
});

test("default SUTD screen keeps learner copy free of internal terms", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "All curricula" })).toBeVisible();
  await expect(page.getByText(/generated graph/i)).toHaveCount(0);
  await expect(page.getByText(/queue/i)).toHaveCount(0);
  await expect(page.getByText(/sutd\.[a-z0-9.-]+/)).toHaveCount(0);
});

test("updates the container preview when the hash route changes in place", async ({ page }) => {
  await page.goto("/#sutd/esd/markov-chain-steady-state");

  await expect(page.getByRole("heading", { name: "Markov Chain Steady State" })).toBeVisible();
  await expect(page.getByRole("button", { name: /ESD/ })).toHaveAttribute("aria-pressed", "true");

  await page.evaluate(() => {
    window.location.hash = "#sutd/smt/fourier-mode-superposition";
  });

  await expect(page.getByRole("heading", { name: "Fourier Mode Superposition" })).toBeVisible();
  await expect(page.getByRole("button", { name: /SMT/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Markov Chain Steady State" })).toBeHidden();
});
