import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";

import {
  columnName,
  evaluatePredicate,
  executeQuery,
  selectRows,
  tableName,
  type QueryPredicate,
  type Row,
  type Table,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

const errCode = <T>(result: KernelResult<T>): string => {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected error result");
  return result.error.code;
};

const col = (value: string) => unwrap(columnName(value));
const name = (value: string) => unwrap(tableName(value));
const table = (tableId: string, rows: readonly Row[]): Table => ({ name: name(tableId), rows });

describe("predicate evaluation", () => {
  it("evaluates comparison, boolean composition, and negation predicates", () => {
    const row = { id: 1, amount: 40, region: "east", active: true };
    const predicate: QueryPredicate = {
      kind: "and",
      predicates: [
        { kind: "comparison", column: col("amount"), op: "gte", value: 30 },
        {
          kind: "or",
          predicates: [
            { kind: "comparison", column: col("region"), op: "eq", value: "west" },
            { kind: "not", predicate: { kind: "comparison", column: col("active"), op: "eq", value: false } },
          ],
        },
      ],
    };

    expect(unwrap(evaluatePredicate(row, predicate))).toBe(true);
  });

  it("returns error codes for missing columns, invalid values, and invalid ordering", () => {
    expect(
      errCode(evaluatePredicate({ id: 1 }, { kind: "comparison", column: col("missing"), op: "eq", value: 1 })),
    ).toBe("precondition-violated");
    expect(
      errCode(
        evaluatePredicate(
          { id: 1 },
          { kind: "comparison", column: col("id"), op: "eq", value: Number.NaN },
        ),
      ),
    ).toBe("out-of-domain");
    expect(
      errCode(
        evaluatePredicate(
          { label: "east" },
          { kind: "comparison", column: col("label"), op: "gt", value: 3 },
        ),
      ),
    ).toBe("out-of-domain");
    expect(errCode(evaluatePredicate({ id: 1 }, { kind: "and", predicates: [] }))).toBe(
      "precondition-violated",
    );
  });
});

describe("query execution", () => {
  const orders = table("orders", [
    { customer_id: 1, region: "east", amount: 20 },
    { customer_id: 2, region: "west", amount: 35 },
    { customer_id: 1, region: "east", amount: 45 },
    { customer_id: 4, region: "north", amount: 15 },
  ]);

  const customers = table("customers", [
    { id: 1, segment: "campus" },
    { id: 2, segment: "public" },
  ]);

  it("selects rows and records predicate comparison evidence", () => {
    const result = unwrap(
      selectRows(orders, { kind: "comparison", column: col("amount"), op: "gt", value: 20 }),
    );
    expect(result.table.rows).toEqual([
      { customer_id: 2, region: "west", amount: 35 },
      { customer_id: 1, region: "east", amount: 45 },
    ]);
    expect(result.evidence).toMatchObject({
      inputRows: 4,
      outputRows: 2,
      predicateComparisons: 4,
      joinComparisons: 0,
    });
  });

  it("runs select, join, group, and project steps left to right", () => {
    const result = unwrap(
      executeQuery({
        source: orders,
        steps: [
          { kind: "select", predicate: { kind: "comparison", column: col("amount"), op: "gte", value: 20 } },
          {
            kind: "equi-join",
            right: customers,
            leftKey: col("customer_id"),
            rightKey: col("id"),
            joinKind: "left",
          },
          {
            kind: "group",
            keys: [col("customers.segment")],
            aggregates: [
              { output: col("orders"), op: "count" },
              { output: col("revenue"), op: "sum", column: col("orders.amount") },
            ],
          },
          { kind: "project", columns: [col("customers.segment"), col("orders"), col("revenue")] },
        ],
      }),
    );

    expect(result.table.rows).toEqual([
      { "customers.segment": "campus", orders: 2, revenue: 65 },
      { "customers.segment": "public", orders: 1, revenue: 35 },
    ]);
    expect(result.evidence.steps.map((step) => step.kind)).toEqual([
      "select",
      "equi-join",
      "group",
      "project",
    ]);
    expect(result.evidence).toMatchObject({
      inputRows: 4,
      outputRows: 2,
      predicateComparisons: 4,
      joinComparisons: 6,
      projectedColumns: 6,
    });
  });

  it("rejects unsupported join shapes and aggregate operations outside the kernel scope", () => {
    expect(
      errCode(
        executeQuery({
          source: orders,
          steps: [
            {
              kind: "equi-join",
              right: customers,
              leftKey: col("customer_id"),
              rightKey: col("id"),
              joinKind: "right" as "inner",
            },
          ],
        }),
      ),
    ).toBe("precondition-violated");
    expect(
      errCode(
        executeQuery({
          source: orders,
          steps: [{ kind: "group", keys: [col("region")], aggregates: [{ output: col("bad"), op: "sum" }] }],
        }),
      ),
    ).toBe("precondition-violated");
  });

  it("does not mutate caller-owned tables while executing a plan", () => {
    const rows = [
      { id: 1, value: 10 },
      { id: 2, value: 20 },
    ];
    const before = rows.map((row) => ({ ...row }));
    unwrap(
      executeQuery({
        source: table("numbers", rows),
        steps: [
          { kind: "select", predicate: { kind: "comparison", column: col("value"), op: "gte", value: 10 } },
          { kind: "project", columns: [col("id")] },
        ],
      }),
    );
    expect(rows).toEqual(before);
  });
});

describe("properties", () => {
  it("selecting with value >= threshold returns only matching rows", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -50, max: 50 }), { maxLength: 25 }),
        fc.integer({ min: -50, max: 50 }),
        (values, threshold) => {
          const rows = values.map((value, index) => ({ id: index, value }));
          const result = unwrap(
            selectRows(table("numbers", rows), {
              kind: "comparison",
              column: col("value"),
              op: "gte",
              value: threshold,
            }),
          );
          expect(result.table.rows.map((row) => row.value)).toEqual(
            values.filter((value) => value >= threshold),
          );
          expect(result.evidence.predicateComparisons).toBe(values.length);
        },
      ),
    );
  });

  it("project step preserves row cardinality for valid projections", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 20 }), (values) => {
        const rows = values.map((value, index) => ({ id: index, value }));
        const result = unwrap(
          executeQuery({
            source: table("numbers", rows),
            steps: [{ kind: "project", columns: [col("id")] }],
          }),
        );
        expect(result.table.rows).toHaveLength(values.length);
      }),
    );
  });
});
