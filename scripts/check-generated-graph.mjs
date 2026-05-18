#!/usr/bin/env node
/**
 * CI guard for generated shell graph and sim registry data.
 *
 * Runs the generator, then fails if any generated output changed. This keeps
 * contributors from editing container manifests without committing the derived
 * app data used by shells and the sim harness.
 */

import { spawnSync } from "node:child_process";
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

const generated = run(process.execPath, [generator]);
process.stdout.write(generated.stdout);
process.stderr.write(generated.stderr);

if (generated.status !== 0) {
  process.exit(generated.status ?? 1);
}

const status = run("git", ["status", "--short", "--", ...generatedTargets]);
process.stdout.write(status.stdout);
process.stderr.write(status.stderr);

if (status.status !== 0) {
  process.exit(status.status ?? 1);
}

if (status.stdout.trim().length > 0) {
  process.stderr.write(
    [
      "Generated graph data is stale.",
      "Run `pnpm graph:generate`, commit the generated files, and retry.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
