#!/usr/bin/env node
/**
 * generate-container-docs.mjs
 *
 * Regenerate container README.md and TECHNICAL.md from canonical container
 * sources. Use this for existing containers; `pnpm container:new` only
 * scaffolds fresh containers and refuses to overwrite.
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import YAML from "yaml";

const REPO_ROOT = resolve(process.cwd());
const BRANCHES = ["a-level", "sutd"];
const ARGS = process.argv.slice(2);
const ALLOWED_FLAGS = new Set(["--check", "--help", "-h"]);
const UNKNOWN_FLAGS = ARGS.filter((arg) => arg.startsWith("-") && !ALLOWED_FLAGS.has(arg));
const CHECK = ARGS.includes("--check");
const HELP = ARGS.includes("--help") || ARGS.includes("-h");
const TARGETS = ARGS.filter((arg) => !arg.startsWith("-"));

function usage() {
  process.stdout.write(`Usage:
  pnpm container:docs [--check] [container-path ...]

Examples:
  pnpm container:docs
  pnpm container:docs a-level/content/physics/containers/scalars-and-vectors
  pnpm container:docs --check
`);
}

if (HELP) {
  usage();
  process.exit(0);
}

if (UNKNOWN_FLAGS.length > 0) {
  process.stderr.write(`container:docs: unknown option(s): ${UNKNOWN_FLAGS.join(", ")}\n`);
  usage();
  process.exit(1);
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function parseYaml(path) {
  return YAML.parse(readText(path));
}

function findContainers() {
  const containers = [];
  for (const branch of BRANCHES) {
    const contentDir = join(REPO_ROOT, branch, "content");
    if (!isDirectory(contentDir)) continue;

    for (const subject of readdirSync(contentDir)) {
      const containersDir = join(contentDir, subject, "containers");
      if (!isDirectory(containersDir)) continue;
      for (const conceptId of readdirSync(containersDir)) {
        const containerDir = join(containersDir, conceptId);
        if (isDirectory(containerDir) && isFile(join(containerDir, "container.yaml"))) {
          containers.push(containerDir);
        }
      }
    }
  }
  return containers.sort();
}

function resolveTargets() {
  if (TARGETS.length === 0) return findContainers();
  return TARGETS.map((target) => resolve(REPO_ROOT, target));
}

function safeRead(containerDir, relativePath) {
  if (!relativePath) return "";
  const absolute = join(containerDir, relativePath);
  return isFile(absolute) ? readText(absolute) : "";
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function yamlBlock(value) {
  return YAML.stringify(value, { lineWidth: 0 }).trimEnd();
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*/, "").trim();
}

function extractSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^##\\s+${escaped}\\s*$`, "im"));
  if (!match) return "";
  const start = (match.index ?? 0) + match[0].length;
  const after = markdown.slice(start);
  const next = after.search(/^##\s+/m);
  return (next === -1 ? after : after.slice(0, next)).trim();
}

function firstParagraph(text) {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .find((part) => part.length > 0 && !part.startsWith("- "))
    ?.replace(/\n/g, " ") ?? "";
}

function sectionBody(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^##\\s+${escaped}\\s*$`, "im"));
  if (!match) return null;
  const start = (match.index ?? 0) + match[0].length;
  const after = markdown.slice(start);
  const next = after.search(/^##\s+/m);
  return (next === -1 ? after : after.slice(0, next)).trim();
}

function preserveSection(existing, heading, fallback) {
  const body = sectionBody(existing, heading);
  if (body === null || body.length === 0) return fallback;
  return `## ${heading}\n\n${body}`;
}

function bulletList(items, fallback = "- None declared.") {
  return items.length > 0 ? items.map((item) => `  - ${item}`).join("\n") : `  ${fallback}`;
}

function maybeLink(path) {
  return path ? `\`${path}\`` : "`not declared`";
}

function readSimulation(containerDir, manifest) {
  if (!manifest.simulation?.spec) return null;
  const absolute = join(containerDir, manifest.simulation.spec);
  return isFile(absolute) ? parseYaml(absolute) : null;
}

function containerRelative(containerDir) {
  return relative(REPO_ROOT, containerDir);
}

function renderReadme(containerDir, manifest, conceptMarkdown, simulation) {
  const firstPrinciples = firstParagraph(extractSection(conceptMarkdown, "First-Principles Explanation"));
  const simRows = simulation
    ? `| ${simulation.id} | ${simulation.title ?? simulation.id} | ${simulation.interaction_type ?? "unspecified"} |`
    : "| None declared | None declared | None declared |";
  const sourceCount = asList(manifest.sources).length;
  const controlCount = asList(simulation?.manipulate?.controls).length;
  const controlLabel = controlCount === 1 ? "1 declared control" : `${controlCount} declared controls`;
  const prerequisites = bulletList(asList(manifest.prerequisites).map((item) => `\`${item}\``));
  const transfers = bulletList(
    asList(manifest.transfer_problems).map(
      (problem) => `\`${problem.id}\` - ${problem.surface_form ?? "transfer problem"}`,
    ),
  );
  const whatStudentDoes = simulation
    ? [
        simulation.predict?.prompt ? "1. Commit a prediction before the reveal." : "1. Start from the declared simulation state.",
        `2. Manipulate ${controlLabel}.`,
        `3. Observe ${asList(simulation.observe?.renderers).map((renderer) => renderer.id).join(", ") || "the declared renderer"}.`,
        simulation.explain?.prompt ? "4. Explain the result using the generated prompt and misconception map." : "4. Transfer the result through the problem-solving surface.",
      ].join("\n")
    : "The learner uses the concept card, concept map, and problem-solving algorithm. No interactive simulation is declared yet.";

  return `# ${manifest.title}

> **Auto-generated by \`pnpm container:docs\`. Do not edit by hand.**
> Source: \`container.yaml\`, \`concept-card.md\`, \`concept-map/\`, \`simulation/\`, \`problem-solving/\`, \`sources.md\`.

## What this teaches

${manifest.one_line_summary}

${firstPrinciples || "_No first-principles paragraph found in concept-card.md._"}

## What the student does

${whatStudentDoes}

## Simulation in this container

| Sim id | Title | Interaction type |
|---|---|---|
${simRows}

## Concept map and problem-solving

- Concept map: ${maybeLink(manifest.concept_map?.spec)}
- Mindmap: ${maybeLink(manifest.concept_map?.mindmap)}
- Problem-solving algorithm: ${maybeLink(manifest.problem_solving?.algorithm)}
- Transfer problems:
${transfers}

## Citations and provenance

- Source records in \`container.yaml\`: ${sourceCount}
- Human-readable source file: ${isFile(join(containerDir, "sources.md")) ? "`sources.md`" : "`sources.md` missing"}
- Original container path: \`${containerRelative(containerDir)}\`

## Author + date + advisor sign-offs

- **Author(s):** ${asList(manifest.authors).join(", ") || "Not declared"}
- **Owner:** ${manifest.authoring?.owner ?? "Not declared"}
- **Status:** ${manifest.status}
- **QA status:** ${manifest.authoring?.qa_status ?? "Not declared"}
- **Advisor sign-offs:** ${asList(manifest.advisor_signoffs).length}

## Where to next

- Prerequisites:
${prerequisites}
- Dependency graph: ${maybeLink(manifest.authoring?.dependency_graph)}
`;
}

function renderTechnical(containerDir, manifest, simulation, existingTechnical) {
  const kernelDeps = asList(simulation?.kernel_deps);
  const simulationSpec = simulation ? yamlBlock(simulation) : "# No simulation declared.";
  const importsRows = simulation
    ? kernelDeps.map((dep) => `| ${simulation.id} | \`${dep}\` | Declared in \`${manifest.simulation.spec}\` |`).join("\n")
    : "| None | None | No simulation declared |";
  const preservedFilter = preserveSection(
    existingTechnical,
    "Anieyrudh Filter pass",
    `## Anieyrudh Filter pass

Date: ${manifest.review?.anieyrudh_filter?.last_run ?? manifest.filter_pass?.date ?? "TBD"}
Filter version: aniegpt v1.0

### P0 issues

- No generated Filter output recorded yet.

### P1 issues

- No generated P1 disposition recorded yet.

### High-bandwidth questions surfaced

- None recorded.`,
  );
  const preservedIteration = preserveSection(
    existingTechnical,
    "Iteration log",
    `## Iteration log

- Regenerated README.md and TECHNICAL.md with \`pnpm container:docs\`.`,
  );
  const optionalPreserved = [
    "Simulation Contract",
    "Kernel Boundaries",
    "Prediction-Gate Self-Review",
    "Student UI Copy Review",
    "Product-Slice Quality Review",
    "Validation Notes",
    "Failures and Fixes Recorded",
    "Failure log",
    "Deferred fixes",
    "Candidate Integration Review",
    "Latest Validation",
  ]
    .map((heading) => preserveSection(existingTechnical, heading, ""))
    .filter((section) => section.length > 0)
    .join("\n\n");

  return `# ${manifest.title} · Technical Record

> **Auto-generated by \`pnpm container:docs\`. Updated by every product PR.**
> Source: \`container.yaml\`, sim source declarations, and preserved review sections.

## Architecture

- Container path: \`${containerRelative(containerDir)}\`
- Status: \`${manifest.status}\`
- Concept card: ${maybeLink(manifest.components?.concept_card)}
- Concept map: ${maybeLink(manifest.concept_map?.spec)}
- Simulation spec: ${simulation ? maybeLink(manifest.simulation?.spec) : "`not declared`"}
- Embed API: ${maybeLink(manifest.embed_api?.api)}
- Problem-solving algorithm: ${maybeLink(manifest.problem_solving?.algorithm)}

## Imports

| Sim | Module | Symbols / role |
|---|---|---|
${importsRows}

## SimulationSpec (frozen)

Full validated YAML for the declared sim in this container at the time of last docs regeneration.

\`\`\`yaml
${simulationSpec}
\`\`\`

## Kernel extensions

${kernelDeps.length > 0
  ? "No core-change proposal is declared in this container. Kernel use is limited to declared dependencies above."
  : "None. No simulation kernel dependencies are declared."}

## Accessibility

- Prediction gate contract: ${manifest.package_predict || simulation?.predict ? "required and tested when the sim is registered." : "not declared."}
- Route-level axe coverage: record the latest shell or container-specific result in the preserved review section below.
- Media fallback: ${isFile(join(containerDir, "media", "fallback.svg")) ? "`media/fallback.svg` present." : "missing."}

## Tests

- Container validation: \`pnpm container:validate ${containerRelative(containerDir)}\`
- Docs regeneration: \`pnpm container:docs ${containerRelative(containerDir)}\`
- Prediction-gate test: ${simulation ? maybeLink("simulation/simulation.test.ts") : "`not declared`"}
- Package or shell tests: record exact commands in the preserved validation section below.

## How to run locally

\`\`\`bash
pnpm container:docs ${containerRelative(containerDir)}
pnpm container:validate ${containerRelative(containerDir)}
pnpm graph:generate
\`\`\`

${optionalPreserved ? `${optionalPreserved}\n\n` : ""}${preservedFilter}

${preservedIteration}
`;
}

function generate(containerDir) {
  if (!isDirectory(containerDir) || !isFile(join(containerDir, "container.yaml"))) {
    throw new Error(`Not a container directory: ${containerDir}`);
  }

  const manifest = parseYaml(join(containerDir, "container.yaml"));
  const conceptMarkdown = stripFrontmatter(safeRead(containerDir, manifest.components?.concept_card ?? "concept-card.md"));
  const simulation = readSimulation(containerDir, manifest);
  const existingTechnical = safeRead(containerDir, "TECHNICAL.md");

  return {
    readme: renderReadme(containerDir, manifest, conceptMarkdown, simulation),
    technical: renderTechnical(containerDir, manifest, simulation, existingTechnical),
  };
}

const failures = [];
let changed = 0;

for (const containerDir of resolveTargets()) {
  try {
    const generated = generate(containerDir);
    const readmePath = join(containerDir, "README.md");
    const technicalPath = join(containerDir, "TECHNICAL.md");
    const currentReadme = isFile(readmePath) ? readText(readmePath) : "";
    const currentTechnical = isFile(technicalPath) ? readText(technicalPath) : "";
    const nextReadme = `${generated.readme.trimEnd()}\n`;
    const nextTechnical = `${generated.technical.trimEnd()}\n`;
    const stale = currentReadme !== nextReadme || currentTechnical !== nextTechnical;

    if (CHECK) {
      if (stale) failures.push(`${containerRelative(containerDir)} docs are stale`);
    } else if (stale) {
      writeFileSync(readmePath, nextReadme);
      writeFileSync(technicalPath, nextTechnical);
      changed += 1;
      process.stdout.write(`container:docs regenerated ${containerRelative(containerDir)}\n`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(message);
  }
}

if (failures.length > 0) {
  for (const failure of failures) process.stderr.write(`container:docs: ${failure}\n`);
  process.exit(1);
}

if (CHECK) {
  process.stdout.write("container:docs: all container docs are current.\n");
} else if (changed === 0) {
  process.stdout.write("container:docs: no changes.\n");
}
