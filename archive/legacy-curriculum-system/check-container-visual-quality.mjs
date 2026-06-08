#!/usr/bin/env node
/**
 * Browser-backed visual simulation quality gate.
 *
 * Containers opt in by adding simulation/runtime.yaml visual_quality metadata.
 * The generated Playwright spec uses that explicit metadata to move through
 * setup and prediction checkpoints without guessing learner-facing button labels.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import YAML from "yaml";

const REPO_ROOT = resolve(process.cwd());
const CONTAINER_ROOTS = ["a-level/content", "sutd/content", "shared/content"].map((path) =>
  join(REPO_ROOT, path),
);
const WORK_DIR = join(REPO_ROOT, "testing/sim-harness/.visual-quality");
const SPEC_PATH = join(WORK_DIR, "visual-quality.generated.spec.ts");

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function walkDirectories(root, visit) {
  if (!isDirectory(root)) return;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      visit(path);
      walkDirectories(path, visit);
    }
  }
}

function readYaml(path) {
  return YAML.parse(readFileSync(path, "utf8"));
}

function findContainers() {
  const containers = [];
  for (const root of CONTAINER_ROOTS) {
    walkDirectories(root, (directory) => {
      if (isFile(join(directory, "container.yaml"))) containers.push(directory);
    });
  }
  return containers.sort((a, b) => relative(REPO_ROOT, a).localeCompare(relative(REPO_ROOT, b)));
}

function routePrefixForContainer(containerPath) {
  const parts = relative(REPO_ROOT, containerPath).split("/");
  if (parts[0] === "a-level") {
    return `a-level/${parts[2]}/${parts[4]}`;
  }
  if (parts[0] === "sutd") {
    return `sutd/${parts[2]}/${parts[4]}`;
  }
  if (parts[0] === "shared") {
    return `shared/${parts[2]}/${parts[4]}`;
  }
  throw new Error(`Cannot derive route prefix for ${relative(REPO_ROOT, containerPath)}`);
}

function loadContracts(routeFilter) {
  const contracts = [];
  const failures = [];

  for (const container of findContainers()) {
    const runtimePath = join(container, "simulation", "runtime.yaml");
    const simulationPath = join(container, "simulation", "simulation.yaml");
    if (!isFile(runtimePath) || !isFile(simulationPath)) continue;

    let runtime;
    let simulation;
    try {
      runtime = readYaml(runtimePath);
      simulation = readYaml(simulationPath);
    } catch (error) {
      failures.push(`${relative(REPO_ROOT, container)} has invalid YAML: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    const visualQuality = runtime?.visual_quality;
    if (!visualQuality) continue;

    const simId = `${routePrefixForContainer(container)}/${simulation?.id ?? ""}`;
    if (routeFilter.length > 0 && !routeFilter.includes(simId)) continue;

    const prediction = visualQuality.prediction;
    const observation = visualQuality.observation ?? visualQuality.reveal ?? {};
    if (!prediction?.option_label || !prediction?.rationale) {
      failures.push(`${relative(REPO_ROOT, runtimePath)} visual_quality.prediction needs option_label and rationale.`);
      continue;
    }
    if (observation.formula === "not-applicable" && !observation.formula_not_applicable_reason) {
      failures.push(`${relative(REPO_ROOT, runtimePath)} formula: not-applicable needs formula_not_applicable_reason.`);
      continue;
    }

    contracts.push({
      simId,
      setup: Array.isArray(visualQuality.setup)
        ? visualQuality.setup.map((step) => ({ role: step.role ?? "button", name: step.name }))
        : [],
      prediction: {
        optionLabel: prediction.option_label,
        rationale: prediction.rationale,
      },
      observation: {
        observationLabel: observation.observation_label ?? "Observation unlocked",
        visual: observation.visual ?? "required",
        formula: observation.formula ?? "required",
        formulaNotApplicableReason: observation.formula_not_applicable_reason,
      },
    });
  }

  if (failures.length > 0) {
    process.stderr.write(`container:visual-quality metadata failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`);
    process.exit(1);
  }

  return contracts;
}

function writeSpec(contracts) {
  rmSync(WORK_DIR, { recursive: true, force: true });
  mkdirSync(WORK_DIR, { recursive: true });
  const source = `import { test } from "@playwright/test";
import { expectProductSimulationExperience } from "../src/playwright-contract.js";

const contracts = ${JSON.stringify(contracts, null, 2)} as const;

for (const contract of contracts) {
  test(\`\${contract.simId} satisfies product simulation experience contract\`, async ({ page }) => {
    await expectProductSimulationExperience(page, contract);
  });
}
`;
  writeFileSync(SPEC_PATH, source, "utf8");
}

function main() {
  const routeFilter = process.argv.slice(2).filter((arg) => arg !== "--");
  const contracts = loadContracts(routeFilter);

  if (routeFilter.length > 0 && contracts.length === 0) {
    process.stderr.write(`container:visual-quality found no visual_quality metadata for ${routeFilter.join(", ")}\n`);
    process.exit(1);
  }

  if (contracts.length === 0) {
    process.stdout.write("container:visual-quality: no visual_quality metadata found; no-op.\n");
    return;
  }

  writeSpec(contracts);
  process.stdout.write(`container:visual-quality: checking ${contracts.length} route(s).\n`);

  const result = spawnSync(
    join(REPO_ROOT, "testing/sim-harness/node_modules/.bin/playwright"),
    [
      "test",
      "testing/sim-harness/.visual-quality/visual-quality.generated.spec.ts",
      "--config",
      "testing/sim-harness/playwright.config.ts",
      "--output",
      "testing/sim-harness/.visual-quality/test-results",
    ],
    {
      cwd: REPO_ROOT,
      stdio: "inherit",
    },
  );

  process.exit(result.status ?? 1);
}

main();
