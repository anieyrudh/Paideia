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
export const speedOfLightVacuumMetresPerSecond = 299_792_458;
export const vacuumImpedanceOhms = 376.730313668;

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
export type WebersPerSecond = Brand<number, "WebersPerSecond">;
export type SquareMetres = Brand<number, "SquareMetres">;
export type Ohms = Brand<number, "Ohms">;
export type Amps = Brand<number, "Amps">;
export type VoltsPerMetre = Brand<number, "VoltsPerMetre">;
export type RadiansPerMetre = Brand<number, "RadiansPerMetre">;
export type WattsPerSquareMetre = Brand<number, "WattsPerSquareMetre">;

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
export const volts = (value: number): Volts => value as Volts;
export const newtonsPerCoulomb = (value: number): NewtonsPerCoulomb =>
  value as NewtonsPerCoulomb;
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
