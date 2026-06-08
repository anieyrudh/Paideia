# core/materials - agent contract

## What this module is

Pure materials-engineering kernels for teaching tensile behaviour, safety
factors, and first-pass Ashby-style material selection. It owns validation of
caller-supplied material property records, elastic/plastic/failure regime
classification for simplified engineering stress-strain curves, specific
property indices, and deterministic material ranking. It returns numbers and
readonly records only; charts, specimen animation, material databases, and
learner controls live elsewhere.

## Public interface

Exports from `@paideia/materials`:

- `Pascals = Brand<number, "Materials.Pascals">`
- `DensityKgPerCubicMetre = Brand<number, "Materials.DensityKgPerCubicMetre">`
- `CostPerKg = Brand<number, "Materials.CostPerKg">`
- `EmbodiedCarbonKgCO2ePerKg = Brand<number, "Materials.EmbodiedCarbonKgCO2ePerKg">`
- `Strain = Brand<number, "Materials.Strain">`
- `MaterialClass = "metal" | "polymer" | "ceramic" | "composite" | "semiconductor" | "biomaterial" | "other"`
- `StressStrainRegime = "elastic" | "plastic" | "fracture" | "invalid"`
- `MaterialProperties = { id: string; name: string; class: MaterialClass; density: DensityKgPerCubicMetre; youngModulus: Pascals; yieldStrength?: Pascals; ultimateStrength: Pascals; fractureStrain?: Strain; cost?: CostPerKg; embodiedCarbon?: EmbodiedCarbonKgCO2ePerKg }`
- `ValidatedMaterial = MaterialProperties`
- `StressStrainPoint = { strain: Strain; stress: Pascals; regime: StressStrainRegime; tangentModulus: Pascals }`
- `SafetyFactorMode = "yield" | "ultimate"`
- `SafetyFactorResult = { mode: SafetyFactorMode; factor: number; allowableStress: Pascals; appliedStress: Pascals; passes: boolean }`
- `PerformanceGoal = "specific-stiffness" | "specific-strength" | "stiffness-per-cost" | "strength-per-cost" | "low-carbon-stiffness" | "low-carbon-strength"`
- `MaterialScore = { material: ValidatedMaterial; goal: PerformanceGoal; score: number; missing: readonly string[] }`
- `pascals(value: number): KernelResult<Pascals>`
- `densityKgPerCubicMetre(value: number): KernelResult<DensityKgPerCubicMetre>`
- `costPerKg(value: number): KernelResult<CostPerKg>`
- `embodiedCarbonKgCO2ePerKg(value: number): KernelResult<EmbodiedCarbonKgCO2ePerKg>`
- `strain(value: number): KernelResult<Strain>`
- `validateMaterial(material: MaterialProperties): KernelResult<ValidatedMaterial>`
- `yieldStrain(material: MaterialProperties): KernelResult<Strain | null>`
- `stressAtStrain(material: MaterialProperties, strain: Strain): KernelResult<StressStrainPoint>`
- `safetyFactor(material: MaterialProperties, appliedStress: Pascals, mode?: SafetyFactorMode): KernelResult<SafetyFactorResult>`
- `performanceIndex(material: MaterialProperties, goal: PerformanceGoal): KernelResult<MaterialScore>`
- `rankMaterials(materials: readonly MaterialProperties[], goal: PerformanceGoal): KernelResult<readonly MaterialScore[]>`

## Invariants the caller must preserve

- Material ids and names are non-empty strings.
- Density, Young's modulus, ultimate strength, cost, and embodied carbon are
  finite positive values when present.
- Yield strength, when present, is positive and not greater than ultimate
  strength.
- Fracture strain, when present, is positive.
- `stressAtStrain` uses engineering strain, not true strain.
- The stress-strain model is simplified: elastic up to yield or brittle
  ultimate point, then linear hardening to ultimate at fracture strain when
  enough properties are supplied.
- Ranking is deterministic and never mutates caller-owned arrays.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not ship a canonical material database or cite material values.
- Does not render Ashby charts, tensile rigs, fracture diagrams, or 3D models.
- Does not perform finite-element analysis, fatigue-life prediction, fracture
  mechanics, creep, viscoelasticity, or temperature-dependent property models.
- Does not choose a material automatically for a real design without the caller
  supplying requirements and property records.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/materials` when a sim needs canonical material-property validation,
stress-strain regime labels, safety factors, or performance-index ranking. If a
sim is about to inline `E/rho`, `strength/rho`, yield strain, or a simplified
tensile curve, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to ranking formulas, stress-strain regime
   thresholds, or error behavior for existing valid inputs.

## Anti-patterns (will be rejected in PR review)

- Bundling uncited material-property data into this package.
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mutating caller-owned material arrays or records.
- Hidden global material libraries, caches, or branch-specific presets.
- Rendering charts or specimen animations from this package.
- Pretending the simplified model is full nonlinear material behaviour.

## How the Anieyrudh Filter reads this module

The Filter probes that visual Ashby charts and stress-strain animations match
this kernel's numbers: yield strain is `sigma_y / E`, ranking lines use the
declared performance index, and safety-factor labels agree with the selected
mode. A sim that teaches a different material ranking than this kernel fails
review.
