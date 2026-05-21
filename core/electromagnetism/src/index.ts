import {
  norm2,
  normalize2,
  scale2,
  type Vector2,
} from "@paideia/linear-algebra";
import {
  err,
  joules,
  ok,
  type Brand,
  type Joules,
  type KernelResult,
} from "@paideia/shared";

export const coulombConstantVacuum = 8.99e9;

export const electromagnetismTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type Coulombs = Brand<number, "Coulombs">;
export type Volts = Brand<number, "Volts">;
export type NewtonsPerCoulomb = Brand<number, "NewtonsPerCoulomb">;

export interface PointChargeElectricFieldInput {
  readonly sourceChargeCoulombs: Coulombs;
  readonly pointMetres: Vector2;
  readonly minRadiusMetres?: number;
}

export interface PointChargePotentialInput {
  readonly sourceChargeCoulombs: Coulombs;
  readonly radiusMetres: number;
  readonly minRadiusMetres?: number;
}

export interface ElectricForceInput {
  readonly electricFieldNewtonsPerCoulomb: Vector2;
  readonly testChargeCoulombs: Coulombs;
}

export interface ElectricPotentialEnergyInput {
  readonly chargeCoulombs: Coulombs;
  readonly potentialVolts: Volts;
}

export interface PointChargeModelInput {
  readonly sourceChargeCoulombs: Coulombs;
  readonly testChargeCoulombs: Coulombs;
  readonly pointMetres: Vector2;
  readonly minRadiusMetres?: number;
}

export interface PointChargeModel {
  readonly electricFieldVectorNewtonsPerCoulomb: Vector2;
  readonly electricFieldStrengthNewtonsPerCoulomb: NewtonsPerCoulomb;
  readonly forceVectorNewtons: Vector2;
  readonly forceMagnitudeNewtons: number;
  readonly potentialVolts: Volts;
  readonly potentialEnergyJoules: Joules;
  readonly separationMetres: number;
}

export const coulombs = (value: number): Coulombs => value as Coulombs;
export const volts = (value: number): Volts => value as Volts;
export const newtonsPerCoulomb = (value: number): NewtonsPerCoulomb =>
  value as NewtonsPerCoulomb;

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteDerived = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite after computation; got ${value}`);

const validRadius = (
  radiusMetres: number,
  minRadiusMetres: number,
): KernelResult<"clamped" | "valid"> => {
  const radius = finite(radiusMetres, "radiusMetres");
  if (!radius.ok) return radius;
  const minRadius = finite(minRadiusMetres, "minRadiusMetres");
  if (!minRadius.ok) return minRadius;
  if (minRadiusMetres < 0) {
    return err("precondition-violated", `minRadiusMetres must be non-negative; got ${minRadiusMetres}`);
  }
  if (radiusMetres < 0) {
    return err("precondition-violated", `radiusMetres must be non-negative; got ${radiusMetres}`);
  }
  if (radiusMetres === 0 && minRadiusMetres === 0) {
    return err("undefined-at-point", "Point-charge field and potential are undefined at r = 0.");
  }
  return radiusMetres < minRadiusMetres ? ok("clamped") : ok("valid");
};

export const pointChargeElectricField = (
  input: PointChargeElectricFieldInput,
): KernelResult<Vector2> => {
  const sourceCharge = finite(input.sourceChargeCoulombs, "sourceChargeCoulombs");
  if (!sourceCharge.ok) return sourceCharge;
  if (input.sourceChargeCoulombs === 0) return ok([0, 0]);
  const minRadiusMetres = input.minRadiusMetres ?? 0;
  const distance = norm2(input.pointMetres);
  if (!distance.ok) return distance;
  const radius = validRadius(distance.value, minRadiusMetres);
  if (!radius.ok) return radius;
  if (radius.value === "clamped") return ok([0, 0]);

  const direction = normalize2(input.pointMetres);
  if (!direction.ok) return direction;
  const magnitude =
    (coulombConstantVacuum * Math.abs(input.sourceChargeCoulombs)) /
    (distance.value * distance.value);
  const computedMagnitude = finiteDerived(magnitude, "electricFieldStrengthNewtonsPerCoulomb");
  if (!computedMagnitude.ok) return computedMagnitude;
  return scale2(direction.value, Math.sign(input.sourceChargeCoulombs) * magnitude);
};

export const pointChargeElectricPotential = (
  input: PointChargePotentialInput,
): KernelResult<Volts> => {
  const sourceCharge = finite(input.sourceChargeCoulombs, "sourceChargeCoulombs");
  if (!sourceCharge.ok) return sourceCharge;
  if (input.sourceChargeCoulombs === 0) return ok(volts(0));
  const minRadiusMetres = input.minRadiusMetres ?? 0;
  const radius = validRadius(input.radiusMetres, minRadiusMetres);
  if (!radius.ok) return radius;
  if (radius.value === "clamped") return ok(volts(0));

  const potential =
    (coulombConstantVacuum * input.sourceChargeCoulombs) / input.radiusMetres;
  const computedPotential = finiteDerived(potential, "potentialVolts");
  if (!computedPotential.ok) return computedPotential;
  return ok(volts(potential));
};

export const electricForceOnCharge = (input: ElectricForceInput): KernelResult<Vector2> => {
  const testCharge = finite(input.testChargeCoulombs, "testChargeCoulombs");
  if (!testCharge.ok) return testCharge;
  return scale2(input.electricFieldNewtonsPerCoulomb, input.testChargeCoulombs);
};

export const electricPotentialEnergy = (
  input: ElectricPotentialEnergyInput,
): KernelResult<Joules> => {
  const charge = finite(input.chargeCoulombs, "chargeCoulombs");
  if (!charge.ok) return charge;
  const potential = finite(input.potentialVolts, "potentialVolts");
  if (!potential.ok) return potential;
  const energy = input.chargeCoulombs * input.potentialVolts;
  const computedEnergy = finiteDerived(energy, "potentialEnergyJoules");
  if (!computedEnergy.ok) return computedEnergy;
  return ok(joules(energy));
};

export const pointChargeModel = (
  input: PointChargeModelInput,
): KernelResult<PointChargeModel> => {
  const distance = norm2(input.pointMetres);
  if (!distance.ok) return distance;
  const field = pointChargeElectricField(input);
  if (!field.ok) return field;
  const fieldStrength = norm2(field.value);
  if (!fieldStrength.ok) return fieldStrength;
  const force = electricForceOnCharge({
    electricFieldNewtonsPerCoulomb: field.value,
    testChargeCoulombs: input.testChargeCoulombs,
  });
  if (!force.ok) return force;
  const forceMagnitude = norm2(force.value);
  if (!forceMagnitude.ok) return forceMagnitude;
  const potential = pointChargeElectricPotential({
    radiusMetres: distance.value,
    sourceChargeCoulombs: input.sourceChargeCoulombs,
    ...(input.minRadiusMetres !== undefined && { minRadiusMetres: input.minRadiusMetres }),
  });
  if (!potential.ok) return potential;
  const potentialEnergy = electricPotentialEnergy({
    chargeCoulombs: input.testChargeCoulombs,
    potentialVolts: potential.value,
  });
  if (!potentialEnergy.ok) return potentialEnergy;

  return ok({
    electricFieldStrengthNewtonsPerCoulomb: newtonsPerCoulomb(fieldStrength.value),
    electricFieldVectorNewtonsPerCoulomb: field.value,
    forceMagnitudeNewtons: forceMagnitude.value,
    forceVectorNewtons: force.value,
    potentialEnergyJoules: potentialEnergy.value,
    potentialVolts: potential.value,
    separationMetres: distance.value,
  });
};
