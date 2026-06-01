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

// Headings that the four-section exemplar concept card uses. Gate 3 is
// warn-only because some legitimate containers use different headings; the
// warning is a "drift" signal, not a merge bar.
const CONCEPT_CARD_REQUIRED_SECTIONS = [
  "First-Principles",
  "Canonical Example",
  "Common Misconceptions",
  "Transfer",
];

const SOURCES_MIN_NON_BLANK_LINES = 5;

const KERNEL_PATH_LEAK = /`core\/[a-z][a-z0-9-]*`/g;

function checkFilterPassNonTbd(container, failures) {
  const technicalPath = join(container, "TECHNICAL.md");
  if (!isFile(technicalPath)) return;
  const body = readFileSync(technicalPath, "utf8");
  const sectionMatch = body.match(/^##\s+Anieyrudh Filter pass\s*$/m);
  if (!sectionMatch) return;
  const sectionStart = sectionMatch.index + sectionMatch[0].length;
  const tail = body.slice(sectionStart, sectionStart + 200);
  if (/^\s*Date:\s*TBD\b/m.test(tail)) {
    failures.push(
      `${relative(REPO_ROOT, technicalPath)} has \`Date: TBD\` in the \`## Anieyrudh Filter pass\` section; fill the date before review.`,
    );
  }
}

function checkKernelPathLeak(container, failures) {
  for (const rel of ["concept-card.md", join("problem-solving", "algorithm.md")]) {
    const path = join(container, rel);
    if (!isFile(path)) continue;
    const body = readFileSync(path, "utf8");
    const hits = body.match(KERNEL_PATH_LEAK);
    if (!hits) continue;
    const unique = [...new Set(hits)].join(", ");
    failures.push(
      `${relative(REPO_ROOT, path)} mentions kernel package paths (${unique}) in learner-facing copy; describe the concept, not the repo path.`,
    );
  }
}

function checkConceptCardSections(container, warnings) {
  const path = join(container, "concept-card.md");
  if (!isFile(path)) return;
  const body = readFileSync(path, "utf8");
  const missing = CONCEPT_CARD_REQUIRED_SECTIONS.filter((heading) => !body.includes(heading));
  if (missing.length > 0) {
    warnings.push(
      `${relative(REPO_ROOT, path)} is missing canonical heading(s): ${missing.join(", ")}.`,
    );
  }
}

function checkSourcesMinLines(container, warnings) {
  const path = join(container, "sources.md");
  if (!isFile(path)) return;
  const body = readFileSync(path, "utf8");
  const nonBlank = body.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  if (nonBlank < SOURCES_MIN_NON_BLANK_LINES) {
    warnings.push(
      `${relative(REPO_ROOT, path)} has only ${nonBlank} non-blank line(s); aim for at least ${SOURCES_MIN_NON_BLANK_LINES}.`,
    );
  }
}

function checkCopyLints(failures, warnings) {
  for (const container of findContainers()) {
    checkFilterPassNonTbd(container, failures);
    checkKernelPathLeak(container, failures);
    checkConceptCardSections(container, warnings);
    checkSourcesMinLines(container, warnings);
  }
}

function summarizeWarnings(warnings) {
  const grouped = new Map();
  for (const warning of warnings) {
    const tag = warning.includes("canonical heading")
      ? "concept-card missing canonical heading"
      : warning.includes("non-blank line")
        ? "sources.md too thin"
        : "other";
    if (!grouped.has(tag)) grouped.set(tag, []);
    grouped.get(tag).push(warning);
  }
  for (const [tag, list] of grouped) {
    process.stderr.write(`\n[warn] ${list.length} × ${tag}:\n`);
    for (const item of list.slice(0, 5)) process.stderr.write(`  - ${item}\n`);
    if (list.length > 5) process.stderr.write(`  - ... and ${list.length - 5} more\n`);
  }
}

function main() {
  const failures = [];
  const warnings = [];
  checkContainers(failures);
  checkPackageSource(failures);
  checkCopyLints(failures, warnings);

  if (warnings.length > 0) summarizeWarnings(warnings);

  if (failures.length > 0) {
    process.stderr.write(`\ncheck-container-quality: FAILED with ${failures.length} issue(s).\n\n`);
    for (const failure of failures) process.stderr.write(`- ${failure}\n`);
    process.exit(1);
  }

  const warnSuffix = warnings.length > 0 ? ` (${warnings.length} warning(s))` : "";
  process.stdout.write(`check-container-quality: OK${warnSuffix}\n`);
}

main();
