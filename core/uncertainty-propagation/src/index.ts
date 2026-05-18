import { approxEqual, err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type UncertaintyQuantity = Brand<number, string>;
export type DimensionlessQuantity = Brand<number, "DimensionlessQuantity">;

export const dimensionless = (value: number): DimensionlessQuantity =>
  value as DimensionlessQuantity;

export interface MeasuredValue<TUnit extends UncertaintyQuantity = UncertaintyQuantity> {
  readonly value: TUnit;
  readonly absoluteUncertainty: TUnit;
  readonly label?: string;
  readonly unit?: string;
}

export interface UncertaintyStep {
  readonly label: string;
  readonly expression: string;
  readonly result: string;
}

export interface UncertaintyPropagation<
  TValue extends number = UncertaintyQuantity,
  TAbsolute extends number = TValue,
> {
  readonly value: TValue;
  readonly absoluteUncertainty: TAbsolute;
  readonly relativeUncertainty: DimensionlessQuantity;
  readonly percentageUncertainty: DimensionlessQuantity;
  readonly steps: readonly UncertaintyStep[];
}

export interface UncertaintySource<TUnit extends UncertaintyQuantity = UncertaintyQuantity> {
  readonly kind: "repeated-readings" | "instrument-resolution" | "manual";
  readonly absoluteUncertainty: TUnit;
  readonly label: string;
  readonly steps: readonly UncertaintyStep[];
}

export interface PropagationTerm<TUnit extends UncertaintyQuantity = UncertaintyQuantity> {
  readonly measurement: MeasuredValue<TUnit>;
  readonly operation?: "add" | "subtract";
}

export interface PropagationFactor<TUnit extends UncertaintyQuantity = UncertaintyQuantity> {
  readonly measurement: MeasuredValue<TUnit>;
  readonly operation?: "multiply" | "divide";
}

export type InstrumentResolutionRule = "half-resolution" | "full-resolution";

export const uncertaintyTolerance = {
  default: 1e-10,
  tight: 1e-12,
  loose: 1e-8,
} as const;

const finite = (value: number, label: string): KernelResult<number> =>
  Number.isFinite(value)
    ? ok(value)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteOutput = (value: number, label: string): KernelResult<number> =>
  Number.isFinite(value)
    ? ok(value)
    : err("numerical-instability", `${label} overflowed to a non-finite value`);

const nonNegative = (value: number, label: string): KernelResult<number> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value >= 0
    ? ok(value)
    : err("out-of-domain", `${label} must be non-negative; got ${value}`);
};

const positive = (value: number, label: string): KernelResult<number> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value > 0
    ? ok(value)
    : err("out-of-domain", `${label} must be positive; got ${value}`);
};

const addSubtractOperation = (
  operation: PropagationTerm["operation"],
): KernelResult<"add" | "subtract"> => {
  if (operation === undefined) return ok("add");
  return operation === "add" || operation === "subtract"
    ? ok(operation)
    : err("precondition-violated", `Unknown add/subtract operation: ${operation as string}`);
};

const multiplyDivideOperation = (
  operation: PropagationFactor["operation"],
): KernelResult<"multiply" | "divide"> => {
  if (operation === undefined) return ok("multiply");
  return operation === "multiply" || operation === "divide"
    ? ok(operation)
    : err("precondition-violated", `Unknown multiply/divide operation: ${operation as string}`);
};

const instrumentRule = (
  rule: InstrumentResolutionRule | undefined,
): KernelResult<InstrumentResolutionRule> => {
  if (rule === undefined) return ok("half-resolution");
  return rule === "half-resolution" || rule === "full-resolution"
    ? ok(rule)
    : err("precondition-violated", `Unknown instrument resolution rule: ${rule as string}`);
};

const validateMeasurement = <TUnit extends UncertaintyQuantity>(
  measurement: MeasuredValue<TUnit>,
  label = measurement.label ?? "measurement",
): KernelResult<MeasuredValue<TUnit>> => {
  const validValue = finite(measurement.value, `${label} value`);
  if (!validValue.ok) return validValue;
  const validUncertainty = nonNegative(
    measurement.absoluteUncertainty,
    `${label} absolute uncertainty`,
  );
  if (!validUncertainty.ok) return validUncertainty;

  return ok(measurement);
};

const displayLabel = (measurement: MeasuredValue, fallback: string): string =>
  measurement.label ?? fallback;

const numberText = (value: number, places = 4): string => {
  if (Object.is(value, -0)) return "0";
  const rounded = Number(value.toFixed(places));
  return rounded.toString();
};

const valueWithUnit = (value: number, unit: string | undefined, places = 4): string =>
  unit === undefined ? numberText(value, places) : `${numberText(value, places)} ${unit}`;

const toPropagation = <
  TValue extends number = number,
  TAbsolute extends number = TValue,
>(
  value: number,
  absolute: number,
  steps: readonly UncertaintyStep[],
): KernelResult<UncertaintyPropagation<TValue, TAbsolute>> => {
  const validValue = finiteOutput(value, "Propagated value");
  if (!validValue.ok) return validValue;
  const validAbsolute = finiteOutput(absolute, "Propagated absolute uncertainty");
  if (!validAbsolute.ok) return validAbsolute;
  if (absolute < 0) {
    return err("out-of-domain", "Propagated absolute uncertainty must be non-negative");
  }
  if (approxEqual(value, 0, uncertaintyTolerance.default)) {
    if (absolute === 0) {
      return ok({
        value: value as TValue,
        absoluteUncertainty: absolute as TAbsolute,
        relativeUncertainty: dimensionless(0),
        percentageUncertainty: dimensionless(0),
        steps,
      });
    }
    return err(
      "out-of-domain",
      "Relative uncertainty is undefined for a zero propagated value",
    );
  }

  const relative = absolute / Math.abs(value);
  const validRelative = finiteOutput(relative, "Propagated relative uncertainty");
  if (!validRelative.ok) return validRelative;
  const percentage = relative * 100;
  const validPercentage = finiteOutput(percentage, "Propagated percentage uncertainty");
  if (!validPercentage.ok) return validPercentage;

  return ok({
    value: value as TValue,
    absoluteUncertainty: absolute as TAbsolute,
    relativeUncertainty: dimensionless(relative),
    percentageUncertainty: dimensionless(percentage),
    steps,
  });
};

export const measuredValue = <TUnit extends UncertaintyQuantity>(
  value: TUnit,
  absoluteUncertaintyValue: TUnit,
  opts: { readonly label?: string; readonly unit?: string } = {},
): KernelResult<MeasuredValue<TUnit>> => {
  const candidate: MeasuredValue<TUnit> = {
    value,
    absoluteUncertainty: absoluteUncertaintyValue,
    ...(opts.label !== undefined && { label: opts.label }),
    ...(opts.unit !== undefined && { unit: opts.unit }),
  };
  return validateMeasurement(candidate);
};

export const absoluteUncertainty = <TUnit extends UncertaintyQuantity>(
  measurement: MeasuredValue<TUnit>,
): KernelResult<TUnit> => {
  const valid = validateMeasurement(measurement);
  return valid.ok ? ok(valid.value.absoluteUncertainty) : valid;
};

export const relativeUncertainty = <TUnit extends UncertaintyQuantity>(
  measurement: MeasuredValue<TUnit>,
): KernelResult<DimensionlessQuantity> => {
  const valid = validateMeasurement(measurement);
  if (!valid.ok) return valid;
  if (measurement.value === 0) {
    return err("out-of-domain", "Relative uncertainty is undefined for a zero measured value");
  }
  const relative = measurement.absoluteUncertainty / Math.abs(measurement.value);
  const validRelative = finiteOutput(relative, "Relative uncertainty");
  return validRelative.ok ? ok(dimensionless(validRelative.value)) : validRelative;
};

export const percentageUncertainty = <TUnit extends UncertaintyQuantity>(
  measurement: MeasuredValue<TUnit>,
): KernelResult<DimensionlessQuantity> => {
  const relative = relativeUncertainty(measurement);
  if (!relative.ok) return relative;
  const percentage = finiteOutput(relative.value * 100, "Percentage uncertainty");
  return percentage.ok ? ok(dimensionless(percentage.value)) : percentage;
};

export const addSubtractAbsoluteUncertainty = <TUnit extends UncertaintyQuantity>(
  terms: readonly PropagationTerm<TUnit>[],
): KernelResult<UncertaintyPropagation<TUnit>> => {
  if (terms.length === 0) {
    return err("precondition-violated", "Add/subtract propagation requires at least one term");
  }

  let value = 0;
  let absolute = 0;
  const valuePieces: string[] = [];
  const uncertaintyPieces: string[] = [];

  for (let index = 0; index < terms.length; index += 1) {
    const term = terms[index];
    if (term === undefined) {
      return err("precondition-violated", "Add/subtract propagation received a sparse term array");
    }
    const measurement = term.measurement;
    const valid = validateMeasurement(measurement, displayLabel(measurement, `term ${index + 1}`));
    if (!valid.ok) return valid;

    const operationResult = addSubtractOperation(term.operation);
    if (!operationResult.ok) return operationResult;
    const operation = operationResult.value;
    const sign = operation === "subtract" ? -1 : 1;
    value += sign * measurement.value;
    absolute += measurement.absoluteUncertainty;

    const label = displayLabel(measurement, `x${index + 1}`);
    const prefix = index === 0 ? operation === "subtract" ? "-" : "" : operation === "subtract" ? " - " : " + ";
    valuePieces.push(`${prefix}${label}`);
    uncertaintyPieces.push(`Δ${label}`);

    const finiteValue = finiteOutput(value, "Add/subtract propagated value");
    if (!finiteValue.ok) return finiteValue;
    const finiteAbsolute = finiteOutput(absolute, "Add/subtract propagated uncertainty");
    if (!finiteAbsolute.ok) return finiteAbsolute;
  }

  return toPropagation<TUnit>(value, absolute, [
    {
      label: "value",
      expression: valuePieces.join(""),
      result: numberText(value),
    },
    {
      label: "absolute uncertainty",
      expression: uncertaintyPieces.join(" + "),
      result: `±${numberText(absolute)}`,
    },
    {
      label: "rule",
      expression: "For addition or subtraction, absolute uncertainties add.",
      result: `Δresult = ${numberText(absolute)}`,
    },
  ]);
};

export const multiplyDivideRelativeUncertainty = (
  factors: readonly PropagationFactor[],
): KernelResult<UncertaintyPropagation<number, number>> => {
  if (factors.length === 0) {
    return err("precondition-violated", "Multiply/divide propagation requires at least one factor");
  }

  let value = 1;
  let relativeTotal = 0;
  const valuePieces: string[] = [];
  const relativePieces: string[] = [];

  for (let index = 0; index < factors.length; index += 1) {
    const factor = factors[index];
    if (factor === undefined) {
      return err("precondition-violated", "Multiply/divide propagation received a sparse factor array");
    }
    const measurement = factor.measurement;
    const label = displayLabel(measurement, `x${index + 1}`);
    const valid = validateMeasurement(measurement, label);
    if (!valid.ok) return valid;
    const operationResult = multiplyDivideOperation(factor.operation);
    if (!operationResult.ok) return operationResult;
    const operation = operationResult.value;
    if (operation === "divide" && measurement.value === 0) {
      return err("out-of-domain", `${label} cannot be zero in a denominator`);
    }
    const relative = relativeUncertainty(measurement);
    if (!relative.ok) return relative;
    value = operation === "divide" ? value / measurement.value : value * measurement.value;
    relativeTotal += relative.value;

    const prefix = index === 0 ? operation === "divide" ? "1 ÷ " : "" : operation === "divide" ? " ÷ " : " × ";
    valuePieces.push(`${prefix}${label}`);
    relativePieces.push(`Δ${label}/|${label}|`);

    const finiteValue = finiteOutput(value, "Multiply/divide propagated value");
    if (!finiteValue.ok) return finiteValue;
    const finiteRelative = finiteOutput(relativeTotal, "Multiply/divide relative uncertainty");
    if (!finiteRelative.ok) return finiteRelative;
  }

  const absolute = Math.abs(value) * relativeTotal;
  return toPropagation(value, absolute, [
    {
      label: "value",
      expression: valuePieces.join(""),
      result: numberText(value),
    },
    {
      label: "relative uncertainty",
      expression: relativePieces.join(" + "),
      result: numberText(relativeTotal),
    },
    {
      label: "percentage uncertainty",
      expression: "relative uncertainty × 100%",
      result: `${numberText(relativeTotal * 100)}%`,
    },
    {
      label: "absolute uncertainty",
      expression: "|value| × relative uncertainty",
      result: `±${numberText(absolute)}`,
    },
  ]);
};

export const powerUncertainty = (
  measurement: MeasuredValue,
  exponent: DimensionlessQuantity,
): KernelResult<UncertaintyPropagation<number, number>> => {
  const label = displayLabel(measurement, "x");
  const valid = validateMeasurement(measurement, label);
  if (!valid.ok) return valid;
  const validExponent = finite(exponent, "exponent");
  if (!validExponent.ok) return validExponent;

  const value = measurement.value ** exponent;
  const validValue = finiteOutput(value, "Power propagated value");
  if (!validValue.ok) return validValue;
  if (exponent === 0) {
    return toPropagation(value, 0, [
      {
        label: "value",
        expression: `${label}^0`,
        result: "1",
      },
      {
        label: "relative uncertainty",
        expression: "|0| × Δx/|x|",
        result: "0",
      },
    ]);
  }

  const relative = relativeUncertainty(measurement);
  if (!relative.ok) return relative;
  const propagatedRelative = Math.abs(exponent) * relative.value;
  const validRelative = finiteOutput(propagatedRelative, "Power relative uncertainty");
  if (!validRelative.ok) return validRelative;
  const absolute = Math.abs(value) * propagatedRelative;

  return toPropagation(value, absolute, [
    {
      label: "value",
      expression: `${label}^${numberText(exponent)}`,
      result: numberText(value),
    },
    {
      label: "relative uncertainty",
      expression: `|${numberText(exponent)}| × Δ${label}/|${label}|`,
      result: numberText(propagatedRelative),
    },
    {
      label: "absolute uncertainty",
      expression: "|value| × relative uncertainty",
      result: `±${numberText(absolute)}`,
    },
  ]);
};

export function repeatedReadingUncertainty<TUnit extends UncertaintyQuantity>(
  readings: readonly TUnit[],
  opts: { readonly label?: string } = {},
): KernelResult<UncertaintySource<TUnit>> {
  if (readings.length < 2) {
    return err("precondition-violated", "Repeated-reading uncertainty requires at least two readings");
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const reading of readings) {
    const valid = finite(reading, "reading");
    if (!valid.ok) return valid;
    min = Math.min(min, reading);
    max = Math.max(max, reading);
  }

  const halfRange = (max - min) / 2;
  const validHalfRange = finiteOutput(halfRange, "Repeated-reading half range");
  if (!validHalfRange.ok) return validHalfRange;
  const label = opts.label ?? "repeated readings";

  return ok({
    kind: "repeated-readings",
    absoluteUncertainty: halfRange as TUnit,
    label,
    steps: [
      {
        label: "range",
        expression: "largest reading - smallest reading",
        result: numberText(max - min),
      },
      {
        label: "repeated-reading uncertainty",
        expression: "range ÷ 2",
        result: `±${numberText(halfRange)}`,
      },
    ],
  });
}

export function instrumentResolutionUncertainty<TUnit extends UncertaintyQuantity>(
  resolution: TUnit,
  opts: { readonly label?: string; readonly rule?: InstrumentResolutionRule } = {},
): KernelResult<UncertaintySource<TUnit>> {
  const valid = positive(resolution, "instrument resolution");
  if (!valid.ok) return valid;
  const ruleResult = instrumentRule(opts.rule);
  if (!ruleResult.ok) return ruleResult;
  const rule = ruleResult.value;
  const absolute = rule === "half-resolution" ? resolution / 2 : resolution;
  const validAbsolute = finiteOutput(absolute, "Instrument-resolution uncertainty");
  if (!validAbsolute.ok) return validAbsolute;
  const label = opts.label ?? "instrument resolution";

  return ok({
    kind: "instrument-resolution",
    absoluteUncertainty: absolute as TUnit,
    label,
    steps: [
      {
        label: "instrument resolution",
        expression: rule === "half-resolution" ? "resolution ÷ 2" : "resolution",
        result: `±${numberText(absolute)}`,
      },
    ],
  });
}

export const chooseLargerUncertaintySource = <TUnit extends UncertaintyQuantity>(
  sources: readonly UncertaintySource<TUnit>[],
): KernelResult<UncertaintySource<TUnit>> => {
  if (sources.length === 0) {
    return err("precondition-violated", "At least one uncertainty source is required");
  }

  let chosen: UncertaintySource<TUnit> | undefined;
  for (const source of sources) {
    if (source === undefined) {
      return err("precondition-violated", "Uncertainty source array must not be sparse");
    }
    const valid = nonNegative(source.absoluteUncertainty, `${source.label} uncertainty`);
    if (!valid.ok) return valid;
    if (chosen === undefined || source.absoluteUncertainty > chosen.absoluteUncertainty) {
      chosen = source;
    }
  }

  if (chosen === undefined) {
    return err("precondition-violated", "At least one uncertainty source is required");
  }

  return ok({
    ...chosen,
    steps: [
      ...chosen.steps,
      {
        label: "chosen source",
        expression: "use the larger available absolute uncertainty source",
        result: `${chosen.label}: ±${numberText(chosen.absoluteUncertainty)}`,
      },
    ],
  });
};

export function measurementUncertaintyFromSources<TUnit extends UncertaintyQuantity>(
  opts: {
    readonly repeatedReadings?: readonly TUnit[];
    readonly instrumentResolution?: TUnit;
    readonly instrumentResolutionRule?: InstrumentResolutionRule;
    readonly label?: string;
  },
): KernelResult<UncertaintySource<TUnit>> {
  const sources: UncertaintySource<TUnit>[] = [];

  if (opts.repeatedReadings !== undefined) {
    const repeated = repeatedReadingUncertainty(opts.repeatedReadings, {
      label: opts.label === undefined ? "repeated readings" : `${opts.label} repeated readings`,
    });
    if (!repeated.ok) return repeated;
    sources.push(repeated.value);
  }

  if (opts.instrumentResolution !== undefined) {
    const instrument = instrumentResolutionUncertainty(opts.instrumentResolution, {
      label: opts.label === undefined ? "instrument resolution" : `${opts.label} instrument resolution`,
      ...(opts.instrumentResolutionRule !== undefined && { rule: opts.instrumentResolutionRule }),
    });
    if (!instrument.ok) return instrument;
    sources.push(instrument.value);
  }

  return chooseLargerUncertaintySource(sources);
}

export const formatUncertainty = (
  measurement: MeasuredValue,
  opts: { readonly unit?: string; readonly places?: number } = {},
): KernelResult<string> => {
  const valid = validateMeasurement(measurement);
  if (!valid.ok) return valid;
  const places = opts.places ?? 2;
  if (!Number.isInteger(places) || places < 0 || places > 12) {
    return err("precondition-violated", `places must be an integer from 0 to 12; got ${places}`);
  }
  const unit = opts.unit ?? measurement.unit;
  return ok(
    `${valueWithUnit(measurement.value, unit, places)} ± ${valueWithUnit(
      measurement.absoluteUncertainty,
      unit,
      places,
    )}`,
  );
};
