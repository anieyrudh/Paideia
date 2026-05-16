#!/usr/bin/env node
/**
 * validate-containers.mjs
 *
 * Walk every v2 container under:
 *   <branch>/content/<subject>/containers/<concept-id>/
 * and validate it against docs/container-spec.md plus the Zod schemas in
 * @paideia/content-schema.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import YAML from "yaml";

const REPO_ROOT = resolve(process.cwd());
const BRANCHES = ["a-level", "sutd"];
let schemas = null;

const REQUIRED_FILES = new Set(["container.yaml", "concept-card.md", "README.md", "TECHNICAL.md"]);
const REQUIRED_DIRS = new Set(["concept-map", "embed", "media", "problem-solving"]);
const ALLOWED_TOP_LEVEL = new Set([
  ...REQUIRED_FILES,
  "sources.md",
  "concept-map",
  "simulation",
  "embed",
  "media",
  "problem-solving",
  "notebook-lab",
  "visual-derivation",
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

const REQUIRED_EMBED_METHODS = ["load", "saveState", "score", "resume", "syncTheme", "destroy"];

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

      const containersDir = join(subjectDir, "containers");
      if (!isDirectory(containersDir)) continue;

      for (const conceptId of readdirSync(containersDir)) {
        const containerDir = join(containersDir, conceptId);
        if (isDirectory(containerDir)) containers.push(containerDir);
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

function validateRequiredShape(containerDir, failures) {
  for (const filename of REQUIRED_FILES) {
    if (!isFile(join(containerDir, filename))) failures.push(`Missing required file: ${filename}`);
  }
  for (const dirname of REQUIRED_DIRS) {
    if (!isDirectory(join(containerDir, dirname))) failures.push(`Missing required directory: ${dirname}/`);
  }

  for (const entry of readdirSync(containerDir)) {
    if (!ALLOWED_TOP_LEVEL.has(entry)) failures.push(`Unexpected top-level item: ${entry}`);
  }
}

function validatePath(containerDir, path, label, failures, expectedKind = "file") {
  if (!isSafeRelativePath(path)) {
    failures.push(`${label} must be a relative path inside the container`);
    return;
  }

  const absolute = join(containerDir, path);
  if (expectedKind === "dir") {
    if (!isDirectory(absolute)) failures.push(`${label} points to missing directory: ${path}`);
  } else if (!isFile(absolute)) {
    failures.push(`${label} points to missing file: ${path}`);
  }
}

function validateContainerManifest(containerDir, failures) {
  const parsed = parseYamlFile(join(containerDir, "container.yaml"), failures, "container.yaml");
  if (parsed === null) return null;

  const result = schemas.ContainerSpec.safeParse(parsed);
  if (!result.success) {
    failures.push(`container.yaml failed ContainerSpec: ${formatZodIssues(result.error)}`);
    return null;
  }

  const conceptId = basename(containerDir);
  if (result.data.id !== conceptId) {
    failures.push(`container.yaml id \`${result.data.id}\` does not match directory \`${conceptId}\``);
  }

  const parts = relative(REPO_ROOT, containerDir).split("/");
  const [branch, content, subject, containersSegment] = parts;
  if (!BRANCHES.includes(branch ?? "") || content !== "content" || !subject || containersSegment !== "containers") {
    failures.push("Container path must be <branch>/content/<subject>/containers/<concept-id>");
  } else {
    if (result.data.branch !== branch) {
      failures.push(`container.yaml branch \`${result.data.branch}\` does not match path branch \`${branch}\``);
    }
    if (result.data.subject !== subject) {
      failures.push(`container.yaml subject \`${result.data.subject}\` does not match path subject \`${subject}\``);
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
    failures.push(`concept-card.md concept \`${result.data.concept}\` does not match container.yaml id \`${manifest.id}\``);
  }
  if (result.data.branch !== manifest.branch) {
    failures.push(`concept-card.md branch \`${result.data.branch}\` does not match container.yaml branch \`${manifest.branch}\``);
  }
  if (result.data.subject !== manifest.subject) {
    failures.push(`concept-card.md subject \`${result.data.subject}\` does not match container.yaml subject \`${manifest.subject}\``);
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

function validateConceptMap(containerDir, manifest, failures) {
  if (manifest === null) return;
  validatePath(containerDir, manifest.concept_map.spec, "concept_map.spec", failures);
  validatePath(containerDir, manifest.concept_map.mindmap, "concept_map.mindmap", failures);
  validatePath(containerDir, manifest.concept_map.mermaid, "concept_map.mermaid", failures);

  const parsed = parseYamlFile(join(containerDir, manifest.concept_map.spec), failures, manifest.concept_map.spec);
  if (parsed === null) return;
  const result = schemas.ConceptMapSpec.safeParse(parsed);
  if (!result.success) {
    failures.push(`${manifest.concept_map.spec} failed ConceptMapSpec: ${formatZodIssues(result.error)}`);
    return;
  }
  if (result.data.concept_id !== manifest.id) {
    failures.push(`${manifest.concept_map.spec} concept_id \`${result.data.concept_id}\` does not match container.yaml id \`${manifest.id}\``);
  }
}

function validateSimulation(containerDir, manifest, failures) {
  if (manifest === null || manifest.simulation === undefined) return;

  validatePath(containerDir, manifest.components.simulation ?? "simulation", "components.simulation", failures, "dir");
  validatePath(containerDir, manifest.simulation.spec, "simulation.spec", failures);
  validatePath(containerDir, manifest.simulation.controls, "simulation.controls", failures);
  validatePath(containerDir, manifest.simulation.presets, "simulation.presets", failures);
  validatePath(containerDir, manifest.simulation.state_labels, "simulation.state_labels", failures);
  validatePath(containerDir, manifest.simulation.runtime, "simulation.runtime", failures);
  validatePath(containerDir, "simulation/index.tsx", "simulation/index.tsx", failures);
  validatePath(containerDir, "simulation/simulation.test.ts", "simulation/simulation.test.ts", failures);

  const parsed = parseYamlFile(join(containerDir, manifest.simulation.spec), failures, manifest.simulation.spec);
  let hasSimPredict = false;
  if (parsed !== null) {
    const result = schemas.SimulationSpec.safeParse(parsed);
    if (!result.success) {
      failures.push(`${manifest.simulation.spec} failed SimulationSpec: ${formatZodIssues(result.error)}`);
    } else {
      hasSimPredict = result.data.predict !== undefined;
      validateKernelDeps(result.data.kernel_deps, manifest.simulation.spec, failures);
    }
  }

  const testPath = join(containerDir, "simulation", "simulation.test.ts");
  if (isFile(testPath) && (manifest.package_predict !== undefined || hasSimPredict)) {
    const test = readFileSync(testPath, "utf8");
    if (!test.includes("prediction-gate")) {
      failures.push("simulation/simulation.test.ts does not contain the literal string `prediction-gate`");
    }
  }
}

function validateEmbed(containerDir, manifest, failures) {
  if (manifest === null) return;
  validatePath(containerDir, manifest.components.embed, "components.embed", failures, "dir");
  validatePath(containerDir, manifest.embed_api.entry, "embed_api.entry", failures);
  validatePath(containerDir, manifest.embed_api.api, "embed_api.api", failures);

  const apiPath = join(containerDir, manifest.embed_api.api);
  const entryPath = join(containerDir, manifest.embed_api.entry);
  const apiText = isFile(apiPath) ? readFileSync(apiPath, "utf8") : "";
  const entryText = isFile(entryPath) ? readFileSync(entryPath, "utf8") : "";
  for (const method of REQUIRED_EMBED_METHODS) {
    if (!apiText.includes(method) && !entryText.includes(method)) {
      failures.push(`embed API files do not define or export required method \`${method}\``);
    }
  }
}

function validateMedia(containerDir, manifest, failures) {
  if (manifest === null) return;
  validatePath(containerDir, manifest.components.media, "components.media", failures, "dir");
  if (!isFile(join(containerDir, manifest.components.media, "thumbnail.svg"))) {
    failures.push("media/thumbnail.svg is missing");
  }
  if (!isFile(join(containerDir, manifest.components.media, "fallback.svg"))) {
    failures.push("media/fallback.svg is missing");
  }
}

function validateProblemSolving(containerDir, manifest, failures) {
  if (manifest === null) return;
  validatePath(containerDir, manifest.components.problem_solving, "components.problem_solving", failures, "dir");
  validatePath(containerDir, manifest.problem_solving.algorithm, "problem_solving.algorithm", failures);
  validatePath(containerDir, manifest.problem_solving.steps, "problem_solving.steps", failures);
  for (const problem of manifest.transfer_problems) {
    const rubricPath = problem.rubric_path ?? `problem-solving/${problem.id}.md`;
    validatePath(containerDir, rubricPath, `transfer_problems.${problem.id}.rubric_path`, failures);
  }
}

function validateComponentPaths(containerDir, manifest, failures) {
  if (manifest === null) return;
  validatePath(containerDir, manifest.components.concept_card, "components.concept_card", failures);
  validatePath(containerDir, manifest.components.concept_map, "components.concept_map", failures);
  validatePath(containerDir, manifest.components.mindmap, "components.mindmap", failures);
  validatePath(containerDir, manifest.components.mermaid, "components.mermaid", failures);
  if (manifest.components.sources) validatePath(containerDir, manifest.components.sources, "components.sources", failures);
}

function validateContainer(containerDir) {
  const failures = [];
  validateRequiredShape(containerDir, failures);
  const manifest = isFile(join(containerDir, "container.yaml"))
    ? validateContainerManifest(containerDir, failures)
    : null;
  validateComponentPaths(containerDir, manifest, failures);
  validateConceptCard(containerDir, manifest, failures);
  validateConceptMap(containerDir, manifest, failures);
  validateSimulation(containerDir, manifest, failures);
  validateEmbed(containerDir, manifest, failures);
  validateMedia(containerDir, manifest, failures);
  validateProblemSolving(containerDir, manifest, failures);
  validateTechnical(containerDir, manifest, failures);
  return { container: relative(REPO_ROOT, containerDir), failures };
}

async function main() {
  await loadSchemas();
  const containers = findContainers();

  if (containers.length === 0) {
    process.stdout.write("validate-containers: no containers found; nothing to validate.\n");
    return;
  }

  const results = containers.map(validateContainer);
  const failed = results.filter((result) => result.failures.length > 0);

  if (failed.length > 0) {
    process.stderr.write(`validate-containers: ${failed.length}/${containers.length} container(s) FAILED.\n\n`);
    for (const result of failed) {
      process.stderr.write(`✗ ${result.container}\n`);
      for (const failure of result.failures) process.stderr.write(`  - ${failure}\n`);
      process.stderr.write("\n");
    }
    process.exit(1);
  }

  process.stdout.write(`validate-containers: OK — ${containers.length} container(s) passed.\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`validate-containers: ${message}\n`);
  process.exit(1);
});
