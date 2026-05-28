import {
  err,
  metres,
  metresPerSecond,
  metresPerSecondSquared,
  newtons,
  newtonsPerMetre,
  ok,
  type Brand,
  type Degrees,
  type KernelResult,
  type Metres,
  type MetresPerSecond,
  type MetresPerSecondSquared,
  type Newtons,
  type NewtonsPerMetre,
} from "@paideia/shared";

export const fluidMechanicsTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type KilogramsPerCubicMetre = Brand<number, "KilogramsPerCubicMetre">;
export type PascalSeconds = Brand<number, "PascalSeconds">;
export type Pascals = Brand<number, "Pascals">;
export type SquareMetres = Brand<number, "SquareMetres">;
export type CubicMetres = Brand<number, "CubicMetres">;
export type CubicMetresPerSecond = Brand<number, "CubicMetresPerSecond">;
export type MetresSquaredPerSecond = Brand<number, "MetresSquaredPerSecond">;
export type ReynoldsNumber = Brand<number, "ReynoldsNumber">;
export type PecletNumber = Brand<number, "PecletNumber">;
export type PascalsPerCubicMetrePerSecond = Brand<
  number,
  "PascalsPerCubicMetrePerSecond"
>;
export type PerSecond = Brand<number, "PerSecond">;
export type RelativeRoughness = Brand<number, "RelativeRoughness">;
export type DarcyFrictionFactor = Brand<number, "DarcyFrictionFactor">;
export type DragCoefficient = Brand<number, "DragCoefficient">;

export type ReynoldsRegime = "laminar" | "transition" | "turbulent";
export type PecletRegime = "diffusion-dominated" | "mixed" | "advection-dominated";

export const standardGravityMetresPerSecondSquared =
  metresPerSecondSquared(9.80665);

export interface ReynoldsNumberInput {
  readonly densityKilogramsPerCubicMetre: KilogramsPerCubicMetre;
  readonly velocityMetresPerSecond: MetresPerSecond;
  readonly characteristicLengthMetres: Metres;
  readonly dynamicViscosityPascalSeconds: PascalSeconds;
}

export interface HydrostaticPressureInput {
  readonly densityKilogramsPerCubicMetre: KilogramsPerCubicMetre;
  readonly depthMetres: Metres;
  readonly gravityMetresPerSecondSquared?: MetresPerSecondSquared;
}

export interface BuoyantForceInput {
  readonly fluidDensityKilogramsPerCubicMetre: KilogramsPerCubicMetre;
  readonly displacedVolumeCubicMetres: CubicMetres;
  readonly gravityMetresPerSecondSquared?: MetresPerSecondSquared;
}

export interface ContinuityVelocityInput {
  readonly volumetricFlowRateCubicMetresPerSecond: CubicMetresPerSecond;
  readonly areaSquareMetres: SquareMetres;
}

export interface BernoulliPressureInput {
  readonly densityKilogramsPerCubicMetre: KilogramsPerCubicMetre;
  readonly sourcePressurePascals: Pascals;
  readonly sourceVelocityMetresPerSecond: MetresPerSecond;
  readonly sourceElevationMetres: Metres;
  readonly targetVelocityMetresPerSecond: MetresPerSecond;
  readonly targetElevationMetres: Metres;
  readonly gravityMetresPerSecondSquared?: MetresPerSecondSquared;
}

export interface DarcyFrictionFactorInput {
  readonly reynoldsNumber: ReynoldsNumber;
  readonly relativeRoughness: RelativeRoughness;
}

export interface DarcyFrictionFactorResult {
  readonly frictionFactor: DarcyFrictionFactor;
  readonly regime: ReynoldsRegime;
  readonly method: "poiseuille" | "haaland";
}

export interface PipeHeadLossInput {
  readonly frictionFactor: DarcyFrictionFactor;
  readonly pipeLengthMetres: Metres;
  readonly pipeDiameterMetres: Metres;
  readonly velocityMetresPerSecond: MetresPerSecond;
  readonly gravityMetresPerSecondSquared?: MetresPerSecondSquared;
}

export interface DragForceInput {
  readonly densityKilogramsPerCubicMetre: KilogramsPerCubicMetre;
  readonly relativeVelocityMetresPerSecond: MetresPerSecond;
  readonly dragCoefficient: DragCoefficient;
  readonly referenceAreaSquareMetres: SquareMetres;
}

export interface PoiseuillePipeFlowInput {
  readonly pressureDropPascals: Pascals;
  readonly pipeRadiusMetres: Metres;
  readonly pipeLengthMetres: Metres;
  readonly dynamicViscosityPascalSeconds: PascalSeconds;
}

export interface PoiseuillePipeFlowResult {
  readonly volumetricFlowRateCubicMetresPerSecond: CubicMetresPerSecond;
  readonly meanVelocityMetresPerSecond: MetresPerSecond;
  readonly wallShearStressPascals: Pascals;
  readonly hydraulicResistancePascalsPerCubicMetrePerSecond: PascalsPerCubicMetrePerSecond;
}

export interface PlaneCouetteFlowInput {
  readonly movingPlateSpeedMetresPerSecond: MetresPerSecond;
  readonly gapHeightMetres: Metres;
  readonly positionAcrossGapMetres: Metres;
  readonly dynamicViscosityPascalSeconds: PascalSeconds;
}

export interface PlaneCouetteFlowResult {
  readonly localVelocityMetresPerSecond: MetresPerSecond;
  readonly shearRatePerSecond: PerSecond;
  readonly shearStressPascals: Pascals;
}

export interface StokesDragInput {
  readonly dynamicViscosityPascalSeconds: PascalSeconds;
  readonly sphereRadiusMetres: Metres;
  readonly relativeVelocityMetresPerSecond: MetresPerSecond;
}

export interface CapillaryRiseInput {
  readonly surfaceTensionNewtonsPerMetre: NewtonsPerMetre;
  readonly contactAngleDegrees: Degrees;
  readonly liquidDensityKilogramsPerCubicMetre: KilogramsPerCubicMetre;
  readonly tubeRadiusMetres: Metres;
  readonly gravityMetresPerSecondSquared?: MetresPerSecondSquared;
}

export interface PecletNumberInput {
  readonly velocityMetresPerSecond: MetresPerSecond;
  readonly characteristicLengthMetres: Metres;
  readonly diffusivityMetresSquaredPerSecond: MetresSquaredPerSecond;
}

export const kilogramsPerCubicMetre = (value: number): KilogramsPerCubicMetre =>
  value as KilogramsPerCubicMetre;
export const pascalSeconds = (value: number): PascalSeconds => value as PascalSeconds;
export const pascals = (value: number): Pascals => value as Pascals;
export const squareMetres = (value: number): SquareMetres => value as SquareMetres;
export const cubicMetres = (value: number): CubicMetres => value as CubicMetres;
export const cubicMetresPerSecond = (value: number): CubicMetresPerSecond =>
  value as CubicMetresPerSecond;
export const metresSquaredPerSecond = (value: number): MetresSquaredPerSecond =>
  value as MetresSquaredPerSecond;
export const surfaceTensionNewtonsPerMetre = (value: number): NewtonsPerMetre =>
  newtonsPerMetre(value);

const reynolds = (value: number): ReynoldsNumber => value as ReynoldsNumber;
const peclet = (value: number): PecletNumber => value as PecletNumber;
const darcyFriction = (value: number): DarcyFrictionFactor =>
  value as DarcyFrictionFactor;
const hydraulicResistance = (value: number): PascalsPerCubicMetrePerSecond =>
  value as PascalsPerCubicMetrePerSecond;
const perSecond = (value: number): PerSecond => value as PerSecond;

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteDerived = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite after computation; got ${value}`);

const nonNegative = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value >= 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be non-negative; got ${value}`);
};

const positive = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be positive; got ${value}`);
};

const inclusiveRange = (
  value: number,
  label: string,
  minimum: number,
  maximum: number,
): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value >= minimum && value <= maximum
    ? ok(undefined)
    : err("out-of-domain", `${label} must be between ${minimum} and ${maximum}; got ${value}`);
};

export const relativeRoughness = (value: number): KernelResult<RelativeRoughness> => {
  const valid = nonNegative(value, "relativeRoughness");
  if (!valid.ok) return valid;
  return value <= 0.2
    ? ok(value as RelativeRoughness)
    : err("out-of-domain", `relativeRoughness must be <= 0.2 for this kernel; got ${value}`);
};

export const dragCoefficient = (value: number): KernelResult<DragCoefficient> => {
  const valid = nonNegative(value, "dragCoefficient");
  if (!valid.ok) return valid;
  return ok(value as DragCoefficient);
};

export const reynoldsNumber = (
  input: ReynoldsNumberInput,
): KernelResult<ReynoldsNumber> => {
  const density = positive(input.densityKilogramsPerCubicMetre, "densityKilogramsPerCubicMetre");
  if (!density.ok) return density;
  const velocity = nonNegative(input.velocityMetresPerSecond, "velocityMetresPerSecond");
  if (!velocity.ok) return velocity;
  const length = positive(input.characteristicLengthMetres, "characteristicLengthMetres");
  if (!length.ok) return length;
  const viscosity = positive(input.dynamicViscosityPascalSeconds, "dynamicViscosityPascalSeconds");
  if (!viscosity.ok) return viscosity;

  const value =
    (input.densityKilogramsPerCubicMetre *
      input.velocityMetresPerSecond *
      input.characteristicLengthMetres) /
    input.dynamicViscosityPascalSeconds;
  const computed = finiteDerived(value, "reynoldsNumber");
  if (!computed.ok) return computed;
  return ok(reynolds(value));
};

export const classifyPipeFlow = (reynoldsNumber: ReynoldsNumber): ReynoldsRegime => {
  if (reynoldsNumber < 2_000) return "laminar";
  if (reynoldsNumber <= 4_000) return "transition";
  return "turbulent";
};

export const hydrostaticGaugePressure = (
  input: HydrostaticPressureInput,
): KernelResult<Pascals> => {
  const density = positive(input.densityKilogramsPerCubicMetre, "densityKilogramsPerCubicMetre");
  if (!density.ok) return density;
  const depth = nonNegative(input.depthMetres, "depthMetres");
  if (!depth.ok) return depth;
  const gravity = positive(
    input.gravityMetresPerSecondSquared ?? standardGravityMetresPerSecondSquared,
    "gravityMetresPerSecondSquared",
  );
  if (!gravity.ok) return gravity;

  const pressure =
    input.densityKilogramsPerCubicMetre *
    (input.gravityMetresPerSecondSquared ?? standardGravityMetresPerSecondSquared) *
    input.depthMetres;
  const computed = finiteDerived(pressure, "hydrostaticGaugePressurePascals");
  if (!computed.ok) return computed;
  return ok(pascals(pressure));
};

export const buoyantForce = (input: BuoyantForceInput): KernelResult<Newtons> => {
  const density = positive(
    input.fluidDensityKilogramsPerCubicMetre,
    "fluidDensityKilogramsPerCubicMetre",
  );
  if (!density.ok) return density;
  const volume = nonNegative(input.displacedVolumeCubicMetres, "displacedVolumeCubicMetres");
  if (!volume.ok) return volume;
  const gravity = positive(
    input.gravityMetresPerSecondSquared ?? standardGravityMetresPerSecondSquared,
    "gravityMetresPerSecondSquared",
  );
  if (!gravity.ok) return gravity;

  const force =
    input.fluidDensityKilogramsPerCubicMetre *
    (input.gravityMetresPerSecondSquared ?? standardGravityMetresPerSecondSquared) *
    input.displacedVolumeCubicMetres;
  const computed = finiteDerived(force, "buoyantForceNewtons");
  if (!computed.ok) return computed;
  return ok(newtons(force));
};

export const continuityVelocity = (
  input: ContinuityVelocityInput,
): KernelResult<MetresPerSecond> => {
  const flowRate = nonNegative(
    input.volumetricFlowRateCubicMetresPerSecond,
    "volumetricFlowRateCubicMetresPerSecond",
  );
  if (!flowRate.ok) return flowRate;
  const area = positive(input.areaSquareMetres, "areaSquareMetres");
  if (!area.ok) return area;
  const velocity = input.volumetricFlowRateCubicMetresPerSecond / input.areaSquareMetres;
  const computed = finiteDerived(velocity, "continuityVelocityMetresPerSecond");
  if (!computed.ok) return computed;
  return ok(metresPerSecond(velocity));
};

export const bernoulliPressureAtTarget = (
  input: BernoulliPressureInput,
): KernelResult<Pascals> => {
  const density = positive(input.densityKilogramsPerCubicMetre, "densityKilogramsPerCubicMetre");
  if (!density.ok) return density;
  const sourcePressure = nonNegative(input.sourcePressurePascals, "sourcePressurePascals");
  if (!sourcePressure.ok) return sourcePressure;
  const sourceVelocity = nonNegative(input.sourceVelocityMetresPerSecond, "sourceVelocityMetresPerSecond");
  if (!sourceVelocity.ok) return sourceVelocity;
  const targetVelocity = nonNegative(input.targetVelocityMetresPerSecond, "targetVelocityMetresPerSecond");
  if (!targetVelocity.ok) return targetVelocity;
  const sourceElevation = finite(input.sourceElevationMetres, "sourceElevationMetres");
  if (!sourceElevation.ok) return sourceElevation;
  const targetElevation = finite(input.targetElevationMetres, "targetElevationMetres");
  if (!targetElevation.ok) return targetElevation;
  const gravity = positive(
    input.gravityMetresPerSecondSquared ?? standardGravityMetresPerSecondSquared,
    "gravityMetresPerSecondSquared",
  );
  if (!gravity.ok) return gravity;

  const g = input.gravityMetresPerSecondSquared ?? standardGravityMetresPerSecondSquared;
  const pressure =
    input.sourcePressurePascals +
    0.5 *
      input.densityKilogramsPerCubicMetre *
      (input.sourceVelocityMetresPerSecond ** 2 -
        input.targetVelocityMetresPerSecond ** 2) +
    input.densityKilogramsPerCubicMetre *
      g *
      (input.sourceElevationMetres - input.targetElevationMetres);
  const computed = finiteDerived(pressure, "targetPressurePascals");
  if (!computed.ok) return computed;
  return pressure >= 0
    ? ok(pascals(pressure))
    : err("out-of-domain", `targetPressurePascals must be non-negative; got ${pressure}`);
};

export const darcyFrictionFactor = (
  input: DarcyFrictionFactorInput,
): KernelResult<DarcyFrictionFactorResult> => {
  const re = positive(input.reynoldsNumber, "reynoldsNumber");
  if (!re.ok) return re;
  const roughness = relativeRoughness(input.relativeRoughness);
  if (!roughness.ok) return roughness;

  const regime = classifyPipeFlow(input.reynoldsNumber);
  const value =
    regime === "laminar"
      ? 64 / input.reynoldsNumber
      : 1 /
        (-1.8 *
          Math.log10(
            (input.relativeRoughness / 3.7) ** 1.11 + 6.9 / input.reynoldsNumber,
          )) ** 2;
  const computed = finiteDerived(value, "darcyFrictionFactor");
  if (!computed.ok) return computed;
  return ok(Object.freeze({
    frictionFactor: darcyFriction(value),
    regime,
    method: regime === "laminar" ? "poiseuille" : "haaland",
  }));
};

export const pipeHeadLoss = (input: PipeHeadLossInput): KernelResult<Metres> => {
  const factor = positive(input.frictionFactor, "frictionFactor");
  if (!factor.ok) return factor;
  const length = positive(input.pipeLengthMetres, "pipeLengthMetres");
  if (!length.ok) return length;
  const diameter = positive(input.pipeDiameterMetres, "pipeDiameterMetres");
  if (!diameter.ok) return diameter;
  const velocity = nonNegative(input.velocityMetresPerSecond, "velocityMetresPerSecond");
  if (!velocity.ok) return velocity;
  const gravity = positive(
    input.gravityMetresPerSecondSquared ?? standardGravityMetresPerSecondSquared,
    "gravityMetresPerSecondSquared",
  );
  if (!gravity.ok) return gravity;

  const headLoss =
    input.frictionFactor *
    (input.pipeLengthMetres / input.pipeDiameterMetres) *
    (input.velocityMetresPerSecond ** 2 /
      (2 * (input.gravityMetresPerSecondSquared ?? standardGravityMetresPerSecondSquared)));
  const computed = finiteDerived(headLoss, "pipeHeadLossMetres");
  if (!computed.ok) return computed;
  return ok(metres(headLoss));
};

export const dragForce = (input: DragForceInput): KernelResult<Newtons> => {
  const density = positive(input.densityKilogramsPerCubicMetre, "densityKilogramsPerCubicMetre");
  if (!density.ok) return density;
  const velocity = nonNegative(
    input.relativeVelocityMetresPerSecond,
    "relativeVelocityMetresPerSecond",
  );
  if (!velocity.ok) return velocity;
  const coefficient = dragCoefficient(input.dragCoefficient);
  if (!coefficient.ok) return coefficient;
  const area = positive(input.referenceAreaSquareMetres, "referenceAreaSquareMetres");
  if (!area.ok) return area;

  const force =
    0.5 *
    input.densityKilogramsPerCubicMetre *
    input.relativeVelocityMetresPerSecond ** 2 *
    input.dragCoefficient *
    input.referenceAreaSquareMetres;
  const computed = finiteDerived(force, "dragForceNewtons");
  if (!computed.ok) return computed;
  return ok(newtons(force));
};

export const poiseuillePipeFlow = (
  input: PoiseuillePipeFlowInput,
): KernelResult<PoiseuillePipeFlowResult> => {
  const pressureDrop = nonNegative(input.pressureDropPascals, "pressureDropPascals");
  if (!pressureDrop.ok) return pressureDrop;
  const radius = positive(input.pipeRadiusMetres, "pipeRadiusMetres");
  if (!radius.ok) return radius;
  const length = positive(input.pipeLengthMetres, "pipeLengthMetres");
  if (!length.ok) return length;
  const viscosity = positive(input.dynamicViscosityPascalSeconds, "dynamicViscosityPascalSeconds");
  if (!viscosity.ok) return viscosity;

  const crossSectionArea = Math.PI * input.pipeRadiusMetres ** 2;
  const volumetricFlowRate =
    (Math.PI * input.pipeRadiusMetres ** 4 * input.pressureDropPascals) /
    (8 * input.dynamicViscosityPascalSeconds * input.pipeLengthMetres);
  const meanVelocity = volumetricFlowRate / crossSectionArea;
  const wallShearStress =
    (input.pressureDropPascals * input.pipeRadiusMetres) / (2 * input.pipeLengthMetres);
  const resistance =
    (8 * input.dynamicViscosityPascalSeconds * input.pipeLengthMetres) /
    (Math.PI * input.pipeRadiusMetres ** 4);

  for (const [value, label] of [
    [volumetricFlowRate, "volumetricFlowRateCubicMetresPerSecond"],
    [meanVelocity, "meanVelocityMetresPerSecond"],
    [wallShearStress, "wallShearStressPascals"],
    [resistance, "hydraulicResistancePascalsPerCubicMetrePerSecond"],
  ] as const) {
    const computed = finiteDerived(value, label);
    if (!computed.ok) return computed;
  }

  return ok(Object.freeze({
    volumetricFlowRateCubicMetresPerSecond: cubicMetresPerSecond(volumetricFlowRate),
    meanVelocityMetresPerSecond: metresPerSecond(meanVelocity),
    wallShearStressPascals: pascals(wallShearStress),
    hydraulicResistancePascalsPerCubicMetrePerSecond: hydraulicResistance(resistance),
  }));
};

export const planeCouetteFlow = (
  input: PlaneCouetteFlowInput,
): KernelResult<PlaneCouetteFlowResult> => {
  const speed = nonNegative(input.movingPlateSpeedMetresPerSecond, "movingPlateSpeedMetresPerSecond");
  if (!speed.ok) return speed;
  const gap = positive(input.gapHeightMetres, "gapHeightMetres");
  if (!gap.ok) return gap;
  const position = inclusiveRange(
    input.positionAcrossGapMetres,
    "positionAcrossGapMetres",
    0,
    input.gapHeightMetres,
  );
  if (!position.ok) return position;
  const viscosity = positive(input.dynamicViscosityPascalSeconds, "dynamicViscosityPascalSeconds");
  if (!viscosity.ok) return viscosity;

  const shearRate = input.movingPlateSpeedMetresPerSecond / input.gapHeightMetres;
  const localVelocity = shearRate * input.positionAcrossGapMetres;
  const shearStress = input.dynamicViscosityPascalSeconds * shearRate;

  for (const [value, label] of [
    [shearRate, "shearRatePerSecond"],
    [localVelocity, "localVelocityMetresPerSecond"],
    [shearStress, "shearStressPascals"],
  ] as const) {
    const computed = finiteDerived(value, label);
    if (!computed.ok) return computed;
  }

  return ok(Object.freeze({
    localVelocityMetresPerSecond: metresPerSecond(localVelocity),
    shearRatePerSecond: perSecond(shearRate),
    shearStressPascals: pascals(shearStress),
  }));
};

export const stokesDragForce = (input: StokesDragInput): KernelResult<Newtons> => {
  const viscosity = positive(input.dynamicViscosityPascalSeconds, "dynamicViscosityPascalSeconds");
  if (!viscosity.ok) return viscosity;
  const radius = positive(input.sphereRadiusMetres, "sphereRadiusMetres");
  if (!radius.ok) return radius;
  const velocity = nonNegative(
    input.relativeVelocityMetresPerSecond,
    "relativeVelocityMetresPerSecond",
  );
  if (!velocity.ok) return velocity;

  const force =
    6 *
    Math.PI *
    input.dynamicViscosityPascalSeconds *
    input.sphereRadiusMetres *
    input.relativeVelocityMetresPerSecond;
  const computed = finiteDerived(force, "stokesDragForceNewtons");
  if (!computed.ok) return computed;
  return ok(newtons(force));
};

export const capillaryRiseHeight = (input: CapillaryRiseInput): KernelResult<Metres> => {
  const surfaceTension = positive(
    input.surfaceTensionNewtonsPerMetre,
    "surfaceTensionNewtonsPerMetre",
  );
  if (!surfaceTension.ok) return surfaceTension;
  const angle = inclusiveRange(input.contactAngleDegrees, "contactAngleDegrees", 0, 180);
  if (!angle.ok) return angle;
  const density = positive(
    input.liquidDensityKilogramsPerCubicMetre,
    "liquidDensityKilogramsPerCubicMetre",
  );
  if (!density.ok) return density;
  const radius = positive(input.tubeRadiusMetres, "tubeRadiusMetres");
  if (!radius.ok) return radius;
  const gravity = positive(
    input.gravityMetresPerSecondSquared ?? standardGravityMetresPerSecondSquared,
    "gravityMetresPerSecondSquared",
  );
  if (!gravity.ok) return gravity;

  const contactAngleRadians = (input.contactAngleDegrees * Math.PI) / 180;
  const height =
    (2 * input.surfaceTensionNewtonsPerMetre * Math.cos(contactAngleRadians)) /
    (input.liquidDensityKilogramsPerCubicMetre *
      (input.gravityMetresPerSecondSquared ?? standardGravityMetresPerSecondSquared) *
      input.tubeRadiusMetres);
  const computed = finiteDerived(height, "capillaryRiseHeightMetres");
  if (!computed.ok) return computed;
  return ok(metres(height));
};

export const pecletNumber = (input: PecletNumberInput): KernelResult<PecletNumber> => {
  const velocity = nonNegative(input.velocityMetresPerSecond, "velocityMetresPerSecond");
  if (!velocity.ok) return velocity;
  const length = positive(input.characteristicLengthMetres, "characteristicLengthMetres");
  if (!length.ok) return length;
  const diffusivity = positive(
    input.diffusivityMetresSquaredPerSecond,
    "diffusivityMetresSquaredPerSecond",
  );
  if (!diffusivity.ok) return diffusivity;

  const value =
    (input.velocityMetresPerSecond * input.characteristicLengthMetres) /
    input.diffusivityMetresSquaredPerSecond;
  const computed = finiteDerived(value, "pecletNumber");
  if (!computed.ok) return computed;
  return ok(peclet(value));
};

export const classifyPecletTransport = (pecletNumber: PecletNumber): PecletRegime => {
  if (pecletNumber < 0.1) return "diffusion-dominated";
  if (pecletNumber <= 10) return "mixed";
  return "advection-dominated";
};
