import {
  norm2,
  normalize2,
  scale2,
  type Vector2,
} from "@paideia/linear-algebra";
import {
  err,
  degrees,
  hertz,
  joules,
  metres,
  metresPerSecond,
  ok,
  radiansPerSecond,
  seconds,
  type Brand,
  type Degrees,
  type Hertz,
  type Joules,
  type KernelResult,
  type Metres,
  type MetresPerSecond,
  type RadiansPerSecond,
  type Seconds,
} from "@paideia/shared";

export const coulombConstantVacuum = 8.99e9;
export const vacuumPermittivityFaradsPerMetre = 8.8541878128e-12;
export const speedOfLightVacuumMetresPerSecond = 299_792_458;
export const vacuumImpedanceOhms = 376.730313668;

export const electromagnetismTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type Coulombs = Brand<number, "Coulombs">;
export type CoulombsPerMetre = Brand<number, "CoulombsPerMetre">;
export type CoulombsPerSquareMetre = Brand<number, "CoulombsPerSquareMetre">;
export type Volts = Brand<number, "Volts">;
export type NewtonsPerCoulomb = Brand<number, "NewtonsPerCoulomb">;
export type Farads = Brand<number, "Farads">;
export type ElectricFluxVoltsMetres = Brand<number, "ElectricFluxVoltsMetres">;
export type Teslas = Brand<number, "Teslas">;
export type Webers = Brand<number, "Webers">;
export type WebersPerSecond = Brand<number, "WebersPerSecond">;
export type SquareMetres = Brand<number, "SquareMetres">;
export type Ohms = Brand<number, "Ohms">;
export type Amps = Brand<number, "Amps">;
export type VoltsPerMetre = Brand<number, "VoltsPerMetre">;
export type RadiansPerMetre = Brand<number, "RadiansPerMetre">;
export type WattsPerSquareMetre = Brand<number, "WattsPerSquareMetre">;
export type JoulesPerCubicMetre = Brand<number, "JoulesPerCubicMetre">;

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

export interface ParallelPlateCapacitorInput {
  readonly plateAreaSquareMetres: number;
  readonly plateSeparationMetres: number;
  readonly dielectricConstant: number;
  readonly voltageVolts: Volts;
}

export interface ParallelPlateCapacitorModel {
  readonly capacitanceFarads: Farads;
  readonly chargeCoulombs: Coulombs;
  readonly energyJoules: Joules;
  readonly electricFieldVoltsPerMetre: VoltsPerMetre;
  readonly energyDensityJoulesPerCubicMetre: JoulesPerCubicMetre;
}

export interface ElectricFluxThroughSurfaceInput {
  readonly electricFieldVoltsPerMetre: VoltsPerMetre;
  readonly areaSquareMetres: SquareMetres;
  readonly angleToNormalDegrees: Degrees;
}

export interface ElectricFluxFromChargeInput {
  readonly enclosedChargeCoulombs: Coulombs;
}

export interface EnclosedChargeFromFluxInput {
  readonly electricFluxVoltsMetres: ElectricFluxVoltsMetres;
}

export type GaussLawSymmetricFieldInput =
  | {
      readonly symmetry: "spherical";
      readonly enclosedChargeCoulombs: Coulombs;
      readonly radiusMetres: number;
    }
  | {
      readonly symmetry: "cylindrical";
      readonly linearChargeDensityCoulombsPerMetre: CoulombsPerMetre;
      readonly radiusMetres: number;
      readonly lengthMetres: number;
    }
  | {
      readonly symmetry: "planar";
      readonly surfaceChargeDensityCoulombsPerSquareMetre: CoulombsPerSquareMetre;
      readonly pillboxFaceAreaSquareMetres: SquareMetres;
    };

export interface GaussLawSymmetricFieldModel {
  readonly symmetry: GaussLawSymmetricFieldInput["symmetry"];
  readonly enclosedChargeCoulombs: Coulombs;
  readonly gaussianAreaSquareMetres: SquareMetres;
  readonly electricFluxVoltsMetres: ElectricFluxVoltsMetres;
  readonly electricFieldVoltsPerMetre: VoltsPerMetre;
  readonly interpretation: string;
}

export type LenzOpposition = "oppose-increase" | "oppose-decrease" | "no-change";

export interface UniformFluxInductionInput {
  readonly turns: number;
  readonly loopAreaSquareMetres: SquareMetres;
  readonly initialFieldTeslas: Teslas;
  readonly finalFieldTeslas: Teslas;
  readonly angleToNormalDegrees: Degrees;
  readonly durationSeconds: Seconds;
  readonly circuitResistanceOhms: Ohms;
}

export interface UniformFluxInductionModel {
  readonly initialFluxWebers: Webers;
  readonly finalFluxWebers: Webers;
  readonly fluxChangeWebers: Webers;
  readonly fluxRateWebersPerSecond: WebersPerSecond;
  readonly inducedEmfVolts: Volts;
  readonly inducedEmfMagnitudeVolts: Volts;
  readonly inducedCurrentAmps: Amps;
  readonly lenzOpposition: LenzOpposition;
  readonly inducedFieldDirection: "into-page" | "out-of-page" | "none";
  readonly interpretation: string;
}

export interface ElectromagneticWaveInput {
  readonly frequencyHertz: Hertz;
  readonly electricFieldAmplitudeVoltsPerMetre: VoltsPerMetre;
  readonly relativePermittivity: number;
  readonly relativePermeability: number;
}

export interface ElectromagneticWaveModel {
  readonly speedMetresPerSecond: MetresPerSecond;
  readonly wavelengthMetres: Metres;
  readonly periodSeconds: Seconds;
  readonly angularFrequencyRadPerSecond: RadiansPerSecond;
  readonly waveNumberRadPerMetre: RadiansPerMetre;
  readonly electricFieldAmplitudeVoltsPerMetre: VoltsPerMetre;
  readonly magneticFieldAmplitudeTesla: Teslas;
  readonly mediumImpedanceOhms: Ohms;
  readonly averageIntensityWattsPerSquareMetre: WattsPerSquareMetre;
  readonly spectrumBand: string;
  readonly interpretation: string;
}

export const coulombs = (value: number): Coulombs => value as Coulombs;
export const coulombsPerMetre = (value: number): CoulombsPerMetre =>
  value as CoulombsPerMetre;
export const coulombsPerSquareMetre = (value: number): CoulombsPerSquareMetre =>
  value as CoulombsPerSquareMetre;
export const volts = (value: number): Volts => value as Volts;
export const newtonsPerCoulomb = (value: number): NewtonsPerCoulomb =>
  value as NewtonsPerCoulomb;
export const farads = (value: number): Farads => value as Farads;
export const electricFluxVoltsMetres = (value: number): ElectricFluxVoltsMetres =>
  value as ElectricFluxVoltsMetres;
export const teslas = (value: number): Teslas => value as Teslas;
export const webers = (value: number): Webers => value as Webers;
export const webersPerSecond = (value: number): WebersPerSecond =>
  value as WebersPerSecond;
export const squareMetres = (value: number): SquareMetres => value as SquareMetres;
export const ohms = (value: number): Ohms => value as Ohms;
export const amps = (value: number): Amps => value as Amps;
export const voltsPerMetre = (value: number): VoltsPerMetre =>
  value as VoltsPerMetre;
export const radiansPerMetre = (value: number): RadiansPerMetre =>
  value as RadiansPerMetre;
export const wattsPerSquareMetre = (value: number): WattsPerSquareMetre =>
  value as WattsPerSquareMetre;
export const joulesPerCubicMetre = (value: number): JoulesPerCubicMetre =>
  value as JoulesPerCubicMetre;
export { degrees, hertz, metres, metresPerSecond, radiansPerSecond, seconds };

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

const spectrumBandForFrequency = (frequencyHertz: Hertz): string => {
  if (frequencyHertz < 3e9) return "radio";
  if (frequencyHertz < 3e12) return "microwave";
  if (frequencyHertz < 4.3e14) return "infrared";
  if (frequencyHertz < 7.5e14) return "visible";
  if (frequencyHertz < 3e16) return "ultraviolet";
  if (frequencyHertz < 3e19) return "x-ray";
  return "gamma ray";
};

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

export const parallelPlateCapacitorModel = (
  input: ParallelPlateCapacitorInput,
): KernelResult<ParallelPlateCapacitorModel> => {
  const area = finitePositive(input.plateAreaSquareMetres, "plateAreaSquareMetres");
  if (!area.ok) return area;
  const separation = finitePositive(input.plateSeparationMetres, "plateSeparationMetres");
  if (!separation.ok) return separation;
  const dielectric = finitePositive(input.dielectricConstant, "dielectricConstant");
  if (!dielectric.ok) return dielectric;
  const voltage = finite(input.voltageVolts, "voltageVolts");
  if (!voltage.ok) return voltage;

  const capacitance =
    (input.dielectricConstant *
      vacuumPermittivityFaradsPerMetre *
      input.plateAreaSquareMetres) /
    input.plateSeparationMetres;
  const charge = capacitance * input.voltageVolts;
  const energy = 0.5 * capacitance * input.voltageVolts * input.voltageVolts;
  const electricField = input.voltageVolts / input.plateSeparationMetres;
  const energyDensity =
    0.5 *
    input.dielectricConstant *
    vacuumPermittivityFaradsPerMetre *
    electricField *
    electricField;

  for (const [value, label] of [
    [capacitance, "capacitanceFarads"],
    [charge, "chargeCoulombs"],
    [energy, "energyJoules"],
    [electricField, "electricFieldVoltsPerMetre"],
    [energyDensity, "energyDensityJoulesPerCubicMetre"],
  ] as const) {
    const finiteValue = finiteDerived(value, label);
    if (!finiteValue.ok) return finiteValue;
  }

  return ok({
    capacitanceFarads: farads(capacitance),
    chargeCoulombs: coulombs(charge),
    electricFieldVoltsPerMetre: voltsPerMetre(electricField),
    energyDensityJoulesPerCubicMetre: joulesPerCubicMetre(energyDensity),
    energyJoules: joules(energy),
  });
};

export const electricFluxThroughSurface = (
  input: ElectricFluxThroughSurfaceInput,
): KernelResult<ElectricFluxVoltsMetres> => {
  const field = finite(input.electricFieldVoltsPerMetre, "electricFieldVoltsPerMetre");
  if (!field.ok) return field;
  const area = finitePositive(input.areaSquareMetres, "areaSquareMetres");
  if (!area.ok) return area;
  const angle = finite(input.angleToNormalDegrees, "angleToNormalDegrees");
  if (!angle.ok) return angle;
  if (input.angleToNormalDegrees < 0 || input.angleToNormalDegrees > 180) {
    return err(
      "precondition-violated",
      `angleToNormalDegrees must be between 0 and 180; got ${input.angleToNormalDegrees}`,
    );
  }

  const flux =
    input.electricFieldVoltsPerMetre *
    input.areaSquareMetres *
    Math.cos((input.angleToNormalDegrees * Math.PI) / 180);
  const computed = finiteDerived(flux, "electricFluxVoltsMetres");
  if (!computed.ok) return computed;
  return ok(electricFluxVoltsMetres(flux));
};

export const electricFluxFromEnclosedCharge = (
  input: ElectricFluxFromChargeInput,
): KernelResult<ElectricFluxVoltsMetres> => {
  const charge = finite(input.enclosedChargeCoulombs, "enclosedChargeCoulombs");
  if (!charge.ok) return charge;
  const flux = input.enclosedChargeCoulombs / vacuumPermittivityFaradsPerMetre;
  const computed = finiteDerived(flux, "electricFluxVoltsMetres");
  if (!computed.ok) return computed;
  return ok(electricFluxVoltsMetres(flux));
};

export const enclosedChargeFromElectricFlux = (
  input: EnclosedChargeFromFluxInput,
): KernelResult<Coulombs> => {
  const flux = finite(input.electricFluxVoltsMetres, "electricFluxVoltsMetres");
  if (!flux.ok) return flux;
  const charge = input.electricFluxVoltsMetres * vacuumPermittivityFaradsPerMetre;
  const computed = finiteDerived(charge, "enclosedChargeCoulombs");
  if (!computed.ok) return computed;
  return ok(coulombs(charge));
};

export const gaussLawSymmetricFieldModel = (
  input: GaussLawSymmetricFieldInput,
): KernelResult<GaussLawSymmetricFieldModel> => {
  if (input.symmetry === "spherical") {
    const charge = finite(input.enclosedChargeCoulombs, "enclosedChargeCoulombs");
    if (!charge.ok) return charge;
    const radius = finitePositive(input.radiusMetres, "radiusMetres");
    if (!radius.ok) return radius;

    const gaussianArea = 4 * Math.PI * input.radiusMetres * input.radiusMetres;
    const electricField =
      input.enclosedChargeCoulombs /
      (vacuumPermittivityFaradsPerMetre * gaussianArea);
    const flux = electricFluxFromEnclosedCharge({
      enclosedChargeCoulombs: input.enclosedChargeCoulombs,
    });
    if (!flux.ok) return flux;

    const computedField = finiteDerived(electricField, "electricFieldVoltsPerMetre");
    if (!computedField.ok) return computedField;
    return ok({
      electricFieldVoltsPerMetre: voltsPerMetre(electricField),
      electricFluxVoltsMetres: flux.value,
      enclosedChargeCoulombs: input.enclosedChargeCoulombs,
      gaussianAreaSquareMetres: squareMetres(gaussianArea),
      interpretation:
        "spherical symmetry makes the field normal and equal on every point of the Gaussian sphere",
      symmetry: input.symmetry,
    });
  }

  if (input.symmetry === "cylindrical") {
    const density = finite(
      input.linearChargeDensityCoulombsPerMetre,
      "linearChargeDensityCoulombsPerMetre",
    );
    if (!density.ok) return density;
    const radius = finitePositive(input.radiusMetres, "radiusMetres");
    if (!radius.ok) return radius;
    const length = finitePositive(input.lengthMetres, "lengthMetres");
    if (!length.ok) return length;

    const enclosedCharge = input.linearChargeDensityCoulombsPerMetre * input.lengthMetres;
    const gaussianArea = 2 * Math.PI * input.radiusMetres * input.lengthMetres;
    const electricField =
      input.linearChargeDensityCoulombsPerMetre /
      (2 * Math.PI * vacuumPermittivityFaradsPerMetre * input.radiusMetres);
    const flux = electricFluxFromEnclosedCharge({
      enclosedChargeCoulombs: coulombs(enclosedCharge),
    });
    if (!flux.ok) return flux;

    for (const [value, label] of [
      [enclosedCharge, "enclosedChargeCoulombs"],
      [gaussianArea, "gaussianAreaSquareMetres"],
      [electricField, "electricFieldVoltsPerMetre"],
    ] as const) {
      const computed = finiteDerived(value, label);
      if (!computed.ok) return computed;
    }

    return ok({
      electricFieldVoltsPerMetre: voltsPerMetre(electricField),
      electricFluxVoltsMetres: flux.value,
      enclosedChargeCoulombs: coulombs(enclosedCharge),
      gaussianAreaSquareMetres: squareMetres(gaussianArea),
      interpretation:
        "cylindrical symmetry sends flux through the curved surface while end caps contribute zero flux",
      symmetry: input.symmetry,
    });
  }

  const density = finite(
    input.surfaceChargeDensityCoulombsPerSquareMetre,
    "surfaceChargeDensityCoulombsPerSquareMetre",
  );
  if (!density.ok) return density;
  const faceArea = finitePositive(
    input.pillboxFaceAreaSquareMetres,
    "pillboxFaceAreaSquareMetres",
  );
  if (!faceArea.ok) return faceArea;

  const enclosedCharge =
    input.surfaceChargeDensityCoulombsPerSquareMetre * input.pillboxFaceAreaSquareMetres;
  const gaussianArea = 2 * input.pillboxFaceAreaSquareMetres;
  const electricField =
    input.surfaceChargeDensityCoulombsPerSquareMetre /
    (2 * vacuumPermittivityFaradsPerMetre);
  const flux = electricFluxFromEnclosedCharge({
    enclosedChargeCoulombs: coulombs(enclosedCharge),
  });
  if (!flux.ok) return flux;

  for (const [value, label] of [
    [enclosedCharge, "enclosedChargeCoulombs"],
    [gaussianArea, "gaussianAreaSquareMetres"],
    [electricField, "electricFieldVoltsPerMetre"],
  ] as const) {
    const computed = finiteDerived(value, label);
    if (!computed.ok) return computed;
  }

  return ok({
    electricFieldVoltsPerMetre: voltsPerMetre(electricField),
    electricFluxVoltsMetres: flux.value,
    enclosedChargeCoulombs: coulombs(enclosedCharge),
    gaussianAreaSquareMetres: squareMetres(gaussianArea),
    interpretation:
      "planar symmetry splits equal outward flux through both pillbox faces",
    symmetry: input.symmetry,
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
    fluxRateWebersPerSecond: webersPerSecond(fluxRate),
    inducedCurrentAmps: amps(inducedCurrent),
    inducedEmfMagnitudeVolts: volts(inducedEmfMagnitude),
    inducedEmfVolts: volts(inducedEmf),
    inducedFieldDirection,
    initialFluxWebers: webers(initialFlux),
    interpretation,
    lenzOpposition,
  });
};

export const electromagneticWaveModel = (
  input: ElectromagneticWaveInput,
): KernelResult<ElectromagneticWaveModel> => {
  const frequency = finitePositive(input.frequencyHertz, "frequencyHertz");
  if (!frequency.ok) return frequency;
  const electricField = finitePositive(
    input.electricFieldAmplitudeVoltsPerMetre,
    "electricFieldAmplitudeVoltsPerMetre",
  );
  if (!electricField.ok) return electricField;
  const relativePermittivity = finitePositive(
    input.relativePermittivity,
    "relativePermittivity",
  );
  if (!relativePermittivity.ok) return relativePermittivity;
  const relativePermeability = finitePositive(
    input.relativePermeability,
    "relativePermeability",
  );
  if (!relativePermeability.ok) return relativePermeability;

  const refractiveIndex = Math.sqrt(input.relativePermittivity * input.relativePermeability);
  const speed = speedOfLightVacuumMetresPerSecond / refractiveIndex;
  const wavelength = speed / input.frequencyHertz;
  const period = 1 / input.frequencyHertz;
  const angularFrequency = 2 * Math.PI * input.frequencyHertz;
  const waveNumber = (2 * Math.PI) / wavelength;
  const mediumImpedance =
    vacuumImpedanceOhms * Math.sqrt(input.relativePermeability / input.relativePermittivity);
  const magneticFieldAmplitude =
    input.electricFieldAmplitudeVoltsPerMetre / speed;
  const averageIntensity =
    (input.electricFieldAmplitudeVoltsPerMetre ** 2) / (2 * mediumImpedance);

  for (const [value, label] of [
    [speed, "speedMetresPerSecond"],
    [wavelength, "wavelengthMetres"],
    [period, "periodSeconds"],
    [angularFrequency, "angularFrequencyRadPerSecond"],
    [waveNumber, "waveNumberRadPerMetre"],
    [mediumImpedance, "mediumImpedanceOhms"],
    [magneticFieldAmplitude, "magneticFieldAmplitudeTesla"],
    [averageIntensity, "averageIntensityWattsPerSquareMetre"],
  ] as const) {
    const computed = finiteDerived(value, label);
    if (!computed.ok) return computed;
  }

  const spectrumBand = spectrumBandForFrequency(input.frequencyHertz);
  return ok({
    angularFrequencyRadPerSecond: radiansPerSecond(angularFrequency),
    averageIntensityWattsPerSquareMetre: wattsPerSquareMetre(averageIntensity),
    electricFieldAmplitudeVoltsPerMetre: input.electricFieldAmplitudeVoltsPerMetre,
    interpretation:
      `Maxwell coupling predicts a transverse ${spectrumBand} wave: changing electric fields sustain magnetic fields and both travel at the medium wave speed.`,
    magneticFieldAmplitudeTesla: teslas(magneticFieldAmplitude),
    mediumImpedanceOhms: ohms(mediumImpedance),
    periodSeconds: seconds(period),
    spectrumBand,
    speedMetresPerSecond: metresPerSecond(speed),
    waveNumberRadPerMetre: radiansPerMetre(waveNumber),
    wavelengthMetres: metres(wavelength),
  });
};
