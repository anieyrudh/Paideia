#!/usr/bin/env node
/**
 * audit-containers.mjs
 *
 * Used by .github/workflows/daily-compliance-audit.yml.
 *
 * Walks every ConceptPackage container under:
 *   <branch>/content/<subject>/concept-packages/<package-id>/
 * and checks compliance items the validator enforces at PR time but that may
 * regress on `main` (e.g., an empty `## Anieyrudh Filter pass` section that
 * slipped past a stale validator run).
 *
 * Checks per container:
 *   - For each sims/<sim-id>/: a *.test.ts file exists that contains the
 *     literal string `prediction-gate` (the predict-gate Playwright test).
 *   - TECHNICAL.md has a non-empty `## Anieyrudh Filter pass` section.
 *   - concept-package.yaml parses (regex sanity).
 *
 * Output:
 *   - Prints a JSON array of violations to stdout:
 *       [
 *         { "container": "a-level/content/physics/concept-packages/shm",
 *           "failures": ["TECHNICAL.md ..." , "sims/oscillator/ ..."] },
 *         ...
 *       ]
 *     Empty array `[]` means no violations.
 *   - Always exits 0 (the workflow uses the JSON output, not the exit code,
 *     to decide whether to file Issues).
 *
 * No external dependencies — uses only Node built-ins.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const BRANCHES = ["a-level", "sutd"];

function findContainers() {
  const containers = [];
  for (const branch of BRANCHES) {
    const contentDir = join(REPO_ROOT, branch, "content");
    if (!existsSync(contentDir) || !statSync(contentDir).isDirectory()) continue;
    for (const subject of readdirSync(contentDir)) {
      const subjectDir = join(contentDir, subject);
      if (!statSync(subjectDir).isDirectory()) continue;
      const packagesDir = join(subjectDir, "concept-packages");
      if (!existsSync(packagesDir) || !statSync(packagesDir).isDirectory()) continue;
      for (const pkg of readdirSync(packagesDir)) {
        const pkgDir = join(packagesDir, pkg);
        if (statSync(pkgDir).isDirectory()) containers.push(pkgDir);
      }
    }
  }
  return containers;
}

function auditContainer(containerDir) {
  const failures = [];

  // concept-package.yaml parses (regex sanity)
  const cpYaml = join(containerDir, "concept-package.yaml");
  if (!existsSync(cpYaml)) {
    failures.push("concept-package.yaml is missing");
  } else {
    const raw = readFileSync(cpYaml, "utf8");
    if (raw.trim().length === 0) {
      failures.push("concept-package.yaml is empty");
    } else if (!/^id\s*:\s*\S+/m.test(raw) || !/^status\s*:\s*\S+/m.test(raw)) {
      failures.push("concept-package.yaml fails minimal parse (missing `id:` or `status:`)");
    }
  }

  // Predict-gate Playwright file per sim
  const simsDir = join(containerDir, "sims");
  if (existsSync(simsDir) && statSync(simsDir).isDirectory()) {
    for (const simId of readdirSync(simsDir)) {
      const simDir = join(simsDir, simId);
      if (!statSync(simDir).isDirectory()) continue;
      const tests = readdirSync(simDir).filter((f) =>
        f.endsWith(".test.ts") && statSync(join(simDir, f)).isFile()
      );
      if (tests.length === 0) {
        failures.push(`sims/${simId}/ has no *.test.ts file (predict-gate Playwright required)`);
        continue;
      }
      const anyHasGate = tests.some((f) =>
        readFileSync(join(simDir, f), "utf8").includes("prediction-gate")
      );
      if (!anyHasGate) {
        failures.push(
          `sims/${simId}/ test files do not reference \`prediction-gate\` (predict-gate Playwright assertion missing)`
        );
      }
    }
  }

  // TECHNICAL.md `## Anieyrudh Filter pass` section non-empty
  const techPath = join(containerDir, "TECHNICAL.md");
  if (!existsSync(techPath)) {
    failures.push("TECHNICAL.md is missing");
  } else {
    const tech = readFileSync(techPath, "utf8");
    const header = /^##\s+Anieyrudh Filter pass\s*$/m;
    const match = tech.match(header);
    if (!match) {
      failures.push("TECHNICAL.md is missing the `## Anieyrudh Filter pass` section header");
    } else {
      const startIdx = (match.index ?? 0) + match[0].length;
      const after = tech.slice(startIdx);
      const nextHeader = after.search(/^##\s+/m);
      const sectionBody = nextHeader === -1 ? after : after.slice(0, nextHeader);
      if (sectionBody.trim().length === 0) {
        failures.push("TECHNICAL.md `## Anieyrudh Filter pass` section is empty");
      }
    }
  }

  return { container: relative(REPO_ROOT, containerDir), failures };
}

function main() {
  const containers = findContainers();
  const violations = containers
    .map(auditContainer)
    .filter((r) => r.failures.length > 0);

  // ALWAYS print valid JSON, even for the empty case.
  process.stdout.write(JSON.stringify(violations, null, 2) + "\n");
  process.exit(0);
}

main();
