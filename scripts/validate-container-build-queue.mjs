#!/usr/bin/env node
/**
 * validate-container-build-queue.mjs
 *
 * Validates docs/product/container-build-queue.yaml, the machine-readable seed
 * for the product roadmap build queue. This deliberately stays outside
 * core/content-schema because it is planning metadata, not a container
 * contract.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import YAML from "yaml";

const REPO_ROOT = resolve(process.cwd());
const QUEUE_PATH = join(REPO_ROOT, "docs", "product", "container-build-queue.yaml");

const ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const PRIORITIES = new Set(["P0", "P1", "P2"]);
const STATUSES = new Set([
  "planned",
  "skeleton",
  "content-only",
  "in-build",
  "reviewed",
  "ready-for-build",
  "published",
  "blocked",
  "deferred",
]);
const CURRICULA = new Set(["shared", "sutd", "alevel", "ib"]);
const REUSE_STATUSES = new Set(["shared-core", "curriculum-wrapper", "subject-specific", "assessment-only"]);
const EFFORTS = new Set(["S", "M", "H"]);
const TARGET_CONTAINER_KINDS = new Set(["shared-core", "curriculum-wrapper", "subject-specific", "assessment-only"]);

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function isSafeRelativePath(path) {
  return isNonEmptyString(path) && !isAbsolute(path) && !path.split("/").includes("..");
}

function readQueue() {
  if (!isFile(QUEUE_PATH)) {
    throw new Error(`Missing ${relative(REPO_ROOT, QUEUE_PATH)}`);
  }
  const raw = readFileSync(QUEUE_PATH, "utf8");
  if (raw.trim().length === 0) {
    throw new Error(`${relative(REPO_ROOT, QUEUE_PATH)} is empty`);
  }
  return YAML.parse(raw);
}

function validateStringArray(value, path, failures, { allowed, min = 1 } = {}) {
  if (!Array.isArray(value)) {
    failures.push(`${path} must be an array`);
    return [];
  }
  if (value.length < min) {
    failures.push(`${path} must contain at least ${min} item(s)`);
  }

  const seen = new Set();
  const out = [];
  for (const [index, item] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!isNonEmptyString(item)) {
      failures.push(`${itemPath} must be a non-empty string`);
      continue;
    }
    if (seen.has(item)) failures.push(`${itemPath} duplicates \`${item}\``);
    if (allowed && !allowed.has(item)) failures.push(`${itemPath} must be one of: ${[...allowed].join(", ")}`);
    seen.add(item);
    out.push(item);
  }
  return out;
}

function validateConceptMapNeeds(value, path, failures) {
  if (!isObject(value)) {
    failures.push(`${path} must be an object`);
    return;
  }
  validateStringArray(value.prerequisites ?? [], `${path}.prerequisites`, failures, { min: 0 });
  validateStringArray(value.downstream ?? [], `${path}.downstream`, failures, { min: 0 });
  validateStringArray(value.misconceptions ?? [], `${path}.misconceptions`, failures, { min: 0 });
}

function validateMappingDetailArray(value, path, failures) {
  if (value === undefined) return false;
  if (!Array.isArray(value)) {
    failures.push(`${path} must be an array when present`);
    return false;
  }

  let hasValidDetail = false;
  for (const [index, item] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (isNonEmptyString(item)) {
      hasValidDetail = true;
      continue;
    }
    if (isObject(item) && Object.keys(item).length > 0) {
      hasValidDetail = true;
      continue;
    }
    failures.push(`${itemPath} must be a non-empty string or non-empty object`);
  }

  return hasValidDetail;
}

function validateCurriculumMappings(value, entry, path, failures) {
  if (!Array.isArray(value) || value.length === 0) {
    failures.push(`${path} must be a non-empty array`);
    return;
  }

  const curricula = new Set(entry.curricula);
  const seenCurricula = new Set();
  for (const [index, mapping] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!isObject(mapping)) {
      failures.push(`${itemPath} must be an object`);
      continue;
    }
    if (!CURRICULA.has(mapping.curriculum)) {
      failures.push(`${itemPath}.curriculum must be one of: ${[...CURRICULA].join(", ")}`);
    } else if (!curricula.has(mapping.curriculum)) {
      failures.push(`${itemPath}.curriculum \`${mapping.curriculum}\` is not listed in ${path.replace(/\.curriculum_mappings$/u, ".curricula")}`);
    } else if (seenCurricula.has(mapping.curriculum)) {
      failures.push(`${itemPath}.curriculum \`${mapping.curriculum}\` is duplicated in ${path}`);
    } else {
      seenCurricula.add(mapping.curriculum);
    }

    const hasMappingDetail = ["modules", "subjects", "courses", "syllabus_refs"].some((field) =>
      validateMappingDetailArray(mapping[field], `${itemPath}.${field}`, failures),
    );
    if (!hasMappingDetail) {
      failures.push(`${itemPath} must include at least one of modules, subjects, courses, or syllabus_refs`);
    }
  }
}

function validateEntry(entry, index, failures, workstreams) {
  const path = `entries[${index}]`;
  if (!isObject(entry)) {
    failures.push(`${path} must be an object`);
    return null;
  }

  const requiredStringFields = [
    "id",
    "title",
    "priority",
    "status",
    "cluster",
    "discipline",
    "reuse_status",
    "simulation_type",
    "repo_package_name",
    "estimated_effort",
  ];
  for (const field of requiredStringFields) {
    if (!isNonEmptyString(entry[field])) failures.push(`${path}.${field} must be a non-empty string`);
  }

  if (isNonEmptyString(entry.id) && !ID_PATTERN.test(entry.id)) {
    failures.push(`${path}.id must be lowercase namespaced kebab-case`);
  }
  if (isNonEmptyString(entry.priority) && !PRIORITIES.has(entry.priority)) {
    failures.push(`${path}.priority must be one of: ${[...PRIORITIES].join(", ")}`);
  }
  if (isNonEmptyString(entry.status) && !STATUSES.has(entry.status)) {
    failures.push(`${path}.status must be one of: ${[...STATUSES].join(", ")}`);
  }
  if (isNonEmptyString(entry.reuse_status) && !REUSE_STATUSES.has(entry.reuse_status)) {
    failures.push(`${path}.reuse_status must be one of: ${[...REUSE_STATUSES].join(", ")}`);
  }
  if (isNonEmptyString(entry.estimated_effort) && !EFFORTS.has(entry.estimated_effort)) {
    failures.push(`${path}.estimated_effort must be one of: ${[...EFFORTS].join(", ")}`);
  }

  entry.curricula = validateStringArray(entry.curricula, `${path}.curricula`, failures, { allowed: CURRICULA });
  validateCurriculumMappings(entry.curriculum_mappings, entry, `${path}.curriculum_mappings`, failures);
  validateStringArray(entry.problem_solving_elements, `${path}.problem_solving_elements`, failures);
  validateConceptMapNeeds(entry.concept_map_needs, `${path}.concept_map_needs`, failures);

  const kernelDeps = validateStringArray(entry.kernel_dependencies, `${path}.kernel_dependencies`, failures);
  for (const dep of kernelDeps) {
    if (!dep.startsWith("core/")) {
      failures.push(`${path}.kernel_dependencies entry \`${dep}\` must start with core/`);
    } else if (!isDirectory(join(REPO_ROOT, dep))) {
      failures.push(`${path}.kernel_dependencies entry \`${dep}\` does not resolve to an existing directory`);
    }
  }

  if (!isObject(entry.assignment)) {
    failures.push(`${path}.assignment must be an object`);
  } else {
    if (!workstreams.has(entry.assignment.workstream)) {
      failures.push(`${path}.assignment.workstream must reference a declared workstream`);
    }
    if (!isNonEmptyString(entry.assignment.concept_cluster)) {
      failures.push(`${path}.assignment.concept_cluster must be a non-empty string`);
    }
    if (!TARGET_CONTAINER_KINDS.has(entry.assignment.target_container_kind)) {
      failures.push(`${path}.assignment.target_container_kind must be one of: ${[...TARGET_CONTAINER_KINDS].join(", ")}`);
    }
  }

  const containerPath = entry.repo?.container_path;
  if (containerPath !== undefined) {
    if (!isSafeRelativePath(containerPath)) {
      failures.push(`${path}.repo.container_path must be a safe relative path`);
    } else if (!isDirectory(join(REPO_ROOT, containerPath))) {
      failures.push(`${path}.repo.container_path does not resolve to an existing directory`);
    }
  }

  return isNonEmptyString(entry.id) ? entry.id : null;
}

function validateCoverage(queue, entryIds, failures) {
  if (!isObject(queue.roadmap_coverage)) {
    failures.push("roadmap_coverage must be an object");
    return;
  }

  for (const key of ["p0_universal_theory_infrastructure", "alevel_initial_sequence"]) {
    const ids = validateStringArray(queue.roadmap_coverage[key], `roadmap_coverage.${key}`, failures);
    for (const id of ids) {
      if (!entryIds.has(id)) failures.push(`roadmap_coverage.${key} references missing entry \`${id}\``);
    }
  }
}

function validateSutdClusterMappings(queue, entryIds, workstreams, failures) {
  if (!Array.isArray(queue.sutd_cluster_mappings) || queue.sutd_cluster_mappings.length === 0) {
    failures.push("sutd_cluster_mappings must be a non-empty array");
    return;
  }

  const seen = new Set();
  for (const [index, mapping] of queue.sutd_cluster_mappings.entries()) {
    const path = `sutd_cluster_mappings[${index}]`;
    if (!isObject(mapping)) {
      failures.push(`${path} must be an object`);
      continue;
    }
    if (!isNonEmptyString(mapping.id) || !ID_PATTERN.test(mapping.id)) {
      failures.push(`${path}.id must be lowercase namespaced kebab-case`);
    } else if (seen.has(mapping.id)) {
      failures.push(`${path}.id duplicates \`${mapping.id}\``);
    }
    seen.add(mapping.id);
    if (!isNonEmptyString(mapping.title)) failures.push(`${path}.title must be a non-empty string`);

    const mappingWorkstreams = validateStringArray(mapping.workstreams, `${path}.workstreams`, failures);
    for (const workstream of mappingWorkstreams) {
      if (!workstreams.has(workstream)) failures.push(`${path}.workstreams references undeclared workstream \`${workstream}\``);
    }

    const ids = validateStringArray(mapping.entry_ids, `${path}.entry_ids`, failures);
    for (const id of ids) {
      if (!entryIds.has(id)) failures.push(`${path}.entry_ids references missing entry \`${id}\``);
    }
  }
}

function main() {
  const failures = [];
  let queue;
  try {
    queue = readQueue();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`validate-container-build-queue: ${message}\n`);
    process.exit(1);
  }

  if (!isObject(queue)) {
    failures.push("root must be an object");
  } else {
    if (queue.schema_version !== "1.0.0") failures.push("schema_version must be \"1.0.0\"");
    if (queue.source !== "docs/product/container-roadmap.md") {
      failures.push("source must be docs/product/container-roadmap.md");
    }
    if (!isFile(join(REPO_ROOT, "docs", "product", "container-roadmap.md"))) {
      failures.push("source file docs/product/container-roadmap.md does not exist");
    }
  }

  const workstreams = new Set(validateStringArray(queue?.workstreams, "workstreams", failures));
  const entries = Array.isArray(queue?.entries) ? queue.entries : [];
  if (!Array.isArray(queue?.entries) || entries.length === 0) {
    failures.push("entries must be a non-empty array");
  }

  const entryIds = new Set();
  for (const [index, entry] of entries.entries()) {
    const id = validateEntry(entry, index, failures, workstreams);
    if (id === null) continue;
    if (entryIds.has(id)) failures.push(`entries[${index}].id duplicates \`${id}\``);
    entryIds.add(id);
  }

  if (queue) {
    validateCoverage(queue, entryIds, failures);
    validateSutdClusterMappings(queue, entryIds, workstreams, failures);
  }

  if (failures.length > 0) {
    process.stderr.write(`validate-container-build-queue: FAILED with ${failures.length} issue(s).\n\n`);
    for (const failure of failures) process.stderr.write(`- ${failure}\n`);
    process.exit(1);
  }

  process.stdout.write(`validate-container-build-queue: OK - ${entryIds.size} queue entries validated.\n`);
}

main();
