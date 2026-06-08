import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type Pascals = Brand<number, "Materials.Pascals">;
export type DensityKgPerCubicMetre = Brand<
  number,
  "Materials.DensityKgPerCubicMetre"
>;
export type CostPerKg = Brand<number, "Materials.CostPerKg">;
export type EmbodiedCarbonKgCO2ePerKg = Brand<
  number,
  "Materials.EmbodiedCarbonKgCO2ePerKg"
>;
export type Strain = Brand<number, "Materials.Strain">;

export type MaterialClass =
  | "metal"
  | "polymer"
  | "ceramic"
  | "composite"
  | "semiconductor"
  | "biomaterial"
  | "other";

export type StressStrainRegime = "elastic" | "plastic" | "fracture" | "invalid";

export interface MaterialProperties {
  readonly id: string;
  readonly name: string;
  readonly class: MaterialClass;
  readonly density: DensityKgPerCubicMetre;
  readonly youngModulus: Pascals;
  readonly yieldStrength?: Pascals;
  readonly ultimateStrength: Pascals;
  readonly fractureStrain?: Strain;
  readonly cost?: CostPerKg;
  readonly embodiedCarbon?: EmbodiedCarbonKgCO2ePerKg;
}

export type ValidatedMaterial = MaterialProperties;

export interface StressStrainPoint {
  readonly strain: Strain;
  readonly stress: Pascals;
  readonly regime: StressStrainRegime;
  readonly tangentModulus: Pascals;
}

export type SafetyFactorMode = "yield" | "ultimate";

export interface SafetyFactorResult {
  readonly mode: SafetyFactorMode;
  readonly factor: number;
  readonly allowableStress: Pascals;
  readonly appliedStress: Pascals;
  readonly passes: boolean;
}

export type PerformanceGoal =
  | "specific-stiffness"
  | "specific-strength"
  | "stiffness-per-cost"
  | "strength-per-cost"
  | "low-carbon-stiffness"
  | "low-carbon-strength";

export interface MaterialScore {
  readonly material: ValidatedMaterial;
  readonly goal: PerformanceGoal;
  readonly score: number;
  readonly missing: readonly string[];
}

const materialClasses: readonly MaterialClass[] = [
  "metal",
  "polymer",
  "ceramic",
  "composite",
  "semiconductor",
  "biomaterial",
  "other",
];

const performanceGoals: readonly PerformanceGoal[] = [
  "specific-stiffness",
  "specific-strength",
  "stiffness-per-cost",
  "strength-per-cost",
  "low-carbon-stiffness",
  "low-carbon-strength",
];

export const pascals = (value: number): KernelResult<Pascals> =>
  positiveFinite(value, "pascals").ok
    ? ok(value as Pascals)
    : err("out-of-domain", `pascals must be finite and positive, got ${value}`);

export const densityKgPerCubicMetre = (
  value: number,
): KernelResult<DensityKgPerCubicMetre> =>
  positiveFinite(value, "density").ok
    ? ok(value as DensityKgPerCubicMetre)
    : err("out-of-domain", `density must be finite and positive, got ${value}`);

export const costPerKg = (value: number): KernelResult<CostPerKg> =>
  positiveFinite(value, "cost").ok
    ? ok(value as CostPerKg)
    : err("out-of-domain", `cost must be finite and positive, got ${value}`);

export const embodiedCarbonKgCO2ePerKg = (
  value: number,
): KernelResult<EmbodiedCarbonKgCO2ePerKg> =>
  positiveFinite(value, "embodiedCarbon").ok
    ? ok(value as EmbodiedCarbonKgCO2ePerKg)
    : err(
        "out-of-domain",
        `embodiedCarbon must be finite and positive, got ${value}`,
      );

export const strain = (value: number): KernelResult<Strain> => {
  if (!Number.isFinite(value) || value < 0) {
    return err(
      "out-of-domain",
      `strain must be finite and non-negative, got ${value}`,
    );
  }
  return ok(value as Strain);
};

export const validateMaterial = (
  material: MaterialProperties,
): KernelResult<ValidatedMaterial> => {
  if (material.id.trim().length === 0) {
    return err("precondition-violated", "material id must be non-empty");
  }
  if (material.name.trim().length === 0) {
    return err("precondition-violated", "material name must be non-empty");
  }
  if (!materialClasses.includes(material.class)) {
    return err(
      "precondition-violated",
      `unsupported material class ${String(material.class)}`,
    );
  }

  const required = [
    ["density", material.density],
    ["youngModulus", material.youngModulus],
    ["ultimateStrength", material.ultimateStrength],
  ] as const;
  for (const [label, value] of required) {
    const valid = positiveFinite(value, label);
    if (!valid.ok) {
      return valid;
    }
  }

  if (material.yieldStrength !== undefined) {
    const valid = positiveFinite(material.yieldStrength, "yieldStrength");
    if (!valid.ok) {
      return valid;
    }
    if (material.yieldStrength > material.ultimateStrength) {
      return err(
        "precondition-violated",
        "yieldStrength must not exceed ultimateStrength",
      );
    }
  }

  if (material.fractureStrain !== undefined) {
    const valid = positiveFinite(material.fractureStrain, "fractureStrain");
    if (!valid.ok) {
      return valid;
    }
    if (material.yieldStrength !== undefined) {
      const yieldAt = material.yieldStrength / material.youngModulus;
      if (material.fractureStrain <= yieldAt) {
        return err(
          "precondition-violated",
          "fractureStrain must be greater than yield strain",
        );
      }
    }
  }

  if (material.cost !== undefined) {
    const valid = positiveFinite(material.cost, "cost");
    if (!valid.ok) {
      return valid;
    }
  }

  if (material.embodiedCarbon !== undefined) {
    const valid = positiveFinite(material.embodiedCarbon, "embodiedCarbon");
    if (!valid.ok) {
      return valid;
    }
  }

  return ok({ ...material });
};

export const yieldStrain = (
  material: MaterialProperties,
): KernelResult<Strain | null> => {
  const valid = validateMaterial(material);
  if (!valid.ok) {
    return valid;
  }
  if (valid.value.yieldStrength === undefined) {
    return ok(null);
  }
  return ok((valid.value.yieldStrength / valid.value.youngModulus) as Strain);
};

export const stressAtStrain = (
  material: MaterialProperties,
  inputStrain: Strain,
): KernelResult<StressStrainPoint> => {
  const valid = validateMaterial(material);
  if (!valid.ok) {
    return valid;
  }
  const parsedStrain = strain(inputStrain);
  if (!parsedStrain.ok) {
    return parsedStrain;
  }

  const yieldPoint = yieldStrain(valid.value);
  if (!yieldPoint.ok) {
    return yieldPoint;
  }

  if (yieldPoint.value === null) {
    const fracture = valid.value.fractureStrain ?? brittleFractureStrain(valid.value);
    if (parsedStrain.value >= fracture) {
      return ok(point(parsedStrain.value, valid.value.ultimateStrength, "fracture", 0));
    }
    return ok(
      point(
        parsedStrain.value,
        (valid.value.youngModulus * parsedStrain.value) as Pascals,
        "elastic",
        valid.value.youngModulus,
      ),
    );
  }

  if (parsedStrain.value <= yieldPoint.value) {
    return ok(
      point(
        parsedStrain.value,
        (valid.value.youngModulus * parsedStrain.value) as Pascals,
        "elastic",
        valid.value.youngModulus,
      ),
    );
  }

  const fracture = valid.value.fractureStrain;
  if (fracture === undefined) {
    return err(
      "precondition-violated",
      "stressAtStrain above yield requires fractureStrain for ductile materials",
    );
  }
  if (parsedStrain.value >= fracture) {
    return ok(point(parsedStrain.value, valid.value.ultimateStrength, "fracture", 0));
  }

  const hardening = hardeningModulus(valid.value, yieldPoint.value, fracture);
  const stress =
    valid.value.yieldStrength === undefined
      ? valid.value.ultimateStrength
      : ((valid.value.yieldStrength +
          hardening * (parsedStrain.value - yieldPoint.value)) as Pascals);
  return ok(point(parsedStrain.value, stress, "plastic", hardening as Pascals));
};

export const safetyFactor = (
  material: MaterialProperties,
  appliedStress: Pascals,
  mode: SafetyFactorMode = "yield",
): KernelResult<SafetyFactorResult> => {
  const valid = validateMaterial(material);
  if (!valid.ok) {
    return valid;
  }
  const stress = pascals(appliedStress);
  if (!stress.ok) {
    return stress;
  }
  if (mode !== "yield" && mode !== "ultimate") {
    return err("precondition-violated", `unsupported safety factor mode ${String(mode)}`);
  }
  const allowable =
    mode === "yield" ? valid.value.yieldStrength : valid.value.ultimateStrength;
  if (allowable === undefined) {
    return err(
      "precondition-violated",
      "yield safety factor requires yieldStrength",
    );
  }
  const factor = allowable / stress.value;
  return ok({
    mode,
    factor,
    allowableStress: allowable,
    appliedStress: stress.value,
    passes: factor >= 1,
  });
};

export const performanceIndex = (
  material: MaterialProperties,
  goal: PerformanceGoal,
): KernelResult<MaterialScore> => {
  const valid = validateMaterial(material);
  if (!valid.ok) {
    return valid;
  }
  if (!isPerformanceGoal(goal)) {
    return err(
      "precondition-violated",
      `unsupported performance goal ${String(goal)}`,
    );
  }

  const missing = missingForGoal(valid.value, goal);
  if (missing.length > 0) {
    return ok({ material: valid.value, goal, score: 0, missing });
  }

  const score = scoreForGoal(valid.value, goal);
  if (!Number.isFinite(score) || score <= 0) {
    return err("precondition-violated", `invalid performance score for ${goal}`);
  }
  return ok({ material: valid.value, goal, score, missing: [] });
};

export const rankMaterials = (
  materials: readonly MaterialProperties[],
  goal: PerformanceGoal,
): KernelResult<readonly MaterialScore[]> => {
  const scores: MaterialScore[] = [];
  for (const material of materials) {
    const score = performanceIndex(material, goal);
    if (!score.ok) {
      return score;
    }
    scores.push(score.value);
  }
  return ok(
    scores.sort((a, b) => {
      const missingDelta = a.missing.length - b.missing.length;
      if (missingDelta !== 0) {
        return missingDelta;
      }
      const scoreDelta = b.score - a.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return compareAscii(a.material.id, b.material.id);
    }),
  );
};

const positiveFinite = (
  value: number,
  label: string,
): KernelResult<number> => {
  if (!Number.isFinite(value) || value <= 0) {
    return err("out-of-domain", `${label} must be finite and positive, got ${value}`);
  }
  return ok(value);
};

const brittleFractureStrain = (material: ValidatedMaterial): Strain =>
  (material.ultimateStrength / material.youngModulus) as Strain;

const hardeningModulus = (
  material: ValidatedMaterial,
  yieldAt: Strain,
  fractureAt: Strain,
): number => {
  if (material.yieldStrength === undefined || fractureAt <= yieldAt) {
    return 0;
  }
  return (material.ultimateStrength - material.yieldStrength) / (fractureAt - yieldAt);
};

const point = (
  inputStrain: Strain,
  stress: Pascals,
  regime: StressStrainRegime,
  tangentModulus: number,
): StressStrainPoint => ({
  strain: inputStrain,
  stress,
  regime,
  tangentModulus: tangentModulus as Pascals,
});

const missingForGoal = (
  material: ValidatedMaterial,
  goal: PerformanceGoal,
): readonly string[] => {
  switch (goal) {
    case "specific-stiffness":
      return [];
    case "specific-strength":
      return material.yieldStrength === undefined ? ["yieldStrength"] : [];
    case "stiffness-per-cost":
      return material.cost === undefined ? ["cost"] : [];
    case "strength-per-cost":
      return [
        ...(material.yieldStrength === undefined ? ["yieldStrength"] : []),
        ...(material.cost === undefined ? ["cost"] : []),
      ];
    case "low-carbon-stiffness":
      return material.embodiedCarbon === undefined ? ["embodiedCarbon"] : [];
    case "low-carbon-strength":
      return [
        ...(material.yieldStrength === undefined ? ["yieldStrength"] : []),
        ...(material.embodiedCarbon === undefined ? ["embodiedCarbon"] : []),
      ];
    default:
      return [];
  }
};

const scoreForGoal = (
  material: ValidatedMaterial,
  goal: PerformanceGoal,
): number => {
  switch (goal) {
    case "specific-stiffness":
      return material.youngModulus / material.density;
    case "specific-strength":
      return (material.yieldStrength ?? 0) / material.density;
    case "stiffness-per-cost":
      return material.youngModulus / (material.density * (material.cost ?? 1));
    case "strength-per-cost":
      return (material.yieldStrength ?? 0) / (material.density * (material.cost ?? 1));
    case "low-carbon-stiffness":
      return material.youngModulus / (material.density * (material.embodiedCarbon ?? 1));
    case "low-carbon-strength":
      return (
        (material.yieldStrength ?? 0) /
        (material.density * (material.embodiedCarbon ?? 1))
      );
    default:
      return Number.NaN;
  }
};

const isPerformanceGoal = (goal: PerformanceGoal): boolean =>
  performanceGoals.includes(goal);

const compareAscii = (left: string, right: string): number => {
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const leftCode = left.charCodeAt(index);
    const rightCode = right.charCodeAt(index);
    if (Number.isNaN(leftCode)) {
      return Number.isNaN(rightCode) ? 0 : -1;
    }
    if (Number.isNaN(rightCode)) {
      return 1;
    }
    if (leftCode !== rightCode) {
      return leftCode - rightCode;
    }
  }
  return 0;
};
