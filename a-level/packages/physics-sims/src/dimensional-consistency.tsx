import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";

export const physicalQuantitiesPackageId = "physical-quantities-and-units";
export const dimensionalConsistencySimId = "dimensional-consistency-checker";

export type BaseDimension = "M" | "L" | "T" | "I" | "Theta" | "N" | "J";

export interface DimensionVector {
  readonly M: number;
  readonly L: number;
  readonly T: number;
  readonly I: number;
  readonly Theta: number;
  readonly N: number;
  readonly J: number;
}

export type EquationScenarioId =
  | "speed-distance-time"
  | "force-mass-speed"
  | "kinetic-energy"
  | "pressure-force-area";

export interface QuantityCard {
  readonly id: string;
  readonly label: string;
  readonly quantityKind: "base" | "derived";
  readonly scalarVector: "scalar" | "vector" | "context-dependent";
  readonly unit: string;
  readonly dimension: DimensionVector;
  readonly note: string;
}

export interface EquationTerm {
  readonly label: string;
  readonly unit: string;
  readonly dimension: DimensionVector;
}

export interface EquationScenario {
  readonly id: EquationScenarioId;
  readonly title: string;
  readonly learnerEquation: string;
  readonly left: EquationTerm;
  readonly right: readonly EquationTerm[];
  readonly operation: "multiply" | "divide";
  readonly context: string;
  readonly validRewrite: string;
}

export interface EquationCheck {
  readonly leftDimension: DimensionVector;
  readonly rightDimension: DimensionVector;
  readonly consistent: boolean;
  readonly reasoning: readonly string[];
}

const zeroDimension: DimensionVector = {
  M: 0,
  L: 0,
  T: 0,
  I: 0,
  Theta: 0,
  N: 0,
  J: 0,
};

const dimension = (parts: Partial<DimensionVector>): DimensionVector => ({
  ...zeroDimension,
  ...parts,
});

const addDimensions = (left: DimensionVector, right: DimensionVector): DimensionVector => ({
  M: left.M + right.M,
  L: left.L + right.L,
  T: left.T + right.T,
  I: left.I + right.I,
  Theta: left.Theta + right.Theta,
  N: left.N + right.N,
  J: left.J + right.J,
});

const subtractDimensions = (left: DimensionVector, right: DimensionVector): DimensionVector => ({
  M: left.M - right.M,
  L: left.L - right.L,
  T: left.T - right.T,
  I: left.I - right.I,
  Theta: left.Theta - right.Theta,
  N: left.N - right.N,
  J: left.J - right.J,
});

const sameDimension = (left: DimensionVector, right: DimensionVector): boolean =>
  left.M === right.M &&
  left.L === right.L &&
  left.T === right.T &&
  left.I === right.I &&
  left.Theta === right.Theta &&
  left.N === right.N &&
  left.J === right.J;

const baseDimensionLabels: Record<BaseDimension, string> = {
  M: "mass",
  L: "length",
  T: "time",
  I: "current",
  Theta: "temperature",
  N: "amount",
  J: "luminous intensity",
};

const dimensionOrder: readonly BaseDimension[] = ["M", "L", "T", "I", "Theta", "N", "J"];

export const formatDimension = (vector: DimensionVector): string => {
  const parts = dimensionOrder
    .filter((key) => vector[key] !== 0)
    .map((key) => (vector[key] === 1 ? key : `${key}^${vector[key]}`));
  return parts.length === 0 ? "1" : parts.join(" ");
};

const describeDimension = (vector: DimensionVector): string => {
  const parts = dimensionOrder
    .filter((key) => vector[key] !== 0)
    .map((key) => {
      const exponent = vector[key];
      const power = Math.abs(exponent) === 1 ? "" : ` to power ${Math.abs(exponent)}`;
      return exponent > 0
        ? `${baseDimensionLabels[key]}${power}`
        : `per ${baseDimensionLabels[key]}${power}`;
    });
  return parts.length === 0 ? "dimensionless" : parts.join(", ");
};

export const quantityCards: readonly QuantityCard[] = [
  {
    id: "time",
    label: "time interval",
    quantityKind: "base",
    scalarVector: "scalar",
    unit: "s",
    dimension: dimension({ T: 1 }),
    note: "An SI base quantity: the second is one of the seven base units.",
  },
  {
    id: "displacement",
    label: "displacement",
    quantityKind: "derived",
    scalarVector: "vector",
    unit: "m",
    dimension: dimension({ L: 1 }),
    note: "It uses the base unit metre but direction makes it a vector quantity.",
  },
  {
    id: "speed",
    label: "speed",
    quantityKind: "derived",
    scalarVector: "scalar",
    unit: "m s^-1",
    dimension: dimension({ L: 1, T: -1 }),
    note: "Distance divided by time, so length is counted once and time is in the denominator.",
  },
  {
    id: "force",
    label: "force",
    quantityKind: "derived",
    scalarVector: "vector",
    unit: "N = kg m s^-2",
    dimension: dimension({ M: 1, L: 1, T: -2 }),
    note: "A newton is a derived unit; its base-unit fingerprint is kg m s^-2.",
  },
  {
    id: "energy",
    label: "energy",
    quantityKind: "derived",
    scalarVector: "scalar",
    unit: "J = kg m^2 s^-2",
    dimension: dimension({ M: 1, L: 2, T: -2 }),
    note: "A joule has one mass factor, two length factors, and time squared in the denominator.",
  },
];

export const equationScenarios: readonly EquationScenario[] = [
  {
    id: "speed-distance-time",
    title: "Speed from distance and time",
    learnerEquation: "speed = distance / time",
    left: { label: "speed", unit: "m s^-1", dimension: dimension({ L: 1, T: -1 }) },
    right: [
      { label: "distance", unit: "m", dimension: dimension({ L: 1 }) },
      { label: "time", unit: "s", dimension: dimension({ T: 1 }) },
    ],
    operation: "divide",
    context: "A runner covers a measured distance in a measured time.",
    validRewrite: "m / s = m s^-1, so the equation passes the unit test.",
  },
  {
    id: "force-mass-speed",
    title: "A suspicious force equation",
    learnerEquation: "force = mass × speed",
    left: { label: "force", unit: "N = kg m s^-2", dimension: dimension({ M: 1, L: 1, T: -2 }) },
    right: [
      { label: "mass", unit: "kg", dimension: dimension({ M: 1 }) },
      { label: "speed", unit: "m s^-1", dimension: dimension({ L: 1, T: -1 }) },
    ],
    operation: "multiply",
    context: "A shortcut claims that multiplying mass by speed gives force.",
    validRewrite: "force needs kg m s^-2, but mass × speed gives kg m s^-1.",
  },
  {
    id: "kinetic-energy",
    title: "Kinetic energy check",
    learnerEquation: "energy = mass × speed × speed",
    left: { label: "energy", unit: "J = kg m^2 s^-2", dimension: dimension({ M: 1, L: 2, T: -2 }) },
    right: [
      { label: "mass", unit: "kg", dimension: dimension({ M: 1 }) },
      { label: "speed²", unit: "(m s^-1)^2", dimension: dimension({ L: 2, T: -2 }) },
    ],
    operation: "multiply",
    context: "The numerical factor one-half has no dimension, so only units decide the check.",
    validRewrite: "kg × (m s^-1)^2 = kg m^2 s^-2, matching joules.",
  },
  {
    id: "pressure-force-area",
    title: "Pressure from force and area",
    learnerEquation: "pressure = force / area",
    left: { label: "pressure", unit: "Pa = kg m^-1 s^-2", dimension: dimension({ M: 1, L: -1, T: -2 }) },
    right: [
      { label: "force", unit: "N = kg m s^-2", dimension: dimension({ M: 1, L: 1, T: -2 }) },
      { label: "area", unit: "m^2", dimension: dimension({ L: 2 }) },
    ],
    operation: "divide",
    context: "The same force spread over a larger area gives a smaller pressure.",
    validRewrite: "kg m s^-2 / m^2 = kg m^-1 s^-2, so the equation passes.",
  },
];

export const unitConstraintPredict: TPredictSpec = {
  prompt:
    "A student proposes force = mass × speed. Before opening the checker, which unit fingerprint will the right-hand side have?",
  commit_format: {
    kind: "multiple-choice",
    options: ["kg m s^-2", "kg m s^-1", "m s^-2", "kg m^2 s^-2"],
    correct_index: 1,
  },
  rationale_required: true,
};

export const checkEquation = (scenario: EquationScenario): EquationCheck => {
  const rightDimension = scenario.operation === "multiply"
    ? scenario.right.reduce((current, term) => addDimensions(current, term.dimension), zeroDimension)
    : scenario.right.slice(1).reduce(
        (current, term) => subtractDimensions(current, term.dimension),
        scenario.right[0]?.dimension ?? zeroDimension,
      );
  const consistent = sameDimension(scenario.left.dimension, rightDimension);
  const operationWord = scenario.operation === "multiply" ? "Multiply" : "Divide";
  const termUnits = scenario.right.map((term) => `${term.label}: ${term.unit}`).join("; ");

  return {
    leftDimension: scenario.left.dimension,
    rightDimension,
    consistent,
    reasoning: [
      `${scenario.left.label} has unit ${scenario.left.unit}, so its fingerprint is ${formatDimension(scenario.left.dimension)}.`,
      `${operationWord} the proposed right-hand units (${termUnits}) to get ${formatDimension(rightDimension)}.`,
      consistent
        ? "The fingerprints match, so units allow this equation. The physics may still need evidence, but the unit gate is passed."
        : "The fingerprints do not match, so the equation cannot be correct as written.",
    ],
  };
};

const scenarioById = new Map(equationScenarios.map((scenario) => [scenario.id, scenario]));
const fallbackScenario = (): EquationScenario => {
  const scenario = equationScenarios[1] ?? equationScenarios[0];
  if (scenario === undefined) {
    throw new Error("Dimensional consistency sim requires at least one equation scenario.");
  }
  return scenario;
};

const selectedScenario = (id: EquationScenarioId): EquationScenario =>
  scenarioById.get(id) ?? fallbackScenario();

const EquationBalance = ({ check }: { readonly check: EquationCheck }) => {
  const leftParts = dimensionOrder.map((key) => ({ key, exponent: check.leftDimension[key] }));
  const rightParts = dimensionOrder.map((key) => ({ key, exponent: check.rightDimension[key] }));

  return (
    <div className="dimension-balance" aria-label="Dimension balance">
      <div>
        <strong>Left side</strong>
        <span>{formatDimension(check.leftDimension)}</span>
      </div>
      <div className={check.consistent ? "balance-symbol is-balanced" : "balance-symbol is-mismatch"}>
        {check.consistent ? "=" : "≠"}
      </div>
      <div>
        <strong>Right side</strong>
        <span>{formatDimension(check.rightDimension)}</span>
      </div>
      <table>
        <caption>Base-unit exponents</caption>
        <thead>
          <tr>
            <th scope="col">Base</th>
            <th scope="col">Left</th>
            <th scope="col">Right</th>
          </tr>
        </thead>
        <tbody>
          {leftParts.map(({ key, exponent }, index) => (
            <tr key={key} className={exponent === rightParts[index]?.exponent ? "" : "is-mismatch"}>
              <th scope="row">{key}</th>
              <td>{exponent}</td>
              <td>{rightParts[index]?.exponent ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const QuantityShelf = () => (
  <section className="quantity-shelf" aria-labelledby="quantity-shelf-title">
    <div>
      <p className="lab-kicker">quantity map</p>
      <h3 id="quantity-shelf-title">Units describe quantities, not just numbers</h3>
    </div>
    <div className="quantity-card-grid">
      {quantityCards.map((card) => (
        <article className="quantity-card" key={card.id}>
          <div>
            <strong>{card.label}</strong>
            <span>{card.unit}</span>
          </div>
          <p>{formatDimension(card.dimension)}</p>
          <small>
            {card.quantityKind} • {card.scalarVector}
          </small>
          <small>{card.note}</small>
        </article>
      ))}
    </div>
  </section>
);

export const DimensionalConsistencySim = () => {
  const [scenarioId, setScenarioId] = useState<EquationScenarioId>("force-mass-speed");
  const scenario = selectedScenario(scenarioId);
  const check = useMemo(() => checkEquation(scenario), [scenario]);

  return (
    <PredictionGate
      packageId={physicalQuantitiesPackageId}
      predict={unitConstraintPredict}
      simId={dimensionalConsistencySimId}
    >
      <section aria-label="Dimensional consistency checker" className="vector-lab vector-lab--product unit-lab">
        <div className="vector-controls vector-controls--product unit-controls" aria-label="Equation controls">
          <p className="lab-kicker">dimensional consistency checker</p>
          <label htmlFor="equation-scenario">
            <span>Choose an equation card</span>
            <select
              id="equation-scenario"
              onChange={(event) => setScenarioId(event.currentTarget.value as EquationScenarioId)}
              value={scenarioId}
            >
              {equationScenarios.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
            </select>
          </label>
          <div className="equation-card" aria-label="Selected equation">
            <span>{scenario.context}</span>
            <strong>{scenario.learnerEquation}</strong>
          </div>
          <p>
            Treat each unit as a base-unit fingerprint. The checker only unlocks after your prediction,
            then it compares both sides using visible unit reasoning.
          </p>
        </div>

        <div className="vector-stage vector-stage--product unit-stage">
          <div className={check.consistent ? "unit-verdict is-balanced" : "unit-verdict is-mismatch"} aria-label="Observation unlocked">
            <span>{check.consistent ? "Unit gate passed" : "Impossible as written"}</span>
            <strong>{scenario.learnerEquation}</strong>
            <p>
              {check.consistent
                ? "Both sides name the same kind of measurable quantity."
                : "The units force a stop before any substitution of numbers."}
            </p>
          </div>
          <EquationBalance check={check} />
        </div>

        <section className="formula-panel formula-panel--product" aria-label="Formula used">
          <h3>Unit reasoning</h3>
          <p className="formula">{scenario.validRewrite}</p>
          <ol>
            {check.reasoning.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="formula-note">
            Reading the result: {formatDimension(check.rightDimension)} means {describeDimension(check.rightDimension)}.
          </p>
        </section>

        <QuantityShelf />
      </section>
    </PredictionGate>
  );
};

export default DimensionalConsistencySim;
