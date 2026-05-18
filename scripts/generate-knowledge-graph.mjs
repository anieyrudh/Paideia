#!/usr/bin/env node
/**
 * Generate curriculum-shell data from v2 containers.
 *
 * Reads:
 *   <branch>/content/<subject>/containers/<concept-id>/container.yaml
 *   <branch>/content/<subject>/containers/<concept-id>/concept-map/concept-map.yaml
 *   <branch>/content/<subject>/containers/<concept-id>/simulation/simulation.yaml
 *
 * Emits branch app data. Targets whose app directory does not exist are skipped.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import YAML from "yaml";

const REPO_ROOT = resolve(process.cwd());
const TARGETS = [
  {
    branch: "a-level",
    appDir: join(REPO_ROOT, "a-level", "apps", "shell"),
    output: join(REPO_ROOT, "a-level", "apps", "shell", "src", "generated", "knowledge-graph.tsx"),
  },
  {
    branch: "sutd",
    appDir: join(REPO_ROOT, "sutd", "apps", "shell"),
    output: join(REPO_ROOT, "sutd", "apps", "shell", "src", "generated", "knowledge-graph.tsx"),
  },
];

const isDirectory = (path) => existsSync(path) && statSync(path).isDirectory();
const readYaml = (path) => YAML.parse(readFileSync(path, "utf8"));
const readOptionalText = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const jsString = (value) => JSON.stringify(value);

const subjectLabel = (subject) =>
  subject.replace(/-/gu, " ").replace(/\b\w/gu, (match) => match.toUpperCase());

const findContainers = (branch) => {
  const contentDir = join(REPO_ROOT, branch, "content");
  if (!isDirectory(contentDir)) return [];

  const manifests = [];
  for (const subject of readdirSync(contentDir)) {
    const containersDir = join(contentDir, subject, "containers");
    if (!isDirectory(containersDir)) continue;

    for (const conceptId of readdirSync(containersDir)) {
      const manifestPath = join(containersDir, conceptId, "container.yaml");
      if (existsSync(manifestPath)) manifests.push(manifestPath);
    }
  }

  return manifests.sort();
};

const toIdentifier = (value, index) => {
  const suffix = value
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `GeneratedSim${index}${suffix}`;
};

const renderStringArray = (items, indent = "      ") =>
  items.length === 0
    ? "[]"
    : `[\n${items.map((item) => `${indent}${jsString(item)},`).join("\n")}\n${indent.slice(0, -2)}]`;

const firstRendererModule = (simSpec, manifestPath) => {
  const module = simSpec.observe?.renderers?.[0]?.module;
  if (typeof module !== "string" || module.length === 0) {
    throw new Error(`${relative(REPO_ROOT, manifestPath)} simulation has no renderer module`);
  }
  return module;
};

const readOptionalYaml = (path) => (existsSync(path) ? readYaml(path) : null);

const stripFrontmatter = (markdown) =>
  markdown.replace(/^---\s*\n[\s\S]*?\n---\s*(\n|$)/, "");

const sectionBody = (markdown, heading) => {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^##\\s+${escaped}\\s*$`, "im"));
  if (!match) return "";
  const startIdx = (match.index ?? 0) + match[0].length;
  const after = markdown.slice(startIdx);
  const nextHeader = after.search(/^##\s+/m);
  return nextHeader === -1 ? after : after.slice(0, nextHeader);
};

const normalizeMarkdownText = (markdown) =>
  markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

const firstParagraph = (markdown) => {
  const paragraphs = markdown
    .split(/\n\s*\n/g)
    .map(normalizeMarkdownText)
    .filter(Boolean);
  return paragraphs[0] ?? "";
};

const bulletItems = (markdown, limit = 5) => {
  const items = [];
  let current = "";

  for (const line of markdown.split("\n")) {
    const bullet = line.match(/^\s*-\s+(.*)$/);
    if (bullet) {
      if (current.length > 0) items.push(normalizeMarkdownText(current));
      current = bullet[1] ?? "";
      continue;
    }

    if (current.length === 0) continue;
    if (/^\s*$/.test(line)) continue;
    if (/^#{1,6}\s+/u.test(line)) break;

    current = `${current} ${line.trim()}`;
  }

  if (current.length > 0) items.push(normalizeMarkdownText(current));
  return items.filter(Boolean).slice(0, limit);
};

const conceptCardSummary = (containerDir) => {
  const card = stripFrontmatter(readOptionalText(join(containerDir, "concept-card.md")));
  return {
    firstPrinciples: firstParagraph(sectionBody(card, "First-Principles Explanation") || sectionBody(card, "First-principles explanation")),
    keyDefinitions: bulletItems(sectionBody(card, "Key Definitions") || sectionBody(card, "Key definitions")),
    canonicalExamples: bulletItems(sectionBody(card, "Canonical Examples") || sectionBody(card, "Canonical examples")),
  };
};

const problemSolvingSteps = (containerDir, manifest) => {
  const stepsPath = join(containerDir, manifest.problem_solving?.steps ?? "problem-solving/steps.yaml");
  const parsed = readOptionalYaml(stepsPath);
  return (parsed?.steps ?? [])
    .map((step) => {
      if (typeof step.label === "string") return step.label;
      if (typeof step.prompt === "string") return step.prompt;
      return "";
    })
    .filter(Boolean)
    .slice(0, 7);
};

const renderKnowledgeGraph = (branch, manifests) => {
  const imports = [];
  const containers = [];
  const graphNodes = [];
  const graphEdges = [];
  let importIndex = 0;

  for (const manifestPath of manifests) {
    const containerDir = resolve(manifestPath, "..");
    const manifest = readYaml(manifestPath);
    const conceptMapPath = join(containerDir, manifest.concept_map?.spec ?? "concept-map/concept-map.yaml");
    const conceptMap = readOptionalYaml(conceptMapPath);
    const simSpecPath = manifest.simulation?.spec ? join(containerDir, manifest.simulation.spec) : null;
    const simSpec = simSpecPath === null ? null : readOptionalYaml(simSpecPath);
    const cardSummary = conceptCardSummary(containerDir);
    const steps = problemSolvingSteps(containerDir, manifest);
    const conceptId = basename(containerDir);
    const nodeId = `${branch}/${manifest.subject}/${manifest.id}`;

    graphNodes.push(`  {
    id: ${jsString(nodeId)},
    conceptId: ${jsString(manifest.id)},
    title: ${jsString(manifest.title)},
    subject: ${jsString(manifest.subject)},
    level: ${jsString(manifest.level ?? "")},
    module: ${jsString(manifest.module ?? "")},
    status: ${jsString(manifest.status)},
  }`);

    for (const relation of conceptMap?.prerequisites ?? []) {
      graphEdges.push(`  { from: ${jsString(`${branch}/${manifest.subject}/${relation.id}`)}, to: ${jsString(nodeId)}, kind: "prerequisite" }`);
    }
    for (const relation of conceptMap?.downstream ?? []) {
      graphEdges.push(`  { from: ${jsString(nodeId)}, to: ${jsString(`${branch}/${manifest.subject}/${relation.id}`)}, kind: "downstream" }`);
    }
    for (const relation of conceptMap?.siblings ?? []) {
      graphEdges.push(`  { from: ${jsString(nodeId)}, to: ${jsString(`${branch}/${manifest.subject}/${relation.id}`)}, kind: "sibling" }`);
    }

    const importName = simSpec === null ? null : toIdentifier(`${manifest.id}-${simSpec.id}`, importIndex);
    if (simSpec !== null && importName !== null) {
      importIndex += 1;
      imports.push(`import ${importName} from ${jsString(firstRendererModule(simSpec, manifestPath))};`);
    }

    const simBlock =
      simSpec === null || importName === null
        ? "[]"
        : `[
      {
        id: ${jsString(simSpec.id)},
        title: ${jsString(simSpec.title)},
        interactionType: ${jsString(simSpec.interaction_type)},
        component: ${importName},
      },
    ]`;

    containers.push(`  {
    id: ${jsString(nodeId)},
    branch: ${jsString(branch)},
    subject: ${jsString(subjectLabel(manifest.subject))},
    level: ${jsString(manifest.level ?? "")},
    module: ${jsString(manifest.module ?? "")},
    title: ${jsString(manifest.title)},
    summary: ${jsString(manifest.one_line_summary)},
    syllabusRef: ${jsString(manifest.syllabus_ref ?? "")},
    status: ${jsString(manifest.status)},
    packageId: ${jsString(conceptId)},
    simId: ${jsString(simSpec?.id ?? "package")},
    predictPrompt: ${jsString((manifest.package_predict?.prompt ?? simSpec?.predict?.prompt ?? "").trim())},
    aidTypes: ${renderStringArray(manifest.aid_types ?? [], "      ")},
    misconceptions: ${renderStringArray((manifest.misconceptions ?? []).map((entry) => entry.name), "      ")},
    transferProblem: ${jsString((manifest.transfer_problems?.[0]?.prompt ?? "No transfer problem registered yet.").trim())},
    firstPrinciples: ${jsString(cardSummary.firstPrinciples)},
    keyDefinitions: ${renderStringArray(cardSummary.keyDefinitions, "      ")},
    canonicalExamples: ${renderStringArray(cardSummary.canonicalExamples, "      ")},
    problemSolvingSteps: ${renderStringArray(steps, "      ")},
    prerequisites: ${renderStringArray((conceptMap?.prerequisites ?? []).map((entry) => entry.title), "      ")},
    downstream: ${renderStringArray((conceptMap?.downstream ?? []).map((entry) => entry.title), "      ")},
    siblings: ${renderStringArray((conceptMap?.siblings ?? []).map((entry) => entry.title), "      ")},
    sims: ${simBlock},
  }`);
  }

  if (containers.length === 0) {
    return `// Auto-generated by scripts/generate-knowledge-graph.mjs. Do not edit by hand.
import type { ComponentType } from "react";

export type AidType = "simulation" | "misconception-audit" | "transfer-problem" | "reasoning-lab" | "notebook" | "annotated-source";

export interface ShellSim {
  readonly id: string;
  readonly title: string;
  readonly interactionType: string;
  readonly component: ComponentType;
}

export interface ShellContainer {
  readonly id: string;
  readonly branch: "${branch}";
  readonly subject: string;
  readonly level: string;
  readonly module: string;
  readonly title: string;
  readonly summary: string;
  readonly syllabusRef: string;
  readonly status: string;
  readonly packageId: string;
  readonly simId: string;
  readonly predictPrompt: string;
  readonly aidTypes: readonly AidType[];
  readonly misconceptions: readonly string[];
  readonly transferProblem: string;
  readonly firstPrinciples: string;
  readonly keyDefinitions: readonly string[];
  readonly canonicalExamples: readonly string[];
  readonly problemSolvingSteps: readonly string[];
  readonly prerequisites: readonly string[];
  readonly downstream: readonly string[];
  readonly siblings: readonly string[];
  readonly sims: readonly ShellSim[];
}

export interface KnowledgeGraphNode {
  readonly id: string;
  readonly conceptId: string;
  readonly title: string;
  readonly subject: string;
  readonly level: string;
  readonly module: string;
  readonly status: string;
}

export interface KnowledgeGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: "prerequisite" | "downstream" | "sibling";
}

export const knowledgeGraph = {
  nodes: [],
  edges: [],
} satisfies { readonly nodes: readonly KnowledgeGraphNode[]; readonly edges: readonly KnowledgeGraphEdge[] };

export const containers: readonly ShellContainer[] = [];
`;
  }

  return `// Auto-generated by scripts/generate-knowledge-graph.mjs. Do not edit by hand.
import type { ComponentType } from "react";
${imports.join("\n")}

export type AidType = "simulation" | "misconception-audit" | "transfer-problem" | "reasoning-lab" | "notebook" | "annotated-source";

export interface ShellSim {
  readonly id: string;
  readonly title: string;
  readonly interactionType: string;
  readonly component: ComponentType;
}

export interface ShellContainer {
  readonly id: string;
  readonly branch: "${branch}";
  readonly subject: string;
  readonly level: string;
  readonly module: string;
  readonly title: string;
  readonly summary: string;
  readonly syllabusRef: string;
  readonly status: string;
  readonly packageId: string;
  readonly simId: string;
  readonly predictPrompt: string;
  readonly aidTypes: readonly AidType[];
  readonly misconceptions: readonly string[];
  readonly transferProblem: string;
  readonly firstPrinciples: string;
  readonly keyDefinitions: readonly string[];
  readonly canonicalExamples: readonly string[];
  readonly problemSolvingSteps: readonly string[];
  readonly prerequisites: readonly string[];
  readonly downstream: readonly string[];
  readonly siblings: readonly string[];
  readonly sims: readonly ShellSim[];
}

export interface KnowledgeGraphNode {
  readonly id: string;
  readonly conceptId: string;
  readonly title: string;
  readonly subject: string;
  readonly level: string;
  readonly module: string;
  readonly status: string;
}

export interface KnowledgeGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: "prerequisite" | "downstream" | "sibling";
}

export const knowledgeGraph = {
  nodes: [
${graphNodes.join(",\n")}
  ],
  edges: [
${graphEdges.join(",\n")}
  ],
} satisfies { readonly nodes: readonly KnowledgeGraphNode[]; readonly edges: readonly KnowledgeGraphEdge[] };

export const containers = [
${containers.join(",\n")}
] satisfies readonly [ShellContainer, ...ShellContainer[]];
`;
};

for (const target of TARGETS) {
  if (!isDirectory(target.appDir)) continue;

  const manifests = findContainers(target.branch);
  const output = renderKnowledgeGraph(target.branch, manifests);
  mkdirSync(resolve(target.output, ".."), { recursive: true });
  writeFileSync(target.output, output, "utf8");
  process.stdout.write(
    `generate-knowledge-graph: wrote ${relative(REPO_ROOT, target.output)} from ${manifests.length} container(s)\n`,
  );
}
