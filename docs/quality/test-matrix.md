# Test Matrix

This matrix defines the checks that protect Paideia from regressions. It also
defines which failures an agent may fix mechanically and which failures require
human review.

## CI Gates

| Gate | Command or workflow | Blocks merge | Auto-fixable |
| --- | --- | --- | --- |
| TypeScript | `pnpm typecheck` | Yes | Yes, for local type errors that do not change public contracts |
| Lint | `pnpm lint` | Yes | Yes, for formatting, import order, and narrow static-analysis fixes |
| Unit and browser tests | `pnpm test` | Yes | Sometimes, when the failing assertion clearly matches the intended behavior |
| Boundary check | `pnpm boundary` | Yes | Sometimes, by moving code to the correct branch or core package |
| Container validation | `pnpm container:validate` | Yes | Yes, for missing generated files or schema-shape corrections |
| License check | `pnpm license:check` | Yes | No, unless removing an accidental dependency |
| Agent docs | `pnpm agent:validate` | Yes in lint job | Yes, for stale prompt paths and mirrored skill text |
| Accessibility | `.github/workflows/accessibility.yml` / `pnpm test:a11y` | Yes when triggered | Sometimes, for labels, focus order, contrast, and landmark fixes |

## Container Gates

Every product container must pass the repository validator and the container
contract in `docs/container-spec.md`.

| Area | Required evidence | Auto-fixable |
| --- | --- | --- |
| Manifest | `container.yaml` or `manifest.yaml` validates through `core/content-schema` | Sometimes, for missing metadata already present elsewhere |
| Required folders | `concept-map/`, `simulation/`, `problem-solving/`, `media/`, `embed/` where required by the spec | Yes, for empty scaffold files; no, for educational content |
| Concept card | First-principles explanation, definitions, examples, misconceptions | No, human review required |
| Sources | Citations for syllabus and factual claims | No, human review required |
| Simulation contract | Declared runtime, controls, presets, state labels, formulas, prediction gate if declared | Sometimes, for wiring errors; no, for conceptual design |
| Problem solving | Strategy tree, worked method, proof outline, or decision procedure | No, human review required |
| Concept map | Prerequisites, dependents, sibling concepts, misconception graph, mindmap source | Sometimes, for generated graph links |
| Technical review | Non-empty Anieyrudh Filter pass and known limitations | No, human review required for P0/P1 acceptance |

## Kernel Gates

Core kernels are shared infrastructure. They require stricter review because a
small API mistake can break many future containers.

| Area | Required evidence | Auto-fixable |
| --- | --- | --- |
| Contract match | `core/<module>/AGENTS.md` public interface exactly matches `src/index.ts` | No, unless it is a missing export with an existing implementation |
| Types | No `any` in public APIs; strict TypeScript; branded units where appropriate | Sometimes, for internal typing only |
| Result handling | Expected errors use `KernelResult.err(...)`; no silent swallowing | Sometimes, for local error plumbing |
| Tests | Happy path, edge cases, error codes, and property tests for mathematical invariants | No, human review required for adequacy |
| Architecture | No hidden global state, no branch-specific flags, no DOM access at import time | No, human review required |
| Dependencies | Runtime libraries are allowlisted in `LICENSES.json` | No, maintainer decision required |

## Accessibility Gates

Accessibility is part of product correctness. A sim that cannot be operated by
keyboard or screen reader is not complete.

| Gate | Required evidence | Auto-fixable |
| --- | --- | --- |
| Axe scan | No critical axe violations in revealed sim state | Yes, for straightforward semantic fixes |
| Keyboard path | Prediction, controls, reveal, and reset are reachable without a mouse | Sometimes |
| Labels | Inputs, charts, buttons, and formula readouts have student-facing names | Yes |
| Motion and contrast | Visual feedback is readable and does not rely on color alone | Sometimes |
| Content clarity | No code-facing labels in student UI | Yes, when a clear human label exists |

## Security And License Gates

These gates protect the public repository and future schools using it.

| Area | Required evidence | Auto-fixable |
| --- | --- | --- |
| License allowlist | Runtime dependencies pass `pnpm license:check` | No, except dependency removal |
| GPL boundary | GPL/AGPL/LGPL code is not bundled into runtime packages | No, use clean-room process |
| Secrets | No committed credentials, API keys, or private tokens | Yes, remove and rotate with maintainer |
| Dependency risk | No unreviewed runtime dependency for small helper logic | No, human review required |
| Cross-branch imports | A-Level and SUTD do not import from each other | Sometimes, by moving shared logic to `core/` |
| Generated code | Generated registries are reproducible from source files | Yes |

## Auto-Fix Policy

Agents may push fix commits only when all of these are true:

- The PR is labeled `needs-agent-fix` or `agent-active`.
- The fix is local to the PR's existing scope.
- The fix does not change a public core API, educational claim, source citation,
  license decision, security boundary, or container learning objective.
- The agent can rerun the relevant failing gate.
- The commit message explains the mechanical failure it fixed.

Agents must not auto-merge. They may mark a PR ready for review after checks are
green and P0/P1 review comments are resolved.

## Human-Review-Only

Human review is required for:

- New or changed educational explanations, examples, misconceptions, or sources.
- New core public APIs or breaking shared behavior.
- Security, licensing, clean-room, and dependency policy decisions.
- P0/P1 Anieyrudh Filter findings.
- Any PR where the agent needs to choose between competing product directions.
