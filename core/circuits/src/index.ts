import {
  err,
  ok,
  type Brand,
  type KernelResult,
} from "@paideia/shared";

export type CircuitNodeId = Brand<string, "CircuitNodeId">;
export type CircuitElementId = Brand<string, "CircuitElementId">;

export const nodeId = (id: string): KernelResult<CircuitNodeId> => {
  const trimmed = id.trim();
  return trimmed.length > 0
    ? ok(trimmed as CircuitNodeId)
    : err("precondition-violated", "Circuit node id must be non-empty");
};

export const elementId = (id: string): KernelResult<CircuitElementId> => {
  const trimmed = id.trim();
  return trimmed.length > 0
    ? ok(trimmed as CircuitElementId)
    : err("precondition-violated", "Circuit element id must be non-empty");
};

export interface CircuitTolerance {
  readonly default: number;
  readonly tight: number;
  readonly loose: number;
}

export const circuitTolerance: CircuitTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export interface OhmsLawInput {
  readonly voltageVolts?: number;
  readonly currentAmps?: number;
  readonly resistanceOhms?: number;
}

export interface OhmsLawResult {
  readonly voltageVolts: number;
  readonly currentAmps: number;
  readonly resistanceOhms: number;
  readonly powerWatts: number;
}

export interface ComplexImpedance {
  readonly realOhms: number;
  readonly imaginaryOhms: number;
}

export interface AcResistorElement {
  readonly kind: "resistor";
  readonly resistanceOhms: number;
}

export interface AcInductorElement {
  readonly kind: "inductor";
  readonly inductanceHenrys: number;
}

export interface AcCapacitorElement {
  readonly kind: "capacitor";
  readonly capacitanceFarads: number;
}

export type SeriesAcElement =
  | AcResistorElement
  | AcInductorElement
  | AcCapacitorElement;

export interface SeriesAcCircuitInput {
  readonly sourceVoltageRmsVolts: number;
  readonly frequencyHertz: number;
  readonly elements: readonly SeriesAcElement[];
}

export interface SeriesAcCircuitSolution {
  readonly impedance: ComplexImpedance;
  readonly elementImpedances: readonly ComplexImpedance[];
  readonly impedanceMagnitudeOhms: number;
  readonly impedancePhaseRadians: number;
  readonly currentRmsAmps: number;
  readonly currentPhaseRadians: number;
  readonly powerFactor: number;
  readonly apparentPowerVoltAmps: number;
  readonly realPowerWatts: number;
  readonly reactivePowerVars: number;
}

export interface SeriesRlcResonanceInput {
  readonly sourceVoltageRmsVolts: number;
  readonly resistanceOhms: number;
  readonly inductanceHenrys: number;
  readonly capacitanceFarads: number;
  readonly frequencyHertz: number;
}

export interface SeriesRlcResonanceModel {
  readonly resonantFrequencyHertz: number;
  readonly angularFrequencyRadPerSec: number;
  readonly inductiveReactanceOhms: number;
  readonly capacitiveReactanceOhms: number;
  readonly netReactanceOhms: number;
  readonly impedanceMagnitudeOhms: number;
  readonly currentRmsAmps: number;
  readonly currentPhaseRadians: number;
  readonly powerFactor: number;
  readonly qualityFactor: number;
  readonly bandwidthHertz: number;
  readonly interpretation: string;
}

export interface ResistorElement {
  readonly kind: "resistor";
  readonly id: CircuitElementId;
  readonly from: CircuitNodeId;
  readonly to: CircuitNodeId;
  readonly resistanceOhms: number;
}

export interface CurrentSourceElement {
  readonly kind: "current-source";
  readonly id: CircuitElementId;
  readonly from: CircuitNodeId;
  readonly to: CircuitNodeId;
  readonly currentAmps: number;
}

export interface VoltageSourceElement {
  readonly kind: "voltage-source";
  readonly id: CircuitElementId;
  readonly positive: CircuitNodeId;
  readonly negative: CircuitNodeId;
  readonly voltageVolts: number;
}

export type DcCircuitElement =
  | ResistorElement
  | CurrentSourceElement
  | VoltageSourceElement;

export interface DcCircuit {
  readonly referenceNode: CircuitNodeId;
  readonly elements: readonly DcCircuitElement[];
}

export interface NodeVoltage {
  readonly node: CircuitNodeId;
  readonly voltageVolts: number;
}

export interface ElementCurrent {
  readonly element: CircuitElementId;
  readonly currentAmps: number;
}

export interface ElementPower {
  readonly element: CircuitElementId;
  readonly powerWatts: number;
}

export interface DcCircuitSolution {
  readonly nodeVoltages: readonly NodeVoltage[];
  readonly elementCurrents: readonly ElementCurrent[];
  readonly elementPowers: readonly ElementPower[];
}

type Matrix = number[][];

const present = (value: number | undefined): value is number => value !== undefined;

const finite = (value: number, label: string): KernelResult<number> =>
  Number.isFinite(value)
    ? ok(value)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const positiveResistance = (
  resistanceOhms: number,
  label = "resistanceOhms",
): KernelResult<number> => {
  const validFinite = finite(resistanceOhms, label);
  if (!validFinite.ok) return validFinite;
  return resistanceOhms > 0
    ? ok(resistanceOhms)
    : err("precondition-violated", `${label} must be > 0; got ${resistanceOhms}`);
};

const positiveFinite = (value: number, label: string): KernelResult<number> => {
  const validFinite = finite(value, label);
  if (!validFinite.ok) return validFinite;
  return value > 0
    ? ok(value)
    : err("precondition-violated", `${label} must be > 0; got ${value}`);
};

const withinTolerance = (actual: number, expected: number): boolean =>
  Math.abs(actual - expected) <= circuitTolerance.loose * Math.max(1, Math.abs(expected));

const finiteOhmsLawResult = (
  result: OhmsLawResult,
): KernelResult<OhmsLawResult> =>
  Number.isFinite(result.voltageVolts) &&
  Number.isFinite(result.currentAmps) &&
  Number.isFinite(result.resistanceOhms) &&
  Number.isFinite(result.powerWatts)
    ? ok(result)
    : err("numerical-instability", "Ohm's law derived outputs must be finite");

export const ohmsLaw = (input: OhmsLawInput): KernelResult<OhmsLawResult> => {
  const values = [
    present(input.voltageVolts),
    present(input.currentAmps),
    present(input.resistanceOhms),
  ].filter(Boolean).length;

  if (values < 2) {
    return err("precondition-violated", "Ohm's law requires at least two of voltage, current, and resistance");
  }

  if (present(input.voltageVolts)) {
    const validVoltage = finite(input.voltageVolts, "voltageVolts");
    if (!validVoltage.ok) return validVoltage;
  }
  if (present(input.currentAmps)) {
    const validCurrent = finite(input.currentAmps, "currentAmps");
    if (!validCurrent.ok) return validCurrent;
  }
  if (present(input.resistanceOhms)) {
    const validResistance = positiveResistance(input.resistanceOhms);
    if (!validResistance.ok) return validResistance;
  }

  if (present(input.voltageVolts) && present(input.currentAmps) && present(input.resistanceOhms)) {
    const expectedVoltage = input.currentAmps * input.resistanceOhms;
    if (!Number.isFinite(expectedVoltage)) {
      return err(
        "numerical-instability",
        `Ohm's law expected voltage must be finite; got ${expectedVoltage}`,
      );
    }
    if (!withinTolerance(input.voltageVolts, expectedVoltage)) {
      return err(
        "precondition-violated",
        `Ohm's law inputs are inconsistent: expected ${expectedVoltage} V, got ${input.voltageVolts} V`,
      );
    }
    return finiteOhmsLawResult({
      voltageVolts: input.voltageVolts,
      currentAmps: input.currentAmps,
      resistanceOhms: input.resistanceOhms,
      powerWatts: input.voltageVolts * input.currentAmps,
    });
  }

  if (!present(input.voltageVolts) && present(input.currentAmps) && present(input.resistanceOhms)) {
    const voltageVolts = input.currentAmps * input.resistanceOhms;
    return finiteOhmsLawResult({
      voltageVolts,
      currentAmps: input.currentAmps,
      resistanceOhms: input.resistanceOhms,
      powerWatts: voltageVolts * input.currentAmps,
    });
  }

  if (present(input.voltageVolts) && !present(input.currentAmps) && present(input.resistanceOhms)) {
    const currentAmps = input.voltageVolts / input.resistanceOhms;
    return finiteOhmsLawResult({
      voltageVolts: input.voltageVolts,
      currentAmps,
      resistanceOhms: input.resistanceOhms,
      powerWatts: input.voltageVolts * currentAmps,
    });
  }

  if (present(input.voltageVolts) && present(input.currentAmps) && !present(input.resistanceOhms)) {
    if (Math.abs(input.currentAmps) <= circuitTolerance.tight) {
      return err("precondition-violated", "Cannot solve resistance from zero current");
    }
    const resistanceOhms = input.voltageVolts / input.currentAmps;
    const validResistance = positiveResistance(resistanceOhms, "solved resistanceOhms");
    if (!validResistance.ok) return validResistance;
    return finiteOhmsLawResult({
      voltageVolts: input.voltageVolts,
      currentAmps: input.currentAmps,
      resistanceOhms,
      powerWatts: input.voltageVolts * input.currentAmps,
    });
  }

  return err("precondition-violated", "Unsupported Ohm's law input combination");
};

export const combineSeries = (
  resistancesOhms: readonly number[],
): KernelResult<number> => {
  if (resistancesOhms.length === 0) {
    return err("precondition-violated", "Series combination requires at least one resistor");
  }

  let total = 0;
  for (let index = 0; index < resistancesOhms.length; index += 1) {
    const resistance = resistancesOhms[index];
    if (resistance === undefined) {
      return err("numerical-instability", "Series resistance array changed during iteration");
    }
    const validResistance = positiveResistance(resistance, `resistancesOhms[${index}]`);
    if (!validResistance.ok) return validResistance;
    total += resistance;
  }
  return ok(total);
};

export const combineParallel = (
  resistancesOhms: readonly number[],
): KernelResult<number> => {
  if (resistancesOhms.length === 0) {
    return err("precondition-violated", "Parallel combination requires at least one resistor");
  }

  let conductanceSiemens = 0;
  for (let index = 0; index < resistancesOhms.length; index += 1) {
    const resistance = resistancesOhms[index];
    if (resistance === undefined) {
      return err("numerical-instability", "Parallel resistance array changed during iteration");
    }
    const validResistance = positiveResistance(resistance, `resistancesOhms[${index}]`);
    if (!validResistance.ok) return validResistance;
    conductanceSiemens += 1 / resistance;
  }
  return ok(1 / conductanceSiemens);
};

export const voltageDivider = (
  supplyVoltageVolts: number,
  resistancesOhms: readonly number[],
): KernelResult<readonly number[]> => {
  const validSupply = finite(supplyVoltageVolts, "supplyVoltageVolts");
  if (!validSupply.ok) return validSupply;

  const total = combineSeries(resistancesOhms);
  if (!total.ok) return total;

  return ok(resistancesOhms.map((resistance) => supplyVoltageVolts * (resistance / total.value)));
};

const elementImpedance = (
  element: SeriesAcElement,
  angularFrequencyRadPerSec: number,
): KernelResult<ComplexImpedance> => {
  switch (element.kind) {
    case "resistor": {
      const resistance = positiveResistance(element.resistanceOhms);
      return resistance.ok
        ? ok({ realOhms: resistance.value, imaginaryOhms: 0 })
        : resistance;
    }
    case "inductor": {
      const inductance = positiveFinite(element.inductanceHenrys, "inductanceHenrys");
      return inductance.ok
        ? ok({ realOhms: 0, imaginaryOhms: angularFrequencyRadPerSec * inductance.value })
        : inductance;
    }
    case "capacitor": {
      const capacitance = positiveFinite(element.capacitanceFarads, "capacitanceFarads");
      return capacitance.ok
        ? ok({ realOhms: 0, imaginaryOhms: -1 / (angularFrequencyRadPerSec * capacitance.value) })
        : capacitance;
    }
  }
};

export const solveSeriesAcCircuit = (
  input: SeriesAcCircuitInput,
): KernelResult<SeriesAcCircuitSolution> => {
  const sourceVoltage = positiveFinite(input.sourceVoltageRmsVolts, "sourceVoltageRmsVolts");
  if (!sourceVoltage.ok) return sourceVoltage;
  const frequency = positiveFinite(input.frequencyHertz, "frequencyHertz");
  if (!frequency.ok) return frequency;
  if (input.elements.length === 0) {
    return err("precondition-violated", "Series AC circuit requires at least one element");
  }

  const angularFrequencyRadPerSec = 2 * Math.PI * frequency.value;
  let realOhms = 0;
  let imaginaryOhms = 0;
  const elementImpedances: ComplexImpedance[] = [];
  for (let index = 0; index < input.elements.length; index += 1) {
    const element = input.elements[index];
    if (element === undefined) {
      return err("numerical-instability", "Series AC element array changed during iteration");
    }
    const impedance = elementImpedance(element, angularFrequencyRadPerSec);
    if (!impedance.ok) return impedance;
    elementImpedances.push(impedance.value);
    realOhms += impedance.value.realOhms;
    imaginaryOhms += impedance.value.imaginaryOhms;
  }

  const impedanceMagnitudeOhms = Math.hypot(realOhms, imaginaryOhms);
  if (impedanceMagnitudeOhms <= circuitTolerance.tight) {
    return err("precondition-violated", "Series AC impedance magnitude must be non-zero");
  }
  const impedancePhaseRadians = Math.atan2(imaginaryOhms, realOhms);
  const currentRmsAmps = sourceVoltage.value / impedanceMagnitudeOhms;
  const apparentPowerVoltAmps = sourceVoltage.value * currentRmsAmps;
  const realPowerWatts = currentRmsAmps * currentRmsAmps * realOhms;
  const reactivePowerVars = currentRmsAmps * currentRmsAmps * imaginaryOhms;
  const solution = {
    impedance: { realOhms, imaginaryOhms },
    elementImpedances,
    impedanceMagnitudeOhms,
    impedancePhaseRadians,
    currentRmsAmps,
    currentPhaseRadians: -impedancePhaseRadians,
    powerFactor: Math.cos(impedancePhaseRadians),
    apparentPowerVoltAmps,
    realPowerWatts,
    reactivePowerVars,
  };

  return Number.isFinite(solution.impedance.realOhms) &&
    Number.isFinite(solution.impedance.imaginaryOhms) &&
    Number.isFinite(solution.impedanceMagnitudeOhms) &&
    Number.isFinite(solution.impedancePhaseRadians) &&
    Number.isFinite(solution.currentRmsAmps) &&
    Number.isFinite(solution.currentPhaseRadians) &&
    Number.isFinite(solution.powerFactor) &&
    Number.isFinite(solution.apparentPowerVoltAmps) &&
    Number.isFinite(solution.realPowerWatts) &&
    Number.isFinite(solution.reactivePowerVars)
    ? ok(solution)
    : err("numerical-instability", "Series AC circuit solution must be finite");
};

export const seriesRlcResonanceModel = (
  input: SeriesRlcResonanceInput,
): KernelResult<SeriesRlcResonanceModel> => {
  const sourceVoltage = positiveFinite(input.sourceVoltageRmsVolts, "sourceVoltageRmsVolts");
  if (!sourceVoltage.ok) return sourceVoltage;
  const resistance = positiveResistance(input.resistanceOhms);
  if (!resistance.ok) return resistance;
  const inductance = positiveFinite(input.inductanceHenrys, "inductanceHenrys");
  if (!inductance.ok) return inductance;
  const capacitance = positiveFinite(input.capacitanceFarads, "capacitanceFarads");
  if (!capacitance.ok) return capacitance;
  const frequency = positiveFinite(input.frequencyHertz, "frequencyHertz");
  if (!frequency.ok) return frequency;

  const solution = solveSeriesAcCircuit({
    sourceVoltageRmsVolts: sourceVoltage.value,
    frequencyHertz: frequency.value,
    elements: [
      { kind: "resistor", resistanceOhms: resistance.value },
      { kind: "inductor", inductanceHenrys: inductance.value },
      { kind: "capacitor", capacitanceFarads: capacitance.value },
    ],
  });
  if (!solution.ok) return solution;

  const angularFrequencyRadPerSec = 2 * Math.PI * frequency.value;
  const inductiveReactanceOhms = angularFrequencyRadPerSec * inductance.value;
  const capacitiveReactanceOhms = 1 / (angularFrequencyRadPerSec * capacitance.value);
  const netReactanceOhms = inductiveReactanceOhms - capacitiveReactanceOhms;
  const resonantFrequencyHertz =
    1 / (2 * Math.PI * Math.sqrt(inductance.value * capacitance.value));
  const qualityFactor =
    (1 / resistance.value) * Math.sqrt(inductance.value / capacitance.value);
  const bandwidthHertz = resonantFrequencyHertz / qualityFactor;
  const detuningRatio = (frequency.value - resonantFrequencyHertz) / resonantFrequencyHertz;
  const interpretation =
    Math.abs(detuningRatio) < 0.03
      ? "near resonance: inductive and capacitive reactance nearly cancel, so current is high"
      : netReactanceOhms > 0
        ? "above resonance: inductive reactance dominates, so current lags the source voltage"
        : "below resonance: capacitive reactance dominates, so current leads the source voltage";

  const model: SeriesRlcResonanceModel = {
    angularFrequencyRadPerSec,
    bandwidthHertz,
    capacitiveReactanceOhms,
    currentPhaseRadians: solution.value.currentPhaseRadians,
    currentRmsAmps: solution.value.currentRmsAmps,
    impedanceMagnitudeOhms: solution.value.impedanceMagnitudeOhms,
    inductiveReactanceOhms,
    interpretation,
    netReactanceOhms,
    powerFactor: solution.value.powerFactor,
    qualityFactor,
    resonantFrequencyHertz,
  };

  return Object.values(model).every((value) => typeof value === "string" || Number.isFinite(value))
    ? ok(model)
    : err("numerical-instability", "Series RLC resonance model must be finite");
};

const elementEndpoints = (
  element: DcCircuitElement,
): readonly [CircuitNodeId, CircuitNodeId] => {
  switch (element.kind) {
    case "resistor":
    case "current-source":
      return [element.from, element.to];
    case "voltage-source":
      return [element.positive, element.negative];
  }
};

const collectNodes = (
  circuit: DcCircuit,
): KernelResult<readonly CircuitNodeId[]> => {
  const nodeSet = new Set<CircuitNodeId>([circuit.referenceNode]);
  const elementIds = new Set<CircuitElementId>();

  for (const element of circuit.elements) {
    if (elementIds.has(element.id)) {
      return err("precondition-violated", `Duplicate circuit element id: ${element.id}`);
    }
    elementIds.add(element.id);

    const [first, second] = elementEndpoints(element);
    nodeSet.add(first);
    nodeSet.add(second);

    switch (element.kind) {
      case "resistor": {
        const validResistance = positiveResistance(element.resistanceOhms, `${element.id}.resistanceOhms`);
        if (!validResistance.ok) return validResistance;
        break;
      }
      case "current-source": {
        const validCurrent = finite(element.currentAmps, `${element.id}.currentAmps`);
        if (!validCurrent.ok) return validCurrent;
        break;
      }
      case "voltage-source": {
        const validVoltage = finite(element.voltageVolts, `${element.id}.voltageVolts`);
        if (!validVoltage.ok) return validVoltage;
        break;
      }
    }
  }

  return ok([...nodeSet]);
};

const makeMatrix = (size: number): Matrix =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => 0));

const addToMatrix = (
  matrix: Matrix,
  row: number,
  column: number,
  value: number,
): KernelResult<void> => {
  const matrixRow = matrix[row];
  if (matrixRow === undefined || matrixRow[column] === undefined) {
    return err("numerical-instability", "Circuit matrix stamp target is missing");
  }
  matrixRow[column] += value;
  return ok(undefined);
};

const stampNode = (
  vector: number[],
  nodeIndex: ReadonlyMap<CircuitNodeId, number>,
  node: CircuitNodeId,
  value: number,
): KernelResult<void> => {
  const index = nodeIndex.get(node);
  if (index === undefined) return ok(undefined);
  if (vector[index] === undefined) {
    return err("numerical-instability", "Circuit RHS stamp target is missing");
  }
  vector[index] += value;
  return ok(undefined);
};

const stampConductance = (
  matrix: Matrix,
  nodeIndex: ReadonlyMap<CircuitNodeId, number>,
  from: CircuitNodeId,
  to: CircuitNodeId,
  conductanceSiemens: number,
): KernelResult<void> => {
  const fromIndex = nodeIndex.get(from);
  const toIndex = nodeIndex.get(to);

  if (fromIndex !== undefined) {
    const stamped = addToMatrix(matrix, fromIndex, fromIndex, conductanceSiemens);
    if (!stamped.ok) return stamped;
  }
  if (toIndex !== undefined) {
    const stamped = addToMatrix(matrix, toIndex, toIndex, conductanceSiemens);
    if (!stamped.ok) return stamped;
  }
  if (fromIndex !== undefined && toIndex !== undefined) {
    const stampedFromTo = addToMatrix(matrix, fromIndex, toIndex, -conductanceSiemens);
    if (!stampedFromTo.ok) return stampedFromTo;
    const stampedToFrom = addToMatrix(matrix, toIndex, fromIndex, -conductanceSiemens);
    if (!stampedToFrom.ok) return stampedToFrom;
  }

  return ok(undefined);
};

const stampVoltageSource = (
  matrix: Matrix,
  rhs: number[],
  nodeIndex: ReadonlyMap<CircuitNodeId, number>,
  sourceIndex: number,
  nodeCount: number,
  source: VoltageSourceElement,
): KernelResult<void> => {
  const row = nodeCount + sourceIndex;
  const positiveIndex = nodeIndex.get(source.positive);
  const negativeIndex = nodeIndex.get(source.negative);

  if (positiveIndex !== undefined) {
    const upper = addToMatrix(matrix, positiveIndex, row, 1);
    if (!upper.ok) return upper;
    const lower = addToMatrix(matrix, row, positiveIndex, 1);
    if (!lower.ok) return lower;
  }
  if (negativeIndex !== undefined) {
    const upper = addToMatrix(matrix, negativeIndex, row, -1);
    if (!upper.ok) return upper;
    const lower = addToMatrix(matrix, row, negativeIndex, -1);
    if (!lower.ok) return lower;
  }
  if (rhs[row] === undefined) {
    return err("numerical-instability", "Circuit voltage-source RHS row is missing");
  }
  rhs[row] = source.voltageVolts;
  return ok(undefined);
};

const solveLinearSystem = (
  inputMatrix: Matrix,
  inputRhs: readonly number[],
): KernelResult<readonly number[]> => {
  const size = inputMatrix.length;
  const matrix = inputMatrix.map((row) => [...row]);
  const rhs = [...inputRhs];

  for (let pivotColumn = 0; pivotColumn < size; pivotColumn += 1) {
    let pivotRow = pivotColumn;
    let pivotMagnitude = Math.abs(matrix[pivotRow]?.[pivotColumn] ?? 0);

    for (let row = pivotColumn + 1; row < size; row += 1) {
      const magnitude = Math.abs(matrix[row]?.[pivotColumn] ?? 0);
      if (magnitude > pivotMagnitude) {
        pivotRow = row;
        pivotMagnitude = magnitude;
      }
    }

    if (pivotMagnitude <= circuitTolerance.tight) {
      return err(
        "convergence-failed",
        "DC circuit matrix is singular; check for floating nodes or contradictory ideal sources",
      );
    }

    const pivotValues = matrix[pivotRow];
    const currentValues = matrix[pivotColumn];
    if (pivotValues === undefined || currentValues === undefined) {
      return err("numerical-instability", "Linear solver matrix row is missing");
    }
    matrix[pivotRow] = currentValues;
    matrix[pivotColumn] = pivotValues;

    const pivotRhs = rhs[pivotRow];
    const currentRhs = rhs[pivotColumn];
    if (pivotRhs === undefined || currentRhs === undefined) {
      return err("numerical-instability", "Linear solver RHS row is missing");
    }
    rhs[pivotRow] = currentRhs;
    rhs[pivotColumn] = pivotRhs;

    const pivotRowValues = matrix[pivotColumn];
    if (pivotRowValues === undefined) {
      return err("numerical-instability", "Linear solver pivot row is missing");
    }
    const pivot = pivotRowValues[pivotColumn];
    if (pivot === undefined) {
      return err("numerical-instability", "Linear solver pivot is missing");
    }

    for (let column = pivotColumn; column < size; column += 1) {
      const value = pivotRowValues[column];
      if (value === undefined) {
        return err("numerical-instability", "Linear solver cell is missing");
      }
      pivotRowValues[column] = value / pivot;
    }
    const normalizedRhs = rhs[pivotColumn];
    if (normalizedRhs === undefined) {
      return err("numerical-instability", "Linear solver normalized RHS is missing");
    }
    rhs[pivotColumn] = normalizedRhs / pivot;

    for (let row = 0; row < size; row += 1) {
      if (row === pivotColumn) continue;
      const rowValues = matrix[row];
      if (rowValues === undefined) {
        return err("numerical-instability", "Linear solver elimination row is missing");
      }
      const factor = rowValues[pivotColumn];
      if (factor === undefined) {
        return err("numerical-instability", "Linear solver elimination cell is missing");
      }
      if (Math.abs(factor) <= circuitTolerance.tight) continue;

      for (let column = pivotColumn; column < size; column += 1) {
        const target = rowValues[column];
        const source = pivotRowValues[column];
        if (target === undefined || source === undefined) {
          return err("numerical-instability", "Linear solver elimination row is missing");
        }
        rowValues[column] = target - factor * source;
      }
      const rowRhs = rhs[row];
      const pivotColumnRhs = rhs[pivotColumn];
      if (rowRhs === undefined || pivotColumnRhs === undefined) {
        return err("numerical-instability", "Linear solver elimination RHS is missing");
      }
      rhs[row] = rowRhs - factor * pivotColumnRhs;
    }
  }

  return ok(rhs);
};

const voltageAt = (
  node: CircuitNodeId,
  referenceNode: CircuitNodeId,
  nodeIndex: ReadonlyMap<CircuitNodeId, number>,
  solution: readonly number[],
): KernelResult<number> => {
  if (node === referenceNode) return ok(0);
  const index = nodeIndex.get(node);
  if (index === undefined) {
    return err("precondition-violated", `Unknown circuit node: ${node}`);
  }
  const voltage = solution[index];
  return voltage !== undefined
    ? ok(voltage)
    : err("numerical-instability", `Missing solved voltage for node: ${node}`);
};

export const solveDcCircuit = (
  circuit: DcCircuit,
): KernelResult<DcCircuitSolution> => {
  const nodes = collectNodes(circuit);
  if (!nodes.ok) return nodes;

  const nonReferenceNodes = nodes.value.filter((node) => node !== circuit.referenceNode);
  const nodeIndex = new Map<CircuitNodeId, number>(
    nonReferenceNodes.map((node, index) => [node, index] as const),
  );
  const voltageSources = circuit.elements.filter(
    (element): element is VoltageSourceElement => element.kind === "voltage-source",
  );
  const voltageSourceIndex = new Map<CircuitElementId, number>(
    voltageSources.map((source, index) => [source.id, index] as const),
  );
  const nodeCount = nonReferenceNodes.length;
  const unknownCount = nodeCount + voltageSources.length;

  if (unknownCount === 0) {
    const elementCurrents: ElementCurrent[] = [];
    const elementPowers: ElementPower[] = [];

    for (const element of circuit.elements) {
      switch (element.kind) {
        case "resistor":
          elementCurrents.push({ element: element.id, currentAmps: 0 });
          elementPowers.push({ element: element.id, powerWatts: 0 });
          break;
        case "current-source":
          if (Math.abs(element.currentAmps) > circuitTolerance.tight) {
            return err(
              "precondition-violated",
              `All-reference current source ${element.id} must have zero current`,
            );
          }
          elementCurrents.push({ element: element.id, currentAmps: 0 });
          elementPowers.push({ element: element.id, powerWatts: 0 });
          break;
        case "voltage-source":
          return err(
            "numerical-instability",
            `Unexpected voltage source ${element.id} in zero-unknown circuit`,
          );
      }
    }

    return ok({
      nodeVoltages: [{ node: circuit.referenceNode, voltageVolts: 0 }],
      elementCurrents,
      elementPowers,
    });
  }

  const matrix = makeMatrix(unknownCount);
  const rhs = Array.from({ length: unknownCount }, () => 0);

  for (const element of circuit.elements) {
    switch (element.kind) {
      case "resistor": {
        const stamped = stampConductance(
          matrix,
          nodeIndex,
          element.from,
          element.to,
          1 / element.resistanceOhms,
        );
        if (!stamped.ok) return stamped;
        break;
      }
      case "current-source": {
        const stampedFrom = stampNode(rhs, nodeIndex, element.from, -element.currentAmps);
        if (!stampedFrom.ok) return stampedFrom;
        const stampedTo = stampNode(rhs, nodeIndex, element.to, element.currentAmps);
        if (!stampedTo.ok) return stampedTo;
        break;
      }
      case "voltage-source": {
        const sourceIndex = voltageSourceIndex.get(element.id);
        if (sourceIndex === undefined) {
          return err("numerical-instability", `Voltage source index missing for ${element.id}`);
        }
        const stamped = stampVoltageSource(matrix, rhs, nodeIndex, sourceIndex, nodeCount, element);
        if (!stamped.ok) return stamped;
        break;
      }
    }
  }

  const solution = solveLinearSystem(matrix, rhs);
  if (!solution.ok) return solution;

  const nodeVoltages: NodeVoltage[] = [
    { node: circuit.referenceNode, voltageVolts: 0 },
  ];
  for (let index = 0; index < nonReferenceNodes.length; index += 1) {
    const node = nonReferenceNodes[index];
    const voltageVolts = solution.value[index];
    if (node === undefined || voltageVolts === undefined) {
      return err("numerical-instability", "Solved node-voltage vector is incomplete");
    }
    nodeVoltages.push({ node, voltageVolts });
  }

  const elementCurrents: ElementCurrent[] = [];
  const elementPowers: ElementPower[] = [];

  for (const element of circuit.elements) {
    const [firstNode, secondNode] = elementEndpoints(element);
    const firstVoltage = voltageAt(firstNode, circuit.referenceNode, nodeIndex, solution.value);
    if (!firstVoltage.ok) return firstVoltage;
    const secondVoltage = voltageAt(secondNode, circuit.referenceNode, nodeIndex, solution.value);
    if (!secondVoltage.ok) return secondVoltage;
    const voltageDrop = firstVoltage.value - secondVoltage.value;

    const currentAmps = (() => {
      switch (element.kind) {
        case "resistor":
          return voltageDrop / element.resistanceOhms;
        case "current-source":
          return element.currentAmps;
        case "voltage-source": {
          const sourceIndex = voltageSourceIndex.get(element.id);
          if (sourceIndex === undefined) return Number.NaN;
          return solution.value[nodeCount + sourceIndex] ?? Number.NaN;
        }
      }
    })();

    if (!Number.isFinite(currentAmps)) {
      return err("numerical-instability", `Missing current for element ${element.id}`);
    }

    elementCurrents.push({ element: element.id, currentAmps });
    elementPowers.push({ element: element.id, powerWatts: voltageDrop * currentAmps });
  }

  return ok({ nodeVoltages, elementCurrents, elementPowers });
};
