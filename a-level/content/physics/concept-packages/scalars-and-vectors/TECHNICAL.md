# Scalars and Vectors · Technical Record

## Imports

No sim imports yet. This is a content-only package with an empty `sims/`
directory.

## SimulationSpec (frozen)

```yaml
sims: []
```

## Kernel extensions

None.

## Accessibility

No interactive surface yet. Future sim work must run Playwright plus axe and
assert that `core/prediction-gate` blocks reveal.

## Tests

- Container validation: `pnpm container:validate`
- Prediction-gate Playwright: not applicable until a sim is added.

## How to run locally

```bash
pnpm container:validate
```

## Anieyrudh Filter pass

Date: 2026-05-15
Filter version: aniegpt v1.0

### P0 issues

- Potential P0: content package without a prediction gate. Resolution: package
  includes `package_predict`; no observation-shaped sim exists yet, so there is
  no reveal path to leak.
- Potential P0: weak sourcing. Resolution: syllabus alignment cites the current
  SEAB 2027 H2 Physics 9478 syllabus, and misconception claims cite PER/OpenStax
  sources.

### P1 issues

- P1: No implemented sim yet. Resolution: status remains `content-only`; future
  sim work must add `SimulationSpec.yaml`, `index.tsx`, and a prediction-gate
  Playwright test.

### High-bandwidth questions surfaced

- Should the first sim focus on draggable arrows, component resolution, or
  scalar/vector classification cards?

## Iteration log

- Selected a small A-Level Physics foundation concept aligned to the current
  SEAB 9478 syllabus.
- Kept `sims/` empty rather than committing placeholder sim code that would
  fail the stricter validator.
- Rejected using the old scaffold template as-is because full Zod validation now
  rejects unresolved placeholders.
