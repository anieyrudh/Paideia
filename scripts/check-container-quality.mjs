#!/usr/bin/env node
/**
 * check-container-quality.mjs
 *
 * Fast preflight checks for repeated P0/P1 issues found during container waves.
 * This complements the full schema validator: it catches patterns that are
 * syntactically valid but repeatedly caused review churn.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import YAML from "yaml";

const REPO_ROOT = resolve(process.cwd());
const CONTAINER_ROOTS = [
  "a-level/content",
  "sutd/content",
  "shared/content",
].map((path) => join(REPO_ROOT, path));
const SIM_PACKAGE_ROOTS = [
  "a-level/packages",
  "sutd/packages",
  "shared/packages",
].map((path) => join(REPO_ROOT, path));

const PROMPT_METADATA_LINE = /^\s*(commit_format|correct_index|rationale_required):/m;
const LEGACY_PREDICTION_TEST_ALLOWLIST = new Set([
  "a-level/content/physics/containers/forces-and-equilibrium",
  "a-level/content/physics/containers/kinematics-in-one-dimension",
  "a-level/content/physics/containers/physical-quantities-and-units",
  "a-level/content/physics/containers/resolving-vectors",
  "a-level/content/physics/containers/scalars-and-vectors",
  "sutd/content/asd/containers/structural-load-path-diagram",
]);

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function readYaml(path, failures) {
  try {
    return YAML.parse(readFileSync(path, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${relative(REPO_ROOT, path)} could not be parsed as YAML: ${message}`);
    return null;
  }
}

function walkDirectories(root, visit) {
  if (!isDirectory(root)) return;
  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      visit(path);
      walkDirectories(path, visit);
    }
  }
}

function walkFiles(root, visit) {
  if (!isDirectory(root)) return;
  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist") continue;
      walkFiles(path, visit);
    } else if (entry.isFile()) {
      visit(path);
    }
  }
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

function checkPrompt(value, label, failures) {
  if (typeof value !== "string") return;
  if (PROMPT_METADATA_LINE.test(value)) {
    failures.push(`${label} contains YAML metadata text inside the learner prompt; move metadata into structured fields.`);
  }
}

function checkPredictionGateTest(container, hasPrediction, requiresProductRevealHelper, failures) {
  if (!hasPrediction) return;

  const relativeContainer = relative(REPO_ROOT, container);
  if (LEGACY_PREDICTION_TEST_ALLOWLIST.has(relativeContainer)) return;

  const testPath = join(container, "simulation", "simulation.test.ts");
  if (!isFile(testPath)) return;

  const test = readFileSync(testPath, "utf8");
  if (
    !test.includes("Prediction checkpoint") &&
    !test.includes("prediction-checkpoint") &&
    !test.includes("expectProductSimulationExperience")
  ) {
    failures.push(
      `${relative(REPO_ROOT, testPath)} must assert the prediction checkpoint is present while the simulation remains visible.`,
    );
  }

  if (/Observation unlocked["'}\s),\]}]*\)\.toHaveCount\(0\)/u.test(test)) {
    failures.push(
      `${relative(REPO_ROOT, testPath)} still expects the observation to be hidden before prediction; simulations must be visible immediately.`,
    );
  }

  if (
    requiresProductRevealHelper &&
    !test.includes("expectProductSimulationExperience") &&
    !test.includes("expectProductSimulationReveal") &&
    !test.includes("expectRevealedSimulationVisual")
  ) {
    failures.push(
      `${relative(REPO_ROOT, testPath)} must call expectProductSimulationExperience or expectRevealedSimulationVisual so sims cannot stay text-only.`,
    );
  }
}

function checkContainers(failures) {
  for (const container of findContainers()) {
    const manifestPath = join(container, "container.yaml");
    const manifest = readYaml(manifestPath, failures);
    if (!manifest || typeof manifest !== "object") continue;

    checkPrompt(manifest.package_predict?.prompt, `${relative(REPO_ROOT, manifestPath)} package_predict.prompt`, failures);

    const simulationSpecPath = join(container, "simulation", "simulation.yaml");
    let simulation = null;
    if (isFile(simulationSpecPath)) {
      simulation = readYaml(simulationSpecPath, failures);
      checkPrompt(simulation?.predict?.prompt, `${relative(REPO_ROOT, simulationSpecPath)} predict.prompt`, failures);
    }

    const hasPrediction = Boolean(manifest.package_predict || simulation?.predict);
    const runtimePath = join(container, "simulation", "runtime.yaml");
    const runtime = isFile(runtimePath) ? readYaml(runtimePath, failures) : null;
    checkPredictionGateTest(container, hasPrediction, Boolean(runtime?.visual_quality), failures);
  }
}

function checkPackageSource(failures) {
  for (const root of SIM_PACKAGE_ROOTS) {
    walkFiles(root, (path) => {
      if (!/\.(ts|tsx)$/u.test(path)) return;
      const source = readFileSync(path, "utf8");
      if (source.includes("as unknown as number")) {
        failures.push(`${relative(REPO_ROOT, path)} uses \`as unknown as number\`; use a typed helper or Number(...) for display coercion.`);
      }
    });
  }
}

function main() {
  const failures = [];
  checkContainers(failures);
  checkPackageSource(failures);

  if (failures.length > 0) {
    process.stderr.write(`check-container-quality: FAILED with ${failures.length} issue(s).\n\n`);
    for (const failure of failures) process.stderr.write(`- ${failure}\n`);
    process.exit(1);
  }

  process.stdout.write("check-container-quality: OK\n");
}

main();
