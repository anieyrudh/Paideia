#!/usr/bin/env node
/**
 * Check or apply the public contribution bucket layout.
 *
 * Expected path:
 *   contributions/<manifest.subject>/<manifest.slug>/
 *
 * Contributors may start in contributions/_incoming/<slug>/; this script can
 * move that package to the canonical bucket with --write.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import YAML from "yaml";

const REPO_ROOT = resolve(process.cwd());
const CONTRIBUTIONS_DIR = join(REPO_ROOT, "contributions");
const TEMPLATE_DIR = join(CONTRIBUTIONS_DIR, "_template");
const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");
const shouldCheck = args.has("--check") || !shouldWrite;
const failures = [];
const moves = [];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function rel(path) {
  return relative(REPO_ROOT, path);
}

function walkDirectories(dir) {
  if (!isDirectory(dir)) return [];
  const out = [dir];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (isDirectory(path)) out.push(...walkDirectories(path));
  }
  return out;
}

function findContributionPackages() {
  return walkDirectories(CONTRIBUTIONS_DIR)
    .filter((dir) => dir !== TEMPLATE_DIR)
    .filter((dir) => isFile(join(dir, "manifest.yaml")))
    .sort();
}

function readManifest(packageDir) {
  try {
    const parsed = YAML.parse(readFileSync(join(packageDir, "manifest.yaml"), "utf8"));
    if (!isObject(parsed)) throw new Error("manifest must be an object");
    return parsed;
  } catch (error) {
    failures.push(`${rel(packageDir)}: cannot read manifest.yaml (${error.message})`);
    return null;
  }
}

for (const packageDir of findContributionPackages()) {
  const manifest = readManifest(packageDir);
  if (!manifest) continue;
  if (!isNonEmptyString(manifest.subject) || !isNonEmptyString(manifest.slug)) {
    failures.push(`${rel(packageDir)}: manifest.subject and manifest.slug are required for bucket organization`);
    continue;
  }
  if (!SLUG_PATTERN.test(manifest.subject) || !SLUG_PATTERN.test(manifest.slug)) {
    failures.push(`${rel(packageDir)}: manifest.subject and manifest.slug must be lowercase kebab-case`);
    continue;
  }

  const expectedDir = join(CONTRIBUTIONS_DIR, manifest.subject, manifest.slug);
  if (packageDir !== expectedDir) {
    moves.push({ from: packageDir, to: expectedDir });
  }
}

if (failures.length > 0) {
  process.stderr.write(`organize-contributions: ${failures.length} failure(s)\n`);
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exit(1);
}

if (moves.length === 0) {
  process.stdout.write("organize-contributions: OK — all contribution packages are in canonical buckets\n");
  process.exit(0);
}

if (shouldCheck) {
  process.stderr.write("organize-contributions: package(s) are not in canonical buckets\n");
  for (const move of moves) process.stderr.write(`- ${rel(move.from)} -> ${rel(move.to)}\n`);
  process.stderr.write("Run `pnpm contribution:organize -- --write` to move them locally.\n");
  process.exit(1);
}

for (const move of moves) {
  if (existsSync(move.to)) {
    failures.push(`${rel(move.to)} already exists; cannot move ${rel(move.from)}`);
    continue;
  }
  mkdirSync(dirname(move.to), { recursive: true });
  renameSync(move.from, move.to);
  process.stdout.write(`moved ${rel(move.from)} -> ${rel(move.to)}\n`);
}

if (failures.length > 0) {
  process.stderr.write(`organize-contributions: ${failures.length} failure(s)\n`);
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  process.exit(1);
}

process.stdout.write(`organize-contributions: moved ${moves.length} package(s)\n`);
