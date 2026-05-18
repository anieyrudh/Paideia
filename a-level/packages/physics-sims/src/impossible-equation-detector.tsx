import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";
import { ControlGroup, Selector } from "@paideia/ui-sim";

export const physicalQuantitiesPackageId = "physical-quantities-and-units";
export const impossibleEquationSimId = "impossible-equation-detector";

export const impossibleEquationPredict: TPredictSpec = {
  prompt:
    "A student proposes four equations. Before opening the unit detector, which one must be impossible because its units do not match?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "distance = speed × time",
      "force = mass × acceleration",
      "distance = speed + acceleration",
      "change in velocity = acceleration × time",
    ],
    correct_index: 2,
  },
  rationale_required: true,
};

type DimensionKey = "length" | "mass" | "time" | "current" | "temperature" | "amount" | "luminous";

type DirectionKind = "scalar" | "vector";

type QuantityFamily = "base" | "derived";

interface DimensionVector {
  readonly length: number;
  readonly mass: number;
  readonly time: number;
  readonly current: number;
  readonly temperature: number;
  readonly amount: number;
  readonly luminous: number;
}

export interface QuantityProfile {
  readonly label: string;
  readonly unit: string;
  readonly dimension: DimensionVector;
  readonly directionKind: DirectionKind;
  readonly family: QuantityFamily;
}

interface ProductTerm {
  readonly factors: readonly QuantityProfile[];
  readonly divisorFactors?: readonly QuantityProfile[];
  readonly coefficient?: string;
}

interface SumExpression {
  readonly terms: readonly ProductTerm[];
}

export interface EquationCase {
  readonly id: string;
  readonly label: string;
  readonly left: QuantityProfile;
  readonly right: SumExpression;
  readonly note: string;
}

export interface EquationAnalysis {
  readonly equation: EquationCase;
  readonly rightDimension: DimensionVector;
  readonly rightDirectionKind: DirectionKind;
  readonly termSummaries: readonly string[];
  readonly consistent: boolean;
  readonly issue: string | null;
}

const zeroDimension: DimensionVector = {
  length: 0,
  mass: 0,
  time: 0,
  current: 0,
  temperature: 0,
  amount: 0,
  luminous: 0,
};

const dimensionKeys: readonly DimensionKey[] = [
  "mass",
  "length",
  "time",
  "current",
  "temperature",
  "amount",
  "luminous",
];

const dim = (partial: Partial<DimensionVector>): DimensionVector => ({
  ...zeroDimension,
  ...partial,
});

const quantity = (
  label: string,
  unit: string,
  dimension: DimensionVector,
  directionKind: DirectionKind,
  family: QuantityFamily,
): QuantityProfile => ({ label, unit, dimension, directionKind, family });

const distance = quantity("distance", "m", dim({ length: 1 }), "scalar", "base");
const displacement = quantity("displacement", "m", dim({ length: 1 }), "vector", "base");
const time = quantity("time", "s", dim({ time: 1 }), "scalar", "base");
const mass = quantity("mass", "kg", dim({ mass: 1 }), "scalar", "base");
const speed = quantity("speed", "m s^-1", dim({ length: 1, time: -1 }), "scalar", "derived");
const velocityChange = quantity(
  "change in velocity",
  "m s^-1",
  dim({ length: 1, time: -1 }),
  "vector",
  "derived",
);
const acceleration = quantity(
  "acceleration",
  "m s^-2",
  dim({ length: 1, time: -2 }),
  "vector",
  "derived",
);
const force = quantity("force", "N = kg m s^-2", dim({ mass: 1, length: 1, time: -2 }), "vector", "derived");

export const equationCases: readonly EquationCase[] = [
  {
    id: "distance-speed-time",
    label: "distance = speed × time",
    left: distance,
    right: { terms: [{ factors: [speed, time] }] },
    note: "A scalar distance can be built from scalar speed multiplied by time.",
  },
  {
    id: "force-mass-acceleration",
    label: "force = mass × acceleration",
    left: force,
    right: { terms: [{ factors: [mass, acceleration] }] },
    note: "Multiplying scalar mass by vector acceleration gives a vector force with newton units.",
  },
  {
    id: "distance-speed-plus-acceleration",
    label: "distance = speed + acceleration",
    left: distance,
    right: { terms: [{ factors: [speed] }, { factors: [acceleration] }] },
    note: "The plus sign is the trap: only matching dimensions can be added or compared.",
  },
  {
    id: "velocity-change-acceleration-time",
    label: "change in velocity = acceleration × time",
    left: velocityChange,
    right: { terms: [{ factors: [acceleration, time] }] },
    note: "Acceleration multiplied by elapsed time has velocity units and keeps direction.",
  },
  {
    id: "displacement-speed-time",
    label: "displacement = speed × time",
    left: displacement,
    right: { terms: [{ factors: [speed, time] }] },
    note: "The units match length, but speed alone has no direction, so it cannot produce displacement.",
  },
] as const;

const addDimensions = (a: DimensionVector, b: DimensionVector): DimensionVector =>
  dim(Object.fromEntries(dimensionKeys.map((key) => [key, a[key] + b[key]])));

const subtractDimensions = (a: DimensionVector, b: DimensionVector): DimensionVector =>
  dim(Object.fromEntries(dimensionKeys.map((key) => [key, a[key] - b[key]])));

const sameDimension = (a: DimensionVector, b: DimensionVector): boolean =>
  dimensionKeys.every((key) => a[key] === b[key]);

const productDimension = (term: ProductTerm): DimensionVector => {
  const numerator = term.factors.reduce(
    (current, factor) => addDimensions(current, factor.dimension),
    zeroDimension,
  );
  return (term.divisorFactors ?? []).reduce(
    (current, factor) => subtractDimensions(current, factor.dimension),
    numerator,
  );
};

const productDirectionKind = (term: ProductTerm): DirectionKind =>
  term.factors.some((factor) => factor.directionKind === "vector") ? "vector" : "scalar";

const formatPower = (symbol: string, power: number): string => {
  if (power === 0) return "";
  if (power === 1) return symbol;
  return `${symbol}^${power}`;
};

export const formatDimension = (dimension: DimensionVector): string => {
  const parts = [
    formatPower("M", dimension.mass),
    formatPower("L", dimension.length),
    formatPower("T", dimension.time),
    formatPower("I", dimension.current),
    formatPower("Θ", dimension.temperature),
    formatPower("N", dimension.amount),
    formatPower("J", dimension.luminous),
  ].filter((part) => part.length > 0);

  return parts.length === 0 ? "1" : parts.join(" ");
};

const formatProduct = (term: ProductTerm): string => {
  const factors = term.factors.map((factor) => factor.unit).join(" × ");
  const numerator = term.coefficient === undefined ? factors : `${term.coefficient} × ${factors}`;
  const divisors = term.divisorFactors?.map((factor) => factor.unit).join(" × ");
  return divisors === undefined || divisors.length === 0 ? numerator : `${numerator} ÷ (${divisors})`;
};

export const analyzeEquation = (equation: EquationCase): EquationAnalysis => {
  const [firstTerm, ...otherTerms] = equation.right.terms;
  const rightDimension = firstTerm === undefined ? zeroDimension : productDimension(firstTerm);
  const rightDirectionKind = firstTerm === undefined ? "scalar" : productDirectionKind(firstTerm);
  const termSummaries = equation.right.terms.map(
    (term) => `${formatProduct(term)} → ${formatDimension(productDimension(term))} (${productDirectionKind(term)})`,
  );

  const mismatchTerm = otherTerms.find((term) => !sameDimension(productDimension(term), rightDimension));
  if (mismatchTerm !== undefined) {
    return {
      equation,
      rightDimension,
      rightDirectionKind,
      termSummaries,
      consistent: false,
      issue: `The terms on the right cannot be added: ${formatDimension(productDimension(mismatchTerm))} is not ${formatDimension(rightDimension)}.`,
    };
  }

  if (!sameDimension(equation.left.dimension, rightDimension)) {
    return {
      equation,
      rightDimension,
      rightDirectionKind,
      termSummaries,
      consistent: false,
      issue: `The left side is ${formatDimension(equation.left.dimension)}, but the right side is ${formatDimension(rightDimension)}.`,
    };
  }

  if (equation.left.directionKind !== rightDirectionKind) {
    return {
      equation,
      rightDimension,
      rightDirectionKind,
      termSummaries,
      consistent: false,
      issue: `The units match, but a ${rightDirectionKind} expression cannot stand in for a ${equation.left.directionKind} quantity without direction information.`,
    };
  }

  return {
    equation,
    rightDimension,
    rightDirectionKind,
    termSummaries,
    consistent: true,
    issue: null,
  };
};

const options: readonly { readonly label: string; readonly value: string }[] = equationCases.map((equation) => ({
  label: equation.label,
  value: equation.id,
}));

const selectedEquation = (id: string): EquationCase => {
  const fallback = equationCases[0];
  if (fallback === undefined) throw new Error("No equation cards are configured.");
  return equationCases.find((equation) => equation.id === id) ?? fallback;
};

const verdictStyle = (consistent: boolean) => ({
  background: consistent ? "#ecfdf3" : "#fff1f2",
  border: `2px solid ${consistent ? "#16a34a" : "#e11d48"}`,
  borderRadius: "18px",
  color: consistent ? "#14532d" : "#881337",
  padding: "1rem",
});

export const ImpossibleEquationDetectorSim = () => {
  const [equationId, setEquationId] = useState("distance-speed-plus-acceleration");
  const equation = selectedEquation(equationId);
  const analysis = useMemo(() => analyzeEquation(equation), [equation]);

  return (
    <PredictionGate
      packageId={physicalQuantitiesPackageId}
      predict={impossibleEquationPredict}
      simId={impossibleEquationSimId}
    >
      <section
        aria-label="Impossible equation detector"
        style={{
          background: "linear-gradient(135deg, #f8fbff 0%, #eefdf5 100%)",
          border: "1px solid #dbeafe",
          borderRadius: "24px",
          color: "#0f172a",
          display: "grid",
          gap: "1rem",
          padding: "1rem",
        }}
      >
        <header>
          <p style={{ color: "#0369a1", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Unit detective lab
          </p>
          <h2>Can this equation describe the world?</h2>
          <p>
            Pick an equation card. The detector expands every unit into SI dimensions, checks
            whether additions are allowed, then asks whether scalar or vector direction still fits.
          </p>
        </header>

        <ControlGroup legend="Equation card">
          <Selector label="Equation to test" onChange={setEquationId} options={options} value={equationId} />
        </ControlGroup>

        <div aria-label="Observation unlocked" style={{ display: "grid", gap: "1rem" }}>
          <section aria-label="Detector verdict" style={verdictStyle(analysis.consistent)}>
            <p style={{ fontWeight: 900, margin: 0 }}>
              {analysis.consistent ? "Passes the unit check" : "Impossible as written"}
            </p>
            <p style={{ marginBottom: 0 }}>{analysis.issue ?? equation.note}</p>
          </section>

          <section
            aria-label="Unit reasoning"
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "18px",
              padding: "1rem",
            }}
          >
            <h3 style={{ marginTop: 0 }}>{equation.label}</h3>
            <dl style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "max-content 1fr" }}>
              <dt>Left side</dt>
              <dd>
                {equation.left.unit} → {formatDimension(equation.left.dimension)} ({equation.left.family},{" "}
                {equation.left.directionKind})
              </dd>
              <dt>Right side</dt>
              <dd>
                {formatDimension(analysis.rightDimension)} ({analysis.rightDirectionKind})
              </dd>
            </dl>
            <ol>
              {analysis.termSummaries.map((summary) => (
                <li key={summary}>{summary}</li>
              ))}
            </ol>
          </section>

          <section
            aria-label="What the detector is teaching"
            style={{
              background: "#0f172a",
              borderRadius: "18px",
              color: "#e0f2fe",
              padding: "1rem",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Rule of the lab</h3>
            <p>
              Equal quantities must have the same dimension. Added quantities must match each
              other first. A vector quantity also needs direction, not just the right unit.
            </p>
          </section>
        </div>
      </section>
    </PredictionGate>
  );
};

export default ImpossibleEquationDetectorSim;
