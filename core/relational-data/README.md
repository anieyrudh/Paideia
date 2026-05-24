# @paideia/relational-data

Pure relational-table helpers for Paideia SQL and database simulations.

Use this package when a container needs table validation, projection, joins,
GROUP BY style aggregation, or row-count checks over small educational datasets.

```ts
import {
  columnName,
  relationalJoin,
  tableName,
} from "@paideia/relational-data";

const ordersName = tableName("orders");
const customersName = tableName("customers");
const customerId = columnName("customer_id");
const id = columnName("id");

if (ordersName.ok && customersName.ok && customerId.ok && id.ok) {
  const result = relationalJoin({
    left: {
      name: ordersName.value,
      rows: [{ customer_id: 1, amount: 20 }],
    },
    right: {
      name: customersName.value,
      rows: [{ id: 1, name: "Ada" }],
    },
    leftKey: customerId.value,
    rightKey: id.value,
    kind: "inner",
  });
  console.log(result);
}
```

## Assumptions

- Rows are scalar records: string, finite number, boolean, or null.
- Every row in a table must have the same columns.
- Join output columns are prefixed as `<table>.<column>`.
- Outer joins pad missing-side columns with null.
- Aggregate helpers operate on already-structured tables. They do not parse SQL.
- Sum, average, min, and max require finite numeric values.
