# @paideia/materials technical note

## Public surface

The public surface is exactly the symbols listed in `AGENTS.md`: branded
property units, material records, simplified stress-strain response, safety
factor, performance index, and deterministic material ranking.

## Invariant enforcement

| Invariant | Mechanism |
| --- | --- |
| Positive finite material properties | Unit constructors and `validateMaterial`. |
| Non-empty material identity | `validateMaterial` checks `id` and `name`. |
| Material class is known | `validateMaterial` checks against the closed `MaterialClass` set. |
| Yield strength not above ultimate strength | `validateMaterial` returns `precondition-violated`. |
| Ductile fracture strain is beyond yield strain | `validateMaterial` checks `fractureStrain > yieldStrength / youngModulus`. |
| Engineering strain is non-negative | `strain` and `stressAtStrain` runtime guard. |
| Simplified stress-strain model only | README, AGENTS, and regime tests document the limits. |
| Ranking does not mutate inputs | `rankMaterials` copies into local score records; test asserts input order remains. |
| Missing optional properties are explicit | `performanceIndex` returns a score of 0 with `missing` labels. |
| Performance goals are supported values | `performanceIndex` guards runtime goal strings. |

## Error model

- `out-of-domain`: non-finite, zero, negative, or otherwise impossible numeric
  property values.
- `precondition-violated`: empty material identity, unsupported material class,
  yield above ultimate, fracture strain at or below yield strain, unsupported
  goal or safety-factor mode, missing yield strength for yield safety factor, or
  missing ductile fracture strain above yield.

## Dependencies

Runtime dependencies:

- `@paideia/shared` for `Brand`, `KernelResult`, `ok`, and `err`.

Dev-only dependencies:

- `vitest`
- `fast-check`
- `typescript`

No third-party runtime materials package is bundled.

## Anieyrudh Filter pass

P0 issues + resolution:

- P0 check: hidden material database or uncited property values. Resolution: this
  package ships formulas and validation only; property values must come from
  caller-owned, cited container records.
- P0 check: visual stress-strain curve could teach a richer model than the
  kernel computes. Resolution: `StressStrainRegime` is explicitly simplified
  and documented; nonlinear, fatigue, creep, fracture mechanics, and FEA are out
  of scope.
- P0 reviewer finding: unsupported runtime performance goals could escape the
  `KernelResult` contract. Resolution: `performanceIndex` now validates goals
  before selecting missing fields or computing scores; `rankMaterials` inherits
  the guarded path.

P1 issues + resolution-or-deferred-issue-link:

- P1 check: safety factors must be mode-specific. Resolution: `safetyFactor`
  records `mode`, `allowableStress`, `appliedStress`, `factor`, and `passes`.
- P1 check: material ranking must surface incomplete data instead of silently
  dropping materials. Resolution: `performanceIndex` returns `missing` labels
  and `rankMaterials` sorts complete records before incomplete records.
- P1 reviewer finding: stress-strain semantics around fracture strain were
  ambiguous. Resolution: ductile `fractureStrain` must be above yield strain,
  stress above yield without ductile fracture data returns
  `precondition-violated`, and no-yield materials honor supplied
  `fractureStrain`.
- P1 reviewer finding: `validateMaterial` accepted unsupported classes and
  ranking tie-breaks used locale collation. Resolution: class is runtime
  validated and tie-breaks use deterministic code-unit comparison.

High-bandwidth questions surfaced:

- Should Paideia eventually maintain a cited, versioned material-property data
  package? Deferred. This kernel intentionally avoids becoming an uncited data
  source.

P2 cleanup:

- P2 reviewer finding: README example used unchecked `.value`. Resolution:
  example now checks `KernelResult.ok`.
- P2 reviewer finding: examples/tests used named material values without
  citations. Resolution: README and tests now use synthetic demo material
  records rather than real named datasets.
