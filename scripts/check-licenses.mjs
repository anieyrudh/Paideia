#!/usr/bin/env node
/**
 * check-licenses.mjs
 *
 * Validates every production dependency's license against LICENSES.json.
 *
 * Behaviour:
 *   - Reads LICENSES.json (allowed / rejected / review_required).
 *   - Runs `pnpm licenses ls --json --prod`. Falls back to walking
 *     `node_modules/<pkg>/package.json` if pnpm isn't available.
 *   - Any rejected license -> exit 1.
 *   - Any unknown (not in allowed AND not in review_required) license -> exit 1.
 *   - On the empty-deps case (Phase A: no node_modules / no lockfile yet) ->
 *     exit 0 with a friendly message.
 *
 * Exit codes:
 *   0 — all production deps allowed (or no production deps yet)
 *   1 — at least one rejected/unknown license found
 *
 * No external dependencies — uses only Node built-ins.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());

function loadAllowlist() {
  const path = join(REPO_ROOT, "LICENSES.json");
  if (!existsSync(path)) {
    process.stderr.write("check-licenses: LICENSES.json not found at repo root.\n");
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return {
    allowed: new Set(raw.allowed || []),
    rejected: new Set(raw.rejected || []),
    review: new Set(raw.review_required || [])
  };
}

/**
 * Normalize an SPDX expression to a list of license identifiers we can compare.
 * For composite expressions like "(MIT OR Apache-2.0)" we accept the dep if
 * any operand is in the allowlist. For "AND" expressions, every operand must
 * be allowed.
 */
function classifyLicense(expr, allowlist) {
  if (!expr || typeof expr !== "string") {
    return { status: "unknown", licenses: ["(none)"] };
  }
  const cleaned = expr.replace(/[()]/g, "").trim();

  // "X AND Y" — every operand must be allowed (or none rejected) for the dep to pass.
  if (/\sAND\s/i.test(cleaned)) {
    const parts = cleaned.split(/\sAND\s/i).map((s) => s.trim());
    const statuses = parts.map((p) => classifySingle(p, allowlist));
    if (statuses.some((s) => s === "rejected")) {
      return { status: "rejected", licenses: parts };
    }
    if (statuses.every((s) => s === "allowed")) {
      return { status: "allowed", licenses: parts };
    }
    if (statuses.some((s) => s === "review")) {
      return { status: "review", licenses: parts };
    }
    return { status: "unknown", licenses: parts };
  }

  // "X OR Y" — accept if any operand is allowed and none is rejected.
  if (/\sOR\s/i.test(cleaned)) {
    const parts = cleaned.split(/\sOR\s/i).map((s) => s.trim());
    const statuses = parts.map((p) => classifySingle(p, allowlist));
    if (statuses.includes("allowed")) {
      return { status: "allowed", licenses: parts };
    }
    if (statuses.every((s) => s === "rejected")) {
      return { status: "rejected", licenses: parts };
    }
    if (statuses.includes("review")) {
      return { status: "review", licenses: parts };
    }
    return { status: "unknown", licenses: parts };
  }

  return { status: classifySingle(cleaned, allowlist), licenses: [cleaned] };
}

function classifySingle(id, allowlist) {
  const trimmed = id.trim();
  if (allowlist.rejected.has(trimmed)) return "rejected";
  if (allowlist.allowed.has(trimmed)) return "allowed";
  if (allowlist.review.has(trimmed)) return "review";
  return "unknown";
}

/**
 * Returns an array of { name, version, license } from `pnpm licenses ls --json --prod`.
 * Returns null if pnpm isn't available or the call fails.
 */
function readPnpmLicenses() {
  const result = spawnSync("pnpm", ["licenses", "ls", "--json", "--prod"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 120_000
  });
  if (result.error || result.status !== 0 || !result.stdout) return null;
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return null;
  }
  // pnpm groups by license: { "MIT": [{name, version, ...}, ...], "Apache-2.0": [...] }
  const out = [];
  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      out.push({
        name: entry.name,
        version: entry.version,
        license: entry.license || entry.licenses || "(unknown)"
      });
    }
  } else if (typeof parsed === "object" && parsed) {
    for (const [license, pkgs] of Object.entries(parsed)) {
      if (!Array.isArray(pkgs)) continue;
      for (const pkg of pkgs) {
        out.push({
          name: pkg.name,
          version: pkg.version,
          license: license
        });
      }
    }
  }
  return out;
}

/**
 * Fallback: walk node_modules/<pkg>/package.json (one level deep, plus @scope/*).
 */
function readNodeModulesLicenses() {
  const nm = join(REPO_ROOT, "node_modules");
  if (!existsSync(nm)) return [];
  const out = [];

  function readPkgJson(pkgPath) {
    const pj = join(pkgPath, "package.json");
    if (!existsSync(pj)) return;
    try {
      const data = JSON.parse(readFileSync(pj, "utf8"));
      const license =
        (typeof data.license === "string" && data.license) ||
        (data.license && data.license.type) ||
        (Array.isArray(data.licenses) && data.licenses.map((l) => l.type || l).join(" OR ")) ||
        "(unknown)";
      out.push({ name: data.name, version: data.version, license });
    } catch {
      // ignore unparseable package.json
    }
  }

  for (const entry of readdirSync(nm)) {
    if (entry.startsWith(".")) continue;
    const p = join(nm, entry);
    if (!statSync(p).isDirectory()) continue;
    if (entry.startsWith("@")) {
      for (const sub of readdirSync(p)) {
        readPkgJson(join(p, sub));
      }
    } else {
      readPkgJson(p);
    }
  }
  return out;
}

function main() {
  const allowlist = loadAllowlist();

  // Phase A: no node_modules and no lockfile yet — nothing to check.
  const hasNodeModules = existsSync(join(REPO_ROOT, "node_modules"));
  const hasLockfile = existsSync(join(REPO_ROOT, "pnpm-lock.yaml"));
  if (!hasNodeModules && !hasLockfile) {
    process.stdout.write("check-licenses: no production deps yet.\n");
    process.exit(0);
  }

  let deps = readPnpmLicenses();
  if (deps === null) {
    deps = readNodeModulesLicenses();
  }

  if (!deps || deps.length === 0) {
    process.stdout.write("check-licenses: no production deps yet.\n");
    process.exit(0);
  }

  const offenders = [];
  for (const dep of deps) {
    const verdict = classifyLicense(String(dep.license || ""), allowlist);
    if (verdict.status === "rejected" || verdict.status === "unknown") {
      offenders.push({ ...dep, verdict });
    }
  }

  if (offenders.length > 0) {
    process.stderr.write(
      `check-licenses: ${offenders.length} dependency/ies failed the allowlist:\n\n`
    );
    const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
    process.stderr.write(
      `${pad("name", 40)} ${pad("version", 14)} ${pad("license", 30)} status\n`
    );
    process.stderr.write(`${"-".repeat(40)} ${"-".repeat(14)} ${"-".repeat(30)} ${"-".repeat(8)}\n`);
    for (const o of offenders) {
      process.stderr.write(
        `${pad(String(o.name ?? ""), 40)} ${pad(String(o.version ?? ""), 14)} ${pad(String(o.license ?? ""), 30)} ${o.verdict.status}\n`
      );
    }
    process.stderr.write(
      "\nAllowed licenses are listed in LICENSES.json. Rejected licenses (GPL/AGPL/LGPL/SSPL/BUSL/Commons-Clause) MUST NOT appear in bundled production deps.\n"
    );
    process.exit(1);
  }

  process.stdout.write(
    `check-licenses: All ${deps.length} production deps have compatible licenses.\n`
  );
  process.exit(0);
}

main();
