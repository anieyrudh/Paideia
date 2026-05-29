import {
  columnName,
  groupBy,
  projectRows,
  relationalJoin,
  tableName,
  validateRow,
  validateTable,
  type AggregateSpec,
  type CellValue,
  type ColumnName,
  type JoinKind,
  type Row,
  type Table,
} from "@paideia/relational-data";
import { err, ok, type KernelResult } from "@paideia/shared";

export type QueryComparisonOperator = "eq" | "neq" | "lt" | "lte" | "gt" | "gte";

export interface QueryComparisonPredicate {
  readonly kind: "comparison";
  readonly column: ColumnName;
  readonly op: QueryComparisonOperator;
  readonly value: CellValue;
}

export type QueryPredicate =
  | QueryComparisonPredicate
  | { readonly kind: "and"; readonly predicates: readonly QueryPredicate[] }
  | { readonly kind: "or"; readonly predicates: readonly QueryPredicate[] }
  | { readonly kind: "not"; readonly predicate: QueryPredicate };

export interface SelectStep {
  readonly kind: "select";
  readonly predicate: QueryPredicate;
}

export interface ProjectStep {
  readonly kind: "project";
  readonly columns: readonly ColumnName[];
}

export interface EquiJoinStep {
  readonly kind: "equi-join";
  readonly right: Table;
  readonly leftKey: ColumnName;
  readonly rightKey: ColumnName;
  readonly joinKind?: Extract<JoinKind, "inner" | "left">;
}

export interface GroupAggregateSpec {
  readonly output: ColumnName;
  readonly op: "count" | "sum";
  readonly column?: ColumnName;
}

export interface GroupStep {
  readonly kind: "group";
  readonly keys: readonly ColumnName[];
  readonly aggregates: readonly GroupAggregateSpec[];
}

export type QueryStep = SelectStep | ProjectStep | EquiJoinStep | GroupStep;

export interface QueryPlan {
  readonly source: Table;
  readonly steps: readonly QueryStep[];
}

export interface QueryCostStep {
  readonly index: number;
  readonly kind: QueryStep["kind"];
  readonly inputRows: number;
  readonly outputRows: number;
  readonly predicateComparisons: number;
  readonly joinComparisons: number;
  readonly projectedColumns: number;
}

export interface QueryCostEvidence {
  readonly inputRows: number;
  readonly outputRows: number;
  readonly predicateComparisons: number;
  readonly joinComparisons: number;
  readonly projectedColumns: number;
  readonly steps: readonly QueryCostStep[];
}

export interface QueryExecution {
  readonly table: Table;
  readonly evidence: QueryCostEvidence;
}

interface PredicateEvaluation {
  readonly matched: boolean;
  readonly comparisons: number;
}

export const evaluatePredicate = (
  row: Row,
  predicate: QueryPredicate,
): KernelResult<boolean> => {
  const checked = validateRow(row);
  if (!checked.ok) return checked;
  const evaluated = evaluatePredicateInternal(checked.value, predicate);
  return evaluated.ok ? ok(evaluated.value.matched) : evaluated;
};

export const selectRows = (
  table: Table,
  predicate: QueryPredicate,
): KernelResult<QueryExecution> => {
  const checked = validateTable(table);
  if (!checked.ok) return checked;
  return runSelect(checked.value, predicate, 0, checked.value.rows.length);
};

export const executeQuery = (plan: QueryPlan): KernelResult<QueryExecution> => {
  const source = validateTable(plan.source);
  if (!source.ok) return source;
  let current = source.value;
  const steps: QueryCostStep[] = [];
  let predicateComparisons = 0;
  let joinComparisons = 0;
  let projectedColumns = 0;

  for (const [index, step] of plan.steps.entries()) {
    const inputRows = current.rows.length;
    const result = runStep(current, step, index);
    if (!result.ok) return result;
    current = result.value.table;
    steps.push(result.value.step);
    predicateComparisons += result.value.step.predicateComparisons;
    joinComparisons += result.value.step.joinComparisons;
    projectedColumns += result.value.step.projectedColumns;
  }

  return ok({
    table: current,
    evidence: {
      inputRows: source.value.rows.length,
      outputRows: current.rows.length,
      predicateComparisons,
      joinComparisons,
      projectedColumns,
      steps,
    },
  });
};

const runStep = (
  table: Table,
  step: QueryStep,
  index: number,
): KernelResult<{ readonly table: Table; readonly step: QueryCostStep }> => {
  if (step.kind === "select") {
    const selected = runSelect(table, step.predicate, index, table.rows.length);
    if (!selected.ok) return selected;
    return ok({ table: selected.value.table, step: selected.value.evidence.steps[0] as QueryCostStep });
  }

  if (step.kind === "project") {
    const projected = projectRows(table, step.columns);
    if (!projected.ok) return projected;
    return ok({
      table: projected.value,
      step: {
        index,
        kind: "project",
        inputRows: table.rows.length,
        outputRows: projected.value.rows.length,
        predicateComparisons: 0,
        joinComparisons: 0,
        projectedColumns: step.columns.length,
      },
    });
  }

  if (step.kind === "equi-join") {
    const joinKind = step.joinKind ?? "inner";
    if (joinKind !== "inner" && joinKind !== "left") {
      return err("precondition-violated", "query-engine supports only inner and left joins");
    }
    const right = validateTable(step.right);
    if (!right.ok) return right;
    const joined = relationalJoin({
      left: table,
      right: right.value,
      leftKey: step.leftKey,
      rightKey: step.rightKey,
      kind: joinKind,
    });
    if (!joined.ok) return joined;
    return ok({
      table: joined.value,
      step: {
        index,
        kind: "equi-join",
        inputRows: table.rows.length,
        outputRows: joined.value.rows.length,
        predicateComparisons: 0,
        joinComparisons: table.rows.length * right.value.rows.length,
        projectedColumns: 0,
      },
    });
  }

  const grouped = groupBy({
    table,
    keys: step.keys,
    aggregates: step.aggregates.map(toRelationalAggregate),
  });
  if (!grouped.ok) return grouped;
  return ok({
    table: grouped.value,
    step: {
      index,
      kind: "group",
      inputRows: table.rows.length,
      outputRows: grouped.value.rows.length,
      predicateComparisons: 0,
      joinComparisons: 0,
      projectedColumns: step.keys.length + step.aggregates.length,
    },
  });
};

const runSelect = (
  table: Table,
  predicate: QueryPredicate,
  index: number,
  planInputRows: number,
): KernelResult<QueryExecution> => {
  const rows: Row[] = [];
  let comparisons = 0;
  for (const row of table.rows) {
    const evaluated = evaluatePredicateInternal(row, predicate);
    if (!evaluated.ok) return evaluated;
    comparisons += evaluated.value.comparisons;
    if (evaluated.value.matched) rows.push({ ...row });
  }
  const selected: Table = { name: table.name, rows };
  return ok({
    table: selected,
    evidence: {
      inputRows: planInputRows,
      outputRows: selected.rows.length,
      predicateComparisons: comparisons,
      joinComparisons: 0,
      projectedColumns: 0,
      steps: [
        {
          index,
          kind: "select",
          inputRows: table.rows.length,
          outputRows: selected.rows.length,
          predicateComparisons: comparisons,
          joinComparisons: 0,
          projectedColumns: 0,
        },
      ],
    },
  });
};

const evaluatePredicateInternal = (
  row: Row,
  predicate: QueryPredicate,
): KernelResult<PredicateEvaluation> => {
  if (predicate.kind === "comparison") {
    const checkedColumn = columnName(predicate.column);
    if (!checkedColumn.ok) return checkedColumn;
    if (!Object.hasOwn(row, checkedColumn.value)) {
      return err("precondition-violated", `predicate column ${checkedColumn.value} does not exist`);
    }
    if (!validCellValue(predicate.value)) {
      return err("out-of-domain", `predicate value for ${checkedColumn.value} must be scalar and finite`);
    }
    const matched = compareCells(row[checkedColumn.value] ?? null, predicate.op, predicate.value);
    if (!matched.ok) return matched;
    return ok({ matched: matched.value, comparisons: 1 });
  }

  if (predicate.kind === "not") {
    const evaluated = evaluatePredicateInternal(row, predicate.predicate);
    return evaluated.ok
      ? ok({ matched: !evaluated.value.matched, comparisons: evaluated.value.comparisons })
      : evaluated;
  }

  if (predicate.predicates.length === 0) {
    return err("precondition-violated", `${predicate.kind} predicate requires at least one child`);
  }
  let comparisons = 0;
  if (predicate.kind === "and") {
    for (const child of predicate.predicates) {
      const evaluated = evaluatePredicateInternal(row, child);
      if (!evaluated.ok) return evaluated;
      comparisons += evaluated.value.comparisons;
      if (!evaluated.value.matched) return ok({ matched: false, comparisons });
    }
    return ok({ matched: true, comparisons });
  }
  for (const child of predicate.predicates) {
    const evaluated = evaluatePredicateInternal(row, child);
    if (!evaluated.ok) return evaluated;
    comparisons += evaluated.value.comparisons;
    if (evaluated.value.matched) return ok({ matched: true, comparisons });
  }
  return ok({ matched: false, comparisons });
};

const compareCells = (
  left: CellValue,
  op: QueryComparisonOperator,
  right: CellValue,
): KernelResult<boolean> => {
  if (op === "eq") return ok(left === right);
  if (op === "neq") return ok(left !== right);
  if (!validOrderingOperands(left, right)) {
    return err("out-of-domain", `${op} comparison requires finite numeric operands`);
  }
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (op === "lt") return ok(leftNumber < rightNumber);
  if (op === "lte") return ok(leftNumber <= rightNumber);
  if (op === "gt") return ok(leftNumber > rightNumber);
  if (op === "gte") return ok(leftNumber >= rightNumber);
  return err("precondition-violated", `unsupported comparison operator ${op}`);
};

const validOrderingOperands = (
  left: CellValue,
  right: CellValue,
): boolean =>
  typeof left === "number" &&
  Number.isFinite(left) &&
  typeof right === "number" &&
  Number.isFinite(right);

const validCellValue = (value: CellValue): boolean =>
  value === null ||
  typeof value === "string" ||
  typeof value === "boolean" ||
  (typeof value === "number" && Number.isFinite(value));

const toRelationalAggregate = (aggregate: GroupAggregateSpec): AggregateSpec => {
  const output = aggregate.output;
  if (aggregate.op === "count") {
    return { output, op: "count", ...(aggregate.column !== undefined && { column: aggregate.column }) };
  }
  return { output, op: "sum", ...(aggregate.column !== undefined && { column: aggregate.column }) };
};

export { columnName, tableName };
export type { CellValue, ColumnName, Row, Table, TableName } from "@paideia/relational-data";
