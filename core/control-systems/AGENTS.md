# core/control-systems · agent contract

## What this module is
The deterministic control-systems kernel for SUTD and engineering simulations. It owns transfer-function arithmetic, PID controller construction, unity-feedback closure, frequency response, and step-response sampling. It returns numbers and readonly samples only; plots, sliders, state machines, and learner-facing controls live in other core modules.

## Public interface
Exports from `@paideia/control-systems`:

- `Complex = { re: number; im: number }`
- `TransferFunction = { numerator: readonly number[]; denominator: readonly number[] }` - descending powers of `s`, normalized so the denominator leading coefficient is `1`.
- `PidGains = { kp: number; ki: number; kd: number; derivativeFilterTimeSeconds?: Seconds }`
- `StepResponseOptions = { durationSeconds: Seconds; dtSeconds: Seconds; inputAmplitude?: number }`
- `StepResponseSample = { t: Seconds; y: number }`
- `FrequencyResponsePoint = { frequencyRadPerSec: number; value: Complex; magnitude: number; magnitudeDb: number; phaseRad: number; phaseDeg: number }`
- `controlTolerance: { default: number; tight: number; loose: number }`
- `transferFunction(numerator: readonly number[], denominator: readonly number[]): KernelResult<TransferFunction>`
- `evaluateTransferFunction(system: TransferFunction, s: Complex): KernelResult<Complex>`
- `multiplyTransferFunctions(a: TransferFunction, b: TransferFunction): KernelResult<TransferFunction>`
- `addTransferFunctions(a: TransferFunction, b: TransferFunction): KernelResult<TransferFunction>`
- `closeUnityFeedbackLoop(openLoop: TransferFunction): KernelResult<TransferFunction>` - negative unity feedback, `G / (1 + G)`.
- `pidController(gains: PidGains): KernelResult<TransferFunction>`
- `stepResponse(system: TransferFunction, opts: StepResponseOptions): KernelResult<readonly StepResponseSample[]>`
- `bode(system: TransferFunction, frequenciesRadPerSec: readonly number[]): KernelResult<readonly FrequencyResponsePoint[]>`

## Invariants the caller must preserve
- Polynomial coefficients are finite real numbers in descending powers of `s`.
- Step response is defined only for proper transfer functions. Improper controller transfer functions may be composed and evaluated in frequency space, but callers must close them around a plant before asking for a time response.
- Time inputs use SI seconds via `Seconds`; angular frequencies are in rad/s.
- The transfer function is continuous-time only. Discrete-time `z` transforms are a future module.
- Input arrays are read-only. This module never mutates caller-owned arrays.

## What this module does NOT do
- Does **not** render Bode plots, root-locus plots, block diagrams, or time traces.
- Does **not** do symbolic simplification, factorization, pole-zero cancellation, or stability proofs.
- Does **not** solve nonlinear systems or MIMO state-space models.
- Does **not** tune PID gains automatically.
- Does **not** persist simulation state or cache across calls.
- Does **not** import branch-specific content or flags.

## When to consider this module
Use `core/control-systems` when a sim needs a canonical number for a transfer function, PID loop, Bode sample, closed-loop response, or first control-theory step response. If a sim is about to inline transfer-function algebra or a small ODE loop, use this module instead.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for any change to response sampling semantics or transfer-function normalization.

## Anti-patterns (will be rejected in PR review)
- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mutating coefficient arrays supplied by callers.
- Hidden module-level caches of previous systems or responses.
- Branch-specific tolerances or controller variants.
- Rendering plots from this package.
- Silently accepting improper transfer functions for `stepResponse`.

## How the Anieyrudh Filter reads this module
The Filter probes that **a sim's claimed control response matches this kernel's numbers within `controlTolerance.default`**. A PID tuner whose Bode readout, unity-feedback algebra, or step-response curve diverges from these functions fails review because the visual would be teaching a different system than the learner manipulated.
