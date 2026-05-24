import {
  err,
  metres,
  newtons,
  ok,
  type Brand,
  type KernelResult,
  type Metres,
  type Newtons,
  type Radians,
} from "@paideia/shared";

export const structuralAnalysisTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type Pascals = Brand<number, "StructuralAnalysisPascals">;
export type SquareMetres = Brand<number, "StructuralAnalysisSquareMetres">;
export type CubicMetres = Brand<number, "StructuralAnalysisCubicMetres">;
export type MetresToFourthPower = Brand<number, "MetresToFourthPower">;
export type NewtonMetres = Brand<number, "NewtonMetres">;
export type DimensionlessStrain = Brand<number, "DimensionlessStrain">;
export type SafetyFactor = Brand<number, "SafetyFactor">;
export type EndConditionFactor = Brand<number, "EndConditionFactor">;

export interface AxialStressInput {
  readonly axialForceNewtons: Newtons;
  readonly areaSquareMetres: SquareMetres;
}

export interface StrainInput {
  readonly elongationMetres: Metres;
  readonly originalLengthMetres: Metres;
}

export interface YoungModulusInput {
  readonly stressPascals: Pascals;
  readonly strain: DimensionlessStrain;
}

export interface AxialElongationInput {
  readonly axialForceNewtons: Newtons;
  readonly lengthMetres: Metres;
  readonly areaSquareMetres: SquareMetres;
  readonly youngModulusPascals: Pascals;
}

export interface RectangularSectionInput {
  readonly widthMetres: Metres;
  readonly heightMetres: Metres;
}

export interface CircularSectionInput {
  readonly diameterMetres: Metres;
}

export interface SectionProperties {
  readonly areaSquareMetres: SquareMetres;
  readonly secondMomentAreaMetresToFourthPower: MetresToFourthPower;
  readonly sectionModulusCubicMetres: CubicMetres;
  readonly polarMomentMetresToFourthPower: MetresToFourthPower;
}

export interface BendingStressInput {
  readonly bendingMomentNewtonMetres: NewtonMetres;
  readonly distanceFromNeutralAxisMetres: Metres;
  readonly secondMomentAreaMetresToFourthPower: MetresToFourthPower;
}

export interface TorsionalShearStressInput {
  readonly torqueNewtonMetres: NewtonMetres;
  readonly radiusMetres: Metres;
  readonly polarMomentMetresToFourthPower: MetresToFourthPower;
}

export interface EulerBucklingInput {
  readonly youngModulusPascals: Pascals;
  readonly secondMomentAreaMetresToFourthPower: MetresToFourthPower;
  readonly effectiveLengthMetres: Metres;
  readonly endConditionFactor: EndConditionFactor;
}

export interface PlaneStressInput {
  readonly normalStressXPascals: Pascals;
  readonly normalStressYPascals: Pascals;
  readonly shearStressXYPascals: Pascals;
}

export interface PrincipalStressResult {
  readonly principalStress1Pascals: Pascals;
  readonly principalStress2Pascals: Pascals;
  readonly maxShearStressPascals: Pascals;
  readonly angleRadians: Radians;
}

export interface SafetyFactorInput {
  readonly allowableStressPascals: Pascals;
  readonly actualStressPascals: Pascals;
}

export const pascals = (value: number): Pascals => value as Pascals;
export const squareMetres = (value: number): SquareMetres => value as SquareMetres;
export const cubicMetres = (value: number): CubicMetres => value as CubicMetres;
export const metresToFourthPower = (value: number): MetresToFourthPower =>
  value as MetresToFourthPower;
export const newtonMetres = (value: number): NewtonMetres => value as NewtonMetres;
export const dimensionlessStrain = (value: number): DimensionlessStrain =>
  value as DimensionlessStrain;

const safetyFactorBrand = (value: number): SafetyFactor => value as SafetyFactor;
const radians = (value: number): Radians => value as Radians;

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteDerived = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite after computation; got ${value}`);

const positive = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be positive; got ${value}`);
};

const signedFinite = (value: number, label: string): KernelResult<void> => finite(value, label);

export const endConditionFactor = (value: number): KernelResult<EndConditionFactor> => {
  const valid = positive(value, "endConditionFactor");
  if (!valid.ok) return valid;
  return ok(value as EndConditionFactor);
};

const freezeSection = (
  area: number,
  secondMoment: number,
  sectionModulus: number,
  polarMoment: number,
): KernelResult<SectionProperties> => {
  const areaComputed = finiteDerived(area, "areaSquareMetres");
  if (!areaComputed.ok) return areaComputed;
  const secondComputed = finiteDerived(
    secondMoment,
    "secondMomentAreaMetresToFourthPower",
  );
  if (!secondComputed.ok) return secondComputed;
  const modulusComputed = finiteDerived(sectionModulus, "sectionModulusCubicMetres");
  if (!modulusComputed.ok) return modulusComputed;
  const polarComputed = finiteDerived(polarMoment, "polarMomentMetresToFourthPower");
  if (!polarComputed.ok) return polarComputed;

  return ok(Object.freeze({
    areaSquareMetres: squareMetres(area),
    secondMomentAreaMetresToFourthPower: metresToFourthPower(secondMoment),
    sectionModulusCubicMetres: cubicMetres(sectionModulus),
    polarMomentMetresToFourthPower: metresToFourthPower(polarMoment),
  }));
};

export const axialStress = (input: AxialStressInput): KernelResult<Pascals> => {
  const force = signedFinite(input.axialForceNewtons, "axialForceNewtons");
  if (!force.ok) return force;
  const area = positive(input.areaSquareMetres, "areaSquareMetres");
  if (!area.ok) return area;

  const stress = input.axialForceNewtons / input.areaSquareMetres;
  const computed = finiteDerived(stress, "axialStressPascals");
  if (!computed.ok) return computed;
  return ok(pascals(stress));
};

export const engineeringStrain = (
  input: StrainInput,
): KernelResult<DimensionlessStrain> => {
  const elongation = signedFinite(input.elongationMetres, "elongationMetres");
  if (!elongation.ok) return elongation;
  const length = positive(input.originalLengthMetres, "originalLengthMetres");
  if (!length.ok) return length;

  const strain = input.elongationMetres / input.originalLengthMetres;
  const computed = finiteDerived(strain, "engineeringStrain");
  if (!computed.ok) return computed;
  return ok(dimensionlessStrain(strain));
};

export const youngModulus = (input: YoungModulusInput): KernelResult<Pascals> => {
  const stress = signedFinite(input.stressPascals, "stressPascals");
  if (!stress.ok) return stress;
  const strainMagnitude = positive(Math.abs(input.strain), "absoluteStrain");
  if (!strainMagnitude.ok) return strainMagnitude;

  const modulus = input.stressPascals / input.strain;
  const computed = finiteDerived(modulus, "youngModulusPascals");
  if (!computed.ok) return computed;
  return modulus > 0
    ? ok(pascals(modulus))
    : err("out-of-domain", `youngModulusPascals must be positive; got ${modulus}`);
};

export const axialElongation = (
  input: AxialElongationInput,
): KernelResult<Metres> => {
  const force = signedFinite(input.axialForceNewtons, "axialForceNewtons");
  if (!force.ok) return force;
  const length = positive(input.lengthMetres, "lengthMetres");
  if (!length.ok) return length;
  const area = positive(input.areaSquareMetres, "areaSquareMetres");
  if (!area.ok) return area;
  const modulus = positive(input.youngModulusPascals, "youngModulusPascals");
  if (!modulus.ok) return modulus;

  const elongation =
    (input.axialForceNewtons * input.lengthMetres) /
    (input.areaSquareMetres * input.youngModulusPascals);
  const computed = finiteDerived(elongation, "axialElongationMetres");
  if (!computed.ok) return computed;
  return ok(metres(elongation));
};

export const rectangularSectionProperties = (
  input: RectangularSectionInput,
): KernelResult<SectionProperties> => {
  const width = positive(input.widthMetres, "widthMetres");
  if (!width.ok) return width;
  const height = positive(input.heightMetres, "heightMetres");
  if (!height.ok) return height;

  const area = input.widthMetres * input.heightMetres;
  const secondMoment = (input.widthMetres * input.heightMetres ** 3) / 12;
  const sectionModulus = secondMoment / (input.heightMetres / 2);
  const polarMoment =
    (input.widthMetres * input.heightMetres * (input.widthMetres ** 2 + input.heightMetres ** 2)) /
    12;
  return freezeSection(area, secondMoment, sectionModulus, polarMoment);
};

export const circularSectionProperties = (
  input: CircularSectionInput,
): KernelResult<SectionProperties> => {
  const diameter = positive(input.diameterMetres, "diameterMetres");
  if (!diameter.ok) return diameter;

  const area = (Math.PI * input.diameterMetres ** 2) / 4;
  const secondMoment = (Math.PI * input.diameterMetres ** 4) / 64;
  const sectionModulus = secondMoment / (input.diameterMetres / 2);
  const polarMoment = (Math.PI * input.diameterMetres ** 4) / 32;
  return freezeSection(area, secondMoment, sectionModulus, polarMoment);
};

export const bendingStress = (input: BendingStressInput): KernelResult<Pascals> => {
  const moment = signedFinite(input.bendingMomentNewtonMetres, "bendingMomentNewtonMetres");
  if (!moment.ok) return moment;
  const distance = signedFinite(
    input.distanceFromNeutralAxisMetres,
    "distanceFromNeutralAxisMetres",
  );
  if (!distance.ok) return distance;
  const secondMoment = positive(
    input.secondMomentAreaMetresToFourthPower,
    "secondMomentAreaMetresToFourthPower",
  );
  if (!secondMoment.ok) return secondMoment;

  const stress =
    (input.bendingMomentNewtonMetres * input.distanceFromNeutralAxisMetres) /
    input.secondMomentAreaMetresToFourthPower;
  const computed = finiteDerived(stress, "bendingStressPascals");
  if (!computed.ok) return computed;
  return ok(pascals(stress));
};

export const torsionalShearStress = (
  input: TorsionalShearStressInput,
): KernelResult<Pascals> => {
  const torque = signedFinite(input.torqueNewtonMetres, "torqueNewtonMetres");
  if (!torque.ok) return torque;
  const radius = positive(input.radiusMetres, "radiusMetres");
  if (!radius.ok) return radius;
  const polarMoment = positive(
    input.polarMomentMetresToFourthPower,
    "polarMomentMetresToFourthPower",
  );
  if (!polarMoment.ok) return polarMoment;

  const shear =
    (input.torqueNewtonMetres * input.radiusMetres) /
    input.polarMomentMetresToFourthPower;
  const computed = finiteDerived(shear, "torsionalShearStressPascals");
  if (!computed.ok) return computed;
  return ok(pascals(shear));
};

export const eulerBucklingLoad = (
  input: EulerBucklingInput,
): KernelResult<Newtons> => {
  const modulus = positive(input.youngModulusPascals, "youngModulusPascals");
  if (!modulus.ok) return modulus;
  const secondMoment = positive(
    input.secondMomentAreaMetresToFourthPower,
    "secondMomentAreaMetresToFourthPower",
  );
  if (!secondMoment.ok) return secondMoment;
  const length = positive(input.effectiveLengthMetres, "effectiveLengthMetres");
  if (!length.ok) return length;
  const endFactor = positive(input.endConditionFactor, "endConditionFactor");
  if (!endFactor.ok) return endFactor;

  const load =
    (Math.PI ** 2 * input.youngModulusPascals * input.secondMomentAreaMetresToFourthPower) /
    input.effectiveLengthMetres ** 2;
  const computed = finiteDerived(load, "eulerBucklingLoadNewtons");
  if (!computed.ok) return computed;
  return ok(newtons(load));
};

export const principalStresses2D = (
  input: PlaneStressInput,
): KernelResult<PrincipalStressResult> => {
  const sx = signedFinite(input.normalStressXPascals, "normalStressXPascals");
  if (!sx.ok) return sx;
  const sy = signedFinite(input.normalStressYPascals, "normalStressYPascals");
  if (!sy.ok) return sy;
  const txy = signedFinite(input.shearStressXYPascals, "shearStressXYPascals");
  if (!txy.ok) return txy;

  const average = (input.normalStressXPascals + input.normalStressYPascals) / 2;
  const halfDifference = (input.normalStressXPascals - input.normalStressYPascals) / 2;
  const radius = Math.sqrt(halfDifference ** 2 + input.shearStressXYPascals ** 2);
  const principal1 = average + radius;
  const principal2 = average - radius;
  const angle = 0.5 * Math.atan2(
    2 * input.shearStressXYPascals,
    input.normalStressXPascals - input.normalStressYPascals,
  );

  const p1 = finiteDerived(principal1, "principalStress1Pascals");
  if (!p1.ok) return p1;
  const p2 = finiteDerived(principal2, "principalStress2Pascals");
  if (!p2.ok) return p2;
  const shear = finiteDerived(radius, "maxShearStressPascals");
  if (!shear.ok) return shear;
  const theta = finiteDerived(angle, "principalStressAngleRadians");
  if (!theta.ok) return theta;

  return ok(Object.freeze({
    principalStress1Pascals: pascals(principal1),
    principalStress2Pascals: pascals(principal2),
    maxShearStressPascals: pascals(radius),
    angleRadians: radians(angle),
  }));
};

export const vonMisesPlaneStress = (
  input: PlaneStressInput,
): KernelResult<Pascals> => {
  const sx = signedFinite(input.normalStressXPascals, "normalStressXPascals");
  if (!sx.ok) return sx;
  const sy = signedFinite(input.normalStressYPascals, "normalStressYPascals");
  if (!sy.ok) return sy;
  const txy = signedFinite(input.shearStressXYPascals, "shearStressXYPascals");
  if (!txy.ok) return txy;

  const radicand =
    input.normalStressXPascals ** 2 -
    input.normalStressXPascals * input.normalStressYPascals +
    input.normalStressYPascals ** 2 +
    3 * input.shearStressXYPascals ** 2;
  const radicandValid = finiteDerived(radicand, "vonMisesRadicandPascalsSquared");
  if (!radicandValid.ok) return radicandValid;
  if (radicand < -structuralAnalysisTolerance.loose) {
    return err("numerical-instability", `vonMisesRadicandPascalsSquared was negative: ${radicand}`);
  }

  const stress = Math.sqrt(Math.max(0, radicand));
  const computed = finiteDerived(stress, "vonMisesPlaneStressPascals");
  if (!computed.ok) return computed;
  return ok(pascals(stress));
};

export const safetyFactor = (input: SafetyFactorInput): KernelResult<SafetyFactor> => {
  const allowable = positive(input.allowableStressPascals, "allowableStressPascals");
  if (!allowable.ok) return allowable;
  const actual = signedFinite(input.actualStressPascals, "actualStressPascals");
  if (!actual.ok) return actual;
  const actualMagnitude = positive(Math.abs(input.actualStressPascals), "absoluteActualStressPascals");
  if (!actualMagnitude.ok) return actualMagnitude;

  const factor = input.allowableStressPascals / Math.abs(input.actualStressPascals);
  const computed = finiteDerived(factor, "safetyFactor");
  if (!computed.ok) return computed;
  return ok(safetyFactorBrand(factor));
};
