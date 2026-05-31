import { expect, test, type Page } from "@playwright/test";

const commitCheckpoint = async (page: Page, rationale: string) => {
  const checkpoint = page.getByRole("form", { name: "Prediction checkpoint" });
  await checkpoint.locator("input[type='radio']").first().check();
  await checkpoint.getByLabel("Rationale").fill(rationale);
  await checkpoint.getByRole("button", { name: "Commit prediction" }).click();
};

test("launches the first concept sim through the learner shell", async ({ page }) => {
  await page.goto("/#a-level/physics/scalars-and-vectors");

  await expect(page.getByRole("heading", { name: "Scalars and Vectors" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Concept labs" })).toContainText(
    "Physics / H2",
  );
  await expect(page.getByRole("heading", { name: "Knowledge graph" })).toBeVisible();
  await expect(page.getByText("Prerequisite: Physical Quantities and Units")).toBeVisible();
  await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
  await expect(page.getByLabel("Observation unlocked")).toBeVisible();

  await commitCheckpoint(
    page,
    "The arrows are perpendicular, so I expect a right-triangle resultant.",
  );

  await expect(page.getByLabel("Observation unlocked")).toBeVisible();
  await expect(page.getByText("Geometric resultant")).toBeVisible();
  await expect(page.getByLabel("Formula used")).toContainText("Substitution: |R|");

  await page.getByRole("button", { name: "Reset prediction" }).click();
  await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
});

test("navigates the mini knowledge graph", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/\d+ concepts ready/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "First principles" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Concept labs" })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Concept labs" })
      .getByRole("link", { name: /^Probability and Statistics Probability and Statistics \/ H2$/ }),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Concept labs" })
    .getByRole("link", { name: /Resolving Vectors/ })
    .click();
  await expect(page.getByRole("heading", { name: "Resolving Vectors" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Component Resolution Explorer" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
  await commitCheckpoint(page, "The horizontal component is adjacent to the angle, so cosine applies.");
  await expect(page.getByLabel("Observation unlocked")).toBeVisible();
  await expect(page.getByLabel("Formula used")).toContainText("Substitution: Fx");
});

test("reveals the kinematics route from catalogue data", async ({ page }) => {
  await page.goto("/#a-level/physics/kinematics-in-one-dimension");

  await expect(page.getByRole("heading", { name: "Kinematics in One Dimension" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Motion Equations Lab" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
  await expect(page.getByLabel("Observation unlocked")).toBeVisible();

  await commitCheckpoint(
    page,
    "Starting from rest leaves only the acceleration term in the displacement equation.",
  );

  await expect(page.getByLabel("Observation unlocked")).toBeVisible();
  await expect(page.getByLabel("Formula used")).toContainText("Substitution: s");
  await expect(page.getByLabel("Observation unlocked")).toContainText("9.00 m");
});

test("reveals the work-energy-power route from catalogue data", async ({ page }) => {
  await page.goto("/#a-level/physics/work-energy-power");

  await expect(page.getByRole("heading", { name: "Work, Energy, Power" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Energy Transfer Lab" })).toBeVisible();

  const setupButton = page.getByRole("button", { name: "Set up energy transfer" });
    if ((await setupButton.count()) > 0) {
      await setupButton.first().click();
    }
  await page.getByRole("button", { name: "Reveal energy transfer" }).click();
  await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

  await commitCheckpoint(
    page,
    "The force and displacement point in the same direction, so the full force does work.",
  );

  await expect(page.getByLabel("Observation unlocked")).toBeVisible();
  await expect(page.getByLabel("Formula used")).toContainText("W = F s cos(theta)");
  await expect(page.getByLabel("Observation unlocked")).toContainText("+30.00 J");
});

test("keeps the active thermal concept when topbar lab links scroll", async ({ page }) => {
  await page.goto("/#a-level%2Fphysics%2Fthermal-physics");

  await expect(page.getByRole("heading", { name: "Thermal Physics" })).toBeVisible();
  await expect(page.getByRole("link", { name: "All curricula" })).toHaveAttribute("href", "../");
  await page.getByRole("link", { name: "Start lab" }).click();

  await expect(page).toHaveURL(/#a-level%2Fphysics%2Fthermal-physics$/);
  await expect(page.getByRole("heading", { name: "Thermal Physics" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gas Law and Energy Transfer Lab" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reveal thermal behaviour" })).toBeVisible();
});

test("links back to the all-curricula page", async ({ page }) => {
  await page.goto("/#a-level/physics/scalars-and-vectors");

  await page.getByRole("link", { name: "All curricula" }).click();

  await expect(page).toHaveURL(/\/$/);
});

test("reveals the probability-statistics route from catalogue data", async ({ page }) => {
  await page.goto("/#a-level/mathematics/probability-statistics");

  await expect(page.getByRole("heading", { name: "Probability and Statistics" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Distribution and Decision Lab" })).toBeVisible();

  const setupButton = page.getByRole("button", { name: "Set up distribution" });
    if ((await setupButton.count()) > 0) {
      await setupButton.first().click();
    }
  await page.getByRole("button", { name: "Reveal decision" }).click();
  await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

  await expect(page.getByLabel("Distribution readout")).toBeVisible();
  await expect(page.getByLabel("Formula used")).toBeVisible();
  await commitCheckpoint(page, "Changing the rare high outcome changes spread as well as the centre.");

  await expect(page.getByLabel("Observation unlocked")).toBeVisible();
  await expect(page.getByLabel("Formula used")).toContainText("E(X)");
  await expect(page.getByLabel("Distribution readout")).toContainText("Reject H0");
});

test("searches modules and keeps local mastery progress", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Mastery map" })).toBeVisible();
  await page.getByLabel("Search curriculum").fill("base quantity");

  const conceptNav = page.getByRole("navigation", { name: "Concept labs" });
  await expect(conceptNav).toContainText("Physical Quantities and Units");
  await expect(conceptNav).not.toContainText("Resolving Vectors");

  await page.getByLabel("Search curriculum").fill("");
  await page.getByRole("button", { name: "Foundations of Physics" }).click();
  await expect(page.getByText(/\d+ of \d+ concepts/)).toBeVisible();

  await page
    .getByLabel("Physical Quantities and Units mastery")
    .getByRole("button", { name: "Mastered" })
    .click();
  await expect(page.getByText(/1\/\d+ mastered/)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/1\/\d+ mastered/)).toBeVisible();
});

test("keeps internal build language off the learner-facing default screen", async ({ page }) => {
  await page.goto("/");

  const visibleCopy = await page.locator("body").innerText();

  expect(visibleCopy).not.toMatch(/\b(container|generated|queue)\b/i);
  expect(visibleCopy).not.toMatch(/\b(?:shared|sutd|a-level)\.[a-z0-9.-]+\b/i);
  await expect(page.getByRole("navigation", { name: "Concept labs" })).toBeVisible();
  await expect(page.getByLabel("Concept status")).toBeVisible();
});
