import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export const distributedDataTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type Bytes = Brand<number, "Bytes">;
export type Count = Brand<number, "Count">;
export type Fraction = Brand<number, "Fraction">;

export interface HdfsBlockPlanInput {
  readonly fileSizeBytes: Bytes;
  readonly blockSizeBytes: Bytes;
  readonly replicationFactor: Count;
}

export interface HdfsBlockPlanResult {
  readonly blockCount: Count;
  readonly finalBlockBytes: Bytes;
  readonly logicalBytes: Bytes;
  readonly replicatedBytes: Bytes;
}

export interface SparkPartitionPlanInput {
  readonly recordCount: Count;
  readonly targetRecordsPerPartition: Count;
}

export interface SparkPartitionPlanResult {
  readonly partitionCount: Count;
  readonly recordsPerPartitionCeiling: Count;
}

export interface ShuffleEstimateInput {
  readonly mapOutputBytes: Bytes;
  readonly selectivity: Fraction;
  readonly reducerCount: Count;
}

export interface ShuffleEstimateResult {
  readonly shuffleBytes: Bytes;
  readonly bytesPerReducer: Bytes;
}

export const bytes = (value: number): Bytes => value as Bytes;
export const count = (value: number): Count => value as Count;
export const fraction = (value: number): KernelResult<Fraction> => {
  const valid = nonNegative(value, "fraction");
  if (!valid.ok) return valid;
  return value <= 1
    ? ok(value as Fraction)
    : err("out-of-domain", `fraction must be <= 1; got ${value}`);
};

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

const positiveInteger = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return Number.isInteger(value) && value > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be a positive integer; got ${value}`);
};

export const hdfsBlockPlan = (input: HdfsBlockPlanInput): KernelResult<HdfsBlockPlanResult> => {
  const fileSize = nonNegative(input.fileSizeBytes, "fileSizeBytes");
  if (!fileSize.ok) return fileSize;
  const blockSize = positiveInteger(input.blockSizeBytes, "blockSizeBytes");
  if (!blockSize.ok) return blockSize;
  const replication = positiveInteger(input.replicationFactor, "replicationFactor");
  if (!replication.ok) return replication;

  const blockCount = input.fileSizeBytes === 0
    ? 0
    : Math.ceil(input.fileSizeBytes / input.blockSizeBytes);
  const finalBlockBytes = input.fileSizeBytes === 0
    ? 0
    : input.fileSizeBytes - input.blockSizeBytes * (blockCount - 1);
  const replicatedBytes = input.fileSizeBytes * input.replicationFactor;
  for (const [value, label] of [
    [blockCount, "blockCount"],
    [finalBlockBytes, "finalBlockBytes"],
    [replicatedBytes, "replicatedBytes"],
  ] as const) {
    const computed = finiteDerived(value, label);
    if (!computed.ok) return computed;
  }

  return ok(Object.freeze({
    blockCount: count(blockCount),
    finalBlockBytes: bytes(finalBlockBytes),
    logicalBytes: input.fileSizeBytes,
    replicatedBytes: bytes(replicatedBytes),
  }));
};

export const sparkPartitionPlan = (
  input: SparkPartitionPlanInput,
): KernelResult<SparkPartitionPlanResult> => {
  const records = nonNegative(input.recordCount, "recordCount");
  if (!records.ok) return records;
  const target = positiveInteger(input.targetRecordsPerPartition, "targetRecordsPerPartition");
  if (!target.ok) return target;
  const partitionCount = input.recordCount === 0
    ? 0
    : Math.ceil(input.recordCount / input.targetRecordsPerPartition);
  const recordsPerPartitionCeiling = partitionCount === 0
    ? 0
    : Math.ceil(input.recordCount / partitionCount);
  return ok(Object.freeze({
    partitionCount: count(partitionCount),
    recordsPerPartitionCeiling: count(recordsPerPartitionCeiling),
  }));
};

export const shuffleEstimate = (
  input: ShuffleEstimateInput,
): KernelResult<ShuffleEstimateResult> => {
  const mapOutput = nonNegative(input.mapOutputBytes, "mapOutputBytes");
  if (!mapOutput.ok) return mapOutput;
  const selectivity = fraction(input.selectivity);
  if (!selectivity.ok) return selectivity;
  const reducers = positiveInteger(input.reducerCount, "reducerCount");
  if (!reducers.ok) return reducers;

  const shuffleBytes = input.mapOutputBytes * input.selectivity;
  const bytesPerReducer = shuffleBytes / input.reducerCount;
  const shuffleFinite = finiteDerived(shuffleBytes, "shuffleBytes");
  if (!shuffleFinite.ok) return shuffleFinite;
  const reducerFinite = finiteDerived(bytesPerReducer, "bytesPerReducer");
  if (!reducerFinite.ok) return reducerFinite;

  return ok(Object.freeze({
    shuffleBytes: bytes(shuffleBytes),
    bytesPerReducer: bytes(bytesPerReducer),
  }));
};
