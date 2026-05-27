# core/functional-dependencies technical notes

## Public interface

The package exports branded attribute types, functional-dependency and schema
types, constructors, and pure analysis functions for closure, superkeys,
candidate keys, minimal cover, normal-form classification, and binary lossless
decomposition checks.

## Invariant enforcement

| Invariant | Enforcement |
|---|---|
| Attribute names are non-empty and unpadded | `attributeName()` guard |
| Attribute sets have no duplicates and return canonical sorted order | `attributeSet()` / `validateAttributeSet()` guards |
| Dependencies have non-empty determinant and dependent sets | `functionalDependency()` guard |
| Dependency attributes belong to the supplied schema | `relationSchema()` guard |
| Exhaustive key search stays bounded | `relationSchema()`, `attributeClosure()`, and `minimalCover()` reject universes over 12 attributes |
| Candidate keys are minimal superkeys | `candidateKeys()` enumerates by size and skips supersets of discovered keys |
| Minimal covers split RHS and remove redundancy | `minimalCover()` plus regression tests |
| Binary decomposition covers the full schema | `isLosslessBinaryDecomposition()` guard |
| Public functions do not mutate inputs | Regression test |

## Dependencies and licenses

Runtime dependencies:

- `@paideia/shared` workspace dependency.

Dev-only dependencies follow existing core package patterns:

- `typescript`
- `vitest`
- `fast-check`

No third-party runtime package was added.

## Anieyrudh Filter pass

P0 issues + resolution:

- Potential hidden parser scope creep: resolved by excluding SQL/DDL parsing,
  table data scanning, query optimisation, and decomposition synthesis from the
  contract and implementation.
- Potential unbounded exhaustive key search: resolved by rejecting schemas,
  direct closure calls, and minimal-cover calls with more than 12 attributes.
- Potential mutation of caller-owned dependency arrays: resolved with cloned,
  canonical outputs and a mutation regression test.

P1 issues + resolution:

- Candidate-key minimality can be easy to fake with happy-path tests only:
  addressed with proper subset skipping and normal-form tests that depend on
  candidate-key correctness.
- Normal-form wording may need richer student explanations later: deferred to
  consuming containers; this kernel returns stable verdicts and violation
  strings only.

High-bandwidth questions surfaced:

- Should future SUTD database containers need full 3NF/BCNF decomposition
  synthesis? If yes, that should be a separate ADR-backed API extension rather
  than hidden inside this v0 kernel.

## P2 cleanup backlog

- Add `core/functional-dependencies` to `docs/core-modules.md` during the next
  broader core catalogue refresh.
