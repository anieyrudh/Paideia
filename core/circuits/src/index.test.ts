import { describe, expect, it } from "vitest";
import {
  circuitTolerance,
  combineParallel,
  combineSeries,
  elementId,
  nodeId,
  ohmsLaw,
  solveDcCircuit,
  voltageDivider,
  type CircuitElementId,
  type CircuitNodeId,
  type DcCircuitElement,
  type ElementCurrent,
  type ElementPower,
  type NodeVoltage,
} from "./index.js";

const mustNode = (id: string): CircuitNodeId => {
  const result = nodeId(id);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const mustElement = (id: string): CircuitElementId => {
  const result = elementId(id);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const valueForNode = (voltages: readonly NodeVoltage[], node: CircuitNodeId): number => {
  const match = voltages.find((entry) => entry.node === node);
  if (match === undefined) throw new Error(`Missing voltage for ${node}`);
  return match.voltageVolts;
};

const valueForCurrent = (
  currents: readonly ElementCurrent[],
  element: CircuitElementId,
): number => {
  const match = currents.find((entry) => entry.element === element);
  if (match === undefined) throw new Error(`Missing current for ${element}`);
  return match.currentAmps;
};

const totalPower = (powers: readonly ElementPower[]): number =>
  powers.reduce((sum, entry) => sum + entry.powerWatts, 0);

describe("@paideia/circuits", () => {
  it("constructs stable non-empty IDs", () => {
    const node = nodeId("  n1  ");
    expect(node.ok).toBe(true);
    if (node.ok) expect(node.value).toBe("n1");

    const element = elementId("");
    expect(element.ok).toBe(false);
    if (!element.ok) expect(element.error.code).toBe("precondition-violated");
  });

  it("solves and validates Ohm's law", () => {
    const solved = ohmsLaw({ voltageVolts: 12, resistanceOhms: 6 });
    expect(solved.ok).toBe(true);
    if (solved.ok) {
      expect(solved.value.currentAmps).toBe(2);
      expect(solved.value.powerWatts).toBe(24);
    }

    const inconsistent = ohmsLaw({ voltageVolts: 12, currentAmps: 1, resistanceOhms: 6 });
    expect(inconsistent.ok).toBe(false);
    if (!inconsistent.ok) expect(inconsistent.error.code).toBe("precondition-violated");
  });

  it("combines series and parallel resistances", () => {
    const series = combineSeries([10, 20, 30]);
    expect(series.ok && series.value).toBe(60);

    const parallel = combineParallel([6, 3]);
    expect(parallel.ok).toBe(true);
    if (parallel.ok) expect(parallel.value).toBeCloseTo(2, 12);

    const invalid = combineParallel([10, 0]);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error.code).toBe("precondition-violated");
  });

  it("preserves equivalent-resistance identities across generated values", () => {
    for (let first = 1; first <= 10; first += 1) {
      for (let second = 1; second <= 10; second += 1) {
        const series = combineSeries([first, second]);
        const parallel = combineParallel([first, second]);
        expect(series.ok).toBe(true);
        expect(parallel.ok).toBe(true);
        if (series.ok && parallel.ok) {
          expect(series.value).toBeCloseTo(first + second, 12);
          expect(1 / parallel.value).toBeCloseTo(1 / first + 1 / second, 12);
          expect(parallel.value).toBeLessThanOrEqual(Math.min(first, second));
        }
      }
    }
  });

  it("computes voltage-divider drops in input order", () => {
    const drops = voltageDivider(12, [100, 200, 300]);
    expect(drops.ok).toBe(true);
    if (drops.ok) {
      expect(drops.value).toEqual([2, 4, 6]);
      expect(drops.value.reduce((sum, value) => sum + value, 0)).toBeCloseTo(12, 12);
    }
  });

  it("solves a voltage source feeding a resistor", () => {
    const gnd = mustNode("gnd");
    const n1 = mustNode("n1");
    const v1 = mustElement("v1");
    const r1 = mustElement("r1");

    const result = solveDcCircuit({
      referenceNode: gnd,
      elements: [
        { kind: "voltage-source", id: v1, positive: n1, negative: gnd, voltageVolts: 10 },
        { kind: "resistor", id: r1, from: n1, to: gnd, resistanceOhms: 5 },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(valueForNode(result.value.nodeVoltages, gnd)).toBe(0);
      expect(valueForNode(result.value.nodeVoltages, n1)).toBeCloseTo(10, 12);
      expect(valueForCurrent(result.value.elementCurrents, r1)).toBeCloseTo(2, 12);
      expect(valueForCurrent(result.value.elementCurrents, v1)).toBeCloseTo(-2, 12);
      expect(totalPower(result.value.elementPowers)).toBeCloseTo(0, 12);
    }
  });

  it("solves a two-node current-source network with signed currents", () => {
    const gnd = mustNode("gnd");
    const n1 = mustNode("n1");
    const i1 = mustElement("i1");
    const r1 = mustElement("r1");

    const result = solveDcCircuit({
      referenceNode: gnd,
      elements: [
        { kind: "current-source", id: i1, from: gnd, to: n1, currentAmps: 0.25 },
        { kind: "resistor", id: r1, from: n1, to: gnd, resistanceOhms: 8 },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(valueForNode(result.value.nodeVoltages, n1)).toBeCloseTo(2, 12);
      expect(valueForCurrent(result.value.elementCurrents, r1)).toBeCloseTo(0.25, 12);
      expect(valueForCurrent(result.value.elementCurrents, i1)).toBeCloseTo(0.25, 12);
      expect(totalPower(result.value.elementPowers)).toBeCloseTo(0, 12);
    }
  });

  it("satisfies KCL and power balance across generated divider circuits", () => {
    const gnd = mustNode("gnd");
    const n1 = mustNode("n1");
    const n2 = mustNode("n2");
    const v1 = mustElement("v1");
    const r1 = mustElement("r1");
    const r2 = mustElement("r2");

    for (let supply = 1; supply <= 24; supply += 5) {
      for (let top = 2; top <= 20; top += 3) {
        for (let bottom = 1; bottom <= 15; bottom += 4) {
          const elements: readonly DcCircuitElement[] = [
            { kind: "voltage-source", id: v1, positive: n1, negative: gnd, voltageVolts: supply },
            { kind: "resistor", id: r1, from: n1, to: n2, resistanceOhms: top },
            { kind: "resistor", id: r2, from: n2, to: gnd, resistanceOhms: bottom },
          ];

          const result = solveDcCircuit({ referenceNode: gnd, elements });
          expect(result.ok).toBe(true);
          if (result.ok) {
            const expectedCurrent = supply / (top + bottom);
            expect(valueForCurrent(result.value.elementCurrents, r1)).toBeCloseTo(expectedCurrent, 10);
            expect(valueForCurrent(result.value.elementCurrents, r2)).toBeCloseTo(expectedCurrent, 10);
            expect(valueForNode(result.value.nodeVoltages, n2)).toBeCloseTo(expectedCurrent * bottom, 10);
            expect(Math.abs(totalPower(result.value.elementPowers))).toBeLessThan(circuitTolerance.loose);
          }
        }
      }
    }
  });

  it("returns kernel errors for invalid or singular circuits", () => {
    const gnd = mustNode("gnd");
    const n1 = mustNode("n1");
    const r1 = mustElement("r1");

    const invalidResistance = solveDcCircuit({
      referenceNode: gnd,
      elements: [{ kind: "resistor", id: r1, from: n1, to: gnd, resistanceOhms: 0 }],
    });
    expect(invalidResistance.ok).toBe(false);
    if (!invalidResistance.ok) expect(invalidResistance.error.code).toBe("precondition-violated");

    const floating = solveDcCircuit({
      referenceNode: gnd,
      elements: [{ kind: "resistor", id: r1, from: n1, to: mustNode("n2"), resistanceOhms: 10 }],
    });
    expect(floating.ok).toBe(false);
    if (!floating.ok) expect(floating.error.code).toBe("convergence-failed");
  });
});
