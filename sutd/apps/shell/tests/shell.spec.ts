import { expect, test } from "@playwright/test";

test("renders the first SUTD curriculum wrapper container", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "SUTD curriculum wrapper substrate" })).toBeVisible();
  const status = page.getByLabel("SUTD shell status");
  await expect(status).toContainText("2");
  await expect(status.getByText("product containers wired", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /EPD/ }).click();
  await expect(page.getByRole("heading", { name: "PID Step Response" })).toBeVisible();

  await page.getByRole("button", { name: /ESD/ }).click();
  await expect(page.getByRole("heading", { name: "Linear Programming Feasible Region" })).toBeVisible();
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
  await expect(page.getByText("sutd.csd.graph-search-and-shortest-paths")).toBeVisible();

  await page.getByRole("button", { name: /EPD/ }).click();
  await expect(page.getByRole("heading", { name: "EPD" })).toBeVisible();
  await expect(page.getByText("sutd.epd.pid-step-response")).toBeVisible();
});
