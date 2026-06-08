import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type TransactionId = Brand<string, "Transactions.TransactionId">;
export type DataItem = Brand<string, "Transactions.DataItem">;
export type OperationKind = "read" | "write" | "commit" | "abort";

export interface ScheduleOperation {
  readonly tx: TransactionId;
  readonly kind: OperationKind;
  readonly item?: DataItem;
}

export type Schedule = readonly ScheduleOperation[];

export interface Conflict {
  readonly from: TransactionId;
  readonly to: TransactionId;
  readonly item: DataItem;
  readonly leftIndex: number;
  readonly rightIndex: number;
}

export interface PrecedenceGraph {
  readonly nodes: readonly TransactionId[];
  readonly edges: readonly Conflict[];
}

export type AnomalyKind = "dirty-read" | "lost-update" | "non-repeatable-read" | "dirty-write";

export interface Anomaly {
  readonly kind: AnomalyKind;
  readonly tx: TransactionId;
  readonly item: DataItem;
  readonly evidence: readonly number[];
}

export interface RecoverabilityReport {
  readonly recoverable: boolean;
  readonly cascadingAbortRisk: boolean;
  readonly violations: readonly string[];
}

const MAX_OPERATIONS = 200;

export const transactionId = (value: string): KernelResult<TransactionId> => {
  if (value.trim() !== value || value.length === 0) {
    return err("precondition-violated", "transactionId must be non-empty and unpadded");
  }
  return ok(value as TransactionId);
};

export const dataItem = (value: string): KernelResult<DataItem> => {
  if (value.trim() !== value || value.length === 0) {
    return err("precondition-violated", "dataItem must be non-empty and unpadded");
  }
  return ok(value as DataItem);
};

export const scheduleOperation = (input: {
  readonly tx: string;
  readonly kind: OperationKind;
  readonly item?: string;
}): KernelResult<ScheduleOperation> => {
  const tx = transactionId(input.tx);
  if (!tx.ok) {
    return tx;
  }
  if (!validOperationKind(input.kind)) {
    return err("precondition-violated", `unsupported operation kind ${input.kind}`);
  }
  if (input.kind === "read" || input.kind === "write") {
    if (input.item === undefined) {
      return err("precondition-violated", `${input.kind} operations require a data item`);
    }
    const item = dataItem(input.item);
    if (!item.ok) {
      return item;
    }
    return ok({ tx: tx.value, kind: input.kind, item: item.value });
  }
  if (input.item !== undefined) {
    return err("precondition-violated", `${input.kind} operations must not include a data item`);
  }
  return ok({ tx: tx.value, kind: input.kind });
};

export const schedule = (
  operations: readonly ScheduleOperation[],
): KernelResult<Schedule> => {
  if (operations.length > MAX_OPERATIONS) {
    return err("out-of-domain", `schedules are limited to ${MAX_OPERATIONS} operations`);
  }
  const finished = new Set<TransactionId>();
  const checked: ScheduleOperation[] = [];
  for (const operation of operations) {
    const valid = validateOperation(operation);
    if (!valid.ok) {
      return valid;
    }
    if (finished.has(valid.value.tx)) {
      return err("precondition-violated", `operation appears after ${valid.value.tx} finished`);
    }
    checked.push(valid.value);
    if (valid.value.kind === "commit" || valid.value.kind === "abort") {
      finished.add(valid.value.tx);
    }
  }
  return ok(checked);
};

export const extractConflicts = (
  scheduleInput: Schedule,
): KernelResult<readonly Conflict[]> => {
  const checked = schedule(scheduleInput);
  if (!checked.ok) {
    return checked;
  }
  const conflicts: Conflict[] = [];
  for (let leftIndex = 0; leftIndex < checked.value.length; leftIndex += 1) {
    const left = checked.value[leftIndex];
    if (left === undefined || !isDataOperation(left)) {
      continue;
    }
    for (let rightIndex = leftIndex + 1; rightIndex < checked.value.length; rightIndex += 1) {
      const right = checked.value[rightIndex];
      if (right === undefined || !isDataOperation(right)) {
        continue;
      }
      if (left.tx === right.tx || left.item !== right.item) {
        continue;
      }
      if (left.kind === "write" || right.kind === "write") {
        conflicts.push({
          from: left.tx,
          to: right.tx,
          item: left.item,
          leftIndex,
          rightIndex,
        });
      }
    }
  }
  return ok(conflicts);
};

export const precedenceGraph = (
  scheduleInput: Schedule,
): KernelResult<PrecedenceGraph> => {
  const checked = schedule(scheduleInput);
  if (!checked.ok) {
    return checked;
  }
  const conflicts = extractConflicts(checked.value);
  if (!conflicts.ok) {
    return conflicts;
  }
  return ok({
    nodes: transactionOrder(checked.value),
    edges: conflicts.value,
  });
};

export const isConflictSerializable = (
  scheduleInput: Schedule,
): KernelResult<boolean> => {
  const graph = precedenceGraph(scheduleInput);
  if (!graph.ok) {
    return graph;
  }
  return ok(!hasCycle(graph.value));
};

export const classifyAnomalies = (
  scheduleInput: Schedule,
): KernelResult<readonly Anomaly[]> => {
  const checked = schedule(scheduleInput);
  if (!checked.ok) {
    return checked;
  }
  const anomalies: Anomaly[] = [
    ...dirtyReads(checked.value),
    ...dirtyWrites(checked.value),
    ...nonRepeatableReads(checked.value),
    ...lostUpdates(checked.value),
  ];
  return ok(deduplicateAnomalies(anomalies));
};

export const recoverability = (
  scheduleInput: Schedule,
): KernelResult<RecoverabilityReport> => {
  const checked = schedule(scheduleInput);
  if (!checked.ok) {
    return checked;
  }
  const commitIndex = new Map<TransactionId, number>();
  const abortIndex = new Map<TransactionId, number>();
  checked.value.forEach((operation: ScheduleOperation, index: number) => {
    if (operation.kind === "commit") {
      commitIndex.set(operation.tx, index);
    }
    if (operation.kind === "abort") {
      abortIndex.set(operation.tx, index);
    }
  });
  const violations: string[] = [];
  let cascadingAbortRisk = false;
  const lastWrite = new Map<DataItem, { readonly tx: TransactionId; readonly index: number }>();
  checked.value.forEach((operation: ScheduleOperation, index: number) => {
    if (operation.kind === "write" && operation.item !== undefined) {
      lastWrite.set(operation.item, { tx: operation.tx, index });
      return;
    }
    if (operation.kind !== "read" || operation.item === undefined) {
      return;
    }
    const writer = lastWrite.get(operation.item);
    if (writer === undefined || writer.tx === operation.tx) {
      return;
    }
    const writerCommit = commitIndex.get(writer.tx);
    const writerAbort = abortIndex.get(writer.tx);
    if (writerCommit === undefined || writerCommit > index) {
      cascadingAbortRisk = true;
    }
    const readerCommit = commitIndex.get(operation.tx);
    if (readerCommit !== undefined && (writerCommit === undefined || readerCommit < writerCommit)) {
      violations.push(`${operation.tx} commits before ${writer.tx} after reading ${operation.item}`);
    }
    if (readerCommit !== undefined && writerAbort !== undefined) {
      violations.push(`${operation.tx} reads ${operation.item} written by aborted ${writer.tx}`);
    }
  });
  return ok({
    recoverable: violations.length === 0,
    cascadingAbortRisk,
    violations: [...new Set(violations)],
  });
};

const validateOperation = (operation: ScheduleOperation): KernelResult<ScheduleOperation> => {
  const tx = transactionId(operation.tx);
  if (!tx.ok) {
    return tx;
  }
  if (!validOperationKind(operation.kind)) {
    return err("precondition-violated", `unsupported operation kind ${operation.kind}`);
  }
  if (operation.kind === "read" || operation.kind === "write") {
    if (operation.item === undefined) {
      return err("precondition-violated", `${operation.kind} operations require a data item`);
    }
    const item = dataItem(operation.item);
    if (!item.ok) {
      return item;
    }
    return ok({ tx: tx.value, kind: operation.kind, item: item.value });
  }
  if (operation.item !== undefined) {
    return err("precondition-violated", `${operation.kind} operations must not include a data item`);
  }
  return ok({ tx: tx.value, kind: operation.kind });
};

const dirtyReads = (operations: Schedule): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  const lastWrite = new Map<DataItem, { readonly tx: TransactionId; readonly index: number }>();
  const committed = new Set<TransactionId>();
  const aborted = new Set<TransactionId>();
  operations.forEach((operation, index) => {
    if (operation.kind === "write" && operation.item !== undefined) {
      lastWrite.set(operation.item, { tx: operation.tx, index });
      return;
    }
    if (operation.kind === "commit") {
      committed.add(operation.tx);
      return;
    }
    if (operation.kind === "abort") {
      aborted.add(operation.tx);
      return;
    }
    if (operation.kind !== "read" || operation.item === undefined) {
      return;
    }
    const writer = lastWrite.get(operation.item);
    if (
      writer !== undefined &&
      writer.tx !== operation.tx &&
      !committed.has(writer.tx) &&
      !aborted.has(writer.tx)
    ) {
      anomalies.push({ kind: "dirty-read", tx: operation.tx, item: operation.item, evidence: [writer.index, index] });
    }
  });
  return anomalies;
};

const dirtyWrites = (operations: Schedule): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  const lastUncommittedWrite = new Map<DataItem, { readonly tx: TransactionId; readonly index: number }>();
  const finished = new Set<TransactionId>();
  operations.forEach((operation, index) => {
    if (operation.kind === "commit" || operation.kind === "abort") {
      finished.add(operation.tx);
      return;
    }
    if (operation.kind !== "write" || operation.item === undefined) {
      return;
    }
    const previous = lastUncommittedWrite.get(operation.item);
    if (previous !== undefined && previous.tx !== operation.tx && !finished.has(previous.tx)) {
      anomalies.push({ kind: "dirty-write", tx: operation.tx, item: operation.item, evidence: [previous.index, index] });
    }
    lastUncommittedWrite.set(operation.item, { tx: operation.tx, index });
  });
  return anomalies;
};

const nonRepeatableReads = (operations: Schedule): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  const reads = new Map<string, number>();
  operations.forEach((operation, index) => {
    if (operation.kind === "read" && operation.item !== undefined) {
      const key = `${operation.tx}:${operation.item}`;
      const firstRead = reads.get(key);
      const interveningWrite = firstRead === undefined
        ? undefined
        : committedInterveningWrite(operations, firstRead, index, operation.tx, operation.item);
      if (firstRead !== undefined && interveningWrite !== undefined) {
        anomalies.push({ kind: "non-repeatable-read", tx: operation.tx, item: operation.item, evidence: [firstRead, interveningWrite, index] });
      }
      reads.set(key, index);
    }
  });
  return anomalies;
};

const lostUpdates = (operations: Schedule): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  operations.forEach((operation, writeIndex) => {
    if (operation.kind !== "write" || operation.item === undefined) {
      return;
    }
    const priorRead = findPriorRead(operations, writeIndex, operation.tx, operation.item);
    if (priorRead === undefined) {
      return;
    }
    const interveningWrite = committedInterveningReadWrite(
      operations,
      priorRead,
      writeIndex,
      operation.tx,
      operation.item,
    );
    if (interveningWrite >= 0) {
      anomalies.push({ kind: "lost-update", tx: operation.tx, item: operation.item, evidence: [priorRead, interveningWrite, writeIndex] });
    }
  });
  return anomalies;
};

const committedInterveningWrite = (
  operations: Schedule,
  leftIndex: number,
  rightIndex: number,
  tx: TransactionId,
  item: DataItem,
): number | undefined => {
  for (let index = leftIndex + 1; index < rightIndex; index += 1) {
    const operation = operations[index];
    if (
      operation !== undefined &&
      operation.kind === "write" &&
      operation.item === item &&
      operation.tx !== tx &&
      commitsBefore(operations, operation.tx, rightIndex)
    ) {
      return index;
    }
  }
  return undefined;
};

const committedInterveningReadWrite = (
  operations: Schedule,
  leftIndex: number,
  rightIndex: number,
  tx: TransactionId,
  item: DataItem,
): number => {
  for (let readIndex = leftIndex + 1; readIndex < rightIndex; readIndex += 1) {
    const read = operations[readIndex];
    if (
      read === undefined ||
      read.kind !== "read" ||
      read.item !== item ||
      read.tx === tx
    ) {
      continue;
    }
    const writeIndex = operations.findIndex((candidate, index) =>
      index > readIndex &&
      index < rightIndex &&
      candidate.kind === "write" &&
      candidate.item === item &&
      candidate.tx === read.tx,
    );
    if (writeIndex >= 0 && commitsBefore(operations, read.tx, rightIndex)) {
      return writeIndex;
    }
  }
  return -1;
};

const commitsBefore = (
  operations: Schedule,
  tx: TransactionId,
  beforeIndex: number,
): boolean =>
  operations.some((operation, index) =>
    index < beforeIndex &&
    operation.tx === tx &&
    operation.kind === "commit",
  );

const findPriorRead = (
  operations: Schedule,
  writeIndex: number,
  tx: TransactionId,
  item: DataItem,
): number | undefined => {
  for (let index = writeIndex - 1; index >= 0; index -= 1) {
    const operation = operations[index];
    if (operation === undefined) {
      continue;
    }
    if (operation.tx === tx && operation.kind === "read" && operation.item === item) {
      return index;
    }
    if (operation.tx === tx && operation.kind === "write" && operation.item === item) {
      return undefined;
    }
  }
  return undefined;
};

const deduplicateAnomalies = (anomalies: readonly Anomaly[]): readonly Anomaly[] => {
  const seen = new Set<string>();
  const output: Anomaly[] = [];
  for (const anomaly of anomalies) {
    const key = `${anomaly.kind}:${anomaly.tx}:${anomaly.item}:${anomaly.evidence.join(",")}`;
    if (!seen.has(key)) {
      seen.add(key);
      output.push(anomaly);
    }
  }
  return output;
};

const transactionOrder = (operations: Schedule): readonly TransactionId[] => {
  const seen = new Set<TransactionId>();
  const output: TransactionId[] = [];
  for (const operation of operations) {
    if (!seen.has(operation.tx)) {
      seen.add(operation.tx);
      output.push(operation.tx);
    }
  }
  return output;
};

const hasCycle = (graph: PrecedenceGraph): boolean => {
  const adjacency = new Map<TransactionId, Set<TransactionId>>();
  for (const node of graph.nodes) {
    adjacency.set(node, new Set());
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.add(edge.to);
  }
  const visiting = new Set<TransactionId>();
  const visited = new Set<TransactionId>();
  const visit = (node: TransactionId): boolean => {
    if (visiting.has(node)) {
      return true;
    }
    if (visited.has(node)) {
      return false;
    }
    visiting.add(node);
    for (const next of adjacency.get(node) ?? []) {
      if (visit(next)) {
        return true;
      }
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  return graph.nodes.some((node) => visit(node));
};

const isDataOperation = (
  operation: ScheduleOperation,
): operation is ScheduleOperation & { readonly item: DataItem; readonly kind: "read" | "write" } =>
  (operation.kind === "read" || operation.kind === "write") && operation.item !== undefined;

const validOperationKind = (kind: string): kind is OperationKind =>
  kind === "read" || kind === "write" || kind === "commit" || kind === "abort";
