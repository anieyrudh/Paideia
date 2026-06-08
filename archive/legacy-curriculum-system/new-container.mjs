#!/usr/bin/env node
/**
 * new-container.mjs
 *
 * Interactive scaffolder for a fresh v2 container.
 *
 * Usage:
 *   pnpm container:new
 *   # or
 *   node scripts/new-container.mjs
 *
 * Prompts (in order):
 *   1. Branch              — must be `a-level` or `sutd`.
 *   2. Subject             — kebab-case (e.g. `physics`, `general-paper`).
 *   3. Concept id          — kebab-case (e.g. `simple-harmonic-motion`).
 *   4. Title               — human-readable title (e.g. "Simple Harmonic Motion").
 *
 * Produces the canonical container directory exactly as defined in
 * docs/container-spec.md §1 by copying every file from core/docs-templates/
 * and performing the following `<PLACEHOLDER>` substitutions:
 *
 *   <BRANCH>     → branch (a-level | sutd)
 *   <SUBJECT>    → subject (kebab-case)
 *   <PACKAGE_ID> → concept id (kebab-case)
 *   <TITLE>      → human-readable title
 *   <DATE>       → today's date in YYYY-MM-DD
 *   <AUTHOR>     → contents of $PAIDEIA_AUTHOR env var, or "TBD"
 *
 * The script refuses to overwrite an existing container.
 *
 * No external dependencies — uses only Node built-ins.
 */

import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync
} from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const TEMPLATES_DIR = join(REPO_ROOT, "core", "docs-templates");

const VALID_BRANCHES = new Set(["a-level", "sutd"]);
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function ask(rl, question) {
  return new Promise((resolveP) => {
    rl.question(question, (answer) => resolveP(answer.trim()));
  });
}

function applySubstitutions(text, ctx) {
  return text
    .replace(/<BRANCH>/g, ctx.branch)
    .replace(/<SUBJECT>/g, ctx.subject)
    .replace(/<PACKAGE_ID>/g, ctx.packageId)
    .replace(/<SIM_ID>/g, ctx.simId || ctx.packageId)
    .replace(/<SimComponent>/g, ctx.simComponent || toPascalCase(ctx.packageId))
    .replace(/<LEVEL>/g, ctx.level || "TBD")
    .replace(/<MODULE>/g, ctx.module || ctx.subject)
    .replace(/<TITLE>/g, ctx.title)
    .replace(/<DATE>/g, ctx.date)
    .replace(/<AUTHOR>/g, ctx.author);
}

function toPascalCase(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Map template filenames in core/docs-templates/ to their destination
 * inside the new container. Anything ending in `.template.<ext>` becomes
 * the matching canonical filename per docs/container-spec.md §2.
 */
const TEMPLATE_TO_DESTINATION = {
  "container.template.yaml": "container.yaml",
  "concept-card.template.md": "concept-card.md",
  "sources.template.md": "sources.md",
  "concept-map.template.yaml": "concept-map/concept-map.yaml",
  "mindmap.template.md": "concept-map/mindmap.md",
  "graph.template.mmd": "concept-map/graph.mmd",
  "embed-api.template.ts": "embed/api.ts",
  "embed-index.template.ts": "embed/index.ts",
  "embed-test.template.ts": "embed/embed.test.ts",
  "media-fallback.template.svg": "media/fallback.svg",
  "media-thumbnail.template.svg": "media/thumbnail.svg",
  "problem-algorithm.template.md": "problem-solving/algorithm.md",
  "problem-steps.template.yaml": "problem-solving/steps.yaml",
  "simulation-controls.template.yaml": "simulation/controls.yaml",
  "simulation-presets.template.yaml": "simulation/presets.yaml",
  "simulation-runtime.template.yaml": "simulation/runtime.yaml",
  "simulation-state-labels.template.yaml": "simulation/state-labels.yaml",
  "README.template.md": "README.md",
  "TECHNICAL.template.md": "TECHNICAL.md"
};

const SIM_TEMPLATE_TO_DESTINATION = {
  "simulation-spec.template.yaml": "simulation.yaml",
  "sim-index.template.tsx": "index.tsx",
  "sim-test.template.ts": "simulation.test.ts"
};

async function main() {
  if (!existsSync(TEMPLATES_DIR)) {
    process.stderr.write(
      `new-container: templates directory not found at ${TEMPLATES_DIR}.\nCannot scaffold without core/docs-templates/. Aborting.\n`
    );
    process.exit(1);
  }

  const rl = createInterface({ input, output });

  let branch = "";
  while (!VALID_BRANCHES.has(branch)) {
    branch = (await ask(rl, "Branch (a-level / sutd): ")).toLowerCase();
    if (!VALID_BRANCHES.has(branch)) {
      process.stderr.write(`  invalid branch — must be one of: ${[...VALID_BRANCHES].join(", ")}\n`);
    }
  }

  let subject = "";
  while (!KEBAB.test(subject)) {
    subject = (await ask(rl, "Subject (kebab-case, e.g. physics): ")).toLowerCase();
    if (!KEBAB.test(subject)) {
      process.stderr.write("  must be kebab-case (lowercase letters / digits / hyphens)\n");
    }
  }

  let packageId = "";
  while (!KEBAB.test(packageId)) {
    packageId = (await ask(
      rl,
      "Concept id (kebab-case, e.g. simple-harmonic-motion): "
    )).toLowerCase();
    if (!KEBAB.test(packageId)) {
      process.stderr.write("  must be kebab-case (lowercase letters / digits / hyphens)\n");
    }
  }

  let title = "";
  while (title.length === 0) {
    title = await ask(rl, "Title (human-readable, e.g. Simple Harmonic Motion): ");
    if (title.length === 0) {
      process.stderr.write("  title must be non-empty\n");
    }
  }

  rl.close();

  const ctx = {
    branch,
    subject,
    packageId,
    title,
    level: "TBD",
    module: subject,
    date: new Date().toISOString().slice(0, 10),
    author: process.env.PAIDEIA_AUTHOR || "TBD",
    simComponent: toPascalCase(packageId)
  };

  const containerDir = join(
    REPO_ROOT,
    branch,
    "content",
    subject,
    "containers",
    packageId
  );

  if (existsSync(containerDir)) {
    process.stderr.write(
      `new-container: container directory already exists at ${containerDir}\nRefusing to overwrite.\n`
    );
    process.exit(1);
  }

  // Create the canonical tree.
  mkdirSync(containerDir, { recursive: true });
  for (const dirname of ["concept-map", "simulation", "embed", "media", "problem-solving"]) {
    mkdirSync(join(containerDir, dirname), { recursive: true });
  }

  // Write top-level files from templates.
  let writtenCount = 0;
  for (const [templateName, destName] of Object.entries(TEMPLATE_TO_DESTINATION)) {
    const tplPath = join(TEMPLATES_DIR, templateName);
    if (!existsSync(tplPath)) {
      process.stderr.write(`  warning: template missing, skipping: ${templateName}\n`);
      continue;
    }
    const raw = readFileSync(tplPath, "utf8");
    const destination = join(containerDir, destName);
    mkdirSync(resolve(destination, ".."), { recursive: true });
    writeFileSync(destination, applySubstitutions(raw, ctx), "utf8");
    writtenCount += 1;
  }

  // Scaffold the main interactive simulation with the same id as the concept.
  const starterSimId = packageId;
  const simDir = join(containerDir, "simulation");
  mkdirSync(simDir, { recursive: true });

  for (const [templateName, destName] of Object.entries(SIM_TEMPLATE_TO_DESTINATION)) {
    const tplPath = join(TEMPLATES_DIR, templateName);
    if (!existsSync(tplPath)) {
      process.stderr.write(`  warning: sim template missing, skipping: ${templateName}\n`);
      continue;
    }
    const raw = readFileSync(tplPath, "utf8");
    const simCtx = { ...ctx, simId: starterSimId };
    const rendered = applySubstitutions(raw, simCtx);
    writeFileSync(join(simDir, destName), rendered, "utf8");
    writtenCount += 1;
  }

  process.stdout.write(`\nnew-container: scaffolded ${containerDir}\n`);
  process.stdout.write(`  ${writtenCount} files written.\n\n`);
  process.stdout.write("Next steps:\n");
  process.stdout.write(
    "  Now edit container.yaml, concept-map/, simulation/, embed/, media/, and problem-solving/.\n"
  );
  process.stdout.write(
    "  After that: `pnpm container:validate` to sanity-check before committing.\n"
  );
}

main().catch((err) => {
  process.stderr.write(`new-container: ${err && err.message ? err.message : err}\n`);
  process.exit(1);
});
