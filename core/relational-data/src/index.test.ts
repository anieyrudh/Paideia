import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";

import {
  columnName,
  groupBy,
  projectRows,
  relationalJoin,
  tableCardinality,
  tableName,
  validateRow,
  validateTable,
  type Row,
  type Table,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

const name = (value: string) => unwrap(tableName(value));
const col = (value: string) => unwrap(columnName(value));

const table = (tableId: string, rows: readonly Row[]): Table => ({
  name: name(tableId),
  rows,
});

describe("validation", () => {
  it("constructs names and rejects padded or empty names", () => {
    expect(name("orders")).toBe("orders");
    expect(col("customer_id")).toBe("customer_id");
    expect(tableName("").ok).toBe(false);
    expect(columnName(" id").ok).toBe(false);
  });

  it("validates scalar finite rows and consistent table columns", () => {
    expect(validateRow({ id: 1, name: "Ada", active: true, note: null }).ok).toBe(true);
    expect(validateRow({ id: Number.NaN }).ok).toBe(false);
    expect(validateTable(table("t", [{ id: 1 }, { id: 2 }])).ok).toBe(true);
    expect(validateTable(table("t", [{ id: 1 }, { other: 2 }])).ok).toBe(false);
  });

  it("does not mutate caller-owned rows or tables", () => {
    const rows = [{ id: 1, amount: 20 }, { id: 2, amount: 30 }];
    const before = rows.map((row) => ({ ...row }));
    unwrap(projectRows(table("orders", rows), [col("id")]));
    expect(rows).toEqual(before);
  });
});

describe("projection and joins", () => {
  it("projects selected columns in order", () => {
    const result = unwrap(projectRows(table("orders", [{ id: 1, amount: 20 }]), [col("amount")]));
    expect(result.rows).toEqual([{ amount: 20 }]);
  });

  it("performs inner and left joins with prefixed columns", () => {
    const customers = table("customers", [
      { id: 1, name: "Ada" },
      { id: 2, name: "Bo" },
    ]);
    const orders = table("orders", [
      { customer_id: 1, amount: 20 },
      { customer_id: 3, amount: 50 },
    ]);
    const inner = unwrap(
      relationalJoin({
        left: orders,
        right: customers,
        leftKey: col("customer_id"),
        rightKey: col("id"),
        kind: "inner",
      }),
    );
    expect(inner.rows).toEqual([
      {
        "orders.amount": 20,
        "orders.customer_id": 1,
        "customers.id": 1,
        "customers.name": "Ada",
      },
    ]);
    const left = unwrap(
      relationalJoin({
        left: orders,
        right: customers,
        leftKey: col("customer_id"),
        rightKey: col("id"),
        kind: "left",
      }),
    );
    expect(left.rows).toHaveLength(2);
    expect(left.rows[1]?.["customers.name"]).toBeNull();
  });

  it("performs right and full joins", () => {
    const left = table("a", [{ id: 1 }, { id: 2 }]);
    const right = table("b", [{ id: 2 }, { id: 3 }]);
    expect(
      unwrap(
        relationalJoin({
          left,
          right,
          leftKey: col("id"),
          rightKey: col("id"),
          kind: "right",
        }),
      ).rows.map((row) => row["a.id"]),
    ).toEqual([2, null]);
    expect(
      unwrap(
        relationalJoin({
          left,
          right,
          leftKey: col("id"),
          rightKey: col("id"),
          kind: "full",
        }),
      ).rows,
    ).toHaveLength(3);
  });

  it("rejects missing join and projection columns", () => {
    expect(projectRows(table("orders", [{ id: 1 }]), [col("amount")]).ok).toBe(false);
    expect(
      relationalJoin({
        left: table("a", [{ id: 1 }]),
        right: table("b", [{ other: 1 }]),
        leftKey: col("id"),
        rightKey: col("id"),
        kind: "inner",
      }).ok,
    ).toBe(false);
  });

  it("rejects same-name joins so prefixed columns stay unambiguous", () => {
    expect(
      relationalJoin({
        left: table("people", [{ id: 1, name: "Ada" }]),
        right: table("people", [{ id: 1, name: "Ada" }]),
        leftKey: col("id"),
        rightKey: col("id"),
        kind: "inner",
      }).ok,
    ).toBe(false);
  });
});

describe("grouping and aggregation", () => {
  const sales = table("sales", [
    { region: "east", amount: 10, units: 2 },
    { region: "east", amount: 30, units: 4 },
    { region: "west", amount: 20, units: 5 },
  ]);

  it("groups rows and computes count, sum, average, min, and max", () => {
    const result = unwrap(
      groupBy({
        table: sales,
        keys: [col("region")],
        aggregates: [
          { output: col("orders"), op: "count" },
          { output: col("revenue"), op: "sum", column: col("amount") },
          { output: col("avg_units"), op: "avg", column: col("units") },
          { output: col("min_amount"), op: "min", column: col("amount") },
          { output: col("max_amount"), op: "max", column: col("amount") },
        ],
      }),
    );
    expect(result.rows).toEqual([
      {
        region: "east",
        orders: 2,
        revenue: 40,
        avg_units: 3,
        min_amount: 10,
        max_amount: 30,
      },
      {
        region: "west",
        orders: 1,
        revenue: 20,
        avg_units: 5,
        min_amount: 20,
        max_amount: 20,
      },
    ]);
  });

  it("rejects aggregate output collisions and non-numeric sums", () => {
    expect(
      groupBy({
        table: sales,
        keys: [col("region")],
        aggregates: [{ output: col("region"), op: "count" }],
      }).ok,
    ).toBe(false);
    expect(
      groupBy({
        table: sales,
        keys: [col("region")],
        aggregates: [{ output: col("bad"), op: "sum", column: col("region") }],
      }).ok,
    ).toBe(false);
    expect(
      groupBy({
        table: sales,
        keys: [col("region")],
        aggregates: [{ output: col("missing_count"), op: "count", column: col("missing") }],
      }).ok,
    ).toBe(false);
  });
});

describe("properties", () => {
  it("inner join cardinality is bounded by cartesian product size", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 8 }),
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 1, maxLength: 8 }),
        (leftIds, rightIds) => {
          const left = table("left", leftIds.map((id, index) => ({ id, index })));
          const right = table("right", rightIds.map((id, index) => ({ id, index })));
          const joined = unwrap(
            relationalJoin({
              left,
              right,
              leftKey: col("id"),
              rightKey: col("id"),
              kind: "inner",
            }),
          );
          expect(joined.rows.length).toBeLessThanOrEqual(leftIds.length * rightIds.length);
        },
      ),
    );
  });

  it("table cardinality equals row count for valid tables", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 20 }), (values) => {
        const rows = values.map((value) => ({ value }));
        expect(unwrap(tableCardinality(table("numbers", rows)))).toBe(values.length);
      }),
    );
  });
});
