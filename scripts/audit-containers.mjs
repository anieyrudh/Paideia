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
 *   - For each sims/<sim-id>/ with a declared predict step: a *.test.ts file
 *     exists that contains the literal string `prediction-gate`.
 *   - TECHNICAL.md has a non-empty `## Anieyrudh Filter pass` section once
 *     the container reaches the configured Filter lifecycle threshold.
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
const STATUS_RANK = {
  skeleton: 0,
  "content-only": 1,
  draft: 2,
  reviewed: 3,
  "ready-for-build": 4,
  published: 5,
};

function scalarValue(raw, key) {
  const match = raw.match(new RegExp(`^${key}\\s*:\\s*['"]?([A-Za-z0-9_-]+)['"]?`, "m"));
  return match?.[1] ?? "";
}

function filterRequired(raw) {
  const status = scalarValue(raw, "status");
  const requiredFor = scalarValue(raw, "required_for_status") || "published";
  return (STATUS_RANK[status] ?? 0) >= (STATUS_RANK[requiredFor] ?? STATUS_RANK.published);
}

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
  let cpRaw = "";
  if (!existsSync(cpYaml)) {
    failures.push("concept-package.yaml is missing");
  } else {
    cpRaw = readFileSync(cpYaml, "utf8");
    if (cpRaw.trim().length === 0) {
      failures.push("concept-package.yaml is empty");
    } else if (!/^id\s*:\s*\S+/m.test(cpRaw) || !/^status\s*:\s*\S+/m.test(cpRaw)) {
      failures.push("concept-package.yaml fails minimal parse (missing `id:` or `status:`)");
    }
  }

  const hasPackagePredict = /^package_predict\s*:/m.test(cpRaw);

  // Predict-gate Playwright file per sim with a declared predict path.
  const simsDir = join(containerDir, "sims");
  if (existsSync(simsDir) && statSync(simsDir).isDirectory()) {
    for (const simId of readdirSync(simsDir)) {
      const simDir = join(simsDir, simId);
      if (!statSync(simDir).isDirectory()) continue;
      const simSpec = join(simDir, "SimulationSpec.yaml");
      const simHasPredict = existsSync(simSpec) && /^predict\s*:/m.test(readFileSync(simSpec, "utf8"));
      if (!hasPackagePredict && !simHasPredict) continue;
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

  // TECHNICAL.md `## Anieyrudh Filter pass` section non-empty once required.
  const techPath = join(containerDir, "TECHNICAL.md");
  if (!existsSync(techPath)) {
    failures.push("TECHNICAL.md is missing");
  } else {
    const tech = readFileSync(techPath, "utf8");
    const header = /^##\s+Anieyrudh Filter pass\s*$/m;
    const match = tech.match(header);
    if (filterRequired(cpRaw)) {
      if (!match) {
        failures.push("TECHNICAL.md is missing the `## Anieyrudh Filter pass` section header required at this lifecycle status");
        return { container: relative(REPO_ROOT, containerDir), failures };
      }
      const startIdx = (match.index ?? 0) + match[0].length;
      const after = tech.slice(startIdx);
      const nextHeader = after.search(/^##\s+/m);
      const sectionBody = nextHeader === -1 ? after : after.slice(0, nextHeader);
      if (sectionBody.trim().length === 0) {
        failures.push("TECHNICAL.md `## Anieyrudh Filter pass` section is empty but required at this lifecycle status");
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
