# core/treatment-response · agent contract

## What this module is

The deterministic dose-response primitives kernel: Hill-form dose-response,
IC50 adjustment by a resistance factor, the closed-form `doseAtResponse`
inverse, and the therapeutic-index ratio. Owns the small recurring formulas
behind dose-response, IC50, and therapeutic-window containers.

This kernel stays at **closed-form deterministic primitives** with NO
patient-specific or clinical-recommendation logic. It is curriculum-neutral
("dose" is a dimensionless normalised quantity; the caller chooses units at
its own boundary).

## Public interface

Exports from `@paideia/treatment-response`:

- `type Dose` — branded non-negative finite number (caller-chosen units).
- `type IC50` — branded strictly positive finite number (same units as `Dose`).
- `type HillCoefficient` — branded strictly positive finite number.
- `type ResponseFraction` — branded number in `[0, 1]`.
- `type ResistanceFactor` — branded number `>= 1`.
- `type TherapeuticIndex` — branded non-negative finite number.
- `interface DoseResponseInput` — `{ dose: Dose; ic50: IC50; hillCoefficient: HillCoefficient }`.
- `interface EffectiveIC50Input` — `{ baseIC50: IC50; resistanceFactor: ResistanceFactor }`.
- `interface DoseAtResponseInput` — `{ ic50: IC50; hillCoefficient: HillCoefficient; targetResponse: ResponseFraction }`.
- `interface TherapeuticIndexInput` — `{ toxicDose: Dose; effectiveDose: Dose }`.
- `dose(value: number): KernelResult<Dose>`
- `ic50(value: number): KernelResult<IC50>`
- `hillCoefficient(value: number): KernelResult<HillCoefficient>`
- `responseFraction(value: number): KernelResult<ResponseFraction>`
- `resistanceFactor(value: number): KernelResult<ResistanceFactor>`
- `hillDoseResponse(input: DoseResponseInput): KernelResult<ResponseFraction>` — `R = d^n / (IC50^n + d^n)`.
- `effectiveIC50(input: EffectiveIC50Input): KernelResult<IC50>` — `IC50_eff = IC50_base · ResistanceFactor`.
- `doseAtResponse(input: DoseAtResponseInput): KernelResult<Dose>` — inverse: `d = IC50 · (R / (1 − R))^(1/n)`. Rejects `R = 0` (dose = 0 is trivial) and `R = 1` (requires infinite dose).
- `therapeuticIndex(input: TherapeuticIndexInput): KernelResult<TherapeuticIndex>` — `TI = toxicDose / effectiveDose`. Rejects zero or near-zero `effectiveDose`.

## Invariants the caller must preserve

- `Dose` is non-negative finite. `IC50` and `HillCoefficient` are strictly
  positive finite.
- `ResponseFraction` is in `[0, 1]`.
- `ResistanceFactor >= 1` (1 = no resistance; > 1 = clones less sensitive).
- `TherapeuticIndex` is non-negative finite; higher = safer drug.
- All operations are pure; no global state.

## What this module does NOT do

- Does **not** recommend treatment, predict patient outcomes, or diagnose
  conditions.
- Does **not** model pharmacokinetics (absorption, distribution, metabolism,
  excretion). Compose with a future `core/pharmacokinetics` kernel for
  time-course modelling.
- Does **not** model drug-drug interactions or synergy/antagonism formally
  (Bliss, Loewe). A future `synergyScore` could be added if needed.
- Does **not** parse FDA labelling, clinical trial data, or any patient
  dataset.
- Does **not** render anything.

## When to consider this module

Use `core/treatment-response` when a sim needs a Hill dose-response curve, an
IC50 adjusted by a resistance factor, the dose required for a target response
level, or a therapeutic index. If a container is about to inline
`Math.pow(d, n) / (Math.pow(ic50, n) + Math.pow(d, n))`, stop and use this
module.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green.
3. Use `core!:` commit prefix for any change that alters the Hill formula,
   the brand identity of any exported type, or the convention for the
   resistance factor.

## Anti-patterns (will be rejected in PR review)

- Returning `null`, `undefined`, or throwing for expected validation failures.
- Hard-coding drug names, brand names, or unit assumptions (mg/kg vs nM).
- Adding patient-specific or clinical-recommendation logic.
- Embedding adverse-event probability tables.
