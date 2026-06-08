import { describe, expect, it } from "vitest";
import {
  circuitTolerance,
  combineParallel,
  combineSeries,
  elementId,
  farads,
  henrys,
  hertz,
  nodeId,
  ohms,
  ohmsLaw,
  seriesRlcResonanceModel,
  solveSeriesAcCircuit,
  solveDcCircuit,
  volts,
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

const expectApprox = (
  actual: number,
  expected: number,
  tolerance = circuitTolerance.tight,
): void => {
  expect(
    Number.isFinite(actual) &&
      Number.isFinite(expected) &&
      Math.abs(actual - expected) <= tolerance,
  ).toBe(true);
};

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

    const overflowedExpectedVoltage = ohmsLaw({
      voltageVolts: 1,
      currentAmps: 1e308,
      resistanceOhms: 1e308,
    });
    expect(overflowedExpectedVoltage.ok).toBe(false);
    if (!overflowedExpectedVoltage.ok) {
      expect(overflowedExpectedVoltage.error.code).toBe("numerical-instability");
    }

    const overflowingPower = ohmsLaw({
      voltageVolts: Number.MAX_VALUE,
      currentAmps: 2,
      resistanceOhms: Number.MAX_VALUE / 2,
    });
    expect(overflowingPower.ok).toBe(false);
    if (!overflowingPower.ok) expect(overflowingPower.error.code).toBe("numerical-instability");

    const nearZeroCurrent = ohmsLaw({ voltageVolts: 1, currentAmps: circuitTolerance.tight / 2 });
    expect(nearZeroCurrent.ok).toBe(false);
    if (!nearZeroCurrent.ok) expect(nearZeroCurrent.error.code).toBe("precondition-violated");
  });

  it("combines series and parallel resistances", () => {
    const series = combineSeries([10, 20, 30]);
    expect(series.ok && series.value).toBe(60);

    const parallel = combineParallel([6, 3]);
    expect(parallel.ok).toBe(true);
    if (parallel.ok) expectApprox(parallel.value, 2);

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
          expectApprox(series.value, first + second);
          expectApprox(1 / parallel.value, 1 / first + 1 / second);
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
      expectApprox(drops.value.reduce((sum, value) => sum + value, 0), 12);
    }
  });

  it("solves series AC impedance and current phase", () => {
    const result = solveSeriesAcCircuit({
      sourceVoltageRmsVolts: 10,
      frequencyHertz: 50,
      elements: [
        { kind: "resistor", resistanceOhms: 40 },
        { kind: "inductor", inductanceHenrys: 0.2 },
        { kind: "capacitor", capacitanceFarads: 100e-6 },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const expectedReactance = 2 * Math.PI * 50 * 0.2 - 1 / (2 * Math.PI * 50 * 100e-6);
    const expectedMagnitude = Math.hypot(40, expectedReactance);
    expectApprox(result.value.impedance.realOhms, 40, circuitTolerance.loose);
    expectApprox(result.value.impedance.imaginaryOhms, expectedReactance, circuitTolerance.loose);
    expect(result.value.elementImpedances).toHaveLength(3);
    expectApprox(result.value.elementImpedances[1]?.imaginaryOhms ?? Number.NaN, 2 * Math.PI * 50 * 0.2, circuitTolerance.loose);
    expectApprox(result.value.impedanceMagnitudeOhms, expectedMagnitude, circuitTolerance.loose);
    expectApprox(result.value.currentRmsAmps, 10 / expectedMagnitude, circuitTolerance.loose);
    expectApprox(result.value.currentPhaseRadians, -Math.atan2(expectedReactance, 40), circuitTolerance.loose);
    expectApprox(
      result.value.realPowerWatts,
      result.value.currentRmsAmps * result.value.currentRmsAmps * 40,
      circuitTolerance.loose,
    );
  });

  it("rejects invalid series AC inputs with kernel errors", () => {
    const invalidFrequency = solveSeriesAcCircuit({
      sourceVoltageRmsVolts: 10,
      frequencyHertz: 0,
      elements: [{ kind: "resistor", resistanceOhms: 40 }],
    });
    expect(invalidFrequency.ok).toBe(false);
    if (!invalidFrequency.ok) expect(invalidFrequency.error.code).toBe("precondition-violated");

    const emptyCircuit = solveSeriesAcCircuit({
      sourceVoltageRmsVolts: 10,
      frequencyHertz: 60,
      elements: [],
    });
    expect(emptyCircuit.ok).toBe(false);
    if (!emptyCircuit.ok) expect(emptyCircuit.error.code).toBe("precondition-violated");
  });

  it("models series RLC resonance evidence", () => {
    const result = seriesRlcResonanceModel({
      sourceVoltageRmsVolts: volts(10),
      resistanceOhms: ohms(20),
      inductanceHenrys: henrys(0.1),
      capacitanceFarads: farads(100e-6),
      frequencyHertz: hertz(50.32921210448704),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expectApprox(result.value.resonantFrequencyHertz, 50.32921210448704, circuitTolerance.loose);
    expectApprox(result.value.netReactanceOhms, 0, circuitTolerance.loose);
    expectApprox(result.value.impedanceMagnitudeOhms, 20, circuitTolerance.loose);
    expectApprox(result.value.currentRmsAmps, 0.5, circuitTolerance.loose);
    expectApprox(result.value.qualityFactor, 1.5811388300841898, circuitTolerance.loose);
    expect(result.value.interpretation).toContain("near resonance");
  });

  it("returns complete zero results for all-reference zero-current circuits", () => {
    const gnd = mustNode("gnd");
    const r1 = mustElement("r1");
    const i1 = mustElement("i1");
    const i2 = mustElement("i2");

    const result = solveDcCircuit({
      referenceNode: gnd,
      elements: [
        { kind: "resistor", id: r1, from: gnd, to: gnd, resistanceOhms: 10 },
        { kind: "current-source", id: i1, from: gnd, to: gnd, currentAmps: 0 },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(valueForNode(result.value.nodeVoltages, gnd)).toBe(0);
      expect(valueForCurrent(result.value.elementCurrents, r1)).toBe(0);
      expect(valueForCurrent(result.value.elementCurrents, i1)).toBe(0);
      expect(totalPower(result.value.elementPowers)).toBe(0);
      expect(result.value.elementCurrents).toHaveLength(2);
      expect(result.value.elementPowers).toHaveLength(2);
    }

    const nonZeroReferenceCurrent = solveDcCircuit({
      referenceNode: gnd,
      elements: [
        { kind: "current-source", id: i2, from: gnd, to: gnd, currentAmps: 1 },
      ],
    });
    expect(nonZeroReferenceCurrent.ok).toBe(false);
    if (!nonZeroReferenceCurrent.ok) {
      expect(nonZeroReferenceCurrent.error.code).toBe("precondition-violated");
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
      expectApprox(valueForNode(result.value.nodeVoltages, n1), 10);
      expectApprox(valueForCurrent(result.value.elementCurrents, r1), 2);
      expectApprox(valueForCurrent(result.value.elementCurrents, v1), -2);
      expectApprox(totalPower(result.value.elementPowers), 0);
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
      expectApprox(valueForNode(result.value.nodeVoltages, n1), 2);
      expectApprox(valueForCurrent(result.value.elementCurrents, r1), 0.25);
      expectApprox(valueForCurrent(result.value.elementCurrents, i1), 0.25);
      expectApprox(totalPower(result.value.elementPowers), 0);
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
            expectApprox(valueForCurrent(result.value.elementCurrents, r1), expectedCurrent, circuitTolerance.loose);
            expectApprox(valueForCurrent(result.value.elementCurrents, r2), expectedCurrent, circuitTolerance.loose);
            expectApprox(valueForNode(result.value.nodeVoltages, n2), expectedCurrent * bottom, circuitTolerance.loose);
            expectApprox(totalPower(result.value.elementPowers), 0, circuitTolerance.loose);
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
