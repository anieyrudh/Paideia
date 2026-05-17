#!/usr/bin/env node
/**
 * Validate agent-facing docs and skill mirrors.
 *
 * The repo supports Codex and Claude Code users with little technical setup.
 * Stale skill instructions are worse than missing ones, so this script blocks
 * old container-v1 paths and drift between the two skill mirrors.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());
const AGENTS_SKILLS = join(REPO_ROOT, ".agents", "skills");
const CLAUDE_SKILLS = join(REPO_ROOT, ".claude", "skills");

const requiredFiles = [
  "docs/agent-workflows.md",
  "docs/dependency-clean-room.md",
  "docs/product/container-roadmap.md",
  ".agents/skills/new-kernel/SKILL.md",
  ".claude/skills/new-kernel/SKILL.md",
];

const stalePatterns = [
  {
    pattern: /concept-package\.yaml/g,
    message: "Use container.yaml for v2 containers.",
  },
  {
    pattern: /concept-packages\//g,
    message: "Use <branch>/content/<subject>/containers/<concept-id>/.",
  },
  {
    pattern: /\/sims\//g,
    message: "Use the v2 container simulation/ directory.",
  },
  {
    pattern: /SimulationSpec\.yaml/g,
    message: "Use simulation/simulation.yaml.",
  },
];

const failures = [];

const fail = (message) => failures.push(message);

const read = (path) => readFileSync(path, "utf8");

const walkFiles = (dir) => {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walkFiles(path));
    else out.push(path);
  }
  return out.sort();
};

for (const file of requiredFiles) {
  if (!existsSync(join(REPO_ROOT, file))) fail(`missing required agent doc: ${file}`);
}

const agentFiles = walkFiles(AGENTS_SKILLS).map((path) => relative(AGENTS_SKILLS, path));
const claudeFiles = walkFiles(CLAUDE_SKILLS).map((path) => relative(CLAUDE_SKILLS, path));

if (agentFiles.join("\n") !== claudeFiles.join("\n")) {
  fail(".agents/skills and .claude/skills do not contain the same files");
}

for (const file of agentFiles) {
  const agentPath = join(AGENTS_SKILLS, file);
  const claudePath = join(CLAUDE_SKILLS, file);
  if (!existsSync(claudePath)) continue;
  if (read(agentPath) !== read(claudePath)) {
    fail(`skill mirror drift: ${relative(REPO_ROOT, agentPath)} differs from ${relative(REPO_ROOT, claudePath)}`);
  }
}

const scannedPromptFiles = [
  ...walkFiles(AGENTS_SKILLS),
  ...walkFiles(CLAUDE_SKILLS),
  ...walkFiles(join(REPO_ROOT, ".claude", "agents")),
  ...walkFiles(join(REPO_ROOT, ".codex", "agents")),
  join(REPO_ROOT, "docs", "agent-workflows.md"),
  join(REPO_ROOT, "README.md"),
  join(REPO_ROOT, "CONTRIBUTING.md"),
  join(REPO_ROOT, "core", "docs-templates", "TECHNICAL.template.md"),
];

for (const path of scannedPromptFiles) {
  if (!existsSync(path)) continue;
  const text = read(path);
  for (const { pattern, message } of stalePatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      fail(`${relative(REPO_ROOT, path)} contains stale instruction ${pattern}: ${message}`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`validate-agent-docs: ${failures.length} failure(s)\n`);
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exit(1);
}

process.stdout.write("validate-agent-docs: OK\n");
