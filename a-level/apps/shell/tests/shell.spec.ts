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

  await expect(page.getByText(/\d+ concepts ready/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "First principles" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Concept containers" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Set up distribution" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Concept containers" })
    .getByRole("link", { name: /Resolving Vectors/ })
    .click();
  await expect(page.getByRole("heading", { name: "Resolving Vectors" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Component Resolution Explorer" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
  await page.getByLabel("8.7 N").check();
  await page
    .getByLabel("Rationale")
    .fill("The horizontal component is adjacent to the angle, so cosine applies.");
  await page.getByRole("button", { name: "Commit prediction" }).click();
  await expect(page.getByLabel("Observation unlocked")).toBeVisible();
  await expect(page.getByLabel("Formula used")).toContainText("Fx = F cos θ");
});

test("reveals the kinematics route from generated catalogue data", async ({ page }) => {
  await page.goto("/#a-level/physics/kinematics-in-one-dimension");

  await expect(page.getByRole("heading", { name: "Kinematics in One Dimension" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Motion Equations Lab" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
  await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);

  await page.getByLabel("9.0 m").check();
  await page
    .getByLabel("Rationale")
    .fill("Starting from rest leaves only the acceleration term in the displacement equation.");
  await page.getByRole("button", { name: "Commit prediction" }).click();

  await expect(page.getByLabel("Observation unlocked")).toBeVisible();
  await expect(page.getByLabel("Formula used")).toContainText("s = ut + 1/2 at^2");
  await expect(page.getByLabel("Observation unlocked")).toContainText("9.00 m");
});

test("reveals the work-energy-power route from generated catalogue data", async ({ page }) => {
  await page.goto("/#a-level/physics/work-energy-power");

  await expect(page.getByRole("heading", { name: "Work, Energy, Power" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Energy Transfer Lab" })).toBeVisible();
  await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
  await expect(page.getByText("W = F s cos(theta)")).toHaveCount(0);

  await page.getByRole("button", { name: "Set up energy transfer" }).click();
  await page.getByRole("button", { name: "Reveal energy transfer" }).click();

  await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
  await page.getByLabel("30 J and 15 W").check();
  await page
    .getByLabel("Rationale")
    .fill("The force and displacement point in the same direction, so the full force does work.");
  await page.getByRole("button", { name: "Commit prediction" }).click();

  await expect(page.getByLabel("Observation unlocked")).toBeVisible();
  await expect(page.getByLabel("Formula used")).toContainText("W = F s cos(theta)");
  await expect(page.getByLabel("Observation unlocked")).toContainText("+30.00 J");
});

test("reveals the probability-statistics route from generated catalogue data", async ({ page }) => {
  await page.goto("/#a-level/mathematics/probability-statistics");

  await expect(page.getByRole("heading", { name: "Probability and Statistics" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Distribution and Decision Lab" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Prediction gate" })).toHaveCount(0);
  await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);

  await page.getByRole("button", { name: "Set up distribution" }).click();
  await page.getByRole("button", { name: "Reveal decision" }).click();

  await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
  await expect(page.getByLabel("Distribution readout")).toHaveCount(0);
  await expect(page.getByLabel("Formula used")).toHaveCount(0);
  await page.getByLabel("The expected score can stay close while the spread increases.").check();
  await page
    .getByLabel("Rationale")
    .fill("Changing the rare high outcome changes spread as well as the centre.");
  await page.getByRole("button", { name: "Commit prediction" }).click();

  await expect(page.getByLabel("Observation unlocked")).toBeVisible();
  await expect(page.getByLabel("Formula used")).toContainText("E(X)");
  await expect(page.getByLabel("Distribution readout")).toContainText("Reject H0");
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
  await expect(page.getByText(/\d+ of \d+ containers/)).toBeVisible();

  await page
    .getByLabel("Physical Quantities and Units mastery")
    .getByRole("button", { name: "Mastered" })
    .click();
  await expect(page.getByText(/1\/\d+ mastered/)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/1\/\d+ mastered/)).toBeVisible();
});
