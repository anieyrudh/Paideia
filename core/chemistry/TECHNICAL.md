# @paideia/chemistry technical note

## Public Surface

The public surface is exactly the symbols listed in `AGENTS.md`: branded
chemistry units, formula parsing, molar mass, stoichiometry, limiting reagent,
ideal gas state solving, pH helpers, equilibrium quotient, and Nernst potential.

## Invariant Enforcement

| Invariant | Mechanism |
| --- | --- |
| Positive or non-negative units | Unit constructors and runtime re-validation. |
| Formula grammar | `parseFormula` recursive parser with parentheses and integer counts. |
| Atomic masses are caller-owned and positive | `molarMassOf` validates supplied table values. |
| Reaction coefficients are positive | `validateReaction`. |
| Limiting reagent inputs cover each reactant once | `limitingReagent` checks duplicates and missing reactants. |
| Ideal gas solve has exactly one unknown | `solveIdealGas` counts omitted fields. |
| Strong acid/base assumptions are explicit | README and AGENTS document complete dissociation plus water autoionization at 25 C. |
| Equilibrium concentrations are positive | `equilibriumQuotient` validates every term. |
| Nernst inputs are in valid domains | `nernstPotential` validates `n`, `Q`, and temperature. |

## Error Model

- `out-of-domain`: impossible numeric values, such as negative mass, zero
  molarity, non-finite voltage, or invalid reaction quotient.
- `precondition-violated`: malformed formulas, missing atomic masses, invalid
  reaction terms, duplicate species, wrong ideal-gas known count, invalid pH
  dissociation counts, or empty equilibrium sides.

## Dependencies

Runtime dependencies:

- `@paideia/shared` for `Brand`, `KernelResult`, `ok`, and `err`.

Constants:

- `R = 8.31446261815324 J mol^-1 K^-1`, `F = 96485.33212 C mol^-1`,
  and `298.15 K` are sourced to the NIST CODATA constants database:
  https://physics.nist.gov/cuu/Constants/
- `Kw = 1e-14` and `pKw = 14` are recorded as the teaching-standard 25 C
  approximation for water autoionization:
  https://chem.libretexts.org/Courses/can/CHEM_220%3A_General_Chemistry_II_-_Chemical_Dynamics/04%3A_Acid-Base_Equilibrium/4.03%3A_The_Autoionization_of_Water_and_pH

Dev-only dependencies:

- `vitest`
- `fast-check`
- `typescript`

No third-party runtime chemistry package is bundled.

## Anieyrudh Filter pass

P0 issues + resolution:

- P0 check: hidden uncited chemistry data. Resolution: no atomic masses, pKa
  values, electrochemical series, or equilibrium constants are bundled; callers
  supply cited data.
- P0 check: formulas returning `NaN` or `Infinity`. Resolution: all public
  calculations validate numeric domains and return `KernelResult.err`.

P1 issues + resolution-or-deferred-issue-link:

- P1 check: pH helpers could be mistaken for full acid-base equilibrium.
  Resolution: README and AGENTS state complete-dissociation, 25 C water
  autoionization, and buffer approximation assumptions.
- P1 check: reaction math could silently balance equations. Resolution:
  `Reaction` requires explicit caller-supplied coefficients; this kernel never
  balances raw equations.
- P1 check: audit found unsafe integer counts, extra limiting-reagent inputs,
  dilute acid/base behavior, and non-finite result paths. Resolution: parser
  counts are safe integers, limiting-reagent inputs must be reactants, acid/base
  helpers include water autoionization, and public calculations guard
  non-finite results.

High-bandwidth questions surfaced:

- Should a future `core/chemical-equilibrium` own weak acid/base solvers and
  titration curves? Deferred; this kernel intentionally covers only first-pass
  reference formulas.

P2 cleanup:

- Audit P2 constants citation: resolved in README and this note.
- Audit P2 runtime readonly atoms: resolved with a frozen atom record from
  `parseFormula`.
- No deferred P2 items remain for this kernel.
