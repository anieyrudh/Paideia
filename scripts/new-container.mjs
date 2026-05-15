#!/usr/bin/env node
/**
 * new-container.mjs
 *
 * Interactive scaffolder for a fresh ConceptPackage container.
 *
 * Usage:
 *   pnpm container:new
 *   # or
 *   node scripts/new-container.mjs
 *
 * Prompts (in order):
 *   1. Branch              — must be `a-level` or `sutd`.
 *   2. Subject             — kebab-case (e.g. `physics`, `general-paper`).
 *   3. Package id          — kebab-case (e.g. `simple-harmonic-motion`).
 *   4. Title               — human-readable title (e.g. "Simple Harmonic Motion").
 *
 * Produces the canonical container directory exactly as defined in
 * docs/container-spec.md §1 by copying every file from core/docs-templates/
 * and performing the following `<PLACEHOLDER>` substitutions:
 *
 *   <BRANCH>     → branch (a-level | sutd)
 *   <SUBJECT>    → subject (kebab-case)
 *   <PACKAGE_ID> → package id (kebab-case)
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
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  statSync
} from "node:fs";
import { join, resolve, basename } from "node:path";

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
    .replace(/<TITLE>/g, ctx.title)
    .replace(/<DATE>/g, ctx.date)
    .replace(/<AUTHOR>/g, ctx.author);
}

/**
 * Map template filenames in core/docs-templates/ to their destination
 * inside the new container. Anything ending in `.template.<ext>` becomes
 * the matching canonical filename per docs/container-spec.md §2.
 */
const TEMPLATE_TO_DESTINATION = {
  "concept-package.template.yaml": "concept-package.yaml",
  "concept-card.template.md": "concept-card.md",
  "sources.template.md": "sources.md",
  "decision-matrix.template.md": "decision-matrix.md",
  "misconceptions.template.md": "misconceptions.md",
  "README.template.md": "README.md",
  "TECHNICAL.template.md": "TECHNICAL.md"
};

const SIM_TEMPLATE_TO_DESTINATION = {
  "simulation-spec.template.yaml": "SimulationSpec.yaml",
  "sim-index.template.tsx": "index.tsx",
  // <sim-id>.test.ts is rendered separately so we can interpolate the id.
  "sim-test.template.ts": null
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
      "Package id (kebab-case, e.g. simple-harmonic-motion): "
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
    date: new Date().toISOString().slice(0, 10),
    author: process.env.PAIDEIA_AUTHOR || "TBD"
  };

  const containerDir = join(
    REPO_ROOT,
    branch,
    "content",
    subject,
    "concept-packages",
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
  mkdirSync(join(containerDir, "sims"), { recursive: true });

  // Write top-level files from templates.
  let writtenCount = 0;
  for (const [templateName, destName] of Object.entries(TEMPLATE_TO_DESTINATION)) {
    const tplPath = join(TEMPLATES_DIR, templateName);
    if (!existsSync(tplPath)) {
      process.stderr.write(`  warning: template missing, skipping: ${templateName}\n`);
      continue;
    }
    const raw = readFileSync(tplPath, "utf8");
    writeFileSync(join(containerDir, destName), applySubstitutions(raw, ctx), "utf8");
    writtenCount += 1;
  }

  // Scaffold a single starter sim with the same id as the package.
  // Authors can add more sims by hand.
  const starterSimId = packageId;
  const simDir = join(containerDir, "sims", starterSimId);
  mkdirSync(simDir, { recursive: true });

  for (const [templateName, destName] of Object.entries(SIM_TEMPLATE_TO_DESTINATION)) {
    const tplPath = join(TEMPLATES_DIR, templateName);
    if (!existsSync(tplPath)) {
      process.stderr.write(`  warning: sim template missing, skipping: ${templateName}\n`);
      continue;
    }
    const raw = readFileSync(tplPath, "utf8");
    const simCtx = { ...ctx, simId: starterSimId };
    const rendered = applySubstitutions(raw, simCtx).replace(/<SIM_ID>/g, simCtx.simId);
    const finalDest =
      destName === null ? `${starterSimId}.test.ts` : destName;
    writeFileSync(join(simDir, finalDest), rendered, "utf8");
    writtenCount += 1;
  }

  process.stdout.write(`\nnew-container: scaffolded ${containerDir}\n`);
  process.stdout.write(`  ${writtenCount} files written.\n\n`);
  process.stdout.write("Next steps:\n");
  process.stdout.write(
    "  Now edit concept-package.yaml's package_predict, then fill in your first sim's manipulate/observe slots.\n"
  );
  process.stdout.write(
    "  After that: `pnpm container:validate` to sanity-check before committing.\n"
  );
}

main().catch((err) => {
  process.stderr.write(`new-container: ${err && err.message ? err.message : err}\n`);
  process.exit(1);
});
