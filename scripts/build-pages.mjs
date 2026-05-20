#!/usr/bin/env node
/**
 * Build the static GitHub Pages artifact.
 *
 * Discovers top-level curriculum shells at:
 *   <branch>/apps/shell/package.json
 *
 * Each discovered shell is built with a relative Vite base and copied to:
 *   dist/pages/<branch>/
 *
 * That keeps deployment automatic for new product slices: container PRs update
 * generated graph data, and this workflow publishes the latest generated shell
 * on every push to main.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(process.cwd());
const PAGES_DIR = join(REPO_ROOT, "dist", "pages");
const IGNORED_ROOTS = new Set([
  ".git",
  ".github",
  ".claude",
  ".cursor",
  ".agents",
  "core",
  "dist",
  "docs",
  "node_modules",
  "scripts",
  "testing",
]);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const shellPackagePath = (rootName) => join(REPO_ROOT, rootName, "apps", "shell", "package.json");

const run = (args, cwd = REPO_ROOT) => {
  const result = spawnSync("pnpm", args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
};

const discoverShells = () =>
  readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !IGNORED_ROOTS.has(name))
    .map((name) => {
      const packagePath = shellPackagePath(name);
      if (!existsSync(packagePath)) return null;
      const appDir = join(REPO_ROOT, name, "apps", "shell");
      const packageJson = readJson(packagePath);
      if (typeof packageJson.name !== "string") {
        throw new Error(`${packagePath} must declare a package name`);
      }
      return {
        branch: name,
        appDir,
        packageName: packageJson.name,
        distDir: join(appDir, "dist"),
        targetDir: join(PAGES_DIR, name),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.branch.localeCompare(right.branch));

const renderIndex = (shells) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Paideia</title>
    <style>
      :root {
        color-scheme: light;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f7f2;
        color: #17231d;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
      }

      main {
        width: min(840px, calc(100vw - 32px));
        padding: 48px 0;
      }

      h1 {
        margin: 0 0 12px;
        font-size: clamp(2.25rem, 7vw, 4.75rem);
        line-height: 0.95;
        letter-spacing: 0;
      }

      p {
        margin: 0 0 28px;
        max-width: 64ch;
        color: #405247;
        font-size: 1.08rem;
        line-height: 1.6;
      }

      nav {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }

      a {
        display: block;
        min-height: 72px;
        padding: 18px;
        border: 1px solid #c9d2c3;
        border-radius: 8px;
        color: inherit;
        text-decoration: none;
        background: #ffffff;
      }

      a:focus-visible,
      a:hover {
        border-color: #506b5b;
        box-shadow: 0 0 0 3px rgba(80, 107, 91, 0.18);
      }

      strong {
        display: block;
        margin-bottom: 6px;
        font-size: 1.1rem;
      }

      span {
        color: #5f6f64;
        font-size: 0.95rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Paideia</h1>
      <p>Open concept labs for learning by trying, checking, and explaining. Choose a curriculum shell to begin.</p>
      <nav aria-label="Curriculum shells">
${shells
  .map(
    (shell) => `        <a href="./${shell.branch}/">
          <strong>${shell.branch === "a-level" ? "A-Level" : shell.branch.toUpperCase()}</strong>
          <span>${shell.packageName}</span>
        </a>`,
  )
  .join("\n")}
      </nav>
    </main>
  </body>
</html>
`;

const shells = discoverShells();

if (shells.length === 0) {
  throw new Error("No shell apps found. Expected at least one <branch>/apps/shell/package.json.");
}

rmSync(PAGES_DIR, { force: true, recursive: true });
mkdirSync(PAGES_DIR, { recursive: true });

for (const shell of shells) {
  console.log(`build-pages: building ${shell.packageName} -> ${shell.branch}/`);
  run(["--filter", shell.packageName, "exec", "tsc", "-b"]);
  run(["--filter", shell.packageName, "exec", "vite", "build", "--base", "./"]);
  cpSync(shell.distDir, shell.targetDir, { recursive: true });
}

writeFileSync(join(PAGES_DIR, "index.html"), renderIndex(shells), "utf8");
writeFileSync(join(PAGES_DIR, ".nojekyll"), "", "utf8");
console.log(`build-pages: wrote ${PAGES_DIR}`);
