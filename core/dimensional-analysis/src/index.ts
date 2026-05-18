import { err, ok, type KernelResult } from "@paideia/shared";

export type BaseDimension =
  | "mass"
  | "length"
  | "time"
  | "electricCurrent"
  | "temperature"
  | "amount"
  | "luminousIntensity";

export type DimensionExponents = Readonly<Record<BaseDimension, number>>;

export interface Dimension {
  readonly exponents: DimensionExponents;
}

export interface Unit {
  readonly symbol: string;
  readonly dimension: Dimension;
  readonly scale: number;
}

export interface DimensionDifference {
  readonly dimension: BaseDimension;
  readonly left: number;
  readonly right: number;
  readonly delta: number;
}

export interface EquationDiagnostic {
  readonly valid: boolean;
  readonly left: string;
  readonly right: string;
  readonly message: string;
  readonly differences: readonly DimensionDifference[];
}

export const dimensionalAnalysisTolerance = {
  default: 1e-12,
  zero: 1e-14,
} as const;

const dimensionKeys = [
  "mass",
  "length",
  "time",
  "electricCurrent",
  "temperature",
  "amount",
  "luminousIntensity",
] as const satisfies readonly BaseDimension[];

const dimensionSymbols: Readonly<Record<BaseDimension, string>> = {
  mass: "M",
  length: "L",
  time: "T",
  electricCurrent: "I",
  temperature: "Theta",
  amount: "N",
  luminousIntensity: "J",
};

const dimensionNames: Readonly<Record<BaseDimension, string>> = {
  mass: "mass",
  length: "length",
  time: "time",
  electricCurrent: "electric current",
  temperature: "temperature",
  amount: "amount of substance",
  luminousIntensity: "luminous intensity",
};

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);
const hasOwn = (source: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(source, key);

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object";

const cleanExponent = (value: number): number =>
  Math.abs(value) <= dimensionalAnalysisTolerance.zero ? 0 : value;

const finiteNumber = (value: unknown, label: string): KernelResult<number> =>
  typeof value === "number" && isFiniteNumber(value)
    ? ok(value)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const makeExponents = (
  source: unknown = {},
  options: { readonly requireAll: boolean },
): KernelResult<DimensionExponents> => {
  if (!isRecord(source)) {
    return err("precondition-violated", "Dimension exponents must be an object");
  }

  const exponents: Record<BaseDimension, number> = {
    mass: 0,
    length: 0,
    time: 0,
    electricCurrent: 0,
    temperature: 0,
    amount: 0,
    luminousIntensity: 0,
  };

  for (const key of dimensionKeys) {
    if (!hasOwn(source, key)) {
      if (options.requireAll) {
        return err(
          "precondition-violated",
          `Dimension is missing ${dimensionNames[key]} exponent`,
        );
      }
      continue;
    }

    const raw = source[key];
    if (typeof raw !== "number" || !isFiniteNumber(raw)) {
      return err(
        "precondition-violated",
        `${dimensionNames[key]} exponent must be finite; got ${raw}`,
      );
    }
    exponents[key] = cleanExponent(raw);
  }

  return ok(Object.freeze(exponents));
};

const makeDimension = (exponents: DimensionExponents): Dimension =>
  Object.freeze({ exponents: Object.freeze({ ...exponents }) });

const validateDimension = (input: unknown, label: string): KernelResult<Dimension> => {
  if (!isRecord(input) || !hasOwn(input, "exponents")) {
    return err("precondition-violated", `${label} must be a Dimension`);
  }

  const rebuilt = makeExponents(input.exponents, { requireAll: true });
  if (!rebuilt.ok) return rebuilt;
  return ok(makeDimension(rebuilt.value));
};

const makeUnit = (symbol: string, inputDimension: Dimension, scale: number): Unit =>
  Object.freeze({
    symbol,
    dimension: inputDimension,
    scale,
  });

const validateUnit = (input: unknown, label: string): KernelResult<Unit> => {
  if (!isRecord(input)) {
    return err("precondition-violated", `${label} must be a Unit`);
  }

  if (typeof input.symbol !== "string" || input.symbol.trim().length === 0) {
    return err("precondition-violated", `${label} symbol must be non-empty`);
  }

  const validScale = finiteNumber(input.scale, `${label} scale`);
  if (!validScale.ok) return validScale;
  if (validScale.value <= 0) {
    return err("precondition-violated", `${label} scale must be positive; got ${input.scale}`);
  }

  const validDimension = validateDimension(input.dimension, `${label} dimension`);
  if (!validDimension.ok) return validDimension;
  return ok(makeUnit(input.symbol.trim(), validDimension.value, validScale.value));
};

export const dimension = (
  exponents: Partial<Record<BaseDimension, number>> = {},
): KernelResult<Dimension> => {
  const built = makeExponents(exponents, { requireAll: false });
  return built.ok ? ok(makeDimension(built.value)) : built;
};

export const baseDimensions: Readonly<Record<BaseDimension, Dimension>> = {
  mass: makeDimension({ mass: 1, length: 0, time: 0, electricCurrent: 0, temperature: 0, amount: 0, luminousIntensity: 0 }),
  length: makeDimension({ mass: 0, length: 1, time: 0, electricCurrent: 0, temperature: 0, amount: 0, luminousIntensity: 0 }),
  time: makeDimension({ mass: 0, length: 0, time: 1, electricCurrent: 0, temperature: 0, amount: 0, luminousIntensity: 0 }),
  electricCurrent: makeDimension({ mass: 0, length: 0, time: 0, electricCurrent: 1, temperature: 0, amount: 0, luminousIntensity: 0 }),
  temperature: makeDimension({ mass: 0, length: 0, time: 0, electricCurrent: 0, temperature: 1, amount: 0, luminousIntensity: 0 }),
  amount: makeDimension({ mass: 0, length: 0, time: 0, electricCurrent: 0, temperature: 0, amount: 1, luminousIntensity: 0 }),
  luminousIntensity: makeDimension({ mass: 0, length: 0, time: 0, electricCurrent: 0, temperature: 0, amount: 0, luminousIntensity: 1 }),
};
Object.freeze(baseDimensions);

export const unit = (
  symbol: string,
  inputDimension: Dimension,
  scale = 1,
): KernelResult<Unit> => {
  const validScale = finiteNumber(scale, "Unit scale");
  if (!validScale.ok) return validScale;
  if (validScale.value <= 0) {
    return err("precondition-violated", `Unit scale must be positive; got ${scale}`);
  }

  if (symbol.trim().length === 0) {
    return err("precondition-violated", "Unit symbol must be non-empty");
  }

  const validDimension = validateDimension(inputDimension, "Unit dimension");
  if (!validDimension.ok) return validDimension;

  return ok(makeUnit(symbol.trim(), validDimension.value, scale));
};

const combineDimensions = (
  left: Dimension,
  right: Dimension,
  operation: (left: number, right: number) => number,
  label: string,
): KernelResult<Dimension> => {
  const validLeft = validateDimension(left, "left");
  if (!validLeft.ok) return validLeft;
  const validRight = validateDimension(right, "right");
  if (!validRight.ok) return validRight;

  const exponents: Partial<Record<BaseDimension, number>> = {};
  for (const key of dimensionKeys) {
    const value = operation(validLeft.value.exponents[key], validRight.value.exponents[key]);
    if (!isFiniteNumber(value)) {
      return err("numerical-instability", `${label} produced a non-finite ${dimensionNames[key]} exponent`);
    }
    exponents[key] = cleanExponent(value);
  }

  return dimension(exponents);
};

export const multiplyDimensions = (
  left: Dimension,
  right: Dimension,
): KernelResult<Dimension> => combineDimensions(left, right, (a, b) => a + b, "Dimension product");

export const divideDimensions = (
  left: Dimension,
  right: Dimension,
): KernelResult<Dimension> => combineDimensions(left, right, (a, b) => a - b, "Dimension quotient");

export const powerDimension = (
  input: Dimension,
  exponent: number,
): KernelResult<Dimension> => {
  const validInput = validateDimension(input, "input");
  if (!validInput.ok) return validInput;
  const validExponent = finiteNumber(exponent, "Dimension power exponent");
  if (!validExponent.ok) return validExponent;

  const exponents: Partial<Record<BaseDimension, number>> = {};
  for (const key of dimensionKeys) {
    const value = validInput.value.exponents[key] * exponent;
    if (!isFiniteNumber(value)) {
      return err("numerical-instability", `Dimension power produced a non-finite ${dimensionNames[key]} exponent`);
    }
    exponents[key] = cleanExponent(value);
  }

  return dimension(exponents);
};

const wrapUnitSymbol = (symbol: string): string =>
  symbol.includes(" ") ? `(${symbol})` : symbol;

const formatPowerSuffix = (exponent: number): string =>
  Number.isInteger(exponent) ? `${exponent}` : `${Number(exponent.toPrecision(8))}`;

export const multiplyUnits = (left: Unit, right: Unit): KernelResult<Unit> => {
  const validLeft = validateUnit(left, "left");
  if (!validLeft.ok) return validLeft;
  const validRight = validateUnit(right, "right");
  if (!validRight.ok) return validRight;
  const productDimension = multiplyDimensions(validLeft.value.dimension, validRight.value.dimension);
  if (!productDimension.ok) return productDimension;
  const scale = validLeft.value.scale * validRight.value.scale;
  if (!isFiniteNumber(scale)) {
    return err("numerical-instability", "Unit product scale is non-finite");
  }
  return unit(`${validLeft.value.symbol} ${validRight.value.symbol}`, productDimension.value, scale);
};

export const divideUnits = (left: Unit, right: Unit): KernelResult<Unit> => {
  const validLeft = validateUnit(left, "left");
  if (!validLeft.ok) return validLeft;
  const validRight = validateUnit(right, "right");
  if (!validRight.ok) return validRight;
  const quotientDimension = divideDimensions(validLeft.value.dimension, validRight.value.dimension);
  if (!quotientDimension.ok) return quotientDimension;
  const scale = validLeft.value.scale / validRight.value.scale;
  if (!isFiniteNumber(scale) || scale <= 0) {
    return err("numerical-instability", "Unit quotient scale is not positive and finite");
  }
  return unit(`${validLeft.value.symbol} ${wrapUnitSymbol(validRight.value.symbol)}^-1`, quotientDimension.value, scale);
};

export const powerUnit = (input: Unit, exponent: number): KernelResult<Unit> => {
  const validInput = validateUnit(input, "input");
  if (!validInput.ok) return validInput;
  const poweredDimension = powerDimension(validInput.value.dimension, exponent);
  if (!poweredDimension.ok) return poweredDimension;
  const scale = validInput.value.scale ** exponent;
  if (!isFiniteNumber(scale) || scale <= 0) {
    return err("numerical-instability", "Unit power scale is not positive and finite");
  }
  return unit(`${wrapUnitSymbol(validInput.value.symbol)}^${formatPowerSuffix(exponent)}`, poweredDimension.value, scale);
};

export const dimensionsEqual = (
  left: Dimension,
  right: Dimension,
): KernelResult<boolean> => {
  const diagnostic = diagnoseEquation(left, right);
  return diagnostic.ok ? ok(diagnostic.value.valid) : diagnostic;
};

export const compatibleDimensions = dimensionsEqual;

const dimensionDifferences = (
  left: Dimension,
  right: Dimension,
): KernelResult<readonly DimensionDifference[]> => {
  const validLeft = validateDimension(left, "left");
  if (!validLeft.ok) return validLeft;
  const validRight = validateDimension(right, "right");
  if (!validRight.ok) return validRight;

  const differences: DimensionDifference[] = [];
  for (const key of dimensionKeys) {
    const leftExponent = validLeft.value.exponents[key];
    const rightExponent = validRight.value.exponents[key];
    const delta = cleanExponent(leftExponent - rightExponent);
    if (Math.abs(delta) > dimensionalAnalysisTolerance.default) {
      differences.push({
        dimension: key,
        left: leftExponent,
        right: rightExponent,
        delta,
      });
    }
  }

  return ok(differences);
};

export const diagnoseEquation = (
  left: Dimension,
  right: Dimension,
  labels: { readonly left?: string; readonly right?: string } = {},
): KernelResult<EquationDiagnostic> => {
  const differences = dimensionDifferences(left, right);
  if (!differences.ok) return differences;
  const leftFormat = formatDimension(left);
  if (!leftFormat.ok) return leftFormat;
  const rightFormat = formatDimension(right);
  if (!rightFormat.ok) return rightFormat;

  const leftLabel = labels.left ?? "left side";
  const rightLabel = labels.right ?? "right side";
  const valid = differences.value.length === 0;

  if (valid) {
    return ok({
      valid: true,
      left: leftFormat.value,
      right: rightFormat.value,
      message: `${leftLabel} and ${rightLabel} are dimensionally compatible (${leftFormat.value}).`,
      differences: [],
    });
  }

  const mismatchList = differences.value
    .map((difference) => `${dimensionNames[difference.dimension]} ${difference.left} vs ${difference.right}`)
    .join("; ");

  return ok({
    valid: false,
    left: leftFormat.value,
    right: rightFormat.value,
    message: `${leftLabel} (${leftFormat.value}) is not dimensionally compatible with ${rightLabel} (${rightFormat.value}): ${mismatchList}.`,
    differences: differences.value,
  });
};

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? `${value}` : `${Number(value.toPrecision(8))}`;

export const formatDimension = (input: Dimension): KernelResult<string> => {
  const validInput = validateDimension(input, "input");
  if (!validInput.ok) return validInput;

  const factors = dimensionKeys.flatMap((key) => {
    const exponent = validInput.value.exponents[key];
    if (Math.abs(exponent) <= dimensionalAnalysisTolerance.zero) return [];
    const symbol = dimensionSymbols[key];
    return exponent === 1 ? [symbol] : [`${symbol}^${formatNumber(exponent)}`];
  });

  return ok(factors.length === 0 ? "1" : factors.join(" "));
};

export const formatUnit = (input: Unit): KernelResult<string> => {
  const validInput = validateUnit(input, "input");
  if (!validInput.ok) return validInput;
  return ok(validInput.value.symbol);
};
