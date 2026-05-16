#!/usr/bin/env node
/**
 * validate-containers.mjs
 *
 * Walk every ConceptPackage under:
 *   <branch>/content/<subject>/concept-packages/<package-id>/
 * and validate it against docs/container-spec.md §1 plus the Zod schemas in
 * @paideia/content-schema.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import YAML from "yaml";

const REPO_ROOT = resolve(process.cwd());
const BRANCHES = ["a-level", "sutd"];
let schemas = null;

const REQUIRED_FILES = new Set([
  "concept-package.yaml",
  "concept-card.md",
  "sources.md",
  "README.md",
  "TECHNICAL.md",
]);

const ALLOWED_TOP_LEVEL = new Set([
  ...REQUIRED_FILES,
  "decision-matrix.md",
  "misconceptions.md",
  "sims",
  "transfer",
  "assessments",
  "extras",
]);

const STATUS_RANK = {
  skeleton: 0,
  "content-only": 1,
  draft: 2,
  reviewed: 3,
  "ready-for-build": 4,
  published: 5,
};

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function findContainers() {
  const containers = [];
  for (const branch of BRANCHES) {
    const contentDir = join(REPO_ROOT, branch, "content");
    if (!isDirectory(contentDir)) continue;

    for (const subject of readdirSync(contentDir)) {
      const subjectDir = join(contentDir, subject);
      if (!isDirectory(subjectDir)) continue;

      const packagesDir = join(subjectDir, "concept-packages");
      if (!isDirectory(packagesDir)) continue;

      for (const pkg of readdirSync(packagesDir)) {
        const pkgDir = join(packagesDir, pkg);
        if (isDirectory(pkgDir)) containers.push(pkgDir);
      }
    }
  }
  return containers;
}

function parseYamlFile(path, failures, label) {
  try {
    const raw = readFileSync(path, "utf8");
    if (raw.trim().length === 0) {
      failures.push(`${label} is empty`);
      return null;
    }
    return YAML.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${label} is not valid YAML: ${message}`);
    return null;
  }
}

function formatZodIssues(error) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

async function loadSchemas() {
  if (schemas !== null) return schemas;

  const build = spawnSync("pnpm", ["-F", "@paideia/content-schema", "build"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (build.status !== 0) {
    const detail = [build.stdout, build.stderr].filter(Boolean).join("\n");
    throw new Error(`Could not build @paideia/content-schema before validation.\n${detail}`);
  }

  schemas = await import("../core/content-schema/dist/index.js");
  return schemas;
}

function parseFrontmatter(markdown, failures) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*(\n|$)/);
  if (!match?.[1]) {
    failures.push("concept-card.md is missing YAML frontmatter delimited by `---` at the top of the file");
    return null;
  }
  try {
    return YAML.parse(match[1]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`concept-card.md frontmatter is not valid YAML: ${message}`);
    return null;
  }
}

function sectionBody(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^##\\s+${escaped}\\s*$`, "m"));
  if (!match) return null;
  const startIdx = (match.index ?? 0) + match[0].length;
  const after = markdown.slice(startIdx);
  const nextHeader = after.search(/^##\s+/m);
  return nextHeader === -1 ? after : after.slice(0, nextHeader);
}

function isSafeRelativePath(path) {
  return path.length > 0 && !isAbsolute(path) && !path.split("/").includes("..");
}

function validateTopLevelShape(containerDir, failures) {
  for (const filename of REQUIRED_FILES) {
    if (!isFile(join(containerDir, filename))) {
      failures.push(`Missing required file: ${filename}`);
    }
  }

  if (!isDirectory(join(containerDir, "sims"))) {
    failures.push("Missing required directory: sims/");
  }

  for (const entry of readdirSync(containerDir)) {
    if (!ALLOWED_TOP_LEVEL.has(entry)) {
      failures.push(`Unexpected top-level item: ${entry}`);
    }
  }
}

function validateConceptPackage(containerDir, failures) {
  const parsed = parseYamlFile(
    join(containerDir, "concept-package.yaml"),
    failures,
    "concept-package.yaml",
  );
  if (parsed === null) return null;

  const result = schemas.ConceptPackageSpec.safeParse(parsed);
  if (!result.success) {
    failures.push(`concept-package.yaml failed ConceptPackageSpec: ${formatZodIssues(result.error)}`);
    return null;
  }

  const packageId = basename(containerDir);
  if (result.data.id !== packageId) {
    failures.push(`concept-package.yaml id \`${result.data.id}\` does not match directory \`${packageId}\``);
  }

  const parts = relative(REPO_ROOT, containerDir).split("/");
  const [branch, content, subject] = parts;
  if (!BRANCHES.includes(branch ?? "") || content !== "content" || !subject) {
    failures.push("Container path must be <branch>/content/<subject>/concept-packages/<package-id>");
  } else {
    if (result.data.branch !== branch) {
      failures.push(`concept-package.yaml branch \`${result.data.branch}\` does not match path branch \`${branch}\``);
    }
    if (result.data.subject !== subject) {
      failures.push(`concept-package.yaml subject \`${result.data.subject}\` does not match path subject \`${subject}\``);
    }
  }

  return result.data;
}

function validateConceptCard(containerDir, manifest, failures) {
  const cardPath = join(containerDir, "concept-card.md");
  if (!isFile(cardPath)) return;

  const frontmatter = parseFrontmatter(readFileSync(cardPath, "utf8"), failures);
  if (frontmatter === null) return;

  const result = schemas.ConceptCardFrontmatter.safeParse(frontmatter);
  if (!result.success) {
    failures.push(`concept-card.md frontmatter failed ConceptCardFrontmatter: ${formatZodIssues(result.error)}`);
    return;
  }

  if (manifest === null) return;
  if (result.data.concept !== manifest.id) {
    failures.push(`concept-card.md concept \`${result.data.concept}\` does not match concept-package.yaml id \`${manifest.id}\``);
  }
  if (result.data.branch !== manifest.branch) {
    failures.push(`concept-card.md branch \`${result.data.branch}\` does not match concept-package.yaml branch \`${manifest.branch}\``);
  }
  if (result.data.subject !== manifest.subject) {
    failures.push(`concept-card.md subject \`${result.data.subject}\` does not match concept-package.yaml subject \`${manifest.subject}\``);
  }
}

function filterRequired(manifest) {
  if (manifest === null) return false;
  const status = manifest.status;
  const requiredFor = manifest.review?.anieyrudh_filter?.required_for_status ?? "published";
  return STATUS_RANK[status] >= STATUS_RANK[requiredFor];
}

function validateTechnical(containerDir, manifest, failures) {
  const techPath = join(containerDir, "TECHNICAL.md");
  if (!isFile(techPath)) return;
  const body = sectionBody(readFileSync(techPath, "utf8"), "Anieyrudh Filter pass");
  if (filterRequired(manifest)) {
    if (body === null) {
      failures.push("TECHNICAL.md is missing the `## Anieyrudh Filter pass` section header required at this lifecycle status");
    } else if (body.trim().length === 0) {
      failures.push("TECHNICAL.md `## Anieyrudh Filter pass` section is empty but required at this lifecycle status");
    }
  }
}

function validateManifestPath(containerDir, manifestPath, label, failures) {
  if (!isSafeRelativePath(manifestPath)) {
    failures.push(`${label} must be a relative path inside the container`);
    return;
  }
  if (!isFile(join(containerDir, manifestPath))) {
    failures.push(`${label} points to missing file: ${manifestPath}`);
  }
}

function validateOptionalReferences(containerDir, manifest, failures) {
  if (manifest === null) return;

  validateManifestPath(containerDir, manifest.items.concept_card, "items.concept_card", failures);
  validateManifestPath(containerDir, manifest.items.sources, "items.sources", failures);

  if (manifest.items.decision_matrix) {
    validateManifestPath(containerDir, manifest.items.decision_matrix, "items.decision_matrix", failures);
  } else if (isFile(join(containerDir, "decision-matrix.md"))) {
    failures.push("decision-matrix.md exists but concept-package.yaml items.decision_matrix does not reference it");
  }

  if (manifest.items.misconceptions) {
    validateManifestPath(containerDir, manifest.items.misconceptions, "items.misconceptions", failures);
  } else if (isFile(join(containerDir, "misconceptions.md"))) {
    failures.push("misconceptions.md exists but concept-package.yaml items.misconceptions does not reference it");
  }
}

function validateKernelDeps(kernelDeps, label, failures) {
  for (const dep of kernelDeps) {
    if (!dep.startsWith("core/")) {
      failures.push(`${label} kernel_deps entry \`${dep}\` must start with core/`);
      continue;
    }
    if (!isDirectory(join(REPO_ROOT, dep))) {
      failures.push(`${label} kernel_deps entry \`${dep}\` does not resolve to an existing directory`);
    }
  }
}

function validateSimDirectory(containerDir, simId, manifestSims, hasPackagePredict, failures) {
  const simDir = join(containerDir, "sims", simId);
  const manifestSim = manifestSims.get(simId);
  const specPath = join(simDir, "SimulationSpec.yaml");
  if (!isFile(specPath)) {
    failures.push(`sims/${simId}/SimulationSpec.yaml is missing`);
  } else {
    const parsed = parseYamlFile(specPath, failures, `sims/${simId}/SimulationSpec.yaml`);
    if (parsed !== null) {
      const result = schemas.SimulationSpec.safeParse(parsed);
      if (!result.success) {
        failures.push(`sims/${simId}/SimulationSpec.yaml failed SimulationSpec: ${formatZodIssues(result.error)}`);
      } else {
        if (result.data.id !== simId) {
          failures.push(`sims/${simId}/SimulationSpec.yaml id \`${result.data.id}\` does not match directory \`${simId}\``);
        }
        validateKernelDeps(result.data.kernel_deps, `sims/${simId}/SimulationSpec.yaml`, failures);
      }
    }
  }

  if (!manifestSims.has(simId)) {
    failures.push(`sims/${simId}/ exists but concept-package.yaml items.sims does not list \`${simId}\``);
  }

  if (!isFile(join(simDir, "index.tsx"))) {
    failures.push(`sims/${simId}/index.tsx is missing`);
  }

  const expectedTest = `${simId}.test.ts`;
  const testPath = join(simDir, expectedTest);
  if (!isFile(testPath)) {
    failures.push(`sims/${simId}/${expectedTest} is missing`);
  } else if ((hasPackagePredict || manifestSim?.predict) && !readFileSync(testPath, "utf8").includes("prediction-gate")) {
    failures.push(`sims/${simId}/${expectedTest} does not contain the literal string \`prediction-gate\``);
  }
}

function validateSims(containerDir, manifest, failures) {
  const simsDir = join(containerDir, "sims");
  if (!isDirectory(simsDir)) return;

  const manifestSims = new Map((manifest?.items.sims ?? []).map((sim) => [sim.id, sim]));
  const hasPackagePredict = manifest?.package_predict !== undefined;
  for (const sim of manifest?.items.sims ?? []) {
    validateKernelDeps(sim.kernel_deps, "concept-package.yaml items.sims", failures);
    if (!isDirectory(join(simsDir, sim.id))) {
      failures.push(`concept-package.yaml items.sims lists \`${sim.id}\`, but sims/${sim.id}/ is missing`);
    }
  }

  for (const entry of readdirSync(simsDir)) {
    if (isDirectory(join(simsDir, entry))) {
      validateSimDirectory(containerDir, entry, manifestSims, hasPackagePredict, failures);
    }
  }
}

function validateTransferFiles(containerDir, manifest, failures) {
  const transferDir = join(containerDir, "transfer");
  const transferIds = new Set(manifest?.items.transfer_problems.map((problem) => problem.id) ?? []);
  for (const problem of manifest?.items.transfer_problems ?? []) {
    const expectedPath = join(transferDir, `${problem.id}.md`);
    if (!isFile(expectedPath)) {
      failures.push(`concept-package.yaml items.transfer_problems lists \`${problem.id}\`, but transfer/${problem.id}.md is missing`);
    }
  }
  if (!isDirectory(transferDir)) return;
  for (const entry of readdirSync(transferDir)) {
    if (!entry.endsWith(".md")) continue;
    const problemId = entry.slice(0, -".md".length);
    if (!transferIds.has(problemId)) {
      failures.push(`transfer/${entry} exists but concept-package.yaml items.transfer_problems does not list \`${problemId}\``);
    }
  }
}

function validateContainer(containerDir) {
  const failures = [];
  validateTopLevelShape(containerDir, failures);
  const manifest = isFile(join(containerDir, "concept-package.yaml"))
    ? validateConceptPackage(containerDir, failures)
    : null;
  validateConceptCard(containerDir, manifest, failures);
  validateOptionalReferences(containerDir, manifest, failures);
  validateTechnical(containerDir, manifest, failures);
  validateSims(containerDir, manifest, failures);
  validateTransferFiles(containerDir, manifest, failures);
  return { container: relative(REPO_ROOT, containerDir), failures };
}

async function main() {
  await loadSchemas();
  const containers = findContainers();

  if (containers.length === 0) {
    process.stdout.write("validate-containers: no containers found; nothing to validate.\n");
    process.exit(0);
  }

  const results = containers.map(validateContainer);
  const failed = results.filter((result) => result.failures.length > 0);

  if (failed.length > 0) {
    process.stderr.write(`validate-containers: ${failed.length}/${containers.length} container(s) FAILED.\n\n`);
    for (const result of failed) {
      process.stderr.write(`✗ ${result.container}\n`);
      for (const failure of result.failures) {
        process.stderr.write(`    - ${failure}\n`);
      }
      process.stderr.write("\n");
    }
    process.exit(1);
  }

  process.stdout.write(`validate-containers: OK — ${containers.length} container(s) passed.\n`);
  process.exit(0);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`validate-containers: ${message}\n`);
  process.exit(1);
});
