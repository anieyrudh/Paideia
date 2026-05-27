import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";

import {
  andGate,
  binaryStringToBits,
  bit,
  bits,
  bitsToBinaryString,
  dFlipFlop,
  evaluateGate,
  fullAdder,
  halfAdder,
  nandGate,
  norGate,
  notBit,
  orGate,
  rippleCarryAdd,
  sumOfProducts,
  truthTable,
  xorGate,
  xnorGate,
  type Bit,
  type LogicVector,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

const expectPrecondition = (result: KernelResult<unknown>) => {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe("precondition-violated");
  }
};

describe("bit constructors and binary conversion", () => {
  it("converts booleans, numeric bits, and binary strings", () => {
    expect(unwrap(bit(true))).toBe(1);
    expect(unwrap(bit(false))).toBe(0);
    expect(unwrap(bits([1, 0, true, false]))).toEqual([1, 0, 1, 0]);
    expect(unwrap(binaryStringToBits("1010"))).toEqual([0, 1, 0, 1]);
    expect(unwrap(bitsToBinaryString([0, 1, 0, 1]))).toBe("1010");
    expect(unwrap(bitsToBinaryString([1, 0, 1], { width: 5 }))).toBe("00101");
  });

  it("rejects invalid bit domains and impossible render widths", () => {
    expect(bit(2).ok).toBe(false);
    expect(bits([0, 2]).ok).toBe(false);
    expect(binaryStringToBits("10a1").ok).toBe(false);
    expectPrecondition(bitsToBinaryString([1, 0, 1], { width: 2 }));
  });

  it("round-trips binary strings", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 16 }), (bools) => {
        const text = bools.map((value) => (value ? "1" : "0")).join("");
        const parsed = binaryStringToBits(text);
        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
          expect(unwrap(bitsToBinaryString(parsed.value))).toBe(text);
        }
      }),
    );
  });
});

describe("logic gates", () => {
  it("computes canonical gate outputs", () => {
    expect(unwrap(notBit(0))).toBe(1);
    expect(unwrap(andGate([1, 1, 0]))).toBe(0);
    expect(unwrap(orGate([0, 0, 1]))).toBe(1);
    expect(unwrap(xorGate([1, 1, 1]))).toBe(1);
    expect(unwrap(nandGate([1, 1]))).toBe(0);
    expect(unwrap(norGate([0, 0]))).toBe(1);
    expect(unwrap(xnorGate([1, 0, 1]))).toBe(1);
    expect(unwrap(evaluateGate("xor", [1, 0]))).toBe(1);
  });

  it("rejects invalid arity and invalid runtime bits", () => {
    expectPrecondition(andGate([]));
    expectPrecondition(evaluateGate("not", [1, 0]));
    expectPrecondition(evaluateGate("bogus" as never, [1]));
    expect(andGate([1, 3] as unknown as LogicVector).ok).toBe(false);
  });

  it("keeps input vectors immutable and order-insensitive for commutative gates", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }), (raw) => {
        const vector = raw.map((value): Bit => (value ? 1 : 0));
        const reversed = [...vector].reverse();
        const original = [...vector];

        expect(unwrap(andGate(vector))).toBe(unwrap(andGate(reversed)));
        expect(unwrap(orGate(vector))).toBe(unwrap(orGate(reversed)));
        expect(unwrap(xorGate(vector))).toBe(unwrap(xorGate(reversed)));
        expect(vector).toEqual(original);
      }),
    );
  });
});

describe("adders", () => {
  it("computes half and full adder carries", () => {
    expect(unwrap(halfAdder(1, 1))).toEqual({ sum: 0, carry: 1 });
    expect(unwrap(fullAdder(1, 1, 1))).toEqual({ sum: 1, carryOut: 1 });
    expect(unwrap(fullAdder(1, 0, 0))).toEqual({ sum: 1, carryOut: 0 });
  });

  it("adds LSB-first vectors and reports final carry", () => {
    const result = unwrap(rippleCarryAdd([1, 0, 1], [1, 1, 0]));
    expect(result.sum).toEqual([0, 0, 0]);
    expect(result.carryOut).toBe(1);
    expect(result.unsignedValue).toBe(8);
  });

  it("preserves unsigned addition semantics for small vectors", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 31 }),
        fc.integer({ min: 0, max: 31 }),
        (left, right) => {
          const leftBits = unwrap(binaryStringToBits(left.toString(2)));
          const rightBits = unwrap(binaryStringToBits(right.toString(2)));
          const added = rippleCarryAdd(leftBits, rightBits);
          expect(added.ok).toBe(true);
          if (added.ok) {
            expect(added.value.unsignedValue).toBe(left + right);
          }
        },
      ),
    );
  });
});

describe("truth tables and sum of products", () => {
  it("generates rows in binary teaching order", () => {
    const table = unwrap(
      truthTable(["A", "B"], (inputs) =>
        inputs.A === 1 && inputs.B === 1 ? 1 : 0,
      ),
    );
    expect(table.rows).toEqual([
      { inputs: { A: 0, B: 0 }, output: 0 },
      { inputs: { A: 0, B: 1 }, output: 0 },
      { inputs: { A: 1, B: 0 }, output: 0 },
      { inputs: { A: 1, B: 1 }, output: 1 },
    ]);
  });

  it("covers every truth-table input combination exactly once", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (count) => {
        const names = Array.from({ length: count }, (_, index) => `A${index}`);
        const table = unwrap(
          truthTable(names, (inputs) =>
            Object.values(inputs).filter((value) => value === 1).length % 2 === 1
              ? 1
              : 0,
          ),
        );
        const rowKeys = table.rows.map((row) =>
          names.map((name) => row.inputs[name]).join(""),
        );
        expect(new Set(rowKeys).size).toBe(2 ** count);
        expect(table.rows).toHaveLength(2 ** count);
      }),
    );
  });

  it("rejects duplicate labels, evaluator failures, and non-bit outputs", () => {
    expectPrecondition(truthTable(["A", "A"], () => 0));
    expectPrecondition(
      truthTable(["A"], () => {
        throw new Error("boom");
      }),
    );
    expect(truthTable(["A"], () => 2 as unknown as Bit).ok).toBe(false);
  });

  it("simplifies small minterm sets deterministically", () => {
    const xor = unwrap(sumOfProducts(["A", "B"], [1, 2]));
    expect(xor.expression).toBe("!AB + A!B");
    expect(xor.implicants.map((term) => term.pattern)).toEqual([
      [0, 1],
      [1, 0],
    ]);

    const majority = unwrap(sumOfProducts(["A", "B", "C"], [3, 5, 6, 7]));
    expect(majority.expression).toBe("BC + AC + AB");
  });

  it("uses exact cover rather than greedy cover for minimal SOP", () => {
    const result = unwrap(sumOfProducts(["A", "B", "C"], [1, 2, 3, 4, 5, 6]));
    expect(result.implicants).toHaveLength(3);
    expect(
      result.implicants.reduce(
        (total, implicant) =>
          total + implicant.pattern.filter((value) => value !== null).length,
        0,
      ),
    ).toBe(6);
    expect(new Set(result.expression.split(" + "))).toEqual(
      new Set(["!AB", "A!C", "!BC"]),
    );
  });

  it("handles constant zero, constant one, don't-cares, and invalid domains", () => {
    expect(unwrap(sumOfProducts(["A", "B"], [])).expression).toBe("0");
    expect(unwrap(sumOfProducts(["A", "B"], [0, 1, 2, 3])).expression).toBe("1");
    expect(unwrap(sumOfProducts(["A", "B", "C"], [1, 3], [5, 7])).expression).toBe("C");
    expect(sumOfProducts(["A"], [2]).ok).toBe(false);
    expectPrecondition(sumOfProducts(["A"], [0], [0]));
  });
});

describe("D flip-flop transition", () => {
  it("updates only on rising edge", () => {
    expect(unwrap(dFlipFlop({ d: 1, previousQ: 0, clockRisingEdge: true }))).toEqual({
      q: 1,
      notQ: 0,
    });
    expect(unwrap(dFlipFlop({ d: 1, previousQ: 0, clockRisingEdge: false }))).toEqual({
      q: 0,
      notQ: 1,
    });
  });

  it("rejects invalid runtime clock values", () => {
    expectPrecondition(
      dFlipFlop({
        d: 1,
        previousQ: 0,
        clockRisingEdge: "false" as unknown as boolean,
      }),
    );
  });
});
