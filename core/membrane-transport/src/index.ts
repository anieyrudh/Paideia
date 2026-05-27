import {
  type Brand,
  err,
  type Kelvins,
  ok,
  type KernelResult,
} from "@paideia/shared";

/**
 * @paideia/membrane-transport — Deterministic membrane biophysics primitives.
 *
 * Owns the Nernst equilibrium potential for a single ion, the
 * Goldman-Hodgkin-Katz (GHK) resting membrane potential for a small set of
 * monovalent ions, and Fick's first-law steady membrane flux. Inputs use SI
 * units (millimolar concentration is equivalent to mol/m^3, permeability in
 * m/s, temperature in kelvins). Outputs use branded `Volts` and `Flux`
 * numerics. No UI. No time integration. No multi-valent GHK.
 */

// ──────────────────────────────────────────────────────────────────────────
// Branded numeric types
// ──────────────────────────────────────────────────────────────────────────

export type Concentration = Brand<number, "Concentration_mM">;
export type Permeability = Brand<number, "Permeability_mps">;
export type Flux = Brand<number, "Flux_mol_per_m2_s">;
export type IonCharge = Brand<number, "IonCharge">;
export type Volts = Brand<number, "Volts">;

export interface MonovalentIon {
  readonly name: string;
  readonly charge: -1 | 1;
  readonly permeability: Permeability;
  readonly concentrationOutside: Concentration;
  readonly concentrationInside: Concentration;
}

export interface NernstInput {
  readonly temperatureKelvin: Kelvins;
  readonly charge: IonCharge;
  readonly concentrationOutside: Concentration;
  readonly concentrationInside: Concentration;
}

export interface GoldmanInput {
  readonly temperatureKelvin: Kelvins;
  readonly ions: ReadonlyArray<MonovalentIon>;
}

export interface MembraneFluxInput {
  readonly permeability: Permeability;
  readonly concentrationOutside: Concentration;
  readonly concentrationInside: Concentration;
}

// ──────────────────────────────────────────────────────────────────────────
// Physical constants (CODATA 2018; biological reference temperatures)
// ──────────────────────────────────────────────────────────────────────────

export const GAS_CONSTANT = 8.314462618 as const;
export const FARADAY_CONSTANT = 96485.33212 as const;
export const BODY_TEMPERATURE_KELVIN = 310.15 as Kelvins;
export const ROOM_TEMPERATURE_KELVIN = 298.15 as Kelvins;

// ──────────────────────────────────────────────────────────────────────────
// Constructors with runtime validation
// ──────────────────────────────────────────────────────────────────────────

const requireFinite = (
  value: number,
  label: string,
): KernelResult<number> =>
  typeof value === "number" && Number.isFinite(value)
    ? ok(value)
    : err("precondition-violated", `${label} must be a finite number; got ${String(value)}.`);

export const concentration = (
  value: number,
): KernelResult<Concentration> => {
  const finite = requireFinite(value, "Concentration");
  if (!finite.ok) return finite;
  if (finite.value <= 0) {
    return err(
      "out-of-domain",
      `Concentration must be strictly positive (mM); got ${finite.value}.`,
    );
  }
  return ok(finite.value as Concentration);
};

export const permeability = (
  value: number,
): KernelResult<Permeability> => {
  const finite = requireFinite(value, "Permeability");
  if (!finite.ok) return finite;
  if (finite.value < 0) {
    return err(
      "out-of-domain",
      `Permeability must be non-negative (m/s); got ${finite.value}.`,
    );
  }
  return ok(finite.value as Permeability);
};

export const ionCharge = (value: number): KernelResult<IonCharge> => {
  const finite = requireFinite(value, "IonCharge");
  if (!finite.ok) return finite;
  if (!Number.isInteger(finite.value)) {
    return err(
      "precondition-violated",
      `IonCharge must be an integer; got ${finite.value}.`,
    );
  }
  if (finite.value === 0) {
    return err(
      "out-of-domain",
      "IonCharge must be non-zero; the Nernst equation is undefined for z = 0.",
    );
  }
  return ok(finite.value as IonCharge);
};

export const volts = (value: number): KernelResult<Volts> => {
  const finite = requireFinite(value, "Volts");
  return finite.ok ? ok(finite.value as Volts) : finite;
};

export const flux = (value: number): KernelResult<Flux> => {
  const finite = requireFinite(value, "Flux");
  return finite.ok ? ok(finite.value as Flux) : finite;
};

// ──────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────

const requireTemperature = (
  temperatureKelvin: Kelvins,
): KernelResult<number> => {
  const t = temperatureKelvin as unknown as number;
  if (typeof t !== "number" || !Number.isFinite(t)) {
    return err(
      "precondition-violated",
      `Temperature must be a finite number of kelvins; got ${String(t)}.`,
    );
  }
  if (t <= 0) {
    return err(
      "out-of-domain",
      `Temperature must be strictly positive in kelvins; got ${t}.`,
    );
  }
  return ok(t);
};

const requirePositiveConcentration = (
  value: Concentration,
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
      `${label} must be strictly positive (mM); got ${n}.`,
    );
  }
  return ok(n);
};

const requireNonNegativePermeability = (
  value: Permeability,
  label: string,
): KernelResult<number> => {
  const n = value as unknown as number;
  if (typeof n !== "number" || !Number.isFinite(n)) {
    return err(
      "precondition-violated",
      `${label} must be a finite number; got ${String(n)}.`,
    );
  }
  if (n < 0) {
    return err(
      "out-of-domain",
      `${label} must be non-negative (m/s); got ${n}.`,
    );
  }
  return ok(n);
};

const requireIntegerCharge = (
  charge: IonCharge,
): KernelResult<number> => {
  const z = charge as unknown as number;
  if (typeof z !== "number" || !Number.isFinite(z)) {
    return err(
      "precondition-violated",
      `IonCharge must be a finite integer; got ${String(z)}.`,
    );
  }
  if (!Number.isInteger(z) || z === 0) {
    return err(
      "out-of-domain",
      `IonCharge must be a non-zero integer; got ${z}.`,
    );
  }
  return ok(z);
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

// ──────────────────────────────────────────────────────────────────────────
// Nernst equation
// ──────────────────────────────────────────────────────────────────────────

export const nernstPotential = (
  input: NernstInput,
): KernelResult<Volts> => {
  const temperature = requireTemperature(input.temperatureKelvin);
  if (!temperature.ok) return temperature;
  const charge = requireIntegerCharge(input.charge);
  if (!charge.ok) return charge;
  const cOut = requirePositiveConcentration(
    input.concentrationOutside,
    "concentrationOutside",
  );
  if (!cOut.ok) return cOut;
  const cIn = requirePositiveConcentration(
    input.concentrationInside,
    "concentrationInside",
  );
  if (!cIn.ok) return cIn;

  const ratio = cOut.value / cIn.value;
  const e =
    (GAS_CONSTANT * temperature.value) /
    (charge.value * FARADAY_CONSTANT) *
    Math.log(ratio);

  const finite = ensureFiniteResult(e, "Nernst potential");
  return finite.ok ? ok(finite.value as Volts) : finite;
};

// ──────────────────────────────────────────────────────────────────────────
// Goldman-Hodgkin-Katz equation (monovalent ions only)
// ──────────────────────────────────────────────────────────────────────────

export const goldmanVoltage = (
  input: GoldmanInput,
): KernelResult<Volts> => {
  const temperature = requireTemperature(input.temperatureKelvin);
  if (!temperature.ok) return temperature;
  if (!Array.isArray(input.ions) || input.ions.length === 0) {
    return err(
      "precondition-violated",
      "Goldman input must include at least one ion.",
    );
  }

  let numerator = 0;
  let denominator = 0;
  let anyPositivePermeability = false;

  for (let index = 0; index < input.ions.length; index += 1) {
    const ion = input.ions[index];
    if (ion === undefined) {
      return err(
        "precondition-violated",
        `Goldman input ion at position ${index} is undefined.`,
      );
    }
    if (ion.charge !== 1 && ion.charge !== -1) {
      return err(
        "out-of-domain",
        `Goldman is restricted to monovalent ions; ion "${ion.name}" has charge ${ion.charge}.`,
      );
    }
    const perm = requireNonNegativePermeability(
      ion.permeability,
      `Permeability of "${ion.name}"`,
    );
    if (!perm.ok) return perm;
    const cOut = requirePositiveConcentration(
      ion.concentrationOutside,
      `concentrationOutside of "${ion.name}"`,
    );
    if (!cOut.ok) return cOut;
    const cIn = requirePositiveConcentration(
      ion.concentrationInside,
      `concentrationInside of "${ion.name}"`,
    );
    if (!cIn.ok) return cIn;

    if (perm.value > 0) anyPositivePermeability = true;
    if (ion.charge === 1) {
      numerator += perm.value * cOut.value;
      denominator += perm.value * cIn.value;
    } else {
      // Anion convention: outside concentration appears in the denominator,
      // inside concentration appears in the numerator (signs of charge flip).
      numerator += perm.value * cIn.value;
      denominator += perm.value * cOut.value;
    }
  }

  if (!anyPositivePermeability) {
    return err(
      "precondition-violated",
      "Goldman requires at least one ion with strictly positive permeability.",
    );
  }
  if (numerator <= 0 || denominator <= 0) {
    return err(
      "numerical-instability",
      "Goldman ratio numerator or denominator collapsed to non-positive value.",
    );
  }

  const v =
    ((GAS_CONSTANT * temperature.value) / FARADAY_CONSTANT) *
    Math.log(numerator / denominator);
  const finite = ensureFiniteResult(v, "Goldman voltage");
  return finite.ok ? ok(finite.value as Volts) : finite;
};

// ──────────────────────────────────────────────────────────────────────────
// Fick's first-law steady membrane flux
// ──────────────────────────────────────────────────────────────────────────

export const membraneFlux = (
  input: MembraneFluxInput,
): KernelResult<Flux> => {
  const perm = requireNonNegativePermeability(input.permeability, "permeability");
  if (!perm.ok) return perm;
  const cOut = requirePositiveConcentration(
    input.concentrationOutside,
    "concentrationOutside",
  );
  if (!cOut.ok) return cOut;
  const cIn = requirePositiveConcentration(
    input.concentrationInside,
    "concentrationInside",
  );
  if (!cIn.ok) return cIn;

  const j = perm.value * (cOut.value - cIn.value);
  const finite = ensureFiniteResult(j, "Membrane flux");
  return finite.ok ? ok(finite.value as Flux) : finite;
};
