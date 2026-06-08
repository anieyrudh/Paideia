# @paideia/query-engine

Deterministic query-plan execution over small relational datasets. This kernel
is for educational simulations that need to show how a simple query flows
through selection, projection, equi-join, grouping, and row-count/comparison
evidence without building a SQL parser or database engine.

Use `core/relational-data` for isolated table operators. Use this package when a
container needs the left-to-right execution trace and cost evidence.

```ts
import {
  columnName,
  executeQuery,
  tableName,
  type Table,
} from "@paideia/query-engine";
import type { KernelResult } from "@paideia/shared";

const unwrap = <T>(result: KernelResult<T>): T => {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const orders: Table = {
  name: unwrap(tableName("orders")),
  rows: [
    { customer_id: 1, region: "east", amount: 20 },
    { customer_id: 2, region: "west", amount: 35 },
  ],
};

const result = executeQuery({
  source: orders,
  steps: [
    {
      kind: "select",
      predicate: {
        kind: "comparison",
        column: unwrap(columnName("amount")),
        op: "gte",
        value: 20,
      },
    },
  ],
});

if (result.ok) {
  console.log(result.value.table.rows);
  console.log(result.value.evidence.predicateComparisons);
}
```

## Public API

- `evaluatePredicate(row, predicate)`
- `selectRows(table, predicate)`
- `executeQuery(plan)`
- Predicate types for comparison, `and`, `or`, and `not`
- Query steps for `select`, `project`, `equi-join`, and `group`
- `QueryCostEvidence` for deterministic row/comparison evidence

All expected validation failures return `KernelResult.err(...)`.

## Boundaries

This package does not parse SQL, optimise plans, model indexes/storage, persist
data, execute arbitrary user code, render diagrams, or connect to databases.
