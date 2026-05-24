# core/chemistry - agent contract

## What this module is

Pure first-year chemistry kernels for teaching quantitative chemistry. It owns
formula parsing, molar-mass calculation from caller-supplied atomic masses,
reaction stoichiometry, limiting-reagent math, ideal-gas calculations, strong
acid/base pH, Henderson-Hasselbalch buffers, equilibrium quotients, and Nernst
cell potentials. It returns deterministic numbers and readonly records only;
molecule rendering, reaction animations, titration curves, data tables, and
learner controls live elsewhere.

## Public interface

Exports from `@paideia/chemistry`:

- `Moles = Brand<number, "Chemistry.Moles">`
- `Grams = Brand<number, "Chemistry.Grams">`
- `Litres = Brand<number, "Chemistry.Litres">`
- `Kelvins = Brand<number, "Chemistry.Kelvins">`
- `Atmospheres = Brand<number, "Chemistry.Atmospheres">`
- `Molarity = Brand<number, "Chemistry.Molarity">`
- `MolarMass = Brand<number, "Chemistry.MolarMass">` - g/mol.
- `Volts = Brand<number, "Chemistry.Volts">`
- `ParsedFormula = { formula: string; atoms: Readonly<Record<string, number>> }`
- `AtomicMassTable = Readonly<Record<string, MolarMass>>`
- `StoichiometricTerm = { species: string; coefficient: number }`
- `Reaction = { reactants: readonly StoichiometricTerm[]; products: readonly StoichiometricTerm[] }`
- `LimitingReagentInput = { species: string; availableMoles: Moles }`
- `LimitingReagentResult = { limitingSpecies: string; reactionExtent: Moles; leftoverReactants: Readonly<Record<string, Moles>> }`
- `IdealGasInput = { pressureAtm?: Atmospheres; volumeLitres?: Litres; moles?: Moles; temperatureKelvins?: Kelvins }`
- `IdealGasResult = { pressureAtm: Atmospheres; volumeLitres: Litres; moles: Moles; temperatureKelvins: Kelvins }`
- `EquilibriumTerm = { species: string; concentration: Molarity; coefficient: number }`
- `EquilibriumQuotientInput = { products: readonly EquilibriumTerm[]; reactants: readonly EquilibriumTerm[] }`
- `NernstInput = { standardPotentialVolts: Volts; electronCount: number; reactionQuotient: number; temperatureKelvins?: Kelvins }`
- `moles(value: number): KernelResult<Moles>`
- `grams(value: number): KernelResult<Grams>`
- `litres(value: number): KernelResult<Litres>`
- `kelvins(value: number): KernelResult<Kelvins>`
- `atmospheres(value: number): KernelResult<Atmospheres>`
- `molarity(value: number): KernelResult<Molarity>`
- `molarMass(value: number): KernelResult<MolarMass>`
- `volts(value: number): KernelResult<Volts>`
- `parseFormula(formula: string): KernelResult<ParsedFormula>`
- `molarMassOf(formula: string, masses: AtomicMassTable): KernelResult<MolarMass>`
- `gramsToMoles(mass: Grams, molarMass: MolarMass): KernelResult<Moles>`
- `molesToGrams(amount: Moles, molarMass: MolarMass): KernelResult<Grams>`
- `reactionExtent(reaction: Reaction, species: string, amount: Moles): KernelResult<Moles>`
- `limitingReagent(reaction: Reaction, inputs: readonly LimitingReagentInput[]): KernelResult<LimitingReagentResult>`
- `solveIdealGas(input: IdealGasInput): KernelResult<IdealGasResult>` - exactly one field omitted.
- `strongAcidPH(concentration: Molarity, protonCount?: number): KernelResult<number>`
- `strongBasePH(concentration: Molarity, hydroxideCount?: number): KernelResult<number>`
- `hendersonHasselbalch(pKa: number, baseConcentration: Molarity, acidConcentration: Molarity): KernelResult<number>`
- `equilibriumQuotient(input: EquilibriumQuotientInput): KernelResult<number>`
- `nernstPotential(input: NernstInput): KernelResult<Volts>`

## Invariants the caller must preserve

- Formula strings use element symbols, integer counts, and parentheses, such as
  `H2O`, `Ca(OH)2`, or `Al2(SO4)3`.
- Atomic masses are caller-supplied, positive, and in g/mol.
- Stoichiometric coefficients are finite positive numbers.
- Limiting-reagent inputs must cover every reactant exactly once.
- `solveIdealGas` uses `PV = nRT` with `R = 0.082057 L atm mol^-1 K^-1`
  and exactly one missing field.
- Strong-acid/base helpers assume complete dissociation plus water
  autoionization at 25 C with `Kw = 1e-14` and `pKw = 14`.
- Equilibrium coefficients are exponents; concentration terms must be positive.
- Nernst input uses reaction quotient `Q > 0`, electron count `n > 0`, and SI
  temperature in kelvins.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not render molecules, orbitals, titration curves, cells, or reaction
  animations.
- Does not ship an atomic-mass table, pKa table, electrochemical series, or
  equilibrium constants.
- Does not balance reactions from raw formula strings.
- Does not model weak acid/base equilibria beyond Henderson-Hasselbalch.
- Does not model activities, ionic strength, non-ideal gases, temperature-varying
  constants, or kinetics.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/chemistry` when a sim needs canonical quantitative chemistry:
molar mass, limiting reagent, ideal gas state, pH estimate, buffer pH,
equilibrium quotient, or Nernst potential. If a sim is about to inline these
formulas, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to formula parsing, constants, error behavior, or
   numeric semantics for existing valid inputs.

## Anti-patterns (will be rejected in PR review)

- Bundling uncited chemical data tables into this package.
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mutating caller-owned mass tables, reactions, or input arrays.
- Silently balancing reactions or inventing missing species.
- Rendering chemistry visuals from this package.
- Branch-specific presets or syllabus logic.

## How the Anieyrudh Filter reads this module

The Filter probes that a sim's displayed chemistry matches this kernel:
stoichiometric ratios preserve coefficients, pH formulas match the stated
assumptions, and Nernst readouts use the same temperature and reaction quotient
as the learner manipulated. A visual that teaches different chemistry fails
review.
