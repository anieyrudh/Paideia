import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { topologicalSort, type WeightedGraph } from "@paideia/graph-algorithms";
import { PredictionGate } from "@paideia/prediction-gate";
import { ControlGroup, Selector } from "@paideia/ui-sim";

export const quantityMapPackageId = "physical-quantities-and-units";
export const quantityMapSimId = "quantity-dependency-map";

export const dimensionPredict: TPredictSpec = {
  prompt:
    "Before opening the map, which equation keeps the units of speed consistent with distance and time?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "speed = distance / time",
      "speed = distance × time",
      "speed = distance + time",
      "speed = time / distance",
    ],
    correct_index: 0,
  },
  rationale_required: true,
};

type BaseDimension = "M" | "L" | "T" | "I" | "Theta" | "N" | "J";
type QuantityKind = "base" | "derived";
type DirectionKind = "scalar" | "vector";
type EquationStatus = "consistent" | "inconsistent";

export interface DimensionPower {
  readonly base: BaseDimension;
  readonly power: number;
}

export interface QuantityNode {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly kind: QuantityKind;
  readonly direction: DirectionKind;
  readonly dimensions: readonly DimensionPower[];
  readonly definition: string;
  readonly dependencies: readonly string[];
}

export interface EquationOption {
  readonly id: string;
  readonly label: string;
  readonly expression: string;
  readonly leftQuantityId: string;
  readonly status: EquationStatus;
  readonly reason: string;
  readonly rightDimensions: readonly DimensionPower[];
}

export interface QuantityMapState {
  readonly focusQuantityId: string;
  readonly equationId: string;
}

export interface QuantityMapModel {
  readonly focus: QuantityNode;
  readonly dependencies: readonly QuantityNode[];
  readonly equation: EquationOption;
  readonly dependencyOrder: readonly string[];
}

const baseNames: Readonly<Record<BaseDimension, string>> = {
  M: "mass",
  L: "length",
  T: "time",
  I: "electric current",
  Theta: "temperature",
  N: "amount of substance",
  J: "luminous intensity",
};

export const quantityNodes: readonly QuantityNode[] = [
  {
    id: "length",
    label: "Length",
    unit: "m",
    kind: "base",
    direction: "scalar",
    dimensions: [{ base: "L", power: 1 }],
    definition: "Measures how far apart two positions are.",
    dependencies: [],
  },
  {
    id: "time",
    label: "Time",
    unit: "s",
    kind: "base",
    direction: "scalar",
    dimensions: [{ base: "T", power: 1 }],
    definition: "Measures duration or the ordering of events.",
    dependencies: [],
  },
  {
    id: "mass",
    label: "Mass",
    unit: "kg",
    kind: "base",
    direction: "scalar",
    dimensions: [{ base: "M", power: 1 }],
    definition: "Measures the amount of matter or inertia of an object.",
    dependencies: [],
  },

  {
    id: "area",
    label: "Area",
    unit: "m^2",
    kind: "derived",
    direction: "scalar",
    dimensions: [{ base: "L", power: 2 }],
    definition: "Surface spread measured as length multiplied by length.",
    dependencies: ["length"],
  },
  {
    id: "speed",
    label: "Speed",
    unit: "m s^-1",
    kind: "derived",
    direction: "scalar",
    dimensions: [
      { base: "L", power: 1 },
      { base: "T", power: -1 },
    ],
    definition: "Distance travelled per unit time.",
    dependencies: ["length", "time"],
  },
  {
    id: "velocity",
    label: "Velocity",
    unit: "m s^-1",
    kind: "derived",
    direction: "vector",
    dimensions: [
      { base: "L", power: 1 },
      { base: "T", power: -1 },
    ],
    definition: "Displacement per unit time, so direction is part of the quantity.",
    dependencies: ["length", "time"],
  },
  {
    id: "acceleration",
    label: "Acceleration",
    unit: "m s^-2",
    kind: "derived",
    direction: "vector",
    dimensions: [
      { base: "L", power: 1 },
      { base: "T", power: -2 },
    ],
    definition: "Change in velocity per unit time.",
    dependencies: ["velocity", "time"],
  },
  {
    id: "force",
    label: "Force",
    unit: "N = kg m s^-2",
    kind: "derived",
    direction: "vector",
    dimensions: [
      { base: "M", power: 1 },
      { base: "L", power: 1 },
      { base: "T", power: -2 },
    ],
    definition: "Mass multiplied by acceleration.",
    dependencies: ["mass", "acceleration"],
  },
  {
    id: "pressure",
    label: "Pressure",
    unit: "Pa = kg m^-1 s^-2",
    kind: "derived",
    direction: "scalar",
    dimensions: [
      { base: "M", power: 1 },
      { base: "L", power: -1 },
      { base: "T", power: -2 },
    ],
    definition: "Force spread over an area.",
    dependencies: ["force", "area"],
  },
];

export const equationOptions: readonly EquationOption[] = [
  {
    id: "speed-distance-time",
    label: "Speed from distance and time",
    expression: "speed = distance / time",
    leftQuantityId: "speed",
    status: "consistent",
    reason: "distance contributes L and dividing by time contributes T^-1, so the result is L T^-1.",
    rightDimensions: [
      { base: "L", power: 1 },
      { base: "T", power: -1 },
    ],
  },
  {
    id: "speed-distance-times-time",
    label: "Speed multiplied by time",
    expression: "speed = distance × time",
    leftQuantityId: "speed",
    status: "inconsistent",
    reason: "multiplying distance by time gives L T, not L T^-1, so the equation cannot describe speed.",
    rightDimensions: [
      { base: "L", power: 1 },
      { base: "T", power: 1 },
    ],
  },
  {
    id: "force-mass-acceleration",
    label: "Force from mass and acceleration",
    expression: "force = mass × acceleration",
    leftQuantityId: "force",
    status: "consistent",
    reason: "mass gives M and acceleration gives L T^-2, so force has M L T^-2.",
    rightDimensions: [
      { base: "M", power: 1 },
      { base: "L", power: 1 },
      { base: "T", power: -2 },
    ],
  },
  {
    id: "force-mass-speed",
    label: "Force from mass and speed",
    expression: "force = mass × speed",
    leftQuantityId: "force",
    status: "inconsistent",
    reason: "mass times speed gives M L T^-1, one factor of time short of force.",
    rightDimensions: [
      { base: "M", power: 1 },
      { base: "L", power: 1 },
      { base: "T", power: -1 },
    ],
  },
  {
    id: "pressure-force-area",
    label: "Pressure from force and area",
    expression: "pressure = force / area",
    leftQuantityId: "pressure",
    status: "consistent",
    reason: "area contributes L^2, so force divided by area changes M L T^-2 into M L^-1 T^-2.",
    rightDimensions: [
      { base: "M", power: 1 },
      { base: "L", power: -1 },
      { base: "T", power: -2 },
    ],
  },
];

const quantityById = new Map(quantityNodes.map((node) => [node.id, node]));
const equationById = new Map(equationOptions.map((option) => [option.id, option]));

const assertKnownQuantity = (id: string): QuantityNode => {
  const node = quantityById.get(id);
  if (node === undefined) throw new Error(`Unknown quantity: ${id}`);
  return node;
};

const assertKnownEquation = (id: string): EquationOption => {
  const equation = equationById.get(id);
  if (equation === undefined) throw new Error(`Unknown equation: ${id}`);
  return equation;
};

const dependencyGraph: WeightedGraph = {
  directed: true,
  nodes: quantityNodes.map((node) => ({ id: node.id })),
  edges: quantityNodes.flatMap((node) =>
    node.dependencies.map((dependency) => ({ source: dependency, target: node.id })),
  ),
};

const dependencyOrder = (): readonly string[] => {
  const sorted = topologicalSort(dependencyGraph);
  if (!sorted.ok) return quantityNodes.map((node) => node.id);
  return sorted.value.order;
};

const collectDependencies = (id: string, seen = new Set<string>()): readonly string[] => {
  const node = assertKnownQuantity(id);
  for (const dependency of node.dependencies) {
    if (!seen.has(dependency)) {
      seen.add(dependency);
      collectDependencies(dependency, seen);
    }
  }
  return [...seen];
};

export const dimensionText = (dimensions: readonly DimensionPower[]): string => {
  if (dimensions.length === 0) return "dimensionless";
  return dimensions
    .map(({ base, power }) => (power === 1 ? base : `${base}^${power}`))
    .join(" ");
};

export const dimensionSentence = (dimensions: readonly DimensionPower[]): string =>
  dimensions
    .map(({ base, power }) => `${baseNames[base]}${power === 1 ? "" : `^${power}`}`)
    .join(" · ");

export const quantityMapModel = (state: QuantityMapState): QuantityMapModel => {
  const focus = assertKnownQuantity(state.focusQuantityId);
  const equation = assertKnownEquation(state.equationId);
  const order = dependencyOrder();
  const dependencyIds = [...collectDependencies(focus.id)];
  dependencyIds.sort((left: string, right: string) => order.indexOf(left) - order.indexOf(right));
  const dependencies = dependencyIds.map(assertKnownQuantity);

  return {
    focus,
    dependencies,
    equation,
    dependencyOrder: order,
  };
};

const fallbackEquationId = "speed-distance-time";

const nextEquationForQuantity = (quantityId: string): string =>
  equationOptions.find((option) => option.leftQuantityId === quantityId)?.id ?? fallbackEquationId;

const badge = (text: string, tone: "blue" | "green" | "orange" | "red") => (
  <span className={`quantity-map-badge quantity-map-badge-${tone}`}>{text}</span>
);

export const QuantityMapGraph = ({ model }: { readonly model: QuantityMapModel }) => {
  const visibleNodes = [...model.dependencies, model.focus];

  return (
    <section aria-label="Observation unlocked" className="quantity-map-stage">
      <div aria-label="Quantity dependency map" className="quantity-map-graph" role="img">
        {visibleNodes.map((node) => (
          <article
            className={`quantity-node-card ${node.id === model.focus.id ? "quantity-node-focus" : ""}`}
            key={node.id}
          >
            <header>
              <h3>{node.label}</h3>
              <strong>{node.unit}</strong>
            </header>
            <p>{node.definition}</p>
            <div>
              {badge(node.kind === "base" ? "base quantity" : "derived quantity", node.kind === "base" ? "green" : "blue")}
              {badge(node.direction, node.direction === "vector" ? "orange" : "green")}
            </div>
            <p className="quantity-dimension">Dimension: {dimensionText(node.dimensions)}</p>
          </article>
        ))}
      </div>
      <p className="quantity-map-arrow-note">
        Arrows mean “depends on”: {model.dependencies.map((node) => node.label).join(" + ") || "no prior quantity"} → {model.focus.label}.
      </p>
    </section>
  );
};

const FormulaPanel = ({ model }: { readonly model: QuantityMapModel }) => {
  const left = assertKnownQuantity(model.equation.leftQuantityId);
  const tone = model.equation.status === "consistent" ? "green" : "red";

  return (
    <section aria-label="Formula used" className="quantity-formula-panel">
      <h3>Unit check</h3>
      <p className="quantity-equation">{model.equation.expression}</p>
      <dl>
        <dt>{left.label} dimension</dt>
        <dd>{dimensionText(left.dimensions)}</dd>
        <dt>Right-hand side dimension</dt>
        <dd>{dimensionText(model.equation.rightDimensions)}</dd>
      </dl>
      <p>{badge(model.equation.status === "consistent" ? "dimensionally consistent" : "dimension mismatch", tone)}</p>
      <p>{model.equation.reason}</p>
      <p className="quantity-formula-note">
        Units are part of the quantity: a matching number is not enough unless the dimensions match too.
      </p>
    </section>
  );
};

export const QuantityMapLab = () => {
  const [state, setState] = useState<QuantityMapState>({
    focusQuantityId: "speed",
    equationId: "speed-distance-time",
  });

  const model = useMemo(() => quantityMapModel(state), [state]);

  const setFocus = (focusQuantityId: string) => {
    setState({
      focusQuantityId,
      equationId: nextEquationForQuantity(focusQuantityId),
    });
  };

  const setEquation = (equationId: string) => {
    const equation = assertKnownEquation(equationId);
    setState({ focusQuantityId: equation.leftQuantityId, equationId });
  };

  return (
    <PredictionGate packageId={quantityMapPackageId} predict={dimensionPredict} simId={quantityMapSimId}>
      <section aria-label="Quantity map lab" className="quantity-map-lab">
        <header className="quantity-map-hero">
          <p className="quantity-map-kicker">Dependency graph lab</p>
          <h2>Build a quantity from the units underneath it</h2>
          <p>
            Choose a physical quantity, then inspect which base quantities it depends on and whether a proposed equation can possibly have the right units.
          </p>
        </header>

        <ControlGroup legend="Map controls">
          <Selector
            label="Quantity to inspect"
            onChange={setFocus}
            options={quantityNodes.map((node) => ({ label: node.label, value: node.id }))}
            value={state.focusQuantityId}
          />
          <Selector
            label="Equation to test"
            onChange={setEquation}
            options={equationOptions.map((option) => ({ label: option.label, value: option.id }))}
            value={state.equationId}
          />
        </ControlGroup>

        <div className="quantity-map-grid">
          <QuantityMapGraph model={model} />
          <FormulaPanel model={model} />
        </div>

        <section aria-label="Explain prompt" className="quantity-transfer-card">
          <h3>Explain</h3>
          <p>
            If two formulae give similar-looking numbers, use the unit map first: only the equation whose dimensions match the target quantity can be valid.
          </p>
        </section>
      </section>
    </PredictionGate>
  );
};

export default QuantityMapLab;
