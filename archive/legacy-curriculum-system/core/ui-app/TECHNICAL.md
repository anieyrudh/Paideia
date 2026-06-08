# core/ui-app · Technical Record

## Public Interface

`@paideia/ui-app` exports branch-neutral app-shell primitives:

- catalogue search helpers;
- mastery-status validation, summaries, and ready-next ordering;
- semantic React components for home links, status badges, curriculum search,
  module tabs, and mastery toggles.

The package intentionally avoids branch imports and storage side effects.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Container ids and display fields are non-empty trimmed strings | `validContainer()` returns `KernelResult.err` from search/readiness helpers |
| Search is case-insensitive and diacritic-insensitive | `normalizeSearchQuery()` plus unit tests |
| `selectedModule === "all"` disables module filtering | `filterContainers()` branch and tests |
| Mastery statuses are limited to three known values | `masteryStatus()` runtime guard |
| Mastery percentages are finite | `masterySummary()` zero-safe division |
| Ready-next containers require known prerequisites to be mastered | `nextReadyContainers()` plus tests |
| Components are controlled | props expose `value`/`onChange`; no local state |
| Rendered controls have accessible names | labels, legends, nav labels, and component tests |

## Dependency and License Notes

Runtime dependencies:

- `@paideia/shared` via workspace dependency.

Peer dependencies:

- `react >=18`.

Dev-only dependencies match existing React core packages:

- `@testing-library/react`, `@types/react`, `@types/react-dom`, `jsdom`,
  `react`, `react-dom`, `typescript`, and `vitest`.

No third-party runtime UI library is bundled.

## P2 Followups

- Add `core/ui-app` to `docs/core-modules.md` as implemented during the next
  docs catalogue refresh.
- Migrate A-Level and SUTD shell duplicate search/mastery/navigation logic to
  consume this package in a separate product refactor PR.

## Anieyrudh Filter pass

Date: 2026-05-24
Filter version: aniegpt v1.0

### P0 issues

- Risk: app-shell primitives could accidentally own branch routing or local
  persistence. Resolution: package exposes controlled components and pure
  helpers only; no localStorage, generated-data import, or branch path import.
- Audit P1: duplicate search-summary ids would break pages with two search
  boxes. Resolution: `CurriculumSearch` now uses `useId()` for a unique
  `aria-describedby` target.
- Audit P1: `filterContainers()` silently hid malformed container data while
  the contract promised `KernelResult.err`. Resolution: `filterContainers()` now
  returns `KernelResult<readonly SearchableContainer[]>` and rejects malformed
  data explicitly.

### P1 issues

- Risk: generic UI components could leak technical labels into learner-facing
  pages. Resolution: every learner-visible label is caller-provided; package
  emits no package names, file paths, or kernel jargon.

### High-bandwidth questions surfaced

- A later shell refactor should decide how much A-Level and SUTD page layout
  should converge after this neutral primitive layer exists.

## Iteration log

- Read existing A-Level and SUTD shell duplication before defining the kernel.
- Kept this package storage-agnostic and CSS-light to avoid freezing a visual
  design too early.
- Added component tests for accessibility names and pure tests for search and
  mastery logic.
