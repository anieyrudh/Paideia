#!/usr/bin/env node
/**
 * validate-containers.mjs
 *
 * Walks every ConceptPackage container under:
 *   <branch>/content/<subject>/concept-packages/<package-id>/
 * and validates it against docs/container-spec.md §1.
 *
 * Checks performed per container:
 *   1. Required top-level files exist with EXACT names:
 *        concept-package.yaml
 *        concept-card.md
 *        sources.md
 *        README.md
 *        TECHNICAL.md
 *      and a `sims/` directory (may be empty).
 *   2. concept-package.yaml parses (regex sanity check; full Zod validation is
 *      delegated to core/content-schema once that package is built).
 *   3. For each sims/<sim-id>/:
 *        - SimulationSpec.yaml exists
 *        - At least one *.test.ts file exists AND contains the literal
 *          string `prediction-gate`.
 *   4. TECHNICAL.md contains a non-empty section starting with
 *      `## Anieyrudh Filter pass`.
 *   5. concept-card.md has YAML frontmatter delimited by `---`.
 *
 * Exit codes:
 *   0 — all containers passed (or no containers found)
 *   1 — at least one container failed
 *
 * No external dependencies — uses only Node built-ins.
 *
 * TODO: integrate Zod schema once core/content-schema is built. At that point,
 * the regex sanity check on concept-package.yaml is replaced with full
 * ConceptPackageSpec.parse() validation.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve, basename } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const BRANCHES = ["a-level", "sutd"];

const REQUIRED_FILES = [
  "concept-package.yaml",
  "concept-card.md",
  "sources.md",
  "README.md",
  "TECHNICAL.md"
];

/**
 * Recursively find every concept-packages/<package-id>/ directory.
 * Returns absolute paths.
 */
function findContainers() {
  const containers = [];
  for (const branch of BRANCHES) {
    const contentDir = join(REPO_ROOT, branch, "content");
    if (!existsSync(contentDir)) continue;
    if (!statSync(contentDir).isDirectory()) continue;

    // <branch>/content/<subject>/concept-packages/<package-id>/
    for (const subject of readdirSync(contentDir)) {
      const subjectDir = join(contentDir, subject);
      if (!statSync(subjectDir).isDirectory()) continue;

      const packagesDir = join(subjectDir, "concept-packages");
      if (!existsSync(packagesDir)) continue;
      if (!statSync(packagesDir).isDirectory()) continue;

      for (const pkg of readdirSync(packagesDir)) {
        const pkgDir = join(packagesDir, pkg);
        if (statSync(pkgDir).isDirectory()) {
          containers.push(pkgDir);
        }
      }
    }
  }
  return containers;
}

/**
 * Validate a single container directory.
 * Returns an array of human-readable failure strings (empty = pass).
 */
function validateContainer(containerDir) {
  const failures = [];
  const rel = relative(REPO_ROOT, containerDir);

  // 1. Required top-level files
  for (const filename of REQUIRED_FILES) {
    const fp = join(containerDir, filename);
    if (!existsSync(fp) || !statSync(fp).isFile()) {
      failures.push(`Missing required file: ${filename}`);
    }
  }

  // sims/ directory must exist (may be empty)
  const simsDir = join(containerDir, "sims");
  if (!existsSync(simsDir) || !statSync(simsDir).isDirectory()) {
    failures.push("Missing required directory: sims/");
  }

  // 2. concept-package.yaml sanity check
  const cpYaml = join(containerDir, "concept-package.yaml");
  if (existsSync(cpYaml)) {
    const raw = readFileSync(cpYaml, "utf8");
    if (raw.trim().length === 0) {
      failures.push("concept-package.yaml is empty");
    } else {
      // Regex sanity: must contain an `id:` field and a `status:` field at root.
      // TODO: replace with Zod ConceptPackageSpec.parse() once core/content-schema is built.
      if (!/^id\s*:\s*\S+/m.test(raw)) {
        failures.push("concept-package.yaml does not declare an `id:` field");
      }
      if (!/^status\s*:\s*\S+/m.test(raw)) {
        failures.push("concept-package.yaml does not declare a `status:` field");
      }
    }
  }

  // 3. Each sims/<sim-id>/ must have SimulationSpec.yaml and a *.test.ts with `prediction-gate`
  if (existsSync(simsDir) && statSync(simsDir).isDirectory()) {
    for (const simId of readdirSync(simsDir)) {
      const simDir = join(simsDir, simId);
      if (!statSync(simDir).isDirectory()) continue;

      const specPath = join(simDir, "SimulationSpec.yaml");
      if (!existsSync(specPath) || !statSync(specPath).isFile()) {
        failures.push(`sims/${simId}/SimulationSpec.yaml is missing`);
      }

      const testFiles = readdirSync(simDir).filter(
        (f) => f.endsWith(".test.ts") && statSync(join(simDir, f)).isFile()
      );
      if (testFiles.length === 0) {
        failures.push(`sims/${simId}/ has no *.test.ts file`);
      } else {
        const anyHasGate = testFiles.some((f) => {
          const body = readFileSync(join(simDir, f), "utf8");
          return body.includes("prediction-gate");
        });
        if (!anyHasGate) {
          failures.push(
            `sims/${simId}/ has *.test.ts files, but none contain the literal string \`prediction-gate\``
          );
        }
      }
    }
  }

  // 4. TECHNICAL.md must contain a non-empty `## Anieyrudh Filter pass` section
  const techPath = join(containerDir, "TECHNICAL.md");
  if (existsSync(techPath)) {
    const tech = readFileSync(techPath, "utf8");
    const headerRegex = /^##\s+Anieyrudh Filter pass\s*$/m;
    const match = tech.match(headerRegex);
    if (!match) {
      failures.push(
        "TECHNICAL.md is missing the `## Anieyrudh Filter pass` section header"
      );
    } else {
      // Extract content between this header and the next `## ` header (or EOF).
      const startIdx = (match.index ?? 0) + match[0].length;
      const after = tech.slice(startIdx);
      const nextHeader = after.search(/^##\s+/m);
      const sectionBody = nextHeader === -1 ? after : after.slice(0, nextHeader);
      if (sectionBody.trim().length === 0) {
        failures.push(
          "TECHNICAL.md `## Anieyrudh Filter pass` section is empty — must record P0/P1 items + resolution before merge"
        );
      }
    }
  }

  // 5. concept-card.md must have YAML frontmatter delimited by `---`
  const cardPath = join(containerDir, "concept-card.md");
  if (existsSync(cardPath)) {
    const card = readFileSync(cardPath, "utf8");
    // Frontmatter must start at the very top with `---` on its own line, then close with another `---`.
    if (!/^---\s*\n[\s\S]*?\n---\s*(\n|$)/.test(card)) {
      failures.push(
        "concept-card.md is missing YAML frontmatter delimited by `---` at the top of the file"
      );
    }
  }

  return { container: rel, failures };
}

function main() {
  const containers = findContainers();

  if (containers.length === 0) {
    process.stdout.write("validate-containers: no containers found; nothing to validate.\n");
    process.exit(0);
  }

  const results = containers.map(validateContainer);
  const failed = results.filter((r) => r.failures.length > 0);

  if (failed.length > 0) {
    process.stderr.write(
      `validate-containers: ${failed.length}/${containers.length} container(s) FAILED.\n\n`
    );
    for (const r of failed) {
      process.stderr.write(`✗ ${r.container}\n`);
      for (const f of r.failures) {
        process.stderr.write(`    - ${f}\n`);
      }
      process.stderr.write("\n");
    }
    process.exit(1);
  }

  process.stdout.write(
    `validate-containers: OK — ${containers.length} container(s) passed.\n`
  );
  process.exit(0);
}

main();
