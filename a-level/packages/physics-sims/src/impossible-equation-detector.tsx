import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";
import { ControlGroup, Selector } from "@paideia/ui-sim";

export const physicalQuantitiesPackageId = "physical-quantities-and-units";
export const impossibleEquationSimId = "impossible-equation-detector";

export const impossibleEquationPredict: TPredictSpec = {
  prompt:
    "Four equations look familiar. Before seeing the unit check, which one must be impossible because its units do not match?",
  commit_format: {
    kind: "multiple-choice",
    options: ["v = u + at", "s = ut + 1/2 at^2", "v = u + 1/2 at^2", "F = ma"],
    correct_index: 2,
  },
  rationale_required: true,
};

type BaseDimensionKey = "M" | "L" | "T";

type DimensionVector = Readonly<Record<BaseDimensionKey, number>>;

type QuantityKind = "scalar" | "vector";

type EquationId = "velocity-update" | "displacement" | "velocity-area" | "force-law";

interface QuantityDescriptor {
  readonly symbol: string;
  readonly name: string;
  readonly kind: QuantityKind;
  readonly unit: string;
  readonly dimension: DimensionVector;
}

interface EquationTerm {
  readonly label: string;
  readonly factors: readonly string[];
  readonly dimension: DimensionVector;
  readonly explanation: string;
}

interface EquationCase {
  readonly id: EquationId;
  readonly label: string;
  readonly studentEquation: string;
  readonly context: string;
  readonly left: EquationTerm;
  readonly right: readonly EquationTerm[];
  readonly repairHint: string;
}

interface EquationAnalysis {
  readonly equation: EquationCase;
  readonly consistent: boolean;
  readonly mismatchReason: string;
}

const zeroDimension: DimensionVector = { M: 0, L: 0, T: 0 };
const lengthDimension: DimensionVector = { M: 0, L: 1, T: 0 };
const massDimension: DimensionVector = { M: 1, L: 0, T: 0 };
const timeDimension: DimensionVector = { M: 0, L: 0, T: 1 };
const velocityDimension: DimensionVector = { M: 0, L: 1, T: -1 };
const accelerationDimension: DimensionVector = { M: 0, L: 1, T: -2 };
const forceDimension: DimensionVector = { M: 1, L: 1, T: -2 };

const quantities: readonly QuantityDescriptor[] = [
  {
    symbol: "s",
    name: "displacement",
    kind: "vector",
    unit: "m",
    dimension: lengthDimension,
  },
  {
    symbol: "u, v",
    name: "initial/final velocity",
    kind: "vector",
    unit: "m s^-1",
    dimension: velocityDimension,
  },
  {
    symbol: "a",
    name: "acceleration",
    kind: "vector",
    unit: "m s^-2",
    dimension: accelerationDimension,
  },
  {
    symbol: "t",
    name: "time interval",
    kind: "scalar",
    unit: "s",
    dimension: timeDimension,
  },
  {
    symbol: "m",
    name: "mass",
    kind: "scalar",
    unit: "kg",
    dimension: massDimension,
  },
  {
    symbol: "F",
    name: "force",
    kind: "vector",
    unit: "N = kg m s^-2",
    dimension: forceDimension,
  },
];

const equationCases: readonly EquationCase[] = [
  {
    id: "velocity-update",
    label: "Velocity update",
    studentEquation: "v = u + at",
    context: "Can a final velocity be built from an initial velocity plus acceleration acting for time?",
    left: {
      label: "v",
      factors: ["m s^-1"],
      dimension: velocityDimension,
      explanation: "final velocity is a vector with velocity units",
    },
    right: [
      {
        label: "u",
        factors: ["m s^-1"],
        dimension: velocityDimension,
        explanation: "initial velocity is also a velocity",
      },
      {
        label: "at",
        factors: ["m s^-2", "s"],
        dimension: velocityDimension,
        explanation: "acceleration multiplied by time leaves one power of seconds in the denominator",
      },
    ],
    repairHint: "This equation passes the unit check when all velocities share one chosen direction.",
  },
  {
    id: "displacement",
    label: "Displacement from uniform acceleration",
    studentEquation: "s = ut + 1/2 at^2",
    context: "Can displacement be built from velocity-time area plus acceleration-time-squared area?",
    left: {
      label: "s",
      factors: ["m"],
      dimension: lengthDimension,
      explanation: "displacement is a vector length along the chosen line",
    },
    right: [
      {
        label: "ut",
        factors: ["m s^-1", "s"],
        dimension: lengthDimension,
        explanation: "velocity multiplied by time gives metres",
      },
      {
        label: "1/2 at^2",
        factors: ["m s^-2", "s^2"],
        dimension: lengthDimension,
        explanation: "the numerical factor has no unit; acceleration times seconds squared gives metres",
      },
    ],
    repairHint: "This equation passes the unit check; the half is a dimensionless number.",
  },
  {
    id: "velocity-area",
    label: "Suspicious velocity equation",
    studentEquation: "v = u + 1/2 at^2",
    context: "Can a final velocity be built by adding a displacement-sized term to an initial velocity?",
    left: {
      label: "v",
      factors: ["m s^-1"],
      dimension: velocityDimension,
      explanation: "final velocity must have velocity units",
    },
    right: [
      {
        label: "u",
        factors: ["m s^-1"],
        dimension: velocityDimension,
        explanation: "initial velocity can be added to another velocity",
      },
      {
        label: "1/2 at^2",
        factors: ["m s^-2", "s^2"],
        dimension: lengthDimension,
        explanation: "acceleration times seconds squared gives metres, not metres per second",
      },
    ],
    repairHint: "Replace t^2 with t to make the added term a velocity change: v = u + at.",
  },
  {
    id: "force-law",
    label: "Force from mass and acceleration",
    studentEquation: "F = ma",
    context: "Can mass times acceleration have the same dimensions as force?",
    left: {
      label: "F",
      factors: ["kg m s^-2"],
      dimension: forceDimension,
      explanation: "force is a vector measured in newtons",
    },
    right: [
      {
        label: "ma",
        factors: ["kg", "m s^-2"],
        dimension: forceDimension,
        explanation: "mass times acceleration expands to kg m s^-2",
      },
    ],
    repairHint: "This equation passes the unit check; direction comes from the acceleration vector.",
  },
];

const equationOptions = equationCases.map((equation) => ({
  value: equation.id,
  label: equation.studentEquation,
}));

const dimensionEquals = (left: DimensionVector, right: DimensionVector): boolean =>
  left.M === right.M && left.L === right.L && left.T === right.T;

const addDimensions = (left: DimensionVector, right: DimensionVector): DimensionVector => ({
  M: left.M + right.M,
  L: left.L + right.L,
  T: left.T + right.T,
});

export const multiplyDimensions = (
  ...dimensions: readonly DimensionVector[]
): DimensionVector => dimensions.reduce(addDimensions, zeroDimension);

const superscript = (power: number): string => {
  if (power === 1) return "";
  return `^${power}`;
};

export const formatDimension = (dimension: DimensionVector): string => {
  const parts: string[] = [];
  if (dimension.M !== 0) parts.push(`M${superscript(dimension.M)}`);
  if (dimension.L !== 0) parts.push(`L${superscript(dimension.L)}`);
  if (dimension.T !== 0) parts.push(`T${superscript(dimension.T)}`);
  return parts.length === 0 ? "1" : parts.join(" ");
};

const formatTerm = (term: EquationTerm): string =>
  `${term.label}: ${term.factors.join(" × ")} → ${formatDimension(term.dimension)}`;

const findEquation = (id: EquationId): EquationCase => {
  const equation = equationCases.find((candidate) => candidate.id === id);
  if (equation !== undefined) return equation;
  const fallback = equationCases[0];
  if (fallback === undefined) throw new Error("No equation cases configured.");
  return fallback;
};

export const analyseEquation = (id: EquationId): EquationAnalysis => {
  const equation = findEquation(id);
  const rightMismatch = equation.right.find(
    (term) => !dimensionEquals(term.dimension, equation.left.dimension),
  );
  const consistent = rightMismatch === undefined;

  return {
    equation,
    consistent,
    mismatchReason: consistent
      ? "Every term has the same dimensions, so the equation is dimensionally possible."
      : `${rightMismatch.label} has dimensions ${formatDimension(rightMismatch.dimension)}, but ${equation.left.label} needs ${formatDimension(equation.left.dimension)}.`,
  };
};

const Badge = ({ children, tone }: { readonly children: string; readonly tone: "good" | "warn" }) => (
  <span
    style={{
      background: tone === "good" ? "#dcfce7" : "#fee2e2",
      border: `1px solid ${tone === "good" ? "#86efac" : "#fecaca"}`,
      borderRadius: "999px",
      color: tone === "good" ? "#14532d" : "#7f1d1d",
      display: "inline-flex",
      fontSize: "0.82rem",
      fontWeight: 900,
      padding: "0.25rem 0.55rem",
    }}
  >
    {children}
  </span>
);

const QuantityMap = () => (
  <div aria-label="Quantity map" className="result-readout result-readout--cards">
    {quantities.map((quantity) => (
      <div key={quantity.symbol}>
        <dt>{quantity.symbol}</dt>
        <dd>{quantity.unit}</dd>
        <p style={{ margin: "0.25rem 0 0" }}>
          {quantity.name} · {quantity.kind} · {formatDimension(quantity.dimension)}
        </p>
      </div>
    ))}
  </div>
);

export const ImpossibleEquationDetectorSim = () => {
  const [selectedEquationId, setSelectedEquationId] = useState<EquationId>("velocity-area");
  const analysis = useMemo(() => analyseEquation(selectedEquationId), [selectedEquationId]);

  return (
    <PredictionGate
      packageId={physicalQuantitiesPackageId}
      predict={impossibleEquationPredict}
      simId={impossibleEquationSimId}
    >
      <section aria-label="Impossible equation detector" className="vector-lab vector-lab--product">
        <div className="vector-controls vector-controls--product" aria-label="Equation controls">
          <p className="lab-kicker">Impossible-equation detector</p>
          <ControlGroup legend="Choose an equation to audit">
            <Selector
              label="Equation"
              onChange={setSelectedEquationId}
              options={equationOptions}
              value={selectedEquationId}
            />
          </ControlGroup>
          <div className="preset-strip" aria-label="Quick equation choices">
            {equationCases.map((equation) => (
              <button
                aria-pressed={equation.id === selectedEquationId}
                key={equation.id}
                onClick={() => setSelectedEquationId(equation.id)}
                type="button"
              >
                {equation.label}
              </button>
            ))}
          </div>
          <p>
            Rule: quantities can only be added or equated when every term has the same base
            dimensions.
          </p>
        </div>

        <div className="vector-stage vector-stage--product">
          <div aria-label="Observation unlocked" className="formula-panel formula-panel--product">
            <div style={{ alignItems: "center", display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
              <p className="lab-kicker" style={{ color: "#fde68a" }}>Unit verdict</p>
              <Badge tone={analysis.consistent ? "good" : "warn"}>
                {analysis.consistent ? "Dimensionally possible" : "Impossible as written"}
              </Badge>
            </div>
            <p className="formula">{analysis.equation.studentEquation}</p>
            <p className="formula-note">{analysis.equation.context}</p>
          </div>

          <div aria-label="Formula used" className="formula-panel">
            <h3>Unit reasoning</h3>
            <p className="formula">{formatTerm(analysis.equation.left)}</p>
            {analysis.equation.right.map((term) => (
              <p className="formula" key={term.label}>{formatTerm(term)}</p>
            ))}
            <p className="formula-note">{analysis.mismatchReason}</p>
          </div>

          <dl aria-label="Base and derived quantity map">
            <QuantityMap />
          </dl>

          <div className="formula-panel" style={{ background: "#fffdf7", color: "#10201a", border: "1px solid var(--line)" }}>
            <h3>Repair move</h3>
            <p>{analysis.equation.repairHint}</p>
            <p>
              The detector checks possibility, not truth: matching units do not prove an equation,
              but mismatched units rule it out.
            </p>
          </div>
        </div>
      </section>
    </PredictionGate>
  );
};

export default ImpossibleEquationDetectorSim;
export type { DimensionVector, EquationAnalysis, EquationId };
