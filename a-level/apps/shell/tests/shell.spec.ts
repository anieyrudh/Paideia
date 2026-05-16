import { expect, test } from "@playwright/test";

test("launches the first container sim through the learner shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Scalars and Vectors" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Concept packages" })).toContainText(
    "Physics / H2",
  );
  await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
  await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);

  await page.getByLabel("7.1 m").check();
  await page
    .getByLabel("Rationale")
    .fill("The arrows are perpendicular, so I expect a right-triangle resultant.");
  await page.getByRole("button", { name: "Commit prediction" }).click();

  await expect(page.getByLabel("Observation unlocked")).toBeVisible();
  await expect(page.getByText("Geometric resultant")).toBeVisible();
  await expect(page.getByLabel("Formula used")).toContainText("|R| =");

  await page.getByRole("button", { name: "Reset prediction" }).click();
  await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
});
