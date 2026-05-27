import { type Brand, err, ok, type KernelResult } from "@paideia/shared";

/**
 * @paideia/treatment-response — Deterministic dose-response primitives.
 *
 * Hill-form dose-response curve, IC50 adjustment by a resistance factor,
 * closed-form inverse (dose for a target response), and the
 * therapeutic-index ratio. Curriculum-neutral; no patient-specific or
 * clinical-recommendation logic.
 */

export type Dose = Brand<number, "Dose_nonneg">;
export type IC50 = Brand<number, "IC50_pos">;
export type HillCoefficient = Brand<number, "HillCoefficient_pos">;
export type ResponseFraction = Brand<number, "ResponseFraction_0_1">;
export type ResistanceFactor = Brand<number, "ResistanceFactor_atLeast_1">;
export type TherapeuticIndex = Brand<number, "TherapeuticIndex_nonneg">;

export interface DoseResponseInput {
  readonly dose: Dose;
  readonly ic50: IC50;
  readonly hillCoefficient: HillCoefficient;
}

export interface EffectiveIC50Input {
  readonly baseIC50: IC50;
  readonly resistanceFactor: ResistanceFactor;
}

export interface DoseAtResponseInput {
  readonly ic50: IC50;
  readonly hillCoefficient: HillCoefficient;
  readonly targetResponse: ResponseFraction;
}

export interface TherapeuticIndexInput {
  readonly toxicDose: Dose;
  readonly effectiveDose: Dose;
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

const requireNonNegative = (
  value: number,
  label: string,
): KernelResult<number> => {
  const finite = requireFinite(value, label);
  if (!finite.ok) return finite;
  if (finite.value < 0) {
    return err(
      "out-of-domain",
      `${label} must be non-negative; got ${finite.value}.`,
    );
  }
  return ok(finite.value);
};

const requirePositive = (
  value: number,
  label: string,
): KernelResult<number> => {
  const non = requireNonNegative(value, label);
  if (!non.ok) return non;
  if (non.value === 0) {
    return err("out-of-domain", `${label} must be strictly positive; got 0.`);
  }
  return ok(non.value);
};

const requireUnitInterval = (
  value: number,
  label: string,
): KernelResult<number> => {
  const finite = requireFinite(value, label);
  if (!finite.ok) return finite;
  if (finite.value < 0 || finite.value > 1) {
    return err(
      "out-of-domain",
      `${label} must lie in [0, 1]; got ${finite.value}.`,
    );
  }
  return ok(finite.value);
};

const requireAtLeastOne = (
  value: number,
  label: string,
): KernelResult<number> => {
  const finite = requireFinite(value, label);
  if (!finite.ok) return finite;
  if (finite.value < 1) {
    return err(
      "out-of-domain",
      `${label} must be >= 1; got ${finite.value}.`,
    );
  }
  return ok(finite.value);
};

export const dose = (value: number): KernelResult<Dose> => {
  const r = requireNonNegative(value, "Dose");
  return r.ok ? ok(r.value as Dose) : r;
};

export const ic50 = (value: number): KernelResult<IC50> => {
  const r = requirePositive(value, "IC50");
  return r.ok ? ok(r.value as IC50) : r;
};

export const hillCoefficient = (
  value: number,
): KernelResult<HillCoefficient> => {
  const r = requirePositive(value, "HillCoefficient");
  return r.ok ? ok(r.value as HillCoefficient) : r;
};

export const responseFraction = (
  value: number,
): KernelResult<ResponseFraction> => {
  const r = requireUnitInterval(value, "ResponseFraction");
  return r.ok ? ok(r.value as ResponseFraction) : r;
};

export const resistanceFactor = (
  value: number,
): KernelResult<ResistanceFactor> => {
  const r = requireAtLeastOne(value, "ResistanceFactor");
  return r.ok ? ok(r.value as ResistanceFactor) : r;
};

// ──────────────────────────────────────────────────────────────────────────
// Operations
// ──────────────────────────────────────────────────────────────────────────

const ensureFinite = (
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

export const hillDoseResponse = (
  input: DoseResponseInput,
): KernelResult<ResponseFraction> => {
  const d = requireNonNegative(input.dose as unknown as number, "dose");
  if (!d.ok) return d;
  const k = requirePositive(input.ic50 as unknown as number, "ic50");
  if (!k.ok) return k;
  const n = requirePositive(
    input.hillCoefficient as unknown as number,
    "hillCoefficient",
  );
  if (!n.ok) return n;
  if (d.value === 0) {
    return ok(0 as ResponseFraction);
  }
  const dosePow = Math.pow(d.value, n.value);
  const ic50Pow = Math.pow(k.value, n.value);
  const denom = ic50Pow + dosePow;
  if (denom <= 0) {
    return err(
      "numerical-instability",
      "Hill denominator collapsed to non-positive.",
    );
  }
  const r = dosePow / denom;
  const finite = ensureFinite(r, "hillDoseResponse");
  return finite.ok ? ok(clamp01(finite.value) as ResponseFraction) : finite;
};

export const effectiveIC50 = (
  input: EffectiveIC50Input,
): KernelResult<IC50> => {
  const base = requirePositive(input.baseIC50 as unknown as number, "baseIC50");
  if (!base.ok) return base;
  const rf = requireAtLeastOne(
    input.resistanceFactor as unknown as number,
    "resistanceFactor",
  );
  if (!rf.ok) return rf;
  const next = base.value * rf.value;
  const finite = ensureFinite(next, "effectiveIC50");
  return finite.ok ? ok(finite.value as IC50) : finite;
};

export const doseAtResponse = (
  input: DoseAtResponseInput,
): KernelResult<Dose> => {
  const k = requirePositive(input.ic50 as unknown as number, "ic50");
  if (!k.ok) return k;
  const n = requirePositive(
    input.hillCoefficient as unknown as number,
    "hillCoefficient",
  );
  if (!n.ok) return n;
  const r = requireUnitInterval(
    input.targetResponse as unknown as number,
    "targetResponse",
  );
  if (!r.ok) return r;
  if (r.value === 0) {
    return err(
      "precondition-violated",
      "targetResponse must be > 0 (zero response trivially requires dose = 0).",
    );
  }
  if (r.value === 1) {
    return err(
      "out-of-domain",
      "targetResponse = 1 requires an infinite dose; choose a value < 1.",
    );
  }
  const ratio = r.value / (1 - r.value);
  const d = k.value * Math.pow(ratio, 1 / n.value);
  const finite = ensureFinite(d, "doseAtResponse");
  return finite.ok ? ok(Math.max(0, finite.value) as Dose) : finite;
};

export const therapeuticIndex = (
  input: TherapeuticIndexInput,
): KernelResult<TherapeuticIndex> => {
  const toxic = requireNonNegative(
    input.toxicDose as unknown as number,
    "toxicDose",
  );
  if (!toxic.ok) return toxic;
  const effective = requireNonNegative(
    input.effectiveDose as unknown as number,
    "effectiveDose",
  );
  if (!effective.ok) return effective;
  if (effective.value <= 0) {
    return err(
      "out-of-domain",
      `effectiveDose must be strictly positive; got ${effective.value}.`,
    );
  }
  const ratio = toxic.value / effective.value;
  const finite = ensureFinite(ratio, "therapeuticIndex");
  return finite.ok ? ok(Math.max(0, finite.value) as TherapeuticIndex) : finite;
};
