#!/usr/bin/env node
/**
 * Root accessibility runner.
 *
 * Each shell owns its Playwright/axe suite. The root command wires currently
 * available shells into CI without requiring every future curriculum branch to
 * edit workflow logic directly.
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const targets = [
  { packageName: "@paideia/a-level-shell", path: "a-level/apps/shell" },
  { packageName: "@paideia/sutd-shell", path: "sutd/apps/shell" },
];

const availableTargets = targets.filter((target) =>
  existsSync(resolve(REPO_ROOT, target.path, "package.json")),
);

if (availableTargets.length === 0) {
  process.stdout.write("No shell apps detected. Accessibility scan is a no-op.\n");
  process.exit(0);
}

for (const target of availableTargets) {
  process.stdout.write(`Running a11y scan for ${target.packageName}\n`);
  const result = spawnSync("pnpm", ["-F", target.packageName, "test:a11y"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
