#!/usr/bin/env node
/**
 * Build the static Paideia contribution gallery.
 *
 * Active architecture:
 *   contributions/<subject>/<slug>/manifest.yaml
 *   contributions/<subject>/<slug>/lesson.md
 *   contributions/<subject>/<slug>/simulation.html (optional)
 *
 * The output is a plain GitHub Pages site in dist/pages.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import YAML from "yaml";

const REPO_ROOT = resolve(process.cwd());
const CONTRIBUTIONS_DIR = join(REPO_ROOT, "contributions");
const DIST_DIR = join(REPO_ROOT, "dist", "pages");
const SKIPPED_ROOTS = new Set(["_template", "_incoming"]);

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const out = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };

  for (const line of lines) {
    if (line.startsWith("# ")) {
      closeList();
      out.push(`<h1>${escapeHtml(line.slice(2).trim())}</h1>`);
    } else if (line.startsWith("## ")) {
      closeList();
      out.push(`<h2>${escapeHtml(line.slice(3).trim())}</h2>`);
    } else if (line.startsWith("### ")) {
      closeList();
      out.push(`<h3>${escapeHtml(line.slice(4).trim())}</h3>`);
    } else if (line.startsWith("- ")) {
      if (!listOpen) {
        out.push("<ul>");
        listOpen = true;
      }
      out.push(`<li>${escapeHtml(line.slice(2).trim())}</li>`);
    } else if (line.trim().length === 0) {
      closeList();
    } else {
      closeList();
      out.push(`<p>${escapeHtml(line.trim())}</p>`);
    }
  }

  closeList();
  return out.join("\n");
}

function findPackages() {
  if (!isDirectory(CONTRIBUTIONS_DIR)) return [];
  const packages = [];
  for (const subject of readdirSync(CONTRIBUTIONS_DIR).sort()) {
    if (SKIPPED_ROOTS.has(subject)) continue;
    const subjectDir = join(CONTRIBUTIONS_DIR, subject);
    if (!isDirectory(subjectDir)) continue;
    for (const slug of readdirSync(subjectDir).sort()) {
      const packageDir = join(subjectDir, slug);
      const manifestPath = join(packageDir, "manifest.yaml");
      if (!isDirectory(packageDir) || !isFile(manifestPath)) continue;
      const manifest = YAML.parse(readText(manifestPath));
      packages.push({
        dir: packageDir,
        subject,
        slug,
        manifest,
        href: `contributions/${encodeURIComponent(subject)}/${encodeURIComponent(slug)}/`,
        preview: isFile(join(packageDir, "preview.svg"))
          ? `contributions/${encodeURIComponent(subject)}/${encodeURIComponent(slug)}/preview.svg`
          : isFile(join(packageDir, "preview.png"))
            ? `contributions/${encodeURIComponent(subject)}/${encodeURIComponent(slug)}/preview.png`
            : "",
      });
    }
  }
  return packages;
}

function pageShell({ title, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f8fafc;
        color: #111827;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        background: #f8fafc;
      }

      header, main {
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
      }

      header {
        padding: 44px 0 24px;
        border-bottom: 1px solid #d1d5db;
      }

      h1 {
        margin: 0 0 12px;
        font-size: clamp(2.4rem, 6vw, 5rem);
        line-height: 1;
        letter-spacing: 0;
      }

      h2 { margin-top: 32px; }

      p, li {
        color: #374151;
        font-size: 1.03rem;
        line-height: 1.65;
      }

      a { color: #0f766e; }

      .lede {
        max-width: 760px;
        font-size: 1.18rem;
      }

      .toolbar {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 24px;
      }

      input, select {
        min-height: 42px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0 12px;
        background: #fff;
        font: inherit;
      }

      input { min-width: min(360px, 100%); }

      main { padding: 28px 0 64px; }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 16px;
      }

      .card {
        display: block;
        min-height: 260px;
        padding: 20px;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        background: #fff;
        color: inherit;
        text-decoration: none;
      }

      .card:hover, .card:focus-visible {
        border-color: #14b8a6;
        outline: 3px solid rgba(20, 184, 166, 0.22);
      }

      .preview {
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        background: #f8fafc;
        margin-bottom: 16px;
      }

      .meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin: 16px 0 0;
      }

      .pill {
        border-radius: 999px;
        background: #ecfeff;
        color: #155e75;
        padding: 4px 10px;
        font-size: 0.84rem;
        font-weight: 700;
      }

      iframe {
        width: 100%;
        min-height: 560px;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        background: #fff;
      }

      .panel {
        margin: 24px 0;
        padding: 20px;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        background: #fff;
      }

      .empty {
        max-width: 720px;
        padding: 24px;
        border: 1px dashed #94a3b8;
        border-radius: 10px;
        background: #fff;
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function renderIndex(packages) {
  const subjects = [...new Set(packages.map((item) => item.subject))].sort();
  const cards = packages
    .map((item) => {
      const { manifest } = item;
      return `<a class="card" href="${item.href}" data-title="${escapeHtml(manifest.title ?? item.slug)}" data-subject="${escapeHtml(item.subject)}">
        ${item.preview ? `<img class="preview" src="${item.preview}" alt="" loading="lazy" />` : ""}
        <h2>${escapeHtml(manifest.title ?? item.slug)}</h2>
        <p>${escapeHtml(manifest.summary ?? "Academic lesson or simulation package.")}</p>
        <div class="meta">
          <span class="pill">${escapeHtml(item.subject)}</span>
          <span class="pill">${escapeHtml(manifest.level ?? "level")}</span>
          <span class="pill">${escapeHtml(manifest.type ?? "lesson")}</span>
        </div>
      </a>`;
    })
    .join("\n");

  const empty = `<div class="empty">
    <h2>No public packages yet</h2>
    <p>Paideia is ready for submissions. Add a folder under <code>contributions/&lt;subject&gt;/&lt;slug&gt;/</code>, or start in <code>contributions/_incoming/</code>.</p>
  </div>`;

  return pageShell({
    title: "Paideia",
    body: `<header>
      <h1>Paideia</h1>
      <p class="lede">A public library of academic mini-apps, simulations, and lesson materials.</p>
      <div class="toolbar" aria-label="Library filters">
        <input id="search" type="search" placeholder="Search lessons and simulations" aria-label="Search lessons and simulations" />
        <select id="subject" aria-label="Filter by subject">
          <option value="">All subjects</option>
          ${subjects.map((subject) => `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`).join("\n")}
        </select>
      </div>
    </header>
    <main>
      <div id="cards" class="grid">${cards || empty}</div>
    </main>
    <script>
      const search = document.querySelector("#search");
      const subject = document.querySelector("#subject");
      const cards = Array.from(document.querySelectorAll(".card"));

      function applyFilters() {
        const query = search.value.trim().toLowerCase();
        const selectedSubject = subject.value;
        for (const card of cards) {
          const matchesText = !query || card.textContent.toLowerCase().includes(query);
          const matchesSubject = !selectedSubject || card.dataset.subject === selectedSubject;
          card.hidden = !(matchesText && matchesSubject);
        }
      }

      search?.addEventListener("input", applyFilters);
      subject?.addEventListener("change", applyFilters);
    </script>`,
  });
}

function renderPackage(item) {
  const lessonPath = join(item.dir, "lesson.md");
  const sourcesPath = join(item.dir, "sources.md");
  const licensePath = join(item.dir, "license.md");
  const simulationPath = join(item.dir, "simulation.html");
  const hasSimulation = isFile(simulationPath);

  return pageShell({
    title: item.manifest.title ?? item.slug,
    body: `<header>
      <p><a href="../../../">Back to library</a></p>
      <h1>${escapeHtml(item.manifest.title ?? item.slug)}</h1>
      <p class="lede">${escapeHtml(item.manifest.summary ?? "")}</p>
      <div class="meta">
        <span class="pill">${escapeHtml(item.subject)}</span>
        <span class="pill">${escapeHtml(item.manifest.level ?? "level")}</span>
        <span class="pill">${escapeHtml(item.manifest.type ?? "lesson")}</span>
      </div>
    </header>
    <main>
      ${
        hasSimulation
          ? `<section class="panel" aria-label="Simulation"><h2>Simulation</h2><iframe src="simulation.html" title="${escapeHtml(item.manifest.title ?? item.slug)} simulation"></iframe></section>`
          : ""
      }
      <section class="panel">${markdownToHtml(isFile(lessonPath) ? readText(lessonPath) : "# Lesson\n\nNo lesson file found.")}</section>
      <section class="panel"><h2>Sources</h2>${markdownToHtml(isFile(sourcesPath) ? readText(sourcesPath) : "No sources file found.")}</section>
      <section class="panel"><h2>License</h2>${markdownToHtml(isFile(licensePath) ? readText(licensePath) : "No license file found.")}</section>
    </main>`,
  });
}

rmSync(DIST_DIR, { recursive: true, force: true });
mkdirSync(DIST_DIR, { recursive: true });

const packages = findPackages();
writeFileSync(join(DIST_DIR, "index.html"), renderIndex(packages));

for (const item of packages) {
  const targetDir = join(DIST_DIR, "contributions", item.subject, item.slug);
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, "index.html"), renderPackage(item));
  for (const file of ["simulation.html", "preview.png", "preview.svg"]) {
    const source = join(item.dir, file);
    if (isFile(source)) cpSync(source, join(targetDir, basename(file)));
  }
}

process.stdout.write(`build-pages: wrote ${relative(REPO_ROOT, DIST_DIR)} with ${packages.length} package(s)\n`);
