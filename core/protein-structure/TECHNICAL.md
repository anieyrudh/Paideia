# @paideia/protein-structure Technical Notes

## Public Interface Summary

The package exports three branded types (`AminoAcidLetter`, `Hydropathy`,
`MolecularWeight`), three string-literal classifier types (`ChargeClass`,
`PolarityClass`, `RegionLabel`), three record types (`AminoAcidProperties`,
`HydropathyProfilePoint`, `HydropathyProfile`), the `HydropathyProfileOptions`
input, one validating constructor (`aminoAcidLetter`), four total lookups
(`aminoAcidProperties`, `kyteDoolittleHydropathy`, `chargeClass`,
`polarityClass`), and the windowed `hydropathyProfile`.

All fallible operations return `KernelResult<T>` from `@paideia/shared`. Total
lookups consume a branded `AminoAcidLetter` and cannot fail for branded input.
No public API uses `any`, mutates caller-owned inputs, renders UI, or stores
hidden global state.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| `AminoAcidLetter` is one of the 20 standard uppercase letters | `aminoAcidLetter` rejects empty input, multi-character input, lowercase, the stop symbol `*`, and ambiguity codes (B, Z, J, X, U, O). |
| Property lookups are total over the alphabet | The 20-row `TABLE` is `Object.freeze`'d at module load; the brand guarantees the key exists. A defensive `throw` inside `requireBranded` exists only to surface a forged brand as a programming error. |
| Kyte-Doolittle values are the literature standard | The hydropathy column matches Kyte & Doolittle, *J. Mol. Biol.* 1982, 157, 105–132. A unit test pins extremes (Ile = +4.5, Arg = −4.5) and a sanity test asserts every value lies in `[−4.5, +4.5]`. |
| `hydropathyProfile` rejects even windows | Explicit modulo-2 check returns `precondition-violated`; the centre residue must be unique. |
| `hydropathyProfile` rejects windows larger than the sequence | Explicit guard returns `out-of-domain`. |
| `hydropathyProfile` propagates invalid sequence letters | The internal `validateSequence` calls `aminoAcidLetter` for every character and surfaces the first invalid index. |
| Custom thresholds must be finite and consistently ordered | Both threshold options are validated; `hydrophilicThreshold > hydrophobicThreshold` is rejected. |
| Centre means equal the explicit running mean | Property test compares each profile point's mean against an explicit re-summation. |

## Numerical / Algorithmic Method

The 20-row property table is a frozen literal. Each total lookup is an
`Object.freeze`d `Record` access. The windowed profile is a single forward
pass with a windowed sum:

```text
for centre in [half, N - 1 - half]:
  mean = (sum_{offset=-half..half} hydropathy[centre + offset]) / W
  classify mean against hydrophobic / hydrophilic thresholds
```

The implementation re-sums each window for simplicity rather than maintaining
a sliding accumulator; the per-window cost is `O(W)` and the total cost is
`O(N·W)` which is plenty fast for any realistic protein (W ≤ 21,
N ≤ a few thousand residues).

The default thresholds (`+1.6` hydrophobic, `−0.5` hydrophilic) reproduce
the commonly cited introductory-textbook transmembrane heuristic. Sims that
need different thresholds pass them through `HydropathyProfileOptions`.

## Dependencies and License Status

| Dependency | Kind | Version | License | Notes |
|---|---|---|---|---|
| `@paideia/shared` | runtime | workspace | MIT (project) | Brings in `KernelResult`, `Brand`, `approxEqual`, `err`, `ok`. |
| `fast-check` | dev | `^3.23.2` | MIT | Property-test runner only (already in workspace). |
| `typescript` | dev | `^5.6.0` | Apache-2.0 | Compiler only. |
| `vitest` | dev | `^4.1.7` | MIT | Test runner only. |

No new third-party runtime dependencies. The Kyte-Doolittle hydropathy values
and the residue molecular weights are scientific-literature facts and are not
copyrightable.

## Test Strategy

- **Constructor coverage:** every error path of `aminoAcidLetter` (stop
  symbol, ambiguity codes, lowercase, multi-character, empty, non-string).
- **Total-lookup coverage:** spot-check + full-alphabet bounds check for
  `kyteDoolittleHydropathy`; spot-checks for `chargeClass`, `polarityClass`,
  `aminoAcidProperties`.
- **Profile coverage:** hydrophobic stretch, hydrophilic stretch, mixed
  neutral stretch, even-window rejection, oversized-window rejection,
  invalid-letter rejection, non-integer / non-positive `windowSize`
  rejection, threshold-ordering rejection.
- **Property tests:** wide thresholds force every label to `neutral`;
  per-centre mean equals the explicit running sum.

## Anieyrudh Filter pass

Date: 2026-05-26
Filter version: aniegpt v1.0 (kernel author self-audit)

### P0 issues

- None observed. Public interface matches the contract in `AGENTS.md`: three
  branded types, three classifier literal types, three records, one
  constructor, four total lookups, and the windowed profile. No `any` in any
  public signature. No exceptions thrown for expected validation failures.
  No curriculum-specific flags. No GPL or non-free data: the hydropathy and
  weight tables are scientific-literature facts.

### P1 issues

- The `requireBranded` defensive `throw` is unreachable through the public
  constructor but exists to surface a forged brand as a clear runtime error
  rather than `undefined` propagation. It also pins the brand-as-key
  invariant at the place where it would silently fail otherwise.
- The kernel exposes only the Kyte-Doolittle scale. Hopp-Woods, Eisenberg,
  and Engelman scales are popular alternates. Recording as a P2; widening
  through the same symbol would be a contract break.

### P2 follow-ups (deferred)

- Add alternative hydropathy scales (`hoppWoodsHydropathy`,
  `eisenbergConsensusHydropathy`, `engelmanGesScale`) once a container
  requests them. Each goes through its own typed function and brand.
- Add a `transmembraneSegments` helper that emits half-open ranges of
  consecutive hydrophobic windows. The current `HydropathyProfile` exposes
  enough information for a container to compute this inline; a follow-up
  kernel function would be cleaner once a second container needs it.
- Consider promoting `MolecularWeight` to `core/shared` if a second kernel
  needs it (e.g. a future `core/protein-folding` kernel that scores
  folding-energy approximations).

### High-bandwidth questions surfaced

- Should `core/sequence`'s `ProteinSequence` brand and this kernel's
  `AminoAcidLetter` brand live in the same package to avoid duplication?
  Today they are intentionally separate because `core/sequence` accepts the
  stop symbol `*` (it is part of the translated output) while
  `core/protein-structure` rejects `*` (a stop symbol has no Kyte-Doolittle
  hydropathy). Recorded for a future `core-change-proposal` if the two
  brands diverge further.
