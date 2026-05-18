import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";
import { ok, type KernelResult } from "@paideia/shared";
import { ControlGroup, Selector, Toggle } from "@paideia/ui-sim";

export const physicalQuantitiesPackageId = "physical-quantities-and-units";
export const quantityMapSimId = "quantity-dependency-map";

export const quantityMapPredict: TPredictSpec = {
  prompt:
    "A newton is the unit of force. Which dependency chain should prove that N reduces to kg m s^-2?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "force → mass and acceleration → length and time",
      "force → length and time only",
      "force → mass and length only",
      "force is an SI base quantity",
    ],
    correct_index: 0,
  },
  rationale_required: true,
};

export type QuantityKind = "base" | "derived";
export type DirectionKind = "scalar" | "vector";
export type QuantityId = "length" | "mass" | "time" | "velocity" | "acceleration" | "force" | "energy";

export interface DimensionVector {
  readonly mass: number;
  readonly length: number;
  readonly time: number;
}

export interface QuantityNode {
  readonly id: QuantityId;
  readonly label: string;
  readonly symbol: string;
  readonly unit: string;
  readonly kind: QuantityKind;
  readonly direction: DirectionKind;
  readonly dimension: DimensionVector;
  readonly definition: string;
  readonly reasoning: readonly string[];
}

export interface QuantityDependency {
  readonly source: QuantityId;
  readonly target: QuantityId;
  readonly label: string;
}

export interface QuantityMapModel {
  readonly selected: QuantityNode;
  readonly nodes: readonly QuantityNode[];
  readonly dependencies: readonly QuantityDependency[];
  readonly highlightedNodeIds: readonly QuantityId[];
  readonly highlightedDependencyLabels: readonly string[];
  readonly baseUnitText: string;
  readonly consistencyChecks: readonly string[];
}

const quantityNodes: readonly QuantityNode[] = [
  {
    id: "length",
    label: "length",
    symbol: "l",
    unit: "m",
    kind: "base",
    direction: "scalar",
    dimension: { mass: 0, length: 1, time: 0 },
    definition: "distance from one point to another",
    reasoning: ["length is an SI base quantity", "unit: metre, m"],
  },
  {
    id: "mass",
    label: "mass",
    symbol: "m",
    unit: "kg",
    kind: "base",
    direction: "scalar",
    dimension: { mass: 1, length: 0, time: 0 },
    definition: "amount of matter measured by inertia",
    reasoning: ["mass is an SI base quantity", "unit: kilogram, kg"],
  },
  {
    id: "time",
    label: "time",
    symbol: "t",
    unit: "s",
    kind: "base",
    direction: "scalar",
    dimension: { mass: 0, length: 0, time: 1 },
    definition: "duration between events",
    reasoning: ["time is an SI base quantity", "unit: second, s"],
  },
  {
    id: "velocity",
    label: "velocity",
    symbol: "v",
    unit: "m s^-1",
    kind: "derived",
    direction: "vector",
    dimension: { mass: 0, length: 1, time: -1 },
    definition: "displacement per unit time",
    reasoning: ["velocity = displacement ÷ time", "m ÷ s = m s^-1"],
  },
  {
    id: "acceleration",
    label: "acceleration",
    symbol: "a",
    unit: "m s^-2",
    kind: "derived",
    direction: "vector",
    dimension: { mass: 0, length: 1, time: -2 },
    definition: "change in velocity per unit time",
    reasoning: ["acceleration = velocity ÷ time", "(m s^-1) ÷ s = m s^-2"],
  },
  {
    id: "force",
    label: "force",
    symbol: "F",
    unit: "N",
    kind: "derived",
    direction: "vector",
    dimension: { mass: 1, length: 1, time: -2 },
    definition: "interaction that changes motion",
    reasoning: ["force = mass × acceleration", "kg × m s^-2 = kg m s^-2", "therefore 1 N = 1 kg m s^-2"],
  },
  {
    id: "energy",
    label: "energy",
    symbol: "E",
    unit: "J",
    kind: "derived",
    direction: "scalar",
    dimension: { mass: 1, length: 2, time: -2 },
    definition: "capacity to do work",
    reasoning: ["work done = force × distance", "N × m = kg m^2 s^-2", "therefore 1 J = 1 kg m^2 s^-2"],
  },
];

const quantityDependencies: readonly QuantityDependency[] = [
  { source: "length", target: "velocity", label: "÷ time" },
  { source: "time", target: "velocity", label: "sets rate" },
  { source: "velocity", target: "acceleration", label: "÷ time" },
  { source: "time", target: "acceleration", label: "per second again" },
  { source: "mass", target: "force", label: "× acceleration" },
  { source: "acceleration", target: "force", label: "F = ma" },
  { source: "force", target: "energy", label: "× distance" },
  { source: "length", target: "energy", label: "work distance" },
];

const nodeById = new Map<QuantityId, QuantityNode>(quantityNodes.map((node) => [node.id, node]));
const focusOptions = quantityNodes.map((node) => ({ value: node.id, label: `${node.label} (${node.unit})` }));

const dimensionTerm = (symbol: string, exponent: number): string => {
  if (exponent === 0) return "";
  if (exponent === 1) return symbol;
  return `${symbol}^${exponent}`;
};

const baseUnitText = (dimension: DimensionVector): string => {
  const parts = [
    dimensionTerm("kg", dimension.mass),
    dimensionTerm("m", dimension.length),
    dimensionTerm("s", dimension.time),
  ].filter((part) => part.length > 0);
  return parts.length === 0 ? "1" : parts.join(" ");
};

const upstreamIds = (selectedId: QuantityId): readonly QuantityId[] => {
  const visited = new Set<QuantityId>();
  const visit = (id: QuantityId) => {
    if (visited.has(id)) return;
    visited.add(id);
    quantityDependencies
      .filter((dependency) => dependency.target === id)
      .forEach((dependency) => visit(dependency.source));
  };
  visit(selectedId);
  return quantityNodes.map((node) => node.id).filter((id) => visited.has(id));
};

export const quantityMapModel = (selectedId: QuantityId): KernelResult<QuantityMapModel> => {
  const selected = nodeById.get(selectedId);
  if (selected === undefined) {
    const fallback = nodeById.get("length");
    if (fallback === undefined) return ok({
      selected: {
        id: "length",
        label: "length",
        symbol: "l",
        unit: "m",
        kind: "base",
        direction: "scalar",
        dimension: { mass: 0, length: 1, time: 0 },
        definition: "distance from one point to another",
        reasoning: ["length is an SI base quantity", "unit: metre, m"],
      },
      nodes: quantityNodes,
      dependencies: quantityDependencies,
      highlightedNodeIds: ["length"],
      highlightedDependencyLabels: [],
      baseUnitText: "m",
      consistencyChecks: ["Unknown selection reset to length."],
    });
    return ok({
      selected: fallback,
      nodes: quantityNodes,
      dependencies: quantityDependencies,
      highlightedNodeIds: ["length"],
      highlightedDependencyLabels: [],
      baseUnitText: "m",
      consistencyChecks: ["Unknown selection reset to length."],
    });
  }

  const highlightedNodeIds = upstreamIds(selectedId);
  const highlightedSet = new Set(highlightedNodeIds);
  const highlightedDependencyLabels = quantityDependencies
    .filter((dependency) => highlightedSet.has(dependency.source) && highlightedSet.has(dependency.target))
    .map((dependency) => dependency.label);

  return ok({
    selected,
    nodes: quantityNodes,
    dependencies: quantityDependencies,
    highlightedNodeIds,
    highlightedDependencyLabels,
    baseUnitText: baseUnitText(selected.dimension),
    consistencyChecks: [
      `${selected.label} is ${selected.kind === "base" ? "an SI base quantity" : "built from SI base quantities"}.`,
      `${selected.label} is a ${selected.direction} quantity${selected.direction === "vector" ? " because direction is part of the measurement" : " because direction is not part of the measurement"}.`,
      `Unit check: ${selected.unit} resolves to ${baseUnitText(selected.dimension)}.`,
    ],
  });
};

interface QuantityLayoutNode {
  readonly id: QuantityId;
  readonly x: number;
  readonly y: number;
}

interface QuantityLayoutResult {
  readonly nodes: readonly QuantityLayoutNode[];
}

const layoutResult = (): QuantityLayoutResult => ({
  nodes: [
    { id: "mass", x: -132, y: -82 },
    { id: "length", x: 28, y: -112 },
    { id: "time", x: 156, y: -72 },
    { id: "velocity", x: 72, y: 8 },
    { id: "acceleration", x: 132, y: 92 },
    { id: "force", x: -28, y: 92 },
    { id: "energy", x: -132, y: 12 },
  ],
});

const viewBox = (layout: QuantityLayoutResult): string => {
  const xs = layout.nodes.map((node) => node.x);
  const ys = layout.nodes.map((node) => node.y);
  const minX = Math.min(...xs) - 96;
  const maxX = Math.max(...xs) + 96;
  const minY = Math.min(...ys) - 72;
  const maxY = Math.max(...ys) + 72;
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
};

const positionMap = (layout: QuantityLayoutResult): ReadonlyMap<string, { readonly x: number; readonly y: number }> =>
  new Map(layout.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));

export interface QuantityMapGraphProps {
  readonly model: QuantityMapModel;
  readonly showAllLabels: boolean;
  readonly onSelect: (id: QuantityId) => void;
}

export const QuantityMapGraph = ({ model, showAllLabels, onSelect }: QuantityMapGraphProps) => {
  const layout = useMemo(layoutResult, []);
  const positions = positionMap(layout);
  const highlighted = new Set<QuantityId>(model.highlightedNodeIds);

  return (
    <svg aria-label="Quantity dependency graph" role="img" viewBox={viewBox(layout)}>
      <defs>
        <marker id="quantity-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 Z" fill="#64748b" />
        </marker>
      </defs>
      <rect fill="#f8fbff" height="100%" rx="24" width="100%" x="-50%" y="-50%" />
      <g stroke="#64748b" strokeOpacity="0.42" strokeWidth="2">
        {model.dependencies.map((dependency) => {
          const source = positions.get(dependency.source);
          const target = positions.get(dependency.target);
          if (source === undefined || target === undefined) return null;
          const active = highlighted.has(dependency.source) && highlighted.has(dependency.target);
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          return (
            <g key={`${dependency.source}-${dependency.target}`}>
              <line
                markerEnd="url(#quantity-arrow)"
                stroke={active ? "#1d4ed8" : "#94a3b8"}
                strokeOpacity={active ? 0.85 : 0.34}
                strokeWidth={active ? 3.5 : 2}
                x1={source.x}
                x2={target.x}
                y1={source.y}
                y2={target.y}
              />
              {showAllLabels || active ? (
                <text fill="#334155" fontSize="10" fontWeight="800" textAnchor="middle" x={midX} y={midY - 6}>
                  {dependency.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
      <g>
        {model.nodes.map((node) => {
          const position = positions.get(node.id);
          if (position === undefined) return null;
          const active = highlighted.has(node.id);
          const selected = node.id === model.selected.id;
          return (
            <g key={node.id}>
              <g
                aria-label={`Select ${node.label}`}
                onClick={() => onSelect(node.id)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onSelect(node.id);
                }}
                role="button"
                tabIndex={0}
              >
                <circle
                  cx={position.x}
                  cy={position.y}
                  fill={node.kind === "base" ? "#dcfce7" : "#dbeafe"}
                  r={selected ? 28 : 23}
                  stroke={selected ? "#b42318" : active ? "#1d4ed8" : "#475569"}
                  strokeWidth={selected ? 5 : active ? 3 : 1.5}
                />
                <text fill="#10201a" fontSize="11" fontWeight="900" textAnchor="middle" x={position.x} y={position.y - 2}>
                  {node.symbol}
                </text>
                <text fill="#334155" fontSize="9" fontWeight="800" textAnchor="middle" x={position.x} y={position.y + 11}>
                  {node.unit}
                </text>
              </g>
              <text fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="middle" x={position.x} y={position.y + 43}>
                {node.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export const QuantityDependencyMapSim = () => {
  const [selectedId, setSelectedId] = useState<QuantityId>("force");
  const [showAllLabels, setShowAllLabels] = useState(false);
  const model = quantityMapModel(selectedId);

  if (!model.ok) return <p role="alert">The quantity map could not be prepared.</p>;

  return (
    <PredictionGate packageId={physicalQuantitiesPackageId} predict={quantityMapPredict} simId={quantityMapSimId}>
      <section aria-label="Quantity dependency map lab" className="quantity-map-lab quantity-map-lab--product">
        <div className="quantity-map-controls" aria-label="Quantity map controls">
          <p className="lab-kicker">Build the dependency trail</p>
          <h2>Quantity map lab</h2>
          <p>
            Pick a quantity and trace which base quantities must be present before its unit can make sense.
          </p>
          <ControlGroup legend="Map controls">
            <Selector<QuantityId>
              label="Focus quantity"
              onChange={setSelectedId}
              options={focusOptions}
              value={selectedId}
            />
            <Toggle label="Show every link label" onChange={setShowAllLabels} value={showAllLabels} />
          </ControlGroup>
          <div className="quantity-map-legend" aria-label="Map legend">
            <span>green: base quantity</span>
            <span>blue: derived quantity</span>
            <span>red ring: your focus</span>
          </div>
        </div>

        <div className="quantity-map-stage">
          <QuantityMapGraph model={model.value} onSelect={setSelectedId} showAllLabels={showAllLabels} />
        </div>

        <section aria-label="Unit reasoning panel" className="quantity-map-reasoning">
          <p className="lab-kicker">Observation unlocked</p>
          <h3>{model.value.selected.label}</h3>
          <p>
            {model.value.selected.definition}. The unit shown on the map is {model.value.selected.unit}; in base SI units it becomes {model.value.baseUnitText}.
          </p>
          <dl aria-label="Quantity classification" className="quantity-classification">
            <div>
              <dt>Quantity type</dt>
              <dd>{model.value.selected.kind}</dd>
            </div>
            <div>
              <dt>Scalar or vector</dt>
              <dd>{model.value.selected.direction}</dd>
            </div>
            <div>
              <dt>Base-unit form</dt>
              <dd>{model.value.baseUnitText}</dd>
            </div>
          </dl>
          <ol aria-label="Visible unit reasoning">
            {model.value.selected.reasoning.map((line: string) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <ul aria-label="Dimensional consistency checks">
            {model.value.consistencyChecks.map((check: string) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
        </section>
      </section>
    </PredictionGate>
  );
};

export default QuantityDependencyMapSim;
