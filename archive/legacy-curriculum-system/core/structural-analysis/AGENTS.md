# core/structural-analysis · agent contract

## What this module is
The deterministic mechanics-of-materials kernel for Paideia simulations. It
owns introductory SI-unit calculations for axial stress, engineering strain,
Young's modulus, axial elongation, common section properties, beam bending
stress, circular-shaft torsional shear stress, Euler buckling load, plane-stress
principal stresses, von Mises equivalent stress, and safety factor.

## Public interface
Exports from `@paideia/structural-analysis`:

- `structuralAnalysisTolerance: { default: number; tight: number; loose: number }`
- `type Pascals`
- `type SquareMetres`
- `type CubicMetres`
- `type MetresToFourthPower`
- `type NewtonMetres`
- `type DimensionlessStrain`
- `type SafetyFactor`
- `type EndConditionFactor`
- `type AxialStressInput`
- `type StrainInput`
- `type YoungModulusInput`
- `type AxialElongationInput`
- `type RectangularSectionInput`
- `type CircularSectionInput`
- `type SectionProperties`
- `type BendingStressInput`
- `type TorsionalShearStressInput`
- `type EulerBucklingInput`
- `type PlaneStressInput`
- `type PrincipalStressResult`
- `type SafetyFactorInput`
- `pascals(value: number): Pascals`
- `squareMetres(value: number): SquareMetres`
- `cubicMetres(value: number): CubicMetres`
- `metresToFourthPower(value: number): MetresToFourthPower`
- `newtonMetres(value: number): NewtonMetres`
- `dimensionlessStrain(value: number): DimensionlessStrain`
- `endConditionFactor(value: number): KernelResult<EndConditionFactor>`
- `axialStress(input: AxialStressInput): KernelResult<Pascals>`
- `engineeringStrain(input: StrainInput): KernelResult<DimensionlessStrain>`
- `youngModulus(input: YoungModulusInput): KernelResult<Pascals>`
- `axialElongation(input: AxialElongationInput): KernelResult<Metres>`
- `rectangularSectionProperties(input: RectangularSectionInput): KernelResult<SectionProperties>`
- `circularSectionProperties(input: CircularSectionInput): KernelResult<SectionProperties>`
- `bendingStress(input: BendingStressInput): KernelResult<Pascals>`
- `torsionalShearStress(input: TorsionalShearStressInput): KernelResult<Pascals>`
- `eulerBucklingLoad(input: EulerBucklingInput): KernelResult<Newtons>`
- `principalStresses2D(input: PlaneStressInput): KernelResult<PrincipalStressResult>`
- `vonMisesPlaneStress(input: PlaneStressInput): KernelResult<Pascals>`
- `safetyFactor(input: SafetyFactorInput): KernelResult<SafetyFactor>`

## Invariants the caller must preserve
- Public physical quantities use SI units: N, N m, Pa, m, m², m³, m⁴, and
  dimensionless strain/factors.
- Areas, lengths, diameters, elastic modulus, second moments, polar moments,
  and end-condition factors are finite and positive where used as denominators
  or material/section coefficients.
- Elongation, stresses, bending moments, torques, and shear stresses are finite
  signed values. Positive/negative sign conventions belong to the consuming
  simulation.
- Stress magnitudes used for safety factor are compared as absolute values.
- Euler buckling uses an already-effective length `K L`; the caller is
  responsible for applying support-condition factors before passing the length.
  It is for ideal straight columns under axial compression with small
  deflection assumptions.

## What this module does NOT do
- Does **not** render beams, trusses, stress contours, Mohr circles, or meshes.
- Does **not** run finite-element analysis, solve indeterminate structures,
  optimise topology, simulate crack growth, fatigue damage, creep, plasticity,
  or nonlinear/contact behaviour.
- Does **not** bundle material databases, branch-specific presets, climate
  assumptions, or device/lab fixtures.
- Does **not** keep hidden global state or caches.

## When to consider this module
Use `core/structural-analysis` when a simulation is about to inline `sigma =
F/A`, `epsilon = delta/L`, `E = sigma/epsilon`, `delta = FL/(AE)`, `sigma =
My/I`, `tau = Tr/J`, Euler buckling, Mohr-circle principal stresses, von Mises
plane stress, or safety-factor calculations. If the sim needs FEA or rich
visuals, compose those visuals around this kernel's scalar claims.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current structural sim.
2. Add property tests for every new conservation, monotonicity, bounds, or
   symmetry invariant.
3. Use `core!:` for public API changes that alter existing numeric outputs.

## Anti-patterns
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mixing mm, cm, MPa, GPa, ksi, inch, or imperial units into public kernel
  inputs.
- Adding branch-specific material presets or safety-code factors.
- Treating Euler buckling as a universal failure model outside the documented
  slender-column assumptions.
- Adding rendering, CAD, FEA, or material-database dependencies to this pure
  kernel.

## How the Anieyrudh Filter reads this module
The Filter checks that structural visuals make the same quantitative claims as
this kernel. A stress-strain curve, beam-stress marker, torsion readout,
buckling indicator, Mohr-circle diagram, or safety-factor display whose values
disagree beyond `structuralAnalysisTolerance.default` is rejected.
