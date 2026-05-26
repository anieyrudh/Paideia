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
export type Teslas = Brand<number, "Teslas">;
export type Webers = Brand<number, "Webers">;

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

export type LenzOpposition = "oppose-increase" | "oppose-decrease" | "no-change";

export interface UniformFluxInductionInput {
  readonly turns: number;
  readonly loopAreaSquareMetres: number;
  readonly initialFieldTeslas: Teslas;
  readonly finalFieldTeslas: Teslas;
  readonly angleToNormalDegrees: number;
  readonly durationSeconds: number;
  readonly circuitResistanceOhms: number;
}

export interface UniformFluxInductionModel {
  readonly initialFluxWebers: Webers;
  readonly finalFluxWebers: Webers;
  readonly fluxChangeWebers: Webers;
  readonly fluxRateWebersPerSecond: number;
  readonly inducedEmfVolts: Volts;
  readonly inducedEmfMagnitudeVolts: Volts;
  readonly inducedCurrentAmps: number;
  readonly lenzOpposition: LenzOpposition;
  readonly inducedFieldDirection: "into-page" | "out-of-page" | "none";
  readonly interpretation: string;
}

export const coulombs = (value: number): Coulombs => value as Coulombs;
export const volts = (value: number): Volts => value as Volts;
export const newtonsPerCoulomb = (value: number): NewtonsPerCoulomb =>
  value as NewtonsPerCoulomb;
export const teslas = (value: number): Teslas => value as Teslas;
export const webers = (value: number): Webers => value as Webers;

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteDerived = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite after computation; got ${value}`);

const finitePositive = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value) && value > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite and positive; got ${value}`);

const finiteNonNegative = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value) && value >= 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite and non-negative; got ${value}`);

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

export const uniformFluxInductionModel = (
  input: UniformFluxInductionInput,
): KernelResult<UniformFluxInductionModel> => {
  const turns = finitePositive(input.turns, "turns");
  if (!turns.ok) return turns;
  if (!Number.isInteger(input.turns)) {
    return err("precondition-violated", `turns must be an integer; got ${input.turns}`);
  }
  const area = finitePositive(input.loopAreaSquareMetres, "loopAreaSquareMetres");
  if (!area.ok) return area;
  const initialField = finite(input.initialFieldTeslas, "initialFieldTeslas");
  if (!initialField.ok) return initialField;
  const finalField = finite(input.finalFieldTeslas, "finalFieldTeslas");
  if (!finalField.ok) return finalField;
  const angle = finite(input.angleToNormalDegrees, "angleToNormalDegrees");
  if (!angle.ok) return angle;
  if (input.angleToNormalDegrees < 0 || input.angleToNormalDegrees > 90) {
    return err(
      "precondition-violated",
      `angleToNormalDegrees must be between 0 and 90; got ${input.angleToNormalDegrees}`,
    );
  }
  const duration = finitePositive(input.durationSeconds, "durationSeconds");
  if (!duration.ok) return duration;
  const resistance = finiteNonNegative(input.circuitResistanceOhms, "circuitResistanceOhms");
  if (!resistance.ok) return resistance;

  const projection = Math.cos((input.angleToNormalDegrees * Math.PI) / 180);
  const initialFlux =
    input.initialFieldTeslas * input.loopAreaSquareMetres * projection;
  const finalFlux = input.finalFieldTeslas * input.loopAreaSquareMetres * projection;
  const fluxChange = finalFlux - initialFlux;
  const fluxRate = fluxChange / input.durationSeconds;
  const inducedEmf = -input.turns * fluxRate;
  const inducedEmfMagnitude = Math.abs(inducedEmf);
  const inducedCurrent =
    input.circuitResistanceOhms === 0
      ? 0
      : inducedEmfMagnitude / input.circuitResistanceOhms;

  for (const [value, label] of [
    [initialFlux, "initialFluxWebers"],
    [finalFlux, "finalFluxWebers"],
    [fluxChange, "fluxChangeWebers"],
    [fluxRate, "fluxRateWebersPerSecond"],
    [inducedEmf, "inducedEmfVolts"],
    [inducedEmfMagnitude, "inducedEmfMagnitudeVolts"],
    [inducedCurrent, "inducedCurrentAmps"],
  ] as const) {
    const computed = finiteDerived(value, label);
    if (!computed.ok) return computed;
  }

  const lenzOpposition: LenzOpposition =
    fluxChange > 0 ? "oppose-increase" : fluxChange < 0 ? "oppose-decrease" : "no-change";
  const inducedFieldDirection =
    fluxChange > 0 ? "into-page" : fluxChange < 0 ? "out-of-page" : "none";
  const interpretation =
    fluxChange > 0
      ? "flux through the loop is increasing, so the induced field opposes that increase"
      : fluxChange < 0
        ? "flux through the loop is decreasing, so the induced field tries to preserve it"
        : "flux through the loop is unchanged, so no induction is required";

  return ok({
    finalFluxWebers: webers(finalFlux),
    fluxChangeWebers: webers(fluxChange),
    fluxRateWebersPerSecond: fluxRate,
    inducedCurrentAmps: inducedCurrent,
    inducedEmfMagnitudeVolts: volts(inducedEmfMagnitude),
    inducedEmfVolts: volts(inducedEmf),
    inducedFieldDirection,
    initialFluxWebers: webers(initialFlux),
    interpretation,
    lenzOpposition,
  });
};
