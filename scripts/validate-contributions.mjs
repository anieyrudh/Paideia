#!/usr/bin/env node
/**
 * Validate lightweight contribution packages.
 *
 * This is the public intake gate. It checks package shape, metadata, obvious
 * source/license gaps, and whether simulation packages include a visible,
 * interactive browser surface. It does not certify educational accuracy.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import YAML from "yaml";

const REPO_ROOT = resolve(process.cwd());
const CONTRIBUTIONS_DIR = join(REPO_ROOT, "contributions");
const TEMPLATE_DIR = join(CONTRIBUTIONS_DIR, "_template");

const PACKAGE_TYPES = new Set(["lesson", "simulation-lesson", "external-embed", "advanced-simulation"]);
const STATUSES = new Set(["draft", "reviewed", "featured"]);
const VISUAL_MARKERS = [/<svg[\s>]/iu, /<canvas[\s>]/iu, /role=["']img["']/iu, /<img[\s>]/iu];
const INTERACTION_MARKERS = [/<input[\s>]/iu, /<button[\s>]/iu, /<select[\s>]/iu, /addEventListener\s*\(/iu, /oninput\s*=/iu, /onclick\s*=/iu];
const INCOMPATIBLE_LICENSE_PATTERN = /\b(?:agpl|gpl|lgpl|proprietary|all rights reserved)\b/iu;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const failures = [];
const warnings = [];

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function rel(path) {
  return relative(REPO_ROOT, path);
}

function fail(path, message) {
  failures.push(`${path}: ${message}`);
}

function warn(path, message) {
  warnings.push(`${path}: ${message}`);
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
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
  const manifestPath = join(packageDir, "manifest.yaml");
  try {
    const parsed = YAML.parse(readText(manifestPath));
    if (!isObject(parsed)) {
      fail(rel(manifestPath), "manifest must be a YAML object");
      return null;
    }
    return parsed;
  } catch (error) {
    fail(rel(manifestPath), `manifest is not valid YAML: ${error.message}`);
    return null;
  }
}

function requireFile(packageDir, file) {
  const path = join(packageDir, file);
  if (!isFile(path)) {
    fail(rel(packageDir), `missing required file ${file}`);
    return "";
  }
  const text = readText(path);
  if (text.trim().length === 0) {
    fail(rel(path), "file must not be empty");
  }
  return text;
}

function validateManifest(packageDir, manifest) {
  const manifestPath = rel(join(packageDir, "manifest.yaml"));
  const requiredStringFields = ["title", "slug", "subject", "level", "topic", "type", "status", "summary"];
  for (const field of requiredStringFields) {
    if (!isNonEmptyString(manifest[field])) fail(manifestPath, `${field} must be a non-empty string`);
  }

  if (isNonEmptyString(manifest.slug) && !SLUG_PATTERN.test(manifest.slug)) {
    fail(manifestPath, "slug must be lowercase kebab-case");
  }
  if (isNonEmptyString(manifest.subject) && !SLUG_PATTERN.test(manifest.subject)) {
    fail(manifestPath, "subject must be lowercase kebab-case");
  }
  if (isNonEmptyString(manifest.type) && !PACKAGE_TYPES.has(manifest.type)) {
    fail(manifestPath, `type must be one of: ${[...PACKAGE_TYPES].join(", ")}`);
  }
  if (isNonEmptyString(manifest.status) && !STATUSES.has(manifest.status)) {
    fail(manifestPath, `status must be one of: ${[...STATUSES].join(", ")}`);
  }

  if (!isObject(manifest.license)) {
    fail(manifestPath, "license must include code and content fields");
  } else {
    if (!isNonEmptyString(manifest.license.code)) fail(manifestPath, "license.code must be non-empty");
    if (!isNonEmptyString(manifest.license.content)) fail(manifestPath, "license.content must be non-empty");
    const combinedLicense = `${manifest.license.code ?? ""} ${manifest.license.content ?? ""}`;
    if (INCOMPATIBLE_LICENSE_PATTERN.test(combinedLicense)) {
      fail(manifestPath, "GPL/LGPL/AGPL/proprietary contribution licenses require maintainer review before intake");
    }
  }

  if (manifest.type !== "lesson") {
    if (!isObject(manifest.simulation)) {
      fail(manifestPath, "simulation packages must include simulation metadata");
    } else {
      if (!isNonEmptyString(manifest.simulation.kind)) fail(manifestPath, "simulation.kind must be non-empty");
      if (!isNonEmptyString(manifest.simulation.entry) && !isNonEmptyString(manifest.simulation.url)) {
        fail(manifestPath, "simulation.entry or simulation.url must be provided");
      }
      if (manifest.simulation.interactive !== true) {
        fail(manifestPath, "simulation.interactive must be true for simulation packages");
      }
    }
  }
}

function validateFiles(packageDir, manifest) {
  const lesson = requireFile(packageDir, "lesson.md");
  const sources = requireFile(packageDir, "sources.md");
  const license = requireFile(packageDir, "license.md");

  if (/replace this|list sources|example simulation lesson/iu.test(lesson)) {
    fail(rel(join(packageDir, "lesson.md")), "lesson still contains template placeholder text");
  }
  if (/list sources|do not paste long copyrighted passages/iu.test(sources) || !/https?:\/\//iu.test(sources)) {
    fail(rel(join(packageDir, "sources.md")), "sources.md must include real citations with URLs");
  }
  if (/state what is original|example:/iu.test(license)) {
    fail(rel(join(packageDir, "license.md")), "license.md must replace template provenance notes");
  }
  if (INCOMPATIBLE_LICENSE_PATTERN.test(license)) {
    fail(rel(join(packageDir, "license.md")), "incompatible or unclear license text found");
  }

  if (!isFile(join(packageDir, "teacher-notes.md"))) {
    warn(rel(packageDir), "teacher-notes.md is recommended");
  }
  if (!isFile(join(packageDir, "preview.png"))) {
    warn(rel(packageDir), "preview.png is recommended for the public gallery");
  }

  if (manifest.type === "lesson") return;

  if (manifest.type === "external-embed") {
    if (!isObject(manifest.simulation) || !isNonEmptyString(manifest.simulation.url)) {
      fail(rel(join(packageDir, "manifest.yaml")), "external embeds must provide simulation.url");
    }
    return;
  }

  const htmlPath = join(packageDir, "simulation.html");
  const appDir = join(packageDir, "simulation");
  if (!isFile(htmlPath) && !isDirectory(appDir)) {
    fail(rel(packageDir), "simulation packages require simulation.html or simulation/");
    return;
  }

  if (isFile(htmlPath)) {
    const html = readText(htmlPath);
    if (!/<html[\s>]/iu.test(html)) fail(rel(htmlPath), "simulation.html must be a complete HTML document");
    if (!VISUAL_MARKERS.some((pattern) => pattern.test(html))) {
      fail(rel(htmlPath), "simulation must include a visible model: svg, canvas, img, or role=\"img\"");
    }
    if (!INTERACTION_MARKERS.some((pattern) => pattern.test(html))) {
      fail(rel(htmlPath), "simulation must include an obvious learner interaction");
    }
  }

  if (isDirectory(appDir)) {
    const packageJsonPath = join(appDir, "package.json");
    if (!isFile(packageJsonPath)) {
      fail(rel(appDir), "advanced simulation folders must include package.json");
    } else {
      try {
        const packageJson = JSON.parse(readText(packageJsonPath));
        if (INCOMPATIBLE_LICENSE_PATTERN.test(String(packageJson.license ?? ""))) {
          fail(rel(packageJsonPath), "simulation package license is not intake-safe");
        }
      } catch (error) {
        fail(rel(packageJsonPath), `package.json is invalid JSON: ${error.message}`);
      }
    }
  }
}

const packages = findContributionPackages();

for (const packageDir of packages) {
  const manifest = readManifest(packageDir);
  if (!manifest) continue;
  validateManifest(packageDir, manifest);
  validateFiles(packageDir, manifest);
}

if (failures.length > 0) {
  process.stderr.write(`validate-contributions: ${failures.length} failure(s)\n`);
  for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  if (warnings.length > 0) {
    process.stderr.write(`\nWarnings:\n`);
    for (const warning of warnings) process.stderr.write(`- ${warning}\n`);
  }
  process.exit(1);
}

if (packages.length === 0) {
  process.stdout.write("validate-contributions: no contribution packages found outside _template; OK\n");
} else {
  process.stdout.write(`validate-contributions: OK (${packages.length} package(s))\n`);
}

if (warnings.length > 0) {
  process.stdout.write(`Warnings:\n`);
  for (const warning of warnings) process.stdout.write(`- ${warning}\n`);
}
