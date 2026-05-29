# core/equilibrium - agent contract

## What this module is

Pure first-year chemical-equilibrium kernels for teaching equilibrium constants,
reaction quotient comparison, and simple ICE-table concentration changes. It
returns deterministic numbers and readonly records only; equilibrium animations,
symbolic reaction balancing, broad chemistry tables, and curriculum-specific
presets live elsewhere.

## Public interface

Exports from `@paideia/equilibrium`:

- `ConcentrationMolar = Brand<number, "Equilibrium.ConcentrationMolar">`
- `EquilibriumConstant = Brand<number, "Equilibrium.EquilibriumConstant">`
- `ReactionQuotient = Brand<number, "Equilibrium.ReactionQuotient">`
- `EquilibriumDirection = "toward-products" | "toward-reactants" | "at-equilibrium"`
- `EquilibriumSide = "reactant" | "product"`
- `EquilibriumTerm = { species: string; concentration: ConcentrationMolar; coefficient: number }`
- `EquilibriumExpression = { products: readonly EquilibriumTerm[]; reactants: readonly EquilibriumTerm[] }`
- `QuotientComparisonInput = { reactionQuotient: ReactionQuotient; equilibriumConstant: EquilibriumConstant; relativeTolerance?: number }`
- `QuotientComparison = { reactionQuotient: ReactionQuotient; equilibriumConstant: EquilibriumConstant; ratio: number; direction: EquilibriumDirection }`
- `IceTableTerm = { species: string; side: EquilibriumSide; coefficient: number; initialConcentration: ConcentrationMolar }`
- `IceTableInput = { terms: readonly IceTableTerm[]; extent: ConcentrationMolar }`
- `IceTableRow = { species: string; side: EquilibriumSide; coefficient: number; initialConcentration: ConcentrationMolar; change: number; equilibriumConcentration: ConcentrationMolar }`
- `concentrationMolar(value: number): KernelResult<ConcentrationMolar>`
- `equilibriumConstant(value: number): KernelResult<EquilibriumConstant>`
- `reactionQuotientValue(value: number): KernelResult<ReactionQuotient>`
- `reactionQuotient(expression: EquilibriumExpression): KernelResult<ReactionQuotient>`
- `compareReactionQuotient(input: QuotientComparisonInput): KernelResult<QuotientComparison>`
- `iceTable(input: IceTableInput): KernelResult<readonly IceTableRow[]>`
- `quotientFromIceTable(rows: readonly IceTableRow[]): KernelResult<ReactionQuotient>`

## Invariants the caller must preserve

- Equilibrium constants are finite and positive.
- Reaction quotient values are finite and non-negative.
- Concentrations are finite and non-negative mol/L.
- `reactionQuotient` terms require non-empty product and reactant sides,
  non-empty species names, positive finite coefficients, no duplicate species,
  and positive reactant concentrations.
- ICE tables require at least one reactant and one product, unique species,
  positive finite coefficients, and an extent that does not drive any reactant
  below zero.
- `relativeTolerance` is finite and non-negative when supplied.

Violations return `KernelResult.err("precondition-violated", ...)`,
`KernelResult.err("out-of-domain", ...)`, or
`KernelResult.err("numerical-instability", ...)`.

## What this module does NOT do

- Does not balance reactions from formula strings.
- Does not solve arbitrary equilibrium polynomials.
- Does not model activities, ionic strength, gases, pressure constants,
  temperature dependence, or Le Chatelier perturbation narratives.
- Does not infer reaction mechanisms or kinetics.
- Does not render ICE tables, graphs, particles, or UI controls.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/equilibrium` when a sim needs a reusable `Q` versus `K` comparison,
direction-of-shift evidence, or a simple ICE-table concentration update. Use
`core/chemistry` for broader quantitative chemistry such as formula parsing,
stoichiometry, pH, Nernst potentials, and the original equilibrium quotient
primitive.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to formulas, constants, error behavior, or numeric
   semantics for existing valid inputs.

## Anti-patterns (will be rejected in PR review)

- Reimplementing broad `core/chemistry` behavior in this package.
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mutating caller-owned terms or rows.
- Silently balancing reactions or inventing missing species.
- Rendering equilibrium visuals from this package.

## How the Anieyrudh Filter reads this module

The Filter probes that a sim's equilibrium direction matches `Q` compared with
`K`, that ICE-table rows apply stoichiometric signs consistently, and that no
negative equilibrium concentration is displayed. A visual that teaches
different equilibrium behavior fails review.
