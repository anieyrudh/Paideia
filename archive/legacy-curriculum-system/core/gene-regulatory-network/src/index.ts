import { type Brand, err, ok, type KernelResult } from "@paideia/shared";

/**
 * @paideia/gene-regulatory-network — Deterministic gene-expression kinetics.
 *
 * Hill-form activation and repression regulators, transcription / translation
 * rate primitives, and a single forward-Euler step for an mRNA + protein
 * node. One-node, deterministic; stochastic, multi-node, and SBML-format
 * concerns are explicitly out of scope.
 */

export type RateConstant = Brand<number, "RateConstant_per_s">;
export type MolarConcentration = Brand<number, "MolarConcentration_uM">;
export type RegulationFactor = Brand<number, "RegulationFactor_0_1">;
export type HillCoefficient = Brand<number, "HillCoefficient_pos">;
export type RegulatorKind = "activator" | "repressor";

export interface Regulator {
  readonly kind: RegulatorKind;
  readonly inducer: MolarConcentration;
  readonly threshold: MolarConcentration;
  readonly hillCoefficient: HillCoefficient;
}

export interface ExpressionState {
  readonly mRna: MolarConcentration;
  readonly protein: MolarConcentration;
}

export interface ExpressionParams {
  readonly basalTranscriptionRate: RateConstant;
  readonly maxTranscriptionRate: RateConstant;
  readonly translationRatePerMrna: RateConstant;
  readonly mRnaDegradationRate: RateConstant;
  readonly proteinDegradationRate: RateConstant;
}

export interface ExpressionDerivatives {
  readonly dMrnaDt: number;
  readonly dProteinDt: number;
}

// ──────────────────────────────────────────────────────────────────────────
// Constructors
// ──────────────────────────────────────────────────────────────────────────

const requireFinite = (
  value: number,
  label: string,
): KernelResult<number> =>
  typeof value === "number" && Number.isFinite(value)
    ? ok(value)
    : err(
        "precondition-violated",
        `${label} must be a finite number; got ${String(value)}.`,
      );

export const rateConstant = (value: number): KernelResult<RateConstant> => {
  const finite = requireFinite(value, "RateConstant");
  if (!finite.ok) return finite;
  if (finite.value < 0) {
    return err(
      "out-of-domain",
      `RateConstant must be non-negative (s^-1); got ${finite.value}.`,
    );
  }
  return ok(finite.value as RateConstant);
};

export const molarConcentration = (
  value: number,
): KernelResult<MolarConcentration> => {
  const finite = requireFinite(value, "MolarConcentration");
  if (!finite.ok) return finite;
  if (finite.value < 0) {
    return err(
      "out-of-domain",
      `MolarConcentration must be non-negative (uM); got ${finite.value}.`,
    );
  }
  return ok(finite.value as MolarConcentration);
};

export const hillCoefficient = (
  value: number,
): KernelResult<HillCoefficient> => {
  const finite = requireFinite(value, "HillCoefficient");
  if (!finite.ok) return finite;
  if (finite.value <= 0) {
    return err(
      "out-of-domain",
      `HillCoefficient must be strictly positive; got ${finite.value}.`,
    );
  }
  return ok(finite.value as HillCoefficient);
};

export const regulationFactor = (
  value: number,
): KernelResult<RegulationFactor> => {
  const finite = requireFinite(value, "RegulationFactor");
  if (!finite.ok) return finite;
  if (finite.value < 0 || finite.value > 1) {
    return err(
      "out-of-domain",
      `RegulationFactor must be in [0, 1]; got ${finite.value}.`,
    );
  }
  return ok(finite.value as RegulationFactor);
};

// ──────────────────────────────────────────────────────────────────────────
// Internal re-validation against forged brands
// ──────────────────────────────────────────────────────────────────────────

const requireNonNegative = (
  value: number,
  label: string,
): KernelResult<number> => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return err(
      "precondition-violated",
      `${label} must be a finite number; got ${String(value)}.`,
    );
  }
  if (value < 0) {
    return err(
      "out-of-domain",
      `${label} must be non-negative; got ${value}.`,
    );
  }
  return ok(value);
};

const requireStrictlyPositive = (
  value: number,
  label: string,
): KernelResult<number> => {
  const non = requireNonNegative(value, label);
  if (!non.ok) return non;
  if (non.value === 0) {
    return err(
      "out-of-domain",
      `${label} must be strictly positive; got 0.`,
    );
  }
  return ok(non.value);
};

const ensureFiniteResult = (
  value: number,
  label: string,
): KernelResult<number> =>
  Number.isFinite(value)
    ? ok(value)
    : err(
        "numerical-instability",
        `${label} produced a non-finite result (${String(value)}).`,
      );

const clamp01 = (value: number): number =>
  value < 0 ? 0 : value > 1 ? 1 : value;

// ──────────────────────────────────────────────────────────────────────────
// Hill activation / repression
// ──────────────────────────────────────────────────────────────────────────

export const hillActivate = (
  inducer: MolarConcentration,
  threshold: MolarConcentration,
  hillN: HillCoefficient,
): KernelResult<RegulationFactor> => {
  const i = requireNonNegative(inducer as unknown as number, "inducer");
  if (!i.ok) return i;
  const k = requireStrictlyPositive(threshold as unknown as number, "threshold");
  if (!k.ok) return k;
  const n = requireStrictlyPositive(hillN as unknown as number, "hillCoefficient");
  if (!n.ok) return n;
  const inducerPow = Math.pow(i.value, n.value);
  const thresholdPow = Math.pow(k.value, n.value);
  const denominator = thresholdPow + inducerPow;
  if (denominator <= 0) {
    return err(
      "numerical-instability",
      "Hill denominator collapsed to non-positive value.",
    );
  }
  const r = inducerPow / denominator;
  const finite = ensureFiniteResult(r, "Hill activation");
  return finite.ok ? ok(clamp01(finite.value) as RegulationFactor) : finite;
};

export const hillRepress = (
  repressor: MolarConcentration,
  threshold: MolarConcentration,
  hillN: HillCoefficient,
): KernelResult<RegulationFactor> => {
  const i = requireNonNegative(repressor as unknown as number, "repressor");
  if (!i.ok) return i;
  const k = requireStrictlyPositive(threshold as unknown as number, "threshold");
  if (!k.ok) return k;
  const n = requireStrictlyPositive(hillN as unknown as number, "hillCoefficient");
  if (!n.ok) return n;
  const inducerPow = Math.pow(i.value, n.value);
  const thresholdPow = Math.pow(k.value, n.value);
  const denominator = thresholdPow + inducerPow;
  if (denominator <= 0) {
    return err(
      "numerical-instability",
      "Hill denominator collapsed to non-positive value.",
    );
  }
  const r = thresholdPow / denominator;
  const finite = ensureFiniteResult(r, "Hill repression");
  return finite.ok ? ok(clamp01(finite.value) as RegulationFactor) : finite;
};

export const applyRegulator = (
  regulator: Regulator,
): KernelResult<RegulationFactor> => {
  if (regulator.kind === "activator") {
    return hillActivate(
      regulator.inducer,
      regulator.threshold,
      regulator.hillCoefficient,
    );
  }
  if (regulator.kind === "repressor") {
    return hillRepress(
      regulator.inducer,
      regulator.threshold,
      regulator.hillCoefficient,
    );
  }
  return err(
    "precondition-violated",
    `Regulator.kind must be "activator" or "repressor"; got ${String(regulator.kind)}.`,
  );
};

// ──────────────────────────────────────────────────────────────────────────
// Transcription / translation / step
// ──────────────────────────────────────────────────────────────────────────

const requireParams = (
  params: ExpressionParams,
): KernelResult<{
  readonly basal: number;
  readonly max: number;
  readonly translation: number;
  readonly mRnaDecay: number;
  readonly proteinDecay: number;
}> => {
  const basal = requireNonNegative(
    params.basalTranscriptionRate as unknown as number,
    "basalTranscriptionRate",
  );
  if (!basal.ok) return basal;
  const max = requireNonNegative(
    params.maxTranscriptionRate as unknown as number,
    "maxTranscriptionRate",
  );
  if (!max.ok) return max;
  if (max.value < basal.value) {
    return err(
      "out-of-domain",
      `maxTranscriptionRate (${max.value}) must be >= basalTranscriptionRate (${basal.value}).`,
    );
  }
  const translation = requireNonNegative(
    params.translationRatePerMrna as unknown as number,
    "translationRatePerMrna",
  );
  if (!translation.ok) return translation;
  const mRnaDecay = requireNonNegative(
    params.mRnaDegradationRate as unknown as number,
    "mRnaDegradationRate",
  );
  if (!mRnaDecay.ok) return mRnaDecay;
  const proteinDecay = requireNonNegative(
    params.proteinDegradationRate as unknown as number,
    "proteinDegradationRate",
  );
  if (!proteinDecay.ok) return proteinDecay;
  return ok({
    basal: basal.value,
    max: max.value,
    translation: translation.value,
    mRnaDecay: mRnaDecay.value,
    proteinDecay: proteinDecay.value,
  });
};

const requireRegulation = (
  regulation: RegulationFactor,
): KernelResult<number> => {
  const r = requireNonNegative(regulation as unknown as number, "regulation");
  if (!r.ok) return r;
  if (r.value > 1) {
    return err(
      "out-of-domain",
      `regulation must be in [0, 1]; got ${r.value}.`,
    );
  }
  return ok(r.value);
};

const requireState = (
  state: ExpressionState,
): KernelResult<{ readonly mRna: number; readonly protein: number }> => {
  const m = requireNonNegative(state.mRna as unknown as number, "state.mRna");
  if (!m.ok) return m;
  const p = requireNonNegative(state.protein as unknown as number, "state.protein");
  if (!p.ok) return p;
  return ok({ mRna: m.value, protein: p.value });
};

export const transcriptionRate = (
  params: ExpressionParams,
  regulation: RegulationFactor,
): KernelResult<RateConstant> => {
  const p = requireParams(params);
  if (!p.ok) return p;
  const r = requireRegulation(regulation);
  if (!r.ok) return r;
  const rate = p.value.basal + (p.value.max - p.value.basal) * r.value;
  const finite = ensureFiniteResult(rate, "Transcription rate");
  return finite.ok ? ok(finite.value as RateConstant) : finite;
};

export const expressionDerivatives = (
  state: ExpressionState,
  params: ExpressionParams,
  regulation: RegulationFactor,
): KernelResult<ExpressionDerivatives> => {
  const p = requireParams(params);
  if (!p.ok) return p;
  const r = requireRegulation(regulation);
  if (!r.ok) return r;
  const s = requireState(state);
  if (!s.ok) return s;
  const transcription = p.value.basal + (p.value.max - p.value.basal) * r.value;
  const dMrnaDt = transcription - p.value.mRnaDecay * s.value.mRna;
  const dProteinDt =
    p.value.translation * s.value.mRna - p.value.proteinDecay * s.value.protein;
  if (!Number.isFinite(dMrnaDt) || !Number.isFinite(dProteinDt)) {
    return err(
      "numerical-instability",
      "Derivative computation produced a non-finite result.",
    );
  }
  return ok({ dMrnaDt, dProteinDt });
};

export const stepGeneExpression = (
  state: ExpressionState,
  params: ExpressionParams,
  regulation: RegulationFactor,
  dt: number,
): KernelResult<ExpressionState> => {
  if (typeof dt !== "number" || !Number.isFinite(dt)) {
    return err(
      "precondition-violated",
      `dt must be a finite number; got ${String(dt)}.`,
    );
  }
  if (dt < 0) {
    return err(
      "out-of-domain",
      `dt must be non-negative; got ${dt}.`,
    );
  }
  const derivatives = expressionDerivatives(state, params, regulation);
  if (!derivatives.ok) return derivatives;
  const s = requireState(state);
  if (!s.ok) return s;
  const nextMrna = Math.max(0, s.value.mRna + derivatives.value.dMrnaDt * dt);
  const nextProtein = Math.max(
    0,
    s.value.protein + derivatives.value.dProteinDt * dt,
  );
  if (!Number.isFinite(nextMrna) || !Number.isFinite(nextProtein)) {
    return err(
      "numerical-instability",
      "Forward-Euler step produced a non-finite result.",
    );
  }
  return ok({
    mRna: nextMrna as MolarConcentration,
    protein: nextProtein as MolarConcentration,
  });
};
