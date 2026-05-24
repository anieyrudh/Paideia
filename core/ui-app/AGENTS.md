# core/ui-app - agent contract

## What this module is

Branch-agnostic app-shell helpers for curriculum catalogue pages. It owns small
semantic React primitives for global home links, search boxes, module tabs,
status badges, and mastery status toggles, plus pure helpers for catalogue
search and mastery summaries. It is the shared layer that keeps A-Level, SUTD,
and future curriculum shells from rebuilding the same navigation and learner-map
logic differently.

This module is intentionally smaller than a full design system. Branch apps keep
their layout, copy, visual identity, and CSS. `core/ui-app` supplies accessible
shell primitives and deterministic list/mastery helpers.

## Public interface

Exports from `@paideia/ui-app`:

- `MasteryStatus = "not-started" | "practicing" | "mastered"`
- `MasteryRecord = Readonly<Record<string, MasteryStatus>>`
- `SearchableContainer = { id: string; title: string; subject: string; level: string; module: string; summary: string; keywords?: readonly string[] }`
- `SearchResultSummary = { visible: number; total: number; label: string }`
- `MasterySummary = { total: number; notStarted: number; practicing: number; mastered: number; percentMastered: number }`
- `HomeLinkProps = { href: string; label: string; currentLabel?: string; className?: string }`
- `StatusBadgeProps = { label: string; tone?: "neutral" | "ready" | "practice" | "blocked"; className?: string }`
- `CurriculumSearchProps = { value: string; label: string; placeholder?: string; resultSummary: SearchResultSummary; onChange: (value: string) => void; className?: string }`
- `ModuleTabsProps = { modules: readonly string[]; selectedModule: string; allLabel?: string; label: string; onChange: (module: string) => void; className?: string }`
- `MasteryStatusToggleProps = { containerId: string; label: string; value: MasteryStatus; onChange: (containerId: string, value: MasteryStatus) => void; className?: string }`
- `normalizeSearchQuery(query: string): string`
- `filterContainers(containers: readonly SearchableContainer[], query: string, selectedModule?: string): KernelResult<readonly SearchableContainer[]>`
- `searchResultSummary(visible: number, total: number): SearchResultSummary`
- `masteryStatus(value: string): KernelResult<MasteryStatus>`
- `masterySummary(containers: readonly SearchableContainer[], mastery: MasteryRecord): MasterySummary`
- `nextReadyContainers(containers: readonly SearchableContainer[], prerequisiteIdsByContainer: ReadonlyMap<string, readonly string[]>, mastery: MasteryRecord, limit?: number): KernelResult<readonly SearchableContainer[]>`
- `<HomeLink href={string} label={string} currentLabel?={string} className?={string} />`
- `<StatusBadge label={string} tone?={"neutral" | "ready" | "practice" | "blocked"} className?={string} />`
- `<CurriculumSearch value={string} label={string} placeholder?={string} resultSummary={SearchResultSummary} onChange={(value: string) => void} className?={string} />`
- `<ModuleTabs modules={readonly string[]} selectedModule={string} allLabel?={string} label={string} onChange={(module: string) => void} className?={string} />`
- `<MasteryStatusToggle containerId={string} label={string} value={MasteryStatus} onChange={(containerId: string, value: MasteryStatus) => void} className?={string} />`

## Invariants the caller must preserve

- Container ids are non-empty trimmed strings.
- Search is case-insensitive and diacritic-insensitive.
- `selectedModule === "all"` means no module filter.
- Mastery statuses are limited to `"not-started"`, `"practicing"`, and
  `"mastered"`.
- Mastery percentages are finite and use `0` for an empty container list.
- `nextReadyContainers()` only returns containers whose prerequisites are all
  mastered or absent from the current visible list.
- App-shell primitives are controlled: callers own search text, selected module,
  and mastery state.
- Every rendered control/link has an accessible name from caller-provided text.

Helper invariant violations return `KernelResult.err("precondition-violated", ...)`.
Components are controlled render primitives. Invalid caller labels still render
as provided; validation belongs in the data/helper layer.

## What this module does NOT do

- Does not own branch-specific routing, generated graph loading, or curriculum
  data schemas.
- Does not persist mastery data to localStorage or sync it to a server.
- Does not own final page layout, CSS tokens, or brand voice.
- Does not render simulations, formula panels, charts, or concept maps.
- Does not import from `a-level/`, `sutd/`, or generated shell data.

## When to consider this module

Use `core/ui-app` when a shell needs reusable catalogue search, module tabs,
student-facing status badges, global home navigation, mastery toggles, or
readiness ordering. If A-Level and SUTD are about to duplicate app-shell logic,
put the branch-neutral part here.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current shell consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for prop renames, mastery-state semantics, or search/readiness
   behavior changes.

## Anti-patterns (will be rejected in PR review)

- Hidden localStorage reads or writes inside components.
- Branch-specific labels, ids, or route assumptions.
- Components that look clickable but are not keyboard reachable.
- Exporting a full design system or opinionated marketing layout.
- Mutating caller-owned container arrays, mastery records, or prerequisite maps.
- Leaking package names, file paths, or kernel jargon into learner-facing labels.

## How the Anieyrudh Filter reads this module

The Filter probes whether the app shell helps a learner know where they are,
what is ready next, and how to return home without exposing implementation
details. Components must improve navigation clarity without turning branch pages
into generic technical dashboards.
