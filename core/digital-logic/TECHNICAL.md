# @paideia/digital-logic technical note

## Public surface

The public surface is exactly the symbols listed in `AGENTS.md`: bit
constructors, gate primitives, adders, binary conversion, truth-table generation,
small sum-of-products simplification, and a D flip-flop transition helper.

## Invariant enforcement

| Invariant | Mechanism |
| --- | --- |
| Bits are exactly `0` or `1` | `bit`, `bits`, and all public functions validate runtime values. |
| Multi-input gates require input | `validateNonEmptyVector` returns `precondition-violated`. |
| `not` is unary | `evaluateGate("not", ...)` enforces arity. |
| Arithmetic vectors are LSB-first | README and tests assert binary-string round trips and addition semantics. |
| Input names are unique identifiers | `validateInputNames` guards truth tables and SOP. |
| Truth-table evaluators are deterministic bit functions | Evaluator exceptions and non-bit outputs return `precondition-violated` or `out-of-domain`. |
| SOP minterms are in range with no overlap | `normalizeMinterms` validates bounds, uniqueness, and don't-care overlap. |
| SOP cover is minimal for supported small functions | Prime implicants are selected by exact cover, minimizing term count then literal count. |
| D flip-flop clock edge is boolean | `dFlipFlop` validates `clockRisingEdge` at runtime. |
| No caller input mutation | Functions copy into local arrays; tests assert gate inputs remain unchanged. |

## Error model

- `out-of-domain`: invalid bit, invalid binary string, or out-of-range minterm.
- `precondition-violated`: wrong gate arity, empty vectors where a value is
  required, duplicate/invalid input names, impossible render width, evaluator
  throw, unsupported gate kind, invalid clock edge, or minterm/don't-care
  overlap.

## Dependencies

Runtime dependencies:

- `@paideia/shared` for `KernelResult`, `ok`, and `err`.

Dev-only dependencies:

- `vitest`
- `fast-check`
- `typescript`

No third-party runtime logic package is bundled.

## Anieyrudh Filter pass

P0 issues + resolution:

- P0 check: hidden mutable circuit state. Resolution: no module-level state is
  kept; sequential behavior is represented by explicit `DFlipFlopInput`.
- P0 check: public API leaking loose numbers for bit values. Resolution: public
  outputs use `Bit = 0 | 1`; all public functions validate runtime input.
- P0 reviewer finding: greedy SOP cover could produce non-minimal expressions.
  Resolution: replaced greedy selection with exact cover over the small supported
  implicant set, minimizing term count then literal count; added a non-greedy
  counterexample test.

P1 issues + resolution-or-deferred-issue-link:

- P1 check: bit-order ambiguity could make visuals disagree with arithmetic.
  Resolution: arithmetic vectors are explicitly LSB-first, with conversion
  helpers for MSB-first learner-facing strings and round-trip/property tests.
- P1 check: Boolean simplification can be nondeterministic. Resolution:
  implicants and final expressions are sorted deterministically.
- P1 reviewer finding: unsupported runtime gate kind returned `undefined`.
  Resolution: `evaluateGate` has a defensive default returning
  `precondition-violated`; test added.
- P1 reviewer finding: `clockRisingEdge` accepted truthy/falsy non-booleans at
  runtime. Resolution: `dFlipFlop` validates the clock edge; test added.

High-bandwidth questions surfaced:

- Should a future kernel own timing diagrams and propagation delay, or should
  that remain in a dedicated `core/digital-timing` module? Deferred because this
  package is intentionally limited to logical truth, not timing behavior.

P2 cleanup:

- P2 reviewer finding: missing truth-table row-coverage property. Resolution:
  added a fast-check property asserting `2^n` unique rows for supported small
  arities.
- P2 reviewer finding: runtime-guard tests use type casts. Resolution: retained
  the casts only in tests because they intentionally simulate unsafe JavaScript
  callers crossing the TypeScript boundary; no cleanup issue remains in public
  APIs.
