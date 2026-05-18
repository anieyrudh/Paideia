import { useMemo, useState, type CSSProperties } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";
import { ControlGroup, Selector } from "@paideia/ui-sim";

export const physicalQuantitiesPackageId = "physical-quantities-and-units";
export const dimensionalConsistencySimId = "dimensional-consistency-checker";

export const dimensionalPredict: TPredictSpec = {
  prompt:
    "Before opening the checker, which equation is impossible because the units on the two sides cannot match?",
  commit_format: {
    kind: "multiple-choice",
    options: ["speed = distance / time", "force = mass × acceleration", "distance = speed + time"],
    correct_index: 2,
  },
  rationale_required: true,
};

type BaseDimensionKey = "L" | "M" | "T" | "I" | "Theta" | "N" | "J";
type QuantityKind = "base" | "derived";
type DirectionKind = "scalar" | "vector";

type DimensionVector = Readonly<Record<BaseDimensionKey, number>>;

type Operation = "identity" | "multiply" | "divide" | "add" | "square";

interface QuantityDefinition {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly dimensions: DimensionVector;
  readonly quantityKind: QuantityKind;
  readonly directionKind: DirectionKind;
  readonly note: string;
}

interface EquationScenario {
  readonly id: string;
  readonly label: string;
  readonly leftQuantityId: string;
  readonly operation: Operation;
  readonly firstQuantityId: string;
  readonly secondQuantityId?: string;
  readonly context: string;
}

export interface DimensionCheckResult {
  readonly valid: boolean;
  readonly left: QuantityDefinition;
  readonly rightDimensions: DimensionVector;
  readonly rightUnit: string;
  readonly equationText: string;
  readonly reasoning: readonly string[];
}

const zeroDimensions: DimensionVector = {
  L: 0,
  M: 0,
  T: 0,
  I: 0,
  Theta: 0,
  N: 0,
  J: 0,
};

const dimension = (overrides: Partial<DimensionVector>): DimensionVector => ({
  ...zeroDimensions,
  ...overrides,
});

const quantities = [
  {
    id: "length",
    label: "length / distance",
    unit: "m",
    dimensions: dimension({ L: 1 }),
    quantityKind: "base",
    directionKind: "scalar",
    note: "A base quantity. A direction is not needed for distance or length.",
  },
  {
    id: "displacement",
    label: "displacement",
    unit: "m",
    dimensions: dimension({ L: 1 }),
    quantityKind: "base",
    directionKind: "vector",
    note: "Same base dimension as length, but direction is part of the quantity.",
  },
  {
    id: "time",
    label: "time interval",
    unit: "s",
    dimensions: dimension({ T: 1 }),
    quantityKind: "base",
    directionKind: "scalar",
    note: "A base quantity; seconds count duration, not distance.",
  },
  {
    id: "mass",
    label: "mass",
    unit: "kg",
    dimensions: dimension({ M: 1 }),
    quantityKind: "base",
    directionKind: "scalar",
    note: "A base quantity measured in kilograms.",
  },
  {
    id: "speed",
    label: "speed",
    unit: "m s^-1",
    dimensions: dimension({ L: 1, T: -1 }),
    quantityKind: "derived",
    directionKind: "scalar",
    note: "A derived scalar: distance divided by time.",
  },
  {
    id: "velocity",
    label: "velocity",
    unit: "m s^-1",
    dimensions: dimension({ L: 1, T: -1 }),
    quantityKind: "derived",
    directionKind: "vector",
    note: "Same dimensions as speed, but direction matters.",
  },
  {
    id: "acceleration",
    label: "acceleration",
    unit: "m s^-2",
    dimensions: dimension({ L: 1, T: -2 }),
    quantityKind: "derived",
    directionKind: "vector",
    note: "Velocity change per second, so time appears twice in the denominator.",
  },
  {
    id: "force",
    label: "force",
    unit: "N = kg m s^-2",
    dimensions: dimension({ M: 1, L: 1, T: -2 }),
    quantityKind: "derived",
    directionKind: "vector",
    note: "A derived vector: mass times acceleration.",
  },
  {
    id: "energy",
    label: "energy / work",
    unit: "J = kg m^2 s^-2",
    dimensions: dimension({ M: 1, L: 2, T: -2 }),
    quantityKind: "derived",
    directionKind: "scalar",
    note: "A derived scalar. Work uses force times distance.",
  },
] as const satisfies readonly QuantityDefinition[];

const scenarios = [
  {
    id: "speed-definition",
    label: "speed = distance / time",
    leftQuantityId: "speed",
    operation: "divide",
    firstQuantityId: "length",
    secondQuantityId: "time",
    context: "A sprinter covers a distance in a measured time.",
  },
  {
    id: "force-definition",
    label: "force = mass × acceleration",
    leftQuantityId: "force",
    operation: "multiply",
    firstQuantityId: "mass",
    secondQuantityId: "acceleration",
    context: "A trolley accelerates because a resultant force acts on it.",
  },
  {
    id: "energy-definition",
    label: "work done = force × distance",
    leftQuantityId: "energy",
    operation: "multiply",
    firstQuantityId: "force",
    secondQuantityId: "length",
    context: "A force acts through a displacement in the same direction.",
  },
  {
    id: "impossible-sum",
    label: "distance = speed + time",
    leftQuantityId: "length",
    operation: "add",
    firstQuantityId: "speed",
    secondQuantityId: "time",
    context: "A rushed solution adds two numbers without checking what they measure.",
  },
  {
    id: "acceleration-trap",
    label: "acceleration = velocity / time",
    leftQuantityId: "acceleration",
    operation: "divide",
    firstQuantityId: "velocity",
    secondQuantityId: "time",
    context: "A unit check catches why acceleration is measured in m s^-2.",
  },
] as const satisfies readonly EquationScenario[];

const operations: readonly { readonly value: Operation; readonly label: string }[] = [
  { value: "identity", label: "is the same quantity as" },
  { value: "multiply", label: "is made by multiplying" },
  { value: "divide", label: "is made by dividing" },
  { value: "add", label: "is made by adding" },
  { value: "square", label: "is made by squaring" },
];

const quantityById = (id: string): QuantityDefinition => {
  const quantity = quantities.find((candidate) => candidate.id === id);
  if (quantity === undefined) throw new Error(`Unknown quantity ${id}`);
  return quantity;
};

const addDimensions = (a: DimensionVector, b: DimensionVector): DimensionVector =>
  dimension({
    L: a.L + b.L,
    M: a.M + b.M,
    T: a.T + b.T,
    I: a.I + b.I,
    Theta: a.Theta + b.Theta,
    N: a.N + b.N,
    J: a.J + b.J,
  });

const subtractDimensions = (a: DimensionVector, b: DimensionVector): DimensionVector =>
  dimension({
    L: a.L - b.L,
    M: a.M - b.M,
    T: a.T - b.T,
    I: a.I - b.I,
    Theta: a.Theta - b.Theta,
    N: a.N - b.N,
    J: a.J - b.J,
  });

const scaleDimensions = (a: DimensionVector, factor: number): DimensionVector =>
  dimension({
    L: a.L * factor,
    M: a.M * factor,
    T: a.T * factor,
    I: a.I * factor,
    Theta: a.Theta * factor,
    N: a.N * factor,
    J: a.J * factor,
  });

const dimensionsEqual = (a: DimensionVector, b: DimensionVector): boolean =>
  a.L === b.L &&
  a.M === b.M &&
  a.T === b.T &&
  a.I === b.I &&
  a.Theta === b.Theta &&
  a.N === b.N &&
  a.J === b.J;

const superscript = (exponent: number): string => {
  const digits: Record<string, string> = {
    "-": "⁻",
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };
  return String(exponent)
    .split("")
    .map((character) => digits[character] ?? character)
    .join("");
};

export const formatDimensions = (dimensions: DimensionVector): string => {
  const parts = [
    ["M", dimensions.M],
    ["L", dimensions.L],
    ["T", dimensions.T],
    ["I", dimensions.I],
    ["Θ", dimensions.Theta],
    ["N", dimensions.N],
    ["J", dimensions.J],
  ] as const;
  const visible = parts.filter(([, exponent]) => exponent !== 0);
  if (visible.length === 0) return "1";
  return visible
    .map(([symbol, exponent]) => (exponent === 1 ? symbol : `${symbol}${superscript(exponent)}`))
    .join(" ");
};

const combineUnitText = (
  operation: Operation,
  first: QuantityDefinition,
  second: QuantityDefinition | undefined,
): string => {
  switch (operation) {
    case "identity":
      return first.unit;
    case "multiply":
      return second === undefined ? first.unit : `(${first.unit})(${second.unit})`;
    case "divide":
      return second === undefined ? first.unit : `(${first.unit}) / (${second.unit})`;
    case "add":
      return second === undefined ? first.unit : `${first.unit} + ${second.unit}`;
    case "square":
      return `(${first.unit})²`;
  }
};

const operationSymbol = (operation: Operation): string => {
  switch (operation) {
    case "identity":
      return "";
    case "multiply":
      return "×";
    case "divide":
      return "/";
    case "add":
      return "+";
    case "square":
      return "²";
  }
};

export const checkDimensions = (
  leftQuantityId: string,
  operation: Operation,
  firstQuantityId: string,
  secondQuantityId?: string,
): DimensionCheckResult => {
  const left = quantityById(leftQuantityId);
  const first = quantityById(firstQuantityId);
  const second = secondQuantityId === undefined ? undefined : quantityById(secondQuantityId);
  const rightDimensions = (() => {
    switch (operation) {
      case "identity":
        return first.dimensions;
      case "multiply":
        return second === undefined ? first.dimensions : addDimensions(first.dimensions, second.dimensions);
      case "divide":
        return second === undefined ? first.dimensions : subtractDimensions(first.dimensions, second.dimensions);
      case "add":
        return first.dimensions;
      case "square":
        return scaleDimensions(first.dimensions, 2);
    }
  })();
  const valid =
    operation === "add" && second !== undefined
      ? dimensionsEqual(left.dimensions, first.dimensions) && dimensionsEqual(first.dimensions, second.dimensions)
      : dimensionsEqual(left.dimensions, rightDimensions);

  const rightQuantityText =
    second === undefined
      ? `${first.label}${operation === "square" ? "²" : ""}`
      : `${first.label} ${operationSymbol(operation)} ${second.label}`;

  const addReason =
    operation === "add" && second !== undefined
      ? `Addition needs matching dimensions on both added terms: ${formatDimensions(first.dimensions)} and ${formatDimensions(second.dimensions)}.`
      : `Combine the right-hand units to get ${formatDimensions(rightDimensions)}.`;

  return {
    valid,
    left,
    rightDimensions,
    rightUnit: combineUnitText(operation, first, second),
    equationText: `${left.label} = ${rightQuantityText}`,
    reasoning: [
      `${left.label} has dimensions ${formatDimensions(left.dimensions)} and unit ${left.unit}.`,
      addReason,
      valid
        ? "The dimensions match, so the equation passes the unit check."
        : "The dimensions do not match, so the equation cannot be physically valid as written.",
    ],
  };
};

const badgeStyle = (accent: string): CSSProperties => ({
  background: accent,
  borderRadius: "999px",
  color: "white",
  display: "inline-block",
  fontSize: "0.76rem",
  fontWeight: 800,
  letterSpacing: "0.02em",
  padding: "0.22rem 0.55rem",
  textTransform: "uppercase",
});

const cardStyle: CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid #dbeafe",
  borderRadius: "18px",
  boxShadow: "0 14px 38px rgba(30, 64, 175, 0.12)",
  padding: "1rem",
};

const shellStyle: CSSProperties = {
  background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 46%, #ecfdf5 100%)",
  border: "1px solid #bfdbfe",
  borderRadius: "28px",
  color: "#0f172a",
  display: "grid",
  gap: "1rem",
  padding: "1.25rem",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
};

const QuantityCard = ({ quantity }: { readonly quantity: QuantityDefinition }) => (
  <article style={cardStyle}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.6rem" }}>
      <span style={badgeStyle(quantity.quantityKind === "base" ? "#1d4ed8" : "#7c3aed")}>{quantity.quantityKind}</span>
      <span style={badgeStyle(quantity.directionKind === "vector" ? "#be123c" : "#047857")}>{quantity.directionKind}</span>
    </div>
    <h3 style={{ margin: "0 0 0.35rem" }}>{quantity.label}</h3>
    <p style={{ fontSize: "1.25rem", fontWeight: 900, margin: "0.25rem 0" }}>{quantity.unit}</p>
    <p style={{ margin: "0.25rem 0" }}>Dimension: {formatDimensions(quantity.dimensions)}</p>
    <p style={{ color: "#334155", marginBottom: 0 }}>{quantity.note}</p>
  </article>
);

const ScenarioView = ({ scenario }: { readonly scenario: EquationScenario }) => {
  const result = checkDimensions(
    scenario.leftQuantityId,
    scenario.operation,
    scenario.firstQuantityId,
    scenario.secondQuantityId,
  );

  return (
    <section aria-label="Observation unlocked" style={{ ...cardStyle, borderColor: result.valid ? "#86efac" : "#fecaca" }}>
      <p style={badgeStyle(result.valid ? "#047857" : "#b91c1c")}>{result.valid ? "Unit check passes" : "Impossible as written"}</p>
      <h3 style={{ fontSize: "1.35rem", margin: "0.7rem 0 0.35rem" }}>{scenario.label}</h3>
      <p style={{ color: "#334155" }}>{scenario.context}</p>
      <dl style={gridStyle}>
        <div>
          <dt>Left side</dt>
          <dd>
            {result.left.unit} → {formatDimensions(result.left.dimensions)}
          </dd>
        </div>
        <div>
          <dt>Right side</dt>
          <dd>
            {result.rightUnit} → {formatDimensions(result.rightDimensions)}
          </dd>
        </div>
      </dl>
      <ol>
        {result.reasoning.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
};

const buildScenario = (
  leftQuantityId: string,
  operation: Operation,
  firstQuantityId: string,
  secondQuantityId: string,
): EquationScenario => ({
  id: "custom",
  label: checkDimensions(leftQuantityId, operation, firstQuantityId, secondQuantityId).equationText,
  leftQuantityId,
  operation,
  firstQuantityId,
  secondQuantityId,
  context: "A custom equation built from the quantities selected in the checker.",
});

export const DimensionalConsistencyChecker = () => {
  const [scenarioId, setScenarioId] = useState<string>("impossible-sum");
  const [leftQuantityId, setLeftQuantityId] = useState<string>("length");
  const [operation, setOperation] = useState<Operation>("add");
  const [firstQuantityId, setFirstQuantityId] = useState<string>("speed");
  const [secondQuantityId, setSecondQuantityId] = useState<string>("time");

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === scenarioId) ?? buildScenario(leftQuantityId, operation, firstQuantityId, secondQuantityId),
    [firstQuantityId, leftQuantityId, operation, scenarioId, secondQuantityId],
  );

  const selectedQuantities = [
    quantityById(selectedScenario.leftQuantityId),
    quantityById(selectedScenario.firstQuantityId),
    selectedScenario.secondQuantityId === undefined ? undefined : quantityById(selectedScenario.secondQuantityId),
  ].filter((quantity): quantity is QuantityDefinition => quantity !== undefined);

  return (
    <PredictionGate packageId={physicalQuantitiesPackageId} predict={dimensionalPredict} simId={dimensionalConsistencySimId}>
      <section aria-label="Dimensional consistency checker" style={shellStyle}>
        <header style={{ display: "grid", gap: "0.35rem" }}>
          <p style={{ ...badgeStyle("#2563eb"), justifySelf: "start" }}>Dimensional consistency checker</p>
          <h2 style={{ fontSize: "clamp(1.6rem, 4vw, 2.6rem)", margin: 0 }}>Let the units judge the equation</h2>
          <p style={{ color: "#334155", fontSize: "1.05rem", margin: 0 }}>
            Choose an equation, then compare the base dimensions on each side. A beautiful-looking
            formula still fails if its units describe different kinds of physical quantity.
          </p>
        </header>

        <div style={gridStyle}>
          <section aria-label="Equation controls" style={cardStyle}>
            <ControlGroup legend="Start with a physics claim">
              <Selector
                label="Equation to test"
                onChange={setScenarioId}
                options={[
                  ...scenarios.map((scenario) => ({ label: scenario.label, value: scenario.id })),
                  { label: "Build my own", value: "custom" },
                ]}
                value={scenarioId}
              />
            </ControlGroup>
            {scenarioId === "custom" ? (
              <ControlGroup legend="Build an equation">
                <Selector
                  label="Left side quantity"
                  onChange={setLeftQuantityId}
                  options={quantities.map((quantity) => ({ label: quantity.label, value: quantity.id }))}
                  value={leftQuantityId}
                />
                <Selector
                  label="Operation"
                  onChange={setOperation}
                  options={operations}
                  value={operation}
                />
                <Selector
                  label="First right-side quantity"
                  onChange={setFirstQuantityId}
                  options={quantities.map((quantity) => ({ label: quantity.label, value: quantity.id }))}
                  value={firstQuantityId}
                />
                <Selector
                  label="Second right-side quantity"
                  onChange={setSecondQuantityId}
                  options={quantities.map((quantity) => ({ label: quantity.label, value: quantity.id }))}
                  value={secondQuantityId}
                />
              </ControlGroup>
            ) : null}
          </section>

          <ScenarioView scenario={selectedScenario} />
        </div>

        <section aria-label="Quantity cards" style={gridStyle}>
          {selectedQuantities.map((quantity) => (
            <QuantityCard key={quantity.id} quantity={quantity} />
          ))}
        </section>
      </section>
    </PredictionGate>
  );
};

export default DimensionalConsistencyChecker;
