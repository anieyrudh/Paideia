import { err, ok, type KernelResult } from "@paideia/shared";

export const computerSystemsTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export interface ProcessBurst {
  readonly id: string;
  readonly arrivalTime: number;
  readonly burstTime: number;
}

export interface ScheduledProcess {
  readonly id: string;
  readonly startTime: number;
  readonly completionTime: number;
  readonly waitingTime: number;
  readonly turnaroundTime: number;
}

export interface FcfsScheduleResult {
  readonly processes: readonly ScheduledProcess[];
  readonly averageWaitingTime: number;
  readonly averageTurnaroundTime: number;
}

export interface PageOffsetInput {
  readonly address: number;
  readonly pageSizeBytes: number;
}

export interface PageOffsetResult {
  readonly pageNumber: number;
  readonly offsetBytes: number;
}

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

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

const nonBlank = (value: string, label: string): KernelResult<void> =>
  value.trim().length > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must not be blank`);

export const firstComeFirstServedSchedule = (
  processes: readonly ProcessBurst[],
): KernelResult<FcfsScheduleResult> => {
  if (processes.length === 0) {
    return err("precondition-violated", "processes must not be empty");
  }
  for (const [index, process] of processes.entries()) {
    const id = nonBlank(process.id, `processes[${index}].id`);
    if (!id.ok) return id;
    const arrival = nonNegative(process.arrivalTime, `processes[${index}].arrivalTime`);
    if (!arrival.ok) return arrival;
    const burst = positive(process.burstTime, `processes[${index}].burstTime`);
    if (!burst.ok) return burst;
  }

  const ordered = [...processes].sort((a, b) =>
    a.arrivalTime === b.arrivalTime
      ? processes.indexOf(a) - processes.indexOf(b)
      : a.arrivalTime - b.arrivalTime,
  );
  let clock = 0;
  const scheduled: ScheduledProcess[] = [];
  for (const process of ordered) {
    const startTime = Math.max(clock, process.arrivalTime);
    const completionTime = startTime + process.burstTime;
    const turnaroundTime = completionTime - process.arrivalTime;
    const waitingTime = startTime - process.arrivalTime;
    scheduled.push(Object.freeze({
      id: process.id,
      startTime,
      completionTime,
      waitingTime,
      turnaroundTime,
    }));
    clock = completionTime;
  }
  const averageWaitingTime =
    scheduled.reduce((sum, process) => sum + process.waitingTime, 0) / scheduled.length;
  const averageTurnaroundTime =
    scheduled.reduce((sum, process) => sum + process.turnaroundTime, 0) / scheduled.length;
  return ok(Object.freeze({
    processes: Object.freeze([...scheduled]),
    averageWaitingTime,
    averageTurnaroundTime,
  }));
};

export const pageOffset = (input: PageOffsetInput): KernelResult<PageOffsetResult> => {
  const address = nonNegative(input.address, "address");
  if (!address.ok) return address;
  const pageSize = positive(input.pageSizeBytes, "pageSizeBytes");
  if (!pageSize.ok) return pageSize;
  if (!Number.isInteger(input.address) || !Number.isInteger(input.pageSizeBytes)) {
    return err("precondition-violated", "address and pageSizeBytes must be integers");
  }
  const pageNumber = Math.floor(input.address / input.pageSizeBytes);
  const offsetBytes = input.address % input.pageSizeBytes;
  return ok(Object.freeze({ pageNumber, offsetBytes }));
};
