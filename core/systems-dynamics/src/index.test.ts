import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  evaluateAuxiliaries,
  initialState,
  simulateSystem,
  stepEuler,
  systemVariableId,
  validateSystemModel,
  type FlowSpec,
  type StockSpec,
  type SystemModel,
  type SystemState,
  type SystemVariableId,
} from "./index.js";

const id = (value: string): SystemVariableId => {
  const result = systemVariableId(value);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const rabbits = id("rabbits");
const births = id("births");
const deaths = id("deaths");
const growthRate = id("growthRate");

const stockValue = (state: SystemState, key: string): number => {
  const value = state[key];
  if (value === undefined) throw new Error(`Missing state value for ${key}`);
  return value;
};

const stock: StockSpec = {
  id: rabbits,
  label: "Rabbits",
  initial: 100,
  min: 0,
};

const model: SystemModel = {
  stocks: [stock],
  flows: [
    {
      id: births,
      label: "Births",
      target: rabbits,
      rate: (state) => stockValue(state, "rabbits") * 0.1,
    },
    {
      id: deaths,
      label: "Deaths",
      source: rabbits,
      rate: (state) => stockValue(state, "rabbits") * 0.04,
    },
  ],
  auxiliaries: [
    {
      id: growthRate,
      label: "Growth rate",
      compute: (state) => stockValue(state, "rabbits") * 0.06,
    },
  ],
};

describe("systemVariableId", () => {
  it("brands trimmed ids and rejects blank or whitespace ids", () => {
    expect(systemVariableId("stock_1").ok).toBe(true);
    expect(systemVariableId("").ok).toBe(false);
    expect(systemVariableId("stock 1").ok).toBe(false);
    expect(systemVariableId(" stock").ok).toBe(false);
    expect(systemVariableId("__proto__").ok).toBe(false);
    expect(systemVariableId("prototype").ok).toBe(false);
    expect(systemVariableId("constructor").ok).toBe(false);
  });
});

describe("validateSystemModel", () => {
  it("accepts a valid stock-flow model", () => {
    expect(validateSystemModel(model)).toEqual({ ok: true, value: model });
  });

  it("rejects duplicate ids, missing endpoints, invalid endpoints, and invalid bounds", () => {
    expect(validateSystemModel({ stocks: [], flows: [] }).ok).toBe(false);
    expect(validateSystemModel({ stocks: [stock, stock], flows: [] }).ok).toBe(false);
    expect(validateSystemModel({ stocks: [stock], flows: [{ id: births, label: "Bad", rate: () => 1 }] }).ok).toBe(false);
    expect(validateSystemModel({
      stocks: [stock],
      flows: [{ id: births, label: "Bad", source: id("missing"), rate: () => 1 }],
    }).ok).toBe(false);
    expect(validateSystemModel({
      stocks: [{ ...stock, initial: -1, min: 0 }],
      flows: [],
    }).ok).toBe(false);
  });
});

describe("initialState and auxiliaries", () => {
  it("creates initial state from stock specs", () => {
    const state = initialState(model);

    expect(state.ok).toBe(true);
    if (!state.ok) return;
    expect(state.value.rabbits).toBe(100);
    expect(Object.prototype.hasOwnProperty.call(state.value, "rabbits")).toBe(true);
  });

  it("evaluates auxiliaries without mutating the caller state", () => {
    const state = { rabbits: 100 };
    const before = JSON.stringify(state);
    const result = evaluateAuxiliaries(model, state, 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ rabbits: 100, growthRate: 6 });
    expect(JSON.stringify(state)).toBe(before);
  });

  it("rejects callback mutation attempts without changing caller state", () => {
    const state = { rabbits: 100 };
    const mutating: SystemModel = {
      stocks: [stock],
      flows: [],
      auxiliaries: [
        {
          id: growthRate,
          label: "Growth rate",
          compute: (current) => {
            const mutable = current as Record<string, number>;
            mutable.rabbits = 0;
            return 1;
          },
        },
      ],
    };

    const result = evaluateAuxiliaries(mutating, state, 0);

    expect(result.ok).toBe(false);
    expect(state.rabbits).toBe(100);
  });
});

describe("stepEuler", () => {
  it("steps stocks by inflows minus outflows", () => {
    const result = stepEuler(model, { rabbits: 100 }, 0, 1);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rabbits).toBeCloseTo(106);
  });

  it("rejects missing state, non-finite rates, thrown rates, and bound violations", () => {
    expect(stepEuler(model, {}, 0, 1).ok).toBe(false);
    expect(stepEuler({
      stocks: [stock],
      flows: [{ id: births, label: "Bad", target: rabbits, rate: () => Number.POSITIVE_INFINITY }],
    }, { rabbits: 100 }, 0, 1).ok).toBe(false);
    expect(stepEuler({
      stocks: [stock],
      flows: [{ id: births, label: "Bad", target: rabbits, rate: () => { throw new Error("bad"); } }],
    }, { rabbits: 100 }, 0, 1).ok).toBe(false);
    expect(stepEuler({
      stocks: [{ ...stock, max: 101 }],
      flows: [{ id: births, label: "Bad", target: rabbits, rate: () => 5 }],
    }, { rabbits: 100 }, 0, 1).ok).toBe(false);

    const inherited = Object.create({ rabbits: 100 }) as SystemState;
    expect(stepEuler(model, inherited, 0, 1).ok).toBe(false);
  });

  it("rejects non-deterministic rate callbacks", () => {
    let counter = 0;
    const result = stepEuler({
      stocks: [stock],
      flows: [{ id: births, label: "Counter", target: rabbits, rate: () => counter += 1 }],
    }, { rabbits: 100 }, 0, 1);

    expect(result.ok).toBe(false);
  });

  it("rejects flow callback mutation attempts without changing caller state", () => {
    const state = { rabbits: 100 };
    const result = stepEuler({
      stocks: [stock],
      flows: [
        {
          id: births,
          label: "Mutating births",
          target: rabbits,
          rate: (current) => {
            const mutable = current as Record<string, number>;
            mutable.rabbits = 0;
            return 1;
          },
        },
      ],
    }, state, 0, 1);

    expect(result.ok).toBe(false);
    expect(state.rabbits).toBe(100);
  });

  it("is monotonic for a constant positive inflow", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        fc.double({ min: 0.1, max: 5, noNaN: true }),
        (rate, dt) => {
          const flow: FlowSpec = { id: births, label: "Births", target: rabbits, rate: () => rate };
          const result = stepEuler({ stocks: [stock], flows: [flow] }, { rabbits: 100 }, 0, dt);
          expect(result.ok).toBe(true);
          if (!result.ok) return;
          expect(result.value.rabbits).toBeGreaterThanOrEqual(100);
        },
      ),
    );
  });

  it("conserves total stock across one internal transfer", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1_000, noNaN: true }),
        fc.double({ min: 0, max: 1_000, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (sourceInitial, targetInitial, rate) => {
          const source = id("source");
          const target = id("target");
          const transfer = id("transfer");
          const boundedRate = Math.min(rate, sourceInitial);
          const result = stepEuler({
            stocks: [
              { id: source, label: "Source", initial: sourceInitial, min: 0 },
              { id: target, label: "Target", initial: targetInitial, min: 0 },
            ],
            flows: [{ id: transfer, label: "Transfer", source, target, rate: () => boundedRate }],
          }, { source: sourceInitial, target: targetInitial }, 0, 1);

          expect(result.ok).toBe(true);
          if (!result.ok) return;
          expect(stockValue(result.value, "source") + stockValue(result.value, "target")).toBeCloseTo(
            sourceInitial + targetInitial,
          );
        },
      ),
    );
  });
});

describe("simulateSystem", () => {
  it("returns the initial state and every fixed time step", () => {
    const result = simulateSystem(model, { dt: 1, duration: 3 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(4);
    expect(result.value.map((point) => point.t)).toEqual([0, 1, 2, 3]);
    expect(result.value[3]?.state.rabbits).toBeGreaterThan(100);
    expect(result.value[3]?.state.growthRate).toBeGreaterThan(6);
  });

  it("lets flows depend on declared auxiliaries during simulation", () => {
    const result = simulateSystem({
      stocks: [stock],
      flows: [
        {
          id: births,
          label: "Births",
          target: rabbits,
          rate: (state) => stockValue(state, "growthRate"),
        },
      ],
      auxiliaries: [
        {
          id: growthRate,
          label: "Growth rate",
          compute: (state) => stockValue(state, "rabbits") * 0.1,
        },
      ],
    }, { dt: 1, duration: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]?.state.growthRate).toBe(10);
    expect(result.value[1]?.state.rabbits).toBe(110);
    expect(result.value[1]?.state.growthRate).toBe(11);
  });

  it("rejects invalid simulation specs", () => {
    expect(simulateSystem(model, { dt: 0, duration: 1 }).ok).toBe(false);
    expect(simulateSystem(model, { dt: 2, duration: 3 }).ok).toBe(false);
  });
});
