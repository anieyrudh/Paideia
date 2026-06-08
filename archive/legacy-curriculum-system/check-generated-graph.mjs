#!/usr/bin/env node
/**
 * CI guard for generated shell graph and sim registry data.
 *
 * Runs the generator, then fails if any generated output changed. This keeps
 * contributors from editing container manifests without committing the derived
 * app data used by shells and the sim harness.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const generator = resolve(REPO_ROOT, "scripts", "generate-knowledge-graph.mjs");
const generatedTargets = [
  "a-level/apps/shell/src/generated/knowledge-graph.tsx",
  "sutd/apps/shell/src/generated/knowledge-graph.tsx",
  "testing/sim-harness/src/generated/sim-registry.tsx",
];

const run = (command, args) =>
  spawnSync(command, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const fileDigest = (path) => {
  if (!existsSync(path)) return null;
  return createHash("sha256").update(readFileSync(path)).digest("hex");
};

const before = new Map(generatedTargets.map((target) => [target, fileDigest(resolve(REPO_ROOT, target))]));
const generated = run(process.execPath, [generator]);
process.stdout.write(generated.stdout);
process.stderr.write(generated.stderr);

if (generated.status !== 0) {
  process.exit(generated.status ?? 1);
}

const changedByGenerator = generatedTargets.filter(
  (target) => before.get(target) !== fileDigest(resolve(REPO_ROOT, target)),
);

if (changedByGenerator.length > 0) {
  for (const target of changedByGenerator) process.stderr.write(` M ${target}\n`);
  process.stderr.write(
    [
      "Generated graph data is stale.",
      "Run `pnpm graph:generate`, include the generated files in your PR, and retry.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
