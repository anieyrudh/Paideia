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

const shellDisplayName = (branch) => {
  if (branch === "a-level") return "A-Level";
  if (branch === "sutd") return "SUTD";
  return branch
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const shellDescription = (branch) => {
  if (branch === "a-level") return "Physics foundations and exam-ready concept labs";
  if (branch === "sutd") return "Freshmore, pillar, and systems thinking labs";
  return "Concept labs and curriculum pathways";
};

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
        background: #f4f1e8;
        color: #13211b;
        --ink: #13211b;
        --muted: #59655d;
        --line: rgba(19, 33, 27, 0.18);
        --accent: #da5f34;
        --paper: #fffdf6;
        --deep: #10251e;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 18% 24%, rgba(218, 95, 52, 0.18), transparent 22rem),
          linear-gradient(135deg, #f7f3e8 0%, #edf0e8 52%, #dfe9e1 100%);
      }

      a {
        color: inherit;
      }

      main.page {
        min-height: 100vh;
        display: grid;
        grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
      }

      .hero {
        min-height: 100vh;
        padding: clamp(28px, 5vw, 72px);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .mark {
        width: fit-content;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--line);
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      .hero-copy {
        max-width: 760px;
      }

      h1 {
        max-width: 10ch;
        margin: 0 0 22px;
        font-size: clamp(4.25rem, 13vw, 11.5rem);
        line-height: 0.82;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        max-width: 58ch;
        color: var(--muted);
        font-size: clamp(1.08rem, 2vw, 1.35rem);
        line-height: 1.6;
      }

      .routes {
        margin-top: 44px;
        max-width: 720px;
        border-top: 1px solid var(--line);
      }

      .route {
        display: grid;
        grid-template-columns: minmax(112px, 0.36fr) 1fr auto;
        align-items: center;
        gap: 20px;
        min-height: 82px;
        border-bottom: 1px solid var(--line);
        text-decoration: none;
        transition:
          color 180ms ease,
          transform 180ms ease,
          border-color 180ms ease;
      }

      .route:hover,
      .route:focus-visible {
        color: var(--accent);
        border-color: rgba(218, 95, 52, 0.55);
        transform: translateX(8px);
        outline: none;
      }

      .route strong {
        font-size: clamp(1.45rem, 3vw, 2.15rem);
        letter-spacing: 0;
      }

      .route span {
        color: var(--muted);
        font-size: 0.95rem;
      }

      .route em {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border: 1px solid currentColor;
        border-radius: 50%;
        font-style: normal;
        transition: transform 180ms ease;
      }

      .route:hover em,
      .route:focus-visible em {
        transform: rotate(-35deg);
      }

      .note {
        margin-top: 28px;
        max-width: 58ch;
        color: #687369;
        font-size: 0.95rem;
      }

      .visual {
        position: relative;
        min-height: 100vh;
        padding: clamp(24px, 4vw, 64px);
        display: grid;
        place-items: center;
        background: var(--deep);
        color: #f8f4e8;
        overflow: hidden;
      }

      .visual::before {
        content: "";
        position: absolute;
        inset: -20%;
        background:
          linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
        background-size: 42px 42px;
        transform: rotate(-8deg) scale(1.15);
      }

      .visual::after {
        content: "";
        position: absolute;
        width: 34rem;
        height: 34rem;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(218, 95, 52, 0.32), transparent 68%);
        filter: blur(4px);
      }

      .map {
        position: relative;
        z-index: 1;
        width: min(520px, 84vw);
        aspect-ratio: 1;
      }

      .map-line {
        position: absolute;
        height: 1px;
        background: rgba(248, 244, 232, 0.28);
        transform-origin: left center;
      }

      .line-a {
        left: 21%;
        top: 29%;
        width: 45%;
        transform: rotate(18deg);
      }

      .line-b {
        left: 45%;
        top: 43%;
        width: 38%;
        transform: rotate(62deg);
      }

      .line-c {
        left: 18%;
        top: 68%;
        width: 54%;
        transform: rotate(-28deg);
      }

      .node {
        position: absolute;
        width: clamp(92px, 11vw, 136px);
        min-height: clamp(92px, 11vw, 136px);
        display: grid;
        place-items: center;
        padding: 16px;
        border: 1px solid rgba(248, 244, 232, 0.42);
        border-radius: 999px;
        background: rgba(255, 253, 246, 0.08);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.24);
        backdrop-filter: blur(10px);
        font-weight: 800;
        line-height: 1.05;
        text-align: center;
        animation: breathe 5.4s ease-in-out infinite;
      }

      .node:nth-of-type(2) {
        animation-delay: -1.4s;
      }

      .node:nth-of-type(3) {
        animation-delay: -2.8s;
      }

      .node:nth-of-type(4) {
        animation-delay: -4.1s;
      }

      .node-concept {
        left: 6%;
        top: 16%;
      }

      .node-sim {
        right: 10%;
        top: 28%;
      }

      .node-proof {
        left: 14%;
        bottom: 14%;
      }

      .node-transfer {
        right: 8%;
        bottom: 10%;
        color: #ffd2bf;
        border-color: rgba(218, 95, 52, 0.74);
      }

      .caption {
        position: absolute;
        left: clamp(24px, 4vw, 64px);
        right: clamp(24px, 4vw, 64px);
        bottom: clamp(24px, 4vw, 64px);
        z-index: 1;
        color: rgba(248, 244, 232, 0.72);
        font-size: 0.95rem;
        line-height: 1.5;
      }

      @keyframes breathe {
        0%,
        100% {
          transform: translateY(0) scale(1);
        }
        50% {
          transform: translateY(-10px) scale(1.025);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
        }
      }

      @media (max-width: 880px) {
        main.page {
          grid-template-columns: 1fr;
        }

        .hero {
          min-height: auto;
          padding: 28px 20px 40px;
        }

        .hero-copy {
          margin-top: 72px;
        }

        .routes {
          margin-top: 32px;
        }

        .route {
          grid-template-columns: 1fr auto;
          gap: 14px;
          padding: 18px 0;
        }

        .route span {
          grid-column: 1 / -1;
          grid-row: 2;
        }

        .visual {
          min-height: 560px;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero" aria-labelledby="page-title">
        <div class="mark">Open concept labs</div>
        <div class="hero-copy">
          <h1 id="page-title">Paideia</h1>
          <p>Learn one idea at a time through clear explanations, interactive models, and visible reasoning.</p>
          <nav class="routes" aria-label="Curriculum shells">
${shells
  .map(
    (shell) => `            <a class="route" href="./${shell.branch}/">
          <strong>${shellDisplayName(shell.branch)}</strong>
          <span>${shellDescription(shell.branch)}</span>
          <em aria-hidden="true">→</em>
        </a>`,
  )
  .join("\n")}
          </nav>
          <p class="note">New containers appear here automatically after their generated catalogue data lands on main.</p>
        </div>
      </section>
      <section class="visual" aria-label="Concepts connect into reusable learning paths">
        <div class="map" aria-hidden="true">
          <div class="map-line line-a"></div>
          <div class="map-line line-b"></div>
          <div class="map-line line-c"></div>
          <div class="node node-concept">Concept</div>
          <div class="node node-sim">Sim</div>
          <div class="node node-proof">Explain</div>
          <div class="node node-transfer">Transfer</div>
        </div>
        <p class="caption">Each container keeps its content, simulation, concept map, and embed contract together, so contributors can improve one concept without breaking the rest.</p>
      </section>
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
