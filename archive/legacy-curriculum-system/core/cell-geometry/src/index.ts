import { type Brand, err, ok, type KernelResult } from "@paideia/shared";

/**
 * @paideia/cell-geometry — Deterministic geometric primitives for cell-scale
 * shapes.
 *
 * Surface area, volume, surface-area-to-volume ratio, and a Fick-style
 * mean-square-displacement diffusion-time estimate for spheres, cylinders,
 * and rectangular slabs. All inputs use SI metres; all outputs use SI metres,
 * square metres, and cubic metres. No biological content, no rendering.
 */

export type Length = Brand<number, "Length_m">;
export type Area = Brand<number, "Area_m2">;
export type Volume = Brand<number, "Volume_m3">;
export type InverseLength = Brand<number, "InverseLength_m_inv">;
export type DiffusionCoefficient = Brand<number, "DiffusionCoefficient_m2_per_s">;
export type DiffusionTime = Brand<number, "DiffusionTime_s">;

export interface SphereInput {
  readonly radius: Length;
}

export interface CylinderInput {
  readonly radius: Length;
  readonly length: Length;
}

export interface SlabInput {
  readonly thickness: Length;
  readonly width: Length;
  readonly depth: Length;
}

export interface DiffusionInput {
  readonly characteristicLength: Length;
  readonly diffusionCoefficient: DiffusionCoefficient;
}

export interface ShapeMetrics {
  readonly surfaceArea: Area;
  readonly volume: Volume;
  readonly surfaceToVolumeRatio: InverseLength;
}

// ──────────────────────────────────────────────────────────────────────────
// Constructors with runtime validation
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

export const length = (value: number): KernelResult<Length> => {
  const finite = requireFinite(value, "Length");
  if (!finite.ok) return finite;
  if (finite.value <= 0) {
    return err(
      "out-of-domain",
      `Length must be strictly positive (m); got ${finite.value}.`,
    );
  }
  return ok(finite.value as Length);
};

export const area = (value: number): KernelResult<Area> => {
  const finite = requireFinite(value, "Area");
  if (!finite.ok) return finite;
  if (finite.value < 0) {
    return err(
      "out-of-domain",
      `Area must be non-negative (m^2); got ${finite.value}.`,
    );
  }
  return ok(finite.value as Area);
};

export const volume = (value: number): KernelResult<Volume> => {
  const finite = requireFinite(value, "Volume");
  if (!finite.ok) return finite;
  if (finite.value < 0) {
    return err(
      "out-of-domain",
      `Volume must be non-negative (m^3); got ${finite.value}.`,
    );
  }
  return ok(finite.value as Volume);
};

export const diffusionCoefficient = (
  value: number,
): KernelResult<DiffusionCoefficient> => {
  const finite = requireFinite(value, "DiffusionCoefficient");
  if (!finite.ok) return finite;
  if (finite.value < 0) {
    return err(
      "out-of-domain",
      `DiffusionCoefficient must be non-negative (m^2/s); got ${finite.value}.`,
    );
  }
  return ok(finite.value as DiffusionCoefficient);
};

// ──────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────

const requirePositiveLength = (
  value: Length,
  label: string,
): KernelResult<number> => {
  const n = value as unknown as number;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    return err(
      "precondition-violated",
      `${label} must be a finite number; got ${String(n)}.`,
    );
  }
  if (n <= 0) {
    return err(
      "out-of-domain",
      `${label} must be strictly positive (m); got ${n}.`,
    );
  }
  return ok(n);
};

const requireNonNegativeDiffusion = (
  value: DiffusionCoefficient,
): KernelResult<number> => {
  const n = value as unknown as number;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    return err(
      "precondition-violated",
      `DiffusionCoefficient must be a finite number; got ${String(n)}.`,
    );
  }
  if (n < 0) {
    return err(
      "out-of-domain",
      `DiffusionCoefficient must be non-negative (m^2/s); got ${n}.`,
    );
  }
  return ok(n);
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

const assembleMetrics = (
  surfaceAreaValue: number,
  volumeValue: number,
): KernelResult<ShapeMetrics> => {
  if (volumeValue <= 0) {
    return err(
      "out-of-domain",
      `Volume must be strictly positive to compute SA:V; got ${volumeValue}.`,
    );
  }
  const sav = surfaceAreaValue / volumeValue;
  const finiteSav = ensureFiniteResult(sav, "Surface-to-volume ratio");
  if (!finiteSav.ok) return finiteSav;
  return ok({
    surfaceArea: surfaceAreaValue as Area,
    volume: volumeValue as Volume,
    surfaceToVolumeRatio: finiteSav.value as InverseLength,
  });
};

// ──────────────────────────────────────────────────────────────────────────
// Shape metrics
// ──────────────────────────────────────────────────────────────────────────

export const sphere = (input: SphereInput): KernelResult<ShapeMetrics> => {
  const r = requirePositiveLength(input.radius, "radius");
  if (!r.ok) return r;
  const s = 4 * Math.PI * r.value * r.value;
  const v = (4 / 3) * Math.PI * r.value * r.value * r.value;
  return assembleMetrics(s, v);
};

export const cylinder = (
  input: CylinderInput,
): KernelResult<ShapeMetrics> => {
  const r = requirePositiveLength(input.radius, "radius");
  if (!r.ok) return r;
  const l = requirePositiveLength(input.length, "length");
  if (!l.ok) return l;
  const s = 2 * Math.PI * r.value * (r.value + l.value);
  const v = Math.PI * r.value * r.value * l.value;
  return assembleMetrics(s, v);
};

export const slab = (input: SlabInput): KernelResult<ShapeMetrics> => {
  const t = requirePositiveLength(input.thickness, "thickness");
  if (!t.ok) return t;
  const w = requirePositiveLength(input.width, "width");
  if (!w.ok) return w;
  const d = requirePositiveLength(input.depth, "depth");
  if (!d.ok) return d;
  const s =
    2 * (t.value * d.value + t.value * w.value + d.value * w.value);
  const v = t.value * w.value * d.value;
  return assembleMetrics(s, v);
};

export const surfaceToVolumeRatio = (
  surfaceAreaInput: Area,
  volumeInput: Volume,
): KernelResult<InverseLength> => {
  const sa = surfaceAreaInput as unknown as number;
  const v = volumeInput as unknown as number;
  if (typeof sa !== "number" || !Number.isFinite(sa) || sa < 0) {
    return err(
      "precondition-violated",
      `surfaceArea must be a non-negative finite number; got ${String(sa)}.`,
    );
  }
  if (typeof v !== "number" || !Number.isFinite(v)) {
    return err(
      "precondition-violated",
      `volume must be a finite number; got ${String(v)}.`,
    );
  }
  if (v <= 0) {
    return err(
      "out-of-domain",
      `volume must be strictly positive to compute SA:V; got ${v}.`,
    );
  }
  const sav = sa / v;
  const finite = ensureFiniteResult(sav, "Surface-to-volume ratio");
  return finite.ok ? ok(finite.value as InverseLength) : finite;
};

export const diffusionTimeEstimate = (
  input: DiffusionInput,
): KernelResult<DiffusionTime> => {
  const l = requirePositiveLength(input.characteristicLength, "characteristicLength");
  if (!l.ok) return l;
  const d = requireNonNegativeDiffusion(input.diffusionCoefficient);
  if (!d.ok) return d;
  if (d.value === 0) {
    return err(
      "out-of-domain",
      "DiffusionCoefficient must be strictly positive to compute a finite diffusion time.",
    );
  }
  const t = (l.value * l.value) / (6 * d.value);
  const finite = ensureFiniteResult(t, "Diffusion-time estimate");
  return finite.ok ? ok(finite.value as DiffusionTime) : finite;
};
