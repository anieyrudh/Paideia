# Reuse Boundaries And Clean-Room Rewrites

Paideia separates reusable behavior from curriculum. `core/` owns contracts and
behavior; branches own institutional curriculum; containers compose both into a
student-facing learning unit.

## Ownership Split

| Thing | Goes where | Owns |
| --- | --- | --- |
| Generic math, simulation logic, parsing, layout, scheduling | `core/<kernel>/` | Behavior, public API, invariants, tests, dependency license proof |
| A-Level, SUTD, or future branch syllabus alignment | `<branch>/content/...` | Curriculum, level, syllabus references, source fit, misconceptions |
| A concrete learning experience | `<branch>/content/<subject>/containers/<id>/` | `container.yaml`, concept card, concept map, media, embed API, problem-solving path, simulation spec, citations, QA status |
| A specific interactive simulation | `<container>/simulation/` plus a package/app renderer | UI wiring, controls, presets, state labels, kernel composition, prediction-gate Playwright test |
| GPL code, external prototypes, and design guides | `docs/reference/` or external source notes until extracted | Source material only; no runtime behavior until relicensed, clean-room rewritten, or isolated |

## Classification Rule

Use this decision order for any GPL code, guide excerpt, prototype, or external
repo:

1. If it is reusable behavior independent of institution, syllabus, or concept,
   it belongs in `core/<kernel>/`.
2. If it is syllabus, pedagogy, misconception evidence, assessment intent, or
   source alignment, it belongs in the relevant branch container.
3. If it is a concrete interaction for one concept, it belongs under that
   container's `simulation/` surface and package/app renderer.
4. If it is only inspiration, prior art, or blocked by licensing, keep it as
   reference and rewrite the behavior cleanly.

## GPL Clean-Room Rewrite Rule

GPL-family repositories are not copied into Paideia. That includes source files,
tests, internal data structures, comments, assets, and distinctive implementation
architecture. The safe path is a clean-room rewrite:

1. Treat the GPL repository as reference-only prior art.
2. Record the user-facing behavior needed by Paideia in a neutral spec.
3. Reimplement from first principles against Paideia contracts, preferably in
   `core/<kernel>/` for reusable behavior or inside a container sim for
   concept-specific interaction.
4. Keep attribution in `sources.md` or `NOTICE` when the idea, paper, or
   external project materially informed the work.
5. Do not copy implementation text, file structure, names unique to the GPL
   project, test vectors that are creative rather than factual, or visual assets.

If a GPL tool must be used unchanged, isolate it outside the browser payload
through a separate service, iframe, or external link. Do not bundle it into the
monorepo runtime.

### Clean-Room Roles

Clean-room rewrites require role separation:

- **Reviewer/spec author:** may inspect the GPL source and writes the neutral
  spec.
- **Implementer:** writes Paideia code and must not inspect the GPL source,
  repository history, tests, assets, distinctive identifiers, or internal
  architecture.
- **Rewrite reviewer:** checks behavior against the neutral spec and Paideia
  contracts, not against copied GPL implementation details.

Record the separation in the PR or `TECHNICAL.md`: who inspected the source,
who implemented the rewrite, what source access the implementer did not have,
and where the neutral spec lives. For high-risk rewrites, keep access logs or a
short attestation in the PR.

A **neutral spec** describes only observable behavior: user-facing outcomes,
inputs, outputs, invariants, edge cases, error cases, accessibility
expectations, and acceptance tests. It must not reproduce implementation
structure, algorithms, internal names, file layout, comments, or creative test
vectors from the GPL source.

Allowed wording:

- "Given two vectors, the interaction shows their resultant magnitude and
  direction."
- "The solver rejects a singular matrix with a typed domain error."

Prohibited wording:

- "Port `FooVectorResolver.computeStep3()` into `core/mechanics`."
- "Use the same class names, fixture files, magic constants, or UI asset names
  as the GPL project."

Reusable behavior should land under `core/<kernel>/`. Concept-specific behavior
should land under a single container's `simulation/` and package renderer.

## Reuse Inventory Tags

Every candidate pulled from GPL repositories, SimLab guides, or external
repositories should be tracked with these tags before implementation:

| Tag | Allowed values | Purpose |
| --- | --- | --- |
| `source` | `gpl-repo`, `a-level-guide`, `sutd-guide`, `ib-guide`, `simlab-design-guide`, `external-repo` | Where the idea or code came from |
| `target_branch` | `a-level`, `sutd`, `ib-proposed`, `core`, `none` | Where the extracted work would land |
| `artifact_type` | `core-kernel`, `concept-package`, `sim`, `reference-only` | What kind of Paideia artifact it becomes |
| `domain` | `physics`, `math`, `csd`, `epd`, `esd`, `asd`, `dai`, `hass`, `ib-core`, or subject kebab-case | Curriculum or technical domain |
| `kernel_deps` | `prediction-gate`, `function-eval`, `numerical-math`, `plotting`, etc. | Core modules needed by the candidate |
| `license_status` | `allowed`, `review-required`, `recreate`, `iframe-only`, `blocked`, `unknown` | Whether code/assets may be bundled |
| `reuse_action` | `extract`, `clean-room-rewrite`, `isolate`, `discard`, `keep-as-reference` | What to do next |
| `status` | `reference-only`, `content-only`, `sim-spec-ready`, `build-ready`, `implemented`, `validated` | Current delivery state |

## Sim Inventory Rule

A sim only exists in Paideia when the container declares a simulation and the
runtime surface can be exercised by tests:

- `container.yaml`
- `simulation/simulation.yaml`
- `simulation/index.tsx`
- `simulation/simulation.test.ts`
- package/app renderer and Playwright prediction-gate coverage when the sim is
  runnable in a shell

A guide section, prototype, mockup, issue, or GPL implementation is not a
Paideia sim until it has been moved into that shape and passes
`pnpm container:validate`.

Current repository state snapshot at Phase B start:

| Branch | Container | Status | Sims |
| --- | --- | --- | --- |
| `a-level` | `physics/scalars-and-vectors`, `physics/resolving-vectors`, `physics/physical-quantities-and-units` | reviewed or in product-slice review | runnable physics sims exist in the A-Level shell |
| `sutd` | none | shell-only | none implemented |

## License Triage For GPL And External Reuse

Runtime code bundled into Paideia must pass `LICENSES.json`. Code or assets
under GPL, AGPL, LGPL, SSPL, BUSL, Commons Clause, or unclear custom terms must
not be copied into `core/`, branch apps, or container sims.

`LICENSES.json` is the repository's top-level production dependency license
allowlist. The maintainer owns updates to it. Contributors and agents use it
before adding runtime dependencies, and CI enforces it with:

```bash
pnpm license:check
```

Expected top-level shape:

```json
{
  "allowed": ["MIT", "Apache-2.0", "BSD-3-Clause"],
  "rejected": ["GPL-3.0", "AGPL-3.0", "LGPL-3.0"],
  "review_required": ["CC-BY-4.0", "OFL-1.1"],
  "iframe_only": ["WiseMapping (GPLv3) - embed via separate service"]
}
```

Only the maintainer should add allowlist exceptions. If a package license is
missing, custom, mixed, or unclear, stop and record it as `review-required` or
`blocked` instead of adding it to the runtime.

Use these outcomes:

| License finding | Action |
| --- | --- |
| MIT, Apache-2.0, BSD, ISC, MPL-2.0, 0BSD, Unlicense, CC0 | May be reused if `LICENSES.json` allows it and attribution is recorded |
| CC-BY content | Review required; acceptable for content with attribution, not for code deps |
| CC-BY-SA, OFL, custom research/demo terms | Review required before bundling |
| GPL, AGPL, LGPL, SSPL, BUSL, Commons Clause | Do not bundle; clean-room rewrite behavior from first principles or isolate externally |
| Mixed-license repository | Treat as `unknown` until every imported package/file is proven allowed |
| No license file | Treat as blocked for code reuse; reference only |

Known candidates from the current planning guides that need caution:

| Candidate | Source signal | Default Paideia action |
| --- | --- | --- |
| WiseMapping | Listed in `LICENSES.json` as GPLv3 iframe-only | Do not bundle; isolate externally or recreate a Paideia `mind-map` experience |
| Voyant Tools | Listed in `LICENSES.json` as GPLv3 iframe-only | Do not bundle; link/embed externally or recreate text-analysis behavior |
| PhET / SceneryStack | Guide notes mixed MIT/GPL ecosystem | Audit per repository before reuse; prefer clean-room concept-specific sims when license is mixed |
| Kialo Edu | Listed in `LICENSES.json` as commercial iframe/link-only | Do not bundle; link externally or recreate an argument-graph workflow |

For any GPL repository under consideration, the first pass must produce a
license table before rewrite planning:

| GPL repo path or package | Detected license | Runtime? | Paideia action | Notes |
| --- | --- | --- | --- | --- |
| TBD | unknown | unknown | keep-as-reference | Fill after reading the GPL repository |

If any implementation has no clear compatible license, preserve the idea only
and rewrite the kernel or sim against Paideia contracts.
