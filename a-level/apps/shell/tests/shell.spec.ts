import { expect, test } from "@playwright/test";

test("launches the first container sim through the learner shell", async ({ page }) => {
  await page.goto("/#a-level/physics/scalars-and-vectors");

  await expect(page.getByRole("heading", { name: "Scalars and Vectors" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Concept containers" })).toContainText(
    "Physics / H2",
  );
  await expect(page.getByRole("heading", { name: "Knowledge graph" })).toBeVisible();
  await expect(page.getByText("Prerequisite: Physical Quantities and Units")).toBeVisible();
  await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
  await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);

  await page.getByLabel("7.1 m").check();
  await page
    .getByLabel("Rationale")
    .fill("The arrows are perpendicular, so I expect a right-triangle resultant.");
  await page.getByRole("button", { name: "Commit prediction" }).click();

  await expect(page.getByLabel("Observation unlocked")).toBeVisible();
  await expect(page.getByText("Geometric resultant")).toBeVisible();
  await expect(page.getByLabel("Formula used")).toContainText("|R| = √(A² + B² + 2AB cos θ)");

  await page.getByRole("button", { name: "Reset prediction" }).click();
  await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
});

test("navigates the generated mini knowledge graph", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Physical Quantities and Units" })).toBeVisible();
  await expect(page.getByText("3 container ready")).toBeVisible();
  await expect(page.getByRole("heading", { name: "First principles" })).toBeVisible();
  await expect(page.getByText("A physical quantity is something about the world")).toBeVisible();
  await expect(page.getByText("Name the quantity")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quantity Map Lab" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
  await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
  await expect(page.getByText("Next: Scalars and Vectors")).toBeVisible();

  await page
    .getByRole("navigation", { name: "Concept containers" })
    .getByRole("link", { name: /Resolving Vectors/ })
    .click();
  await expect(page.getByRole("heading", { name: "Resolving Vectors" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Component Resolution Explorer" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
});

test("searches modules and keeps local mastery progress", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Mastery map" })).toBeVisible();
  await page.getByLabel("Search curriculum").fill("base quantity");

  const conceptNav = page.getByRole("navigation", { name: "Concept containers" });
  await expect(conceptNav).toContainText("Physical Quantities and Units");
  await expect(conceptNav).not.toContainText("Resolving Vectors");

  await page.getByLabel("Search curriculum").fill("");
  await page.getByRole("button", { name: "Foundations of Physics" }).click();
  await expect(page.getByText("3 of 3 containers")).toBeVisible();

  await page
    .getByLabel("Physical Quantities and Units mastery")
    .getByRole("button", { name: "Mastered" })
    .click();
  await expect(page.getByText("1/3 mastered")).toBeVisible();

  await page.reload();
  await expect(page.getByText("1/3 mastered")).toBeVisible();
});
