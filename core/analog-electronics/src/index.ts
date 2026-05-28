import {
  err,
  ok,
  type Brand,
  type KernelResult,
} from "@paideia/shared";

export const analogTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type Volts = Brand<number, "Volts">;
export type Ohms = Brand<number, "Ohms">;
export type VoltsPerVolt = Brand<number, "VoltsPerVolt">;
export type SaturationState = "none" | "positive" | "negative";

export interface OutputLimitInput {
  readonly positiveRailVolts: Volts;
  readonly negativeRailVolts: Volts;
}

export interface OpAmpStageResult {
  readonly idealOutputVoltageVolts: Volts;
  readonly outputVoltageVolts: Volts;
  readonly gainVoltsPerVolt: VoltsPerVolt;
  readonly saturation: SaturationState;
}

export interface InvertingAmplifierInput {
  readonly inputVoltageVolts: Volts;
  readonly inputResistanceOhms: Ohms;
  readonly feedbackResistanceOhms: Ohms;
  readonly outputLimit?: OutputLimitInput;
}

export interface NonInvertingAmplifierInput {
  readonly inputVoltageVolts: Volts;
  readonly groundResistanceOhms: Ohms;
  readonly feedbackResistanceOhms: Ohms;
  readonly outputLimit?: OutputLimitInput;
}

export interface DifferenceAmplifierInput {
  readonly nonInvertingInputVoltageVolts: Volts;
  readonly invertingInputVoltageVolts: Volts;
  readonly inputResistanceOhms: Ohms;
  readonly feedbackResistanceOhms: Ohms;
  readonly outputLimit?: OutputLimitInput;
}

export interface InvertingSummerInput {
  readonly inputVoltageVolts: readonly Volts[];
  readonly inputResistanceOhms: readonly Ohms[];
  readonly feedbackResistanceOhms: Ohms;
  readonly outputLimit?: OutputLimitInput;
}

export const volts = (value: number): Volts => value as Volts;
export const ohms = (value: number): Ohms => value as Ohms;
const voltsPerVolt = (value: number): VoltsPerVolt => value as VoltsPerVolt;

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

const validateOutputLimit = (limit: OutputLimitInput | undefined): KernelResult<void> => {
  if (limit === undefined) return ok(undefined);
  const positiveRail = finite(limit.positiveRailVolts, "positiveRailVolts");
  if (!positiveRail.ok) return positiveRail;
  const negativeRail = finite(limit.negativeRailVolts, "negativeRailVolts");
  if (!negativeRail.ok) return negativeRail;
  return limit.positiveRailVolts > limit.negativeRailVolts
    ? ok(undefined)
    : err("out-of-domain", "positiveRailVolts must be greater than negativeRailVolts");
};

const applyOutputLimit = (
  idealOutputVoltageVolts: number,
  outputLimit: OutputLimitInput | undefined,
): { readonly outputVoltageVolts: number; readonly saturation: SaturationState } => {
  if (outputLimit === undefined) {
    return { outputVoltageVolts: idealOutputVoltageVolts, saturation: "none" };
  }
  if (idealOutputVoltageVolts > outputLimit.positiveRailVolts) {
    return { outputVoltageVolts: outputLimit.positiveRailVolts, saturation: "positive" };
  }
  if (idealOutputVoltageVolts < outputLimit.negativeRailVolts) {
    return { outputVoltageVolts: outputLimit.negativeRailVolts, saturation: "negative" };
  }
  return { outputVoltageVolts: idealOutputVoltageVolts, saturation: "none" };
};

const stageResult = (
  idealOutputVoltageVolts: number,
  gainVoltsPerVolt: number,
  outputLimit: OutputLimitInput | undefined,
): KernelResult<OpAmpStageResult> => {
  const ideal = finiteDerived(idealOutputVoltageVolts, "idealOutputVoltageVolts");
  if (!ideal.ok) return ideal;
  const gain = finiteDerived(gainVoltsPerVolt, "gainVoltsPerVolt");
  if (!gain.ok) return gain;
  const limited = applyOutputLimit(idealOutputVoltageVolts, outputLimit);
  const output = finiteDerived(limited.outputVoltageVolts, "outputVoltageVolts");
  if (!output.ok) return output;
  return ok(Object.freeze({
    idealOutputVoltageVolts: volts(idealOutputVoltageVolts),
    outputVoltageVolts: volts(limited.outputVoltageVolts),
    gainVoltsPerVolt: voltsPerVolt(gainVoltsPerVolt),
    saturation: limited.saturation,
  }));
};

export const idealInvertingAmplifier = (
  input: InvertingAmplifierInput,
): KernelResult<OpAmpStageResult> => {
  const inputVoltage = finite(input.inputVoltageVolts, "inputVoltageVolts");
  if (!inputVoltage.ok) return inputVoltage;
  const inputResistance = positive(input.inputResistanceOhms, "inputResistanceOhms");
  if (!inputResistance.ok) return inputResistance;
  const feedback = positive(input.feedbackResistanceOhms, "feedbackResistanceOhms");
  if (!feedback.ok) return feedback;
  const limit = validateOutputLimit(input.outputLimit);
  if (!limit.ok) return limit;

  const gain = -input.feedbackResistanceOhms / input.inputResistanceOhms;
  return stageResult(input.inputVoltageVolts * gain, gain, input.outputLimit);
};

export const idealNonInvertingAmplifier = (
  input: NonInvertingAmplifierInput,
): KernelResult<OpAmpStageResult> => {
  const inputVoltage = finite(input.inputVoltageVolts, "inputVoltageVolts");
  if (!inputVoltage.ok) return inputVoltage;
  const ground = positive(input.groundResistanceOhms, "groundResistanceOhms");
  if (!ground.ok) return ground;
  const feedback = positive(input.feedbackResistanceOhms, "feedbackResistanceOhms");
  if (!feedback.ok) return feedback;
  const limit = validateOutputLimit(input.outputLimit);
  if (!limit.ok) return limit;

  const gain = 1 + input.feedbackResistanceOhms / input.groundResistanceOhms;
  return stageResult(input.inputVoltageVolts * gain, gain, input.outputLimit);
};

export const idealDifferenceAmplifier = (
  input: DifferenceAmplifierInput,
): KernelResult<OpAmpStageResult> => {
  const nonInverting = finite(
    input.nonInvertingInputVoltageVolts,
    "nonInvertingInputVoltageVolts",
  );
  if (!nonInverting.ok) return nonInverting;
  const inverting = finite(input.invertingInputVoltageVolts, "invertingInputVoltageVolts");
  if (!inverting.ok) return inverting;
  const inputResistance = positive(input.inputResistanceOhms, "inputResistanceOhms");
  if (!inputResistance.ok) return inputResistance;
  const feedback = positive(input.feedbackResistanceOhms, "feedbackResistanceOhms");
  if (!feedback.ok) return feedback;
  const limit = validateOutputLimit(input.outputLimit);
  if (!limit.ok) return limit;

  const gain = input.feedbackResistanceOhms / input.inputResistanceOhms;
  return stageResult(
    gain * (input.nonInvertingInputVoltageVolts - input.invertingInputVoltageVolts),
    gain,
    input.outputLimit,
  );
};

export const idealInvertingSummer = (
  input: InvertingSummerInput,
): KernelResult<OpAmpStageResult> => {
  if (input.inputVoltageVolts.length === 0) {
    return err("precondition-violated", "inputVoltageVolts must not be empty");
  }
  if (input.inputVoltageVolts.length !== input.inputResistanceOhms.length) {
    return err(
      "precondition-violated",
      "inputVoltageVolts and inputResistanceOhms must have the same length",
    );
  }
  const feedback = positive(input.feedbackResistanceOhms, "feedbackResistanceOhms");
  if (!feedback.ok) return feedback;
  const limit = validateOutputLimit(input.outputLimit);
  if (!limit.ok) return limit;

  let weightedInputSum = 0;
  for (const [index, inputVoltage] of input.inputVoltageVolts.entries()) {
    const voltage = finite(inputVoltage, `inputVoltageVolts[${index}]`);
    if (!voltage.ok) return voltage;
    const resistance = positive(input.inputResistanceOhms[index] as Ohms, `inputResistanceOhms[${index}]`);
    if (!resistance.ok) return resistance;
    weightedInputSum += inputVoltage / (input.inputResistanceOhms[index] as Ohms);
  }

  const idealOutput = -input.feedbackResistanceOhms * weightedInputSum;
  const gainForEqualInputs = -input.feedbackResistanceOhms / (input.inputResistanceOhms[0] as Ohms);
  return stageResult(idealOutput, gainForEqualInputs, input.outputLimit);
};
