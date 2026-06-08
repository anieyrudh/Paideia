#!/usr/bin/env node
/**
 * audit-containers.mjs
 *
 * Used by .github/workflows/daily-compliance-audit.yml.
 *
 * Walks every v2 container under:
 *   <branch>/content/<subject>/containers/<concept-id>/
 * and checks compliance items the validator enforces at PR time but that may
 * regress on main.
 *
 * Always exits 0; the workflow uses the JSON output to file Issues.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

function findContainers() {
  const containers = [];
  for (const branch of BRANCHES) {
    const contentDir = join(REPO_ROOT, branch, "content");
    if (!existsSync(contentDir) || !statSync(contentDir).isDirectory()) continue;
    for (const subject of readdirSync(contentDir)) {
      const subjectDir = join(contentDir, subject);
      if (!statSync(subjectDir).isDirectory()) continue;
      const containersDir = join(subjectDir, "containers");
      if (!existsSync(containersDir) || !statSync(containersDir).isDirectory()) continue;
      for (const conceptId of readdirSync(containersDir)) {
        const containerDir = join(containersDir, conceptId);
        if (statSync(containerDir).isDirectory()) containers.push(containerDir);
      }
    }
  }
  return containers;
}

function scalarValue(raw, key) {
  const match = raw.match(new RegExp(`^${key}\\s*:\\s*['"]?([A-Za-z0-9_-]+)['"]?`, "m"));
  return match?.[1] ?? "";
}

function filterRequired(raw) {
  const status = scalarValue(raw, "status");
  const requiredFor = scalarValue(raw, "required_for_status") || "published";
  return (STATUS_RANK[status] ?? 0) >= (STATUS_RANK[requiredFor] ?? STATUS_RANK.published);
}

function auditContainer(containerDir) {
  const failures = [];
  const containerYaml = join(containerDir, "container.yaml");
  let raw = "";

  if (!existsSync(containerYaml)) {
    failures.push("container.yaml is missing");
  } else {
    raw = readFileSync(containerYaml, "utf8");
    if (raw.trim().length === 0) {
      failures.push("container.yaml is empty");
    } else if (!/^id\s*:\s*\S+/m.test(raw) || !/^status\s*:\s*\S+/m.test(raw)) {
      failures.push("container.yaml fails minimal parse (missing `id:` or `status:`)");
    }
  }

  for (const dirname of ["concept-map", "embed", "media", "problem-solving"]) {
    const dir = join(containerDir, dirname);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) failures.push(`${dirname}/ is missing`);
  }

  const hasPredict = /^package_predict\s*:/m.test(raw) || /^predict_at\s*:\s*(per-sim|both|package-level)/m.test(raw);
  const simTest = join(containerDir, "simulation", "simulation.test.ts");
  if (hasPredict) {
    if (!existsSync(simTest)) {
      failures.push("simulation/simulation.test.ts is missing for declared prediction path");
    } else if (!readFileSync(simTest, "utf8").includes("prediction-checkpoint")) {
      failures.push("simulation/simulation.test.ts does not reference `prediction-checkpoint`");
    }
  }

  const techPath = join(containerDir, "TECHNICAL.md");
  if (!existsSync(techPath)) {
    failures.push("TECHNICAL.md is missing");
  } else if (filterRequired(raw)) {
    const tech = readFileSync(techPath, "utf8");
    const match = tech.match(/^##\s+Anieyrudh Filter pass\s*$/m);
    if (!match) {
      failures.push("TECHNICAL.md is missing the `## Anieyrudh Filter pass` section header required at this lifecycle status");
    } else {
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
  const violations = findContainers()
    .map(auditContainer)
    .filter((result) => result.failures.length > 0);

  process.stdout.write(`${JSON.stringify(violations, null, 2)}\n`);
}

main();
