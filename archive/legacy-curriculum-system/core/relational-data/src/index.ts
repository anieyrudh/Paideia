import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type CellValue = string | number | boolean | null;
export type ColumnName = Brand<string, "RelationalData.ColumnName">;
export type TableName = Brand<string, "RelationalData.TableName">;
export type Row = Readonly<Record<string, CellValue>>;

export interface Table {
  readonly name: TableName;
  readonly rows: readonly Row[];
}

export type JoinKind = "inner" | "left" | "right" | "full";

export interface JoinInput {
  readonly left: Table;
  readonly right: Table;
  readonly leftKey: ColumnName;
  readonly rightKey: ColumnName;
  readonly kind: JoinKind;
}

export type AggregateOp = "count" | "sum" | "avg" | "min" | "max";

export interface AggregateSpec {
  readonly output: ColumnName;
  readonly op: AggregateOp;
  readonly column?: ColumnName;
}

export interface GroupByInput {
  readonly table: Table;
  readonly keys: readonly ColumnName[];
  readonly aggregates: readonly AggregateSpec[];
}

export const columnName = (value: string): KernelResult<ColumnName> => {
  if (value.trim() !== value || value.length === 0) {
    return err("precondition-violated", "columnName must be non-empty and unpadded");
  }
  return ok(value as ColumnName);
};

export const tableName = (value: string): KernelResult<TableName> => {
  if (value.trim() !== value || value.length === 0) {
    return err("precondition-violated", "tableName must be non-empty and unpadded");
  }
  return ok(value as TableName);
};

export const validateRow = (row: Row): KernelResult<Row> => {
  for (const [column, value] of Object.entries(row)) {
    const checkedColumn = columnName(column);
    if (!checkedColumn.ok) {
      return checkedColumn;
    }
    if (!validCell(value)) {
      return err("out-of-domain", `row value for ${column} must be scalar and finite`);
    }
  }
  return ok({ ...row });
};

export const validateTable = (table: Table): KernelResult<Table> => {
  const checkedName = tableName(table.name);
  if (!checkedName.ok) {
    return checkedName;
  }
  if (table.rows.length === 0) {
    return ok({ name: checkedName.value, rows: [] });
  }
  const first = table.rows[0];
  if (first === undefined) {
    return err("precondition-violated", "table row was missing");
  }
  const firstRow = validateRow(first);
  if (!firstRow.ok) {
    return firstRow;
  }
  const expectedColumns = sortedColumns(firstRow.value);
  const rows: Row[] = [firstRow.value];
  for (let index = 1; index < table.rows.length; index += 1) {
    const row = table.rows[index];
    if (row === undefined) {
      return err("precondition-violated", "table row was missing");
    }
    const checked = validateRow(row);
    if (!checked.ok) {
      return checked;
    }
    if (!sameColumns(expectedColumns, sortedColumns(checked.value))) {
      return err("precondition-violated", "all rows in a table must share the same columns");
    }
    rows.push(checked.value);
  }
  return ok({ name: checkedName.value, rows });
};

export const projectRows = (
  table: Table,
  columns: readonly ColumnName[],
): KernelResult<Table> => {
  const checked = validateTable(table);
  if (!checked.ok) {
    return checked;
  }
  const checkedColumns = validateColumns(columns);
  if (!checkedColumns.ok) {
    return checkedColumns;
  }
  for (const column of checkedColumns.value) {
    if (!hasColumn(checked.value, column)) {
      return err("precondition-violated", `projection column ${column} does not exist`);
    }
  }
  return ok({
    name: checked.value.name,
    rows: checked.value.rows.map((row) => {
      const projected: Record<string, CellValue> = {};
      for (const column of checkedColumns.value) {
        projected[column] = row[column] ?? null;
      }
      return projected;
    }),
  });
};

export const relationalJoin = (input: JoinInput): KernelResult<Table> => {
  const left = validateTable(input.left);
  if (!left.ok) {
    return left;
  }
  const right = validateTable(input.right);
  if (!right.ok) {
    return right;
  }
  const leftKey = columnName(input.leftKey);
  if (!leftKey.ok) {
    return leftKey;
  }
  const rightKey = columnName(input.rightKey);
  if (!rightKey.ok) {
    return rightKey;
  }
  if (left.value.name === right.value.name) {
    return err("precondition-violated", "joined tables must have distinct names");
  }
  if (!validJoinKind(input.kind)) {
    return err("precondition-violated", `unsupported join kind ${input.kind}`);
  }
  if (!hasColumn(left.value, leftKey.value)) {
    return err("precondition-violated", `left join key ${leftKey.value} does not exist`);
  }
  if (!hasColumn(right.value, rightKey.value)) {
    return err("precondition-violated", `right join key ${rightKey.value} does not exist`);
  }
  const matchedRight = new Set<number>();
  const rows: Row[] = [];
  for (const leftRow of left.value.rows) {
    const matches = right.value.rows
      .map((rightRow, index) => ({ rightRow, index }))
      .filter((entry) => cellEquals(leftRow[leftKey.value] ?? null, entry.rightRow[rightKey.value] ?? null));
    if (matches.length === 0) {
      if (input.kind === "left" || input.kind === "full") {
        rows.push(prefixedRow(left.value, leftRow, right.value, null));
      }
      continue;
    }
    for (const match of matches) {
      matchedRight.add(match.index);
      rows.push(prefixedRow(left.value, leftRow, right.value, match.rightRow));
    }
  }
  if (input.kind === "right" || input.kind === "full") {
    right.value.rows.forEach((rightRow, index) => {
      if (!matchedRight.has(index)) {
        rows.push(prefixedRow(left.value, null, right.value, rightRow));
      }
    });
  }
  return ok({ name: joinTableName(left.value.name, right.value.name), rows });
};

export const groupBy = (input: GroupByInput): KernelResult<Table> => {
  const checked = validateTable(input.table);
  if (!checked.ok) {
    return checked;
  }
  const keys = validateColumns(input.keys);
  if (!keys.ok) {
    return keys;
  }
  const aggregates = validateAggregates(input.aggregates, keys.value);
  if (!aggregates.ok) {
    return aggregates;
  }
  for (const key of keys.value) {
    if (!hasColumn(checked.value, key)) {
      return err("precondition-violated", `group key ${key} does not exist`);
    }
  }
  for (const aggregate of aggregates.value) {
    if (aggregate.column !== undefined && !hasColumn(checked.value, aggregate.column)) {
      return err("precondition-violated", `aggregate column ${aggregate.column} does not exist`);
    }
  }
  const groups = new Map<string, Row[]>();
  for (const row of checked.value.rows) {
    const key = JSON.stringify(keys.value.map((column) => row[column] ?? null));
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const rows: Row[] = [];
  for (const groupRows of groups.values()) {
    const first = groupRows[0];
    if (first === undefined) {
      return err("precondition-violated", "group was empty");
    }
    const output: Record<string, CellValue> = {};
    for (const key of keys.value) {
      output[key] = first[key] ?? null;
    }
    for (const aggregate of aggregates.value) {
      const value = aggregateValue(groupRows, aggregate);
      if (!value.ok) {
        return value;
      }
      output[aggregate.output] = value.value;
    }
    rows.push(output);
  }
  return ok({ name: checked.value.name, rows });
};

export const tableCardinality = (table: Table): KernelResult<number> => {
  const checked = validateTable(table);
  if (!checked.ok) {
    return checked;
  }
  return ok(checked.value.rows.length);
};

const validCell = (value: CellValue): boolean =>
  value === null ||
  typeof value === "string" ||
  typeof value === "boolean" ||
  (typeof value === "number" && Number.isFinite(value));

const sortedColumns = (row: Row): readonly string[] => Object.keys(row).sort();

const sameColumns = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((column, index) => column === right[index]);

const validateColumns = (
  columns: readonly ColumnName[],
): KernelResult<readonly ColumnName[]> => {
  const checked: ColumnName[] = [];
  const seen = new Set<string>();
  for (const column of columns) {
    const result = columnName(column);
    if (!result.ok) {
      return result;
    }
    if (seen.has(result.value)) {
      return err("precondition-violated", `duplicate column ${result.value}`);
    }
    seen.add(result.value);
    checked.push(result.value);
  }
  return ok(checked);
};

const hasColumn = (table: Table, column: ColumnName): boolean =>
  table.rows.length === 0 ? false : Object.hasOwn(table.rows[0] ?? {}, column);

const validJoinKind = (kind: JoinKind): boolean =>
  kind === "inner" || kind === "left" || kind === "right" || kind === "full";

const cellEquals = (left: CellValue, right: CellValue): boolean => left === right;

const joinTableName = (left: TableName, right: TableName): TableName =>
  `${left}_${right}_join` as TableName;

const tableColumns = (table: Table): readonly string[] =>
  table.rows.length === 0 ? [] : sortedColumns(table.rows[0] ?? {});

const prefixedRow = (
  left: Table,
  leftRow: Row | null,
  right: Table,
  rightRow: Row | null,
): Row => {
  const output: Record<string, CellValue> = {};
  for (const column of tableColumns(left)) {
    output[`${left.name}.${column}`] = leftRow?.[column] ?? null;
  }
  for (const column of tableColumns(right)) {
    output[`${right.name}.${column}`] = rightRow?.[column] ?? null;
  }
  return output;
};

const validateAggregates = (
  aggregates: readonly AggregateSpec[],
  keys: readonly ColumnName[],
): KernelResult<readonly AggregateSpec[]> => {
  const checked: AggregateSpec[] = [];
  const outputs = new Set<string>(keys);
  for (const aggregate of aggregates) {
    const output = columnName(aggregate.output);
    if (!output.ok) {
      return output;
    }
    if (outputs.has(output.value)) {
      return err("precondition-violated", `aggregate output ${output.value} collides with another output`);
    }
    if (!validAggregateOp(aggregate.op)) {
      return err("precondition-violated", `unsupported aggregate op ${aggregate.op}`);
    }
    if (aggregate.op !== "count" && aggregate.column === undefined) {
      return err("precondition-violated", `${aggregate.op} aggregate requires a column`);
    }
    const column =
      aggregate.column === undefined ? undefined : columnName(aggregate.column);
    if (column !== undefined && !column.ok) {
      return column;
    }
    outputs.add(output.value);
    checked.push({
      output: output.value,
      op: aggregate.op,
      ...(column !== undefined && { column: column.value }),
    });
  }
  return ok(checked);
};

const validAggregateOp = (op: AggregateOp): boolean =>
  op === "count" || op === "sum" || op === "avg" || op === "min" || op === "max";

const aggregateValue = (
  rows: readonly Row[],
  aggregate: AggregateSpec,
): KernelResult<CellValue> => {
  if (aggregate.op === "count") {
    if (aggregate.column === undefined) {
      return ok(rows.length);
    }
    return ok(rows.filter((row) => row[aggregate.column as string] !== null).length);
  }
  if (aggregate.column === undefined) {
    return err("precondition-violated", `${aggregate.op} aggregate requires a column`);
  }
  const values: number[] = [];
  for (const row of rows) {
    const value = row[aggregate.column];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return err("out-of-domain", `${aggregate.op} requires finite numeric values`);
    }
    values.push(value);
  }
  if (values.length === 0) {
    return err("precondition-violated", `${aggregate.op} aggregate has no values`);
  }
  switch (aggregate.op) {
    case "sum":
      return finiteAggregate(values.reduce((sum, value) => sum + value, 0), "sum");
    case "avg":
      return finiteAggregate(values.reduce((sum, value) => sum + value, 0) / values.length, "avg");
    case "min":
      return finiteAggregate(Math.min(...values), "min");
    case "max":
      return finiteAggregate(Math.max(...values), "max");
  }
};

const finiteAggregate = (value: number, label: string): KernelResult<number> =>
  Number.isFinite(value)
    ? ok(value)
    : err("out-of-domain", `${label} aggregate produced a non-finite value`);
