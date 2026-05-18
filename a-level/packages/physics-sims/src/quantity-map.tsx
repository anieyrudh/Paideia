import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { topologicalSort, type WeightedGraph } from "@paideia/graph-algorithms";
import { PredictionGate } from "@paideia/prediction-gate";
import { ControlGroup, Selector } from "@paideia/ui-sim";

export const quantityMapPackageId = "physical-quantities-and-units";
export const quantityMapSimId = "quantity-map-lab";

export const quantityMapPredict: TPredictSpec = {
  prompt:
    "Before opening the map: force is measured in newtons. Which base dimensions must a correct expression for force contain?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "mass + length + time^-2",
      "length + time^-1",
      "mass + length + time^-1",
      "length + time^2",
    ],
    correct_index: 0,
  },
  rationale_required: true,
};

type BaseDimension = "length" | "mass" | "time";
type QuantityKind = "base" | "derived";
type DirectionKind = "scalar" | "vector";

export type QuantityId =
  | "length"
  | "mass"
  | "time"
  | "displacement"
  | "speed"
  | "velocity"
  | "acceleration"
  | "force"
  | "energy"
  | "frequency";

export type EquationId =
  | "speed-distance-time"
  | "speed-distance-times-time"
  | "acceleration-velocity-time"
  | "force-mass-acceleration"
  | "force-mass-velocity"
  | "energy-force-distance"
  | "frequency-one-over-time";

export interface DimensionVector {
  readonly length: number;
  readonly mass: number;
  readonly time: number;
}

export interface QuantityNode {
  readonly id: QuantityId;
  readonly label: string;
  readonly unit: string;
  readonly kind: QuantityKind;
  readonly direction: DirectionKind;
  readonly dimension: DimensionVector;
  readonly dependsOn: readonly QuantityId[];
  readonly x: number;
  readonly y: number;
}

export interface EquationCandidate {
  readonly id: EquationId;
  readonly label: string;
  readonly target: QuantityId;
  readonly dimension: DimensionVector;
  readonly reasoning: readonly string[];
}

export interface QuantityMapModel {
  readonly target: QuantityNode;
  readonly equation: EquationCandidate;
  readonly isDimensionallyConsistent: boolean;
  readonly dependencyOrder: readonly QuantityId[];
  readonly neededBaseDimensions: readonly BaseDimension[];
}

const zeroDimension: DimensionVector = { length: 0, mass: 0, time: 0 };

const dimension = (length: number, mass: number, time: number): DimensionVector => ({
  length,
  mass,
  time,
});

export const quantityNodes: readonly QuantityNode[] = [
  {
    id: "length",
    label: "Length",
    unit: "m",
    kind: "base",
    direction: "scalar",
    dimension: dimension(1, 0, 0),
    dependsOn: [],
    x: 80,
    y: 80,
  },
  {
    id: "mass",
    label: "Mass",
    unit: "kg",
    kind: "base",
    direction: "scalar",
    dimension: dimension(0, 1, 0),
    dependsOn: [],
    x: 80,
    y: 190,
  },
  {
    id: "time",
    label: "Time",
    unit: "s",
    kind: "base",
    direction: "scalar",
    dimension: dimension(0, 0, 1),
    dependsOn: [],
    x: 80,
    y: 300,
  },
  {
    id: "displacement",
    label: "Displacement",
    unit: "m",
    kind: "derived",
    direction: "vector",
    dimension: dimension(1, 0, 0),
    dependsOn: ["length"],
    x: 285,
    y: 72,
  },
  {
    id: "speed",
    label: "Speed",
    unit: "m s^-1",
    kind: "derived",
    direction: "scalar",
    dimension: dimension(1, 0, -1),
    dependsOn: ["length", "time"],
    x: 285,
    y: 158,
  },
  {
    id: "velocity",
    label: "Velocity",
    unit: "m s^-1",
    kind: "derived",
    direction: "vector",
    dimension: dimension(1, 0, -1),
    dependsOn: ["displacement", "time"],
    x: 492,
    y: 102,
  },
  {
    id: "frequency",
    label: "Frequency",
    unit: "s^-1",
    kind: "derived",
    direction: "scalar",
    dimension: dimension(0, 0, -1),
    dependsOn: ["time"],
    x: 285,
    y: 286,
  },
  {
    id: "acceleration",
    label: "Acceleration",
    unit: "m s^-2",
    kind: "derived",
    direction: "vector",
    dimension: dimension(1, 0, -2),
    dependsOn: ["velocity", "time"],
    x: 492,
    y: 206,
  },
  {
    id: "force",
    label: "Force",
    unit: "N = kg m s^-2",
    kind: "derived",
    direction: "vector",
    dimension: dimension(1, 1, -2),
    dependsOn: ["mass", "acceleration"],
    x: 690,
    y: 165,
  },
  {
    id: "energy",
    label: "Energy",
    unit: "J = kg m^2 s^-2",
    kind: "derived",
    direction: "scalar",
    dimension: dimension(2, 1, -2),
    dependsOn: ["force", "length"],
    x: 690,
    y: 268,
  },
] as const;

export const equationCandidates: readonly EquationCandidate[] = [
  {
    id: "speed-distance-time",
    label: "speed = distance ÷ time",
    target: "speed",
    dimension: dimension(1, 0, -1),
    reasoning: ["distance contributes L", "dividing by time contributes T^-1"],
  },
  {
    id: "speed-distance-times-time",
    label: "speed = distance × time",
    target: "speed",
    dimension: dimension(1, 0, 1),
    reasoning: ["distance contributes L", "multiplying by time contributes T, not T^-1"],
  },
  {
    id: "acceleration-velocity-time",
    label: "acceleration = velocity ÷ time",
    target: "acceleration",
    dimension: dimension(1, 0, -2),
    reasoning: ["velocity contributes L T^-1", "dividing by another time gives L T^-2"],
  },
  {
    id: "force-mass-acceleration",
    label: "force = mass × acceleration",
    target: "force",
    dimension: dimension(1, 1, -2),
    reasoning: ["mass contributes M", "acceleration contributes L T^-2"],
  },
  {
    id: "force-mass-velocity",
    label: "force = mass × velocity",
    target: "force",
    dimension: dimension(1, 1, -1),
    reasoning: ["mass contributes M", "velocity contributes L T^-1, missing one division by time"],
  },
  {
    id: "energy-force-distance",
    label: "energy = force × distance",
    target: "energy",
    dimension: dimension(2, 1, -2),
    reasoning: ["force contributes M L T^-2", "distance contributes another L"],
  },
  {
    id: "frequency-one-over-time",
    label: "frequency = 1 ÷ time",
    target: "frequency",
    dimension: dimension(0, 0, -1),
    reasoning: ["one cycle count is dimensionless", "dividing by time gives T^-1"],
  },
] as const;

const quantityGraph: WeightedGraph = {
  directed: true,
  nodes: quantityNodes.map((node) => ({ id: node.id })),
  edges: quantityNodes.flatMap((node) =>
    node.dependsOn.map((dependency) => ({ source: dependency, target: node.id })),
  ),
};

const vectorsEqual = (a: DimensionVector, b: DimensionVector): boolean =>
  a.length === b.length && a.mass === b.mass && a.time === b.time;

const dimensionEntries = ["mass", "length", "time"] as const;

export const formatDimension = (value: DimensionVector): string => {
  const parts = dimensionEntries
    .map((key) => {
      const exponent = value[key];
      if (exponent === 0) return null;
      const symbol = key === "mass" ? "M" : key === "length" ? "L" : "T";
      return exponent === 1 ? symbol : `${symbol}^${exponent}`;
    })
    .filter((part): part is string => part !== null);

  return parts.length === 0 ? "dimensionless" : parts.join(" ");
};

const baseDimensionsOf = (value: DimensionVector): readonly BaseDimension[] =>
  (["length", "mass", "time"] as const).filter((key) => value[key] !== 0);

const nodeById = (id: QuantityId): QuantityNode => {
  const node = quantityNodes.find((candidate) => candidate.id === id);
  if (node === undefined) {
    throw new Error(`Unknown quantity id: ${id}`);
  }
  return node;
};

const equationById = (id: EquationId): EquationCandidate => {
  const equation = equationCandidates.find((candidate) => candidate.id === id);
  if (equation === undefined) {
    throw new Error(`Unknown equation id: ${id}`);
  }
  return equation;
};

const dependencyOrderFor = (target: QuantityId): readonly QuantityId[] => {
  const sorted = topologicalSort(quantityGraph);
  if (!sorted.ok) return [target];
  const needed = new Set<QuantityId>();
  const visit = (id: QuantityId) => {
    if (needed.has(id)) return;
    needed.add(id);
    for (const dependency of nodeById(id).dependsOn) visit(dependency);
  };
  visit(target);
  return sorted.value.order.filter((id): id is QuantityId => needed.has(id as QuantityId));
};

export const buildQuantityMapModel = (
  targetId: QuantityId,
  equationId: EquationId,
): QuantityMapModel => {
  const target = nodeById(targetId);
  const equation = equationById(equationId);

  return {
    target,
    equation,
    isDimensionallyConsistent:
      equation.target === target.id && vectorsEqual(equation.dimension, target.dimension),
    dependencyOrder: dependencyOrderFor(target.id),
    neededBaseDimensions: baseDimensionsOf(target.dimension),
  };
};

const targetOptions = quantityNodes
  .filter((node) => node.kind === "derived")
  .map((node) => ({ value: node.id, label: `${node.label} (${node.unit})` }));

const equationOptions = equationCandidates.map((candidate) => ({
  value: candidate.id,
  label: candidate.label,
}));

const surfaceStyle = {
  background: "linear-gradient(135deg, #f8fbff 0%, #eef7f4 100%)",
  border: "1px solid #cfe3ef",
  borderRadius: "24px",
  color: "#172033",
  display: "grid",
  gap: "1rem",
  padding: "1rem",
} satisfies React.CSSProperties;

const panelStyle = {
  background: "rgba(255, 255, 255, 0.86)",
  border: "1px solid #d9e8ef",
  borderRadius: "18px",
  boxShadow: "0 10px 30px rgba(38, 74, 91, 0.08)",
  padding: "1rem",
} satisfies React.CSSProperties;

const GraphView = ({ model }: { readonly model: QuantityMapModel }) => {
  const highlighted = new Set(model.dependencyOrder);

  return (
    <svg aria-label="Quantity dependency map" role="img" viewBox="0 0 780 365">
      <defs>
        <marker id="quantity-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 Z" fill="#52718a" />
        </marker>
      </defs>
      <rect fill="#f7fbff" height="365" rx="18" width="780" />
      {quantityNodes.flatMap((node) =>
        node.dependsOn.map((dependency) => {
          const source = nodeById(dependency);
          const active = highlighted.has(node.id) && highlighted.has(source.id);
          return (
            <line
              key={`${dependency}-${node.id}`}
              markerEnd="url(#quantity-arrow)"
              stroke={active ? "#0f8f6b" : "#b8c8d4"}
              strokeDasharray={active ? undefined : "6 7"}
              strokeWidth={active ? 3 : 2}
              x1={source.x + 68}
              x2={node.x - 72}
              y1={source.y}
              y2={node.y}
            />
          );
        }),
      )}
      {quantityNodes.map((node) => {
        const isTarget = node.id === model.target.id;
        const active = highlighted.has(node.id);
        return (
          <g key={node.id} transform={`translate(${node.x - 70} ${node.y - 31})`}>
            <rect
              fill={isTarget ? "#17324d" : active ? "#e7fff5" : "#ffffff"}
              height="62"
              rx="14"
              stroke={isTarget ? "#17324d" : active ? "#0f8f6b" : "#c8d7e1"}
              strokeWidth={isTarget || active ? 3 : 1.5}
              width="140"
            />
            <text
              fill={isTarget ? "#ffffff" : "#162033"}
              fontSize="14"
              fontWeight="700"
              textAnchor="middle"
              x="70"
              y="24"
            >
              {node.label}
            </text>
            <text
              fill={isTarget ? "#d6efff" : "#52718a"}
              fontSize="12"
              textAnchor="middle"
              x="70"
              y="44"
            >
              {node.unit} · {node.kind} · {node.direction}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const Badge = ({ children, tone }: { readonly children: string; readonly tone: "good" | "warn" | "info" }) => {
  const background = tone === "good" ? "#e7fff5" : tone === "warn" ? "#fff3df" : "#eaf2ff";
  const border = tone === "good" ? "#75d8b8" : tone === "warn" ? "#efba6b" : "#9dbcf4";
  return (
    <span
      style={{
        background,
        border: `1px solid ${border}`,
        borderRadius: "999px",
        display: "inline-block",
        fontWeight: 700,
        margin: "0.15rem",
        padding: "0.3rem 0.6rem",
      }}
    >
      {children}
    </span>
  );
};

export const QuantityMapLab = () => {
  const [targetId, setTargetId] = useState<QuantityId>("force");
  const [equationId, setEquationId] = useState<EquationId>("force-mass-acceleration");
  const model = useMemo(() => buildQuantityMapModel(targetId, equationId), [equationId, targetId]);

  return (
    <section aria-label="Quantity map lab" style={surfaceStyle}>
      <header style={panelStyle}>
        <p style={{ fontSize: "0.8rem", fontWeight: 800, letterSpacing: "0.12em", margin: 0, textTransform: "uppercase" }}>
          Quantity map lab
        </p>
        <h2 style={{ margin: "0.25rem 0" }}>Trace units through a dependency graph</h2>
        <p style={{ margin: 0 }}>
          Predict first. Then choose a quantity and test whether a proposed equation lands on the same base dimensions.
        </p>
      </header>

      <PredictionGate packageId={quantityMapPackageId} predict={quantityMapPredict} simId={quantityMapSimId}>
        <section aria-label="Observation unlocked" style={{ display: "grid", gap: "1rem" }}>
          <div style={panelStyle}>
            <ControlGroup legend="Map controls">
              <Selector label="Target quantity" onChange={setTargetId} options={targetOptions} value={targetId} />
              <Selector label="Equation to test" onChange={setEquationId} options={equationOptions} value={equationId} />
            </ControlGroup>
          </div>

          <div style={{ ...panelStyle, overflowX: "auto" }}>
            <h3 style={{ margin: "0 0 0.5rem" }}>Quantity dependency map</h3>
            <GraphView model={model} />
          </div>

          <section aria-label="Dimension verdict" style={{ ...panelStyle, display: "grid", gap: "0.75rem" }}>
            <div>
              <Badge tone="info">{model.target.kind === "base" ? "Base quantity" : "Derived quantity"}</Badge>
              <Badge tone="info">{model.target.direction}</Badge>
              <Badge tone={model.isDimensionallyConsistent ? "good" : "warn"}>
                {model.isDimensionallyConsistent ? "dimensionally consistent" : "dimension mismatch"}
              </Badge>
            </div>
            <dl style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "max-content 1fr", margin: 0 }}>
              <dt>Target unit</dt>
              <dd>{model.target.unit}</dd>
              <dt>Target dimension</dt>
              <dd>{formatDimension(model.target.dimension)}</dd>
              <dt>Equation gives</dt>
              <dd>{formatDimension(model.equation.dimension)}</dd>
              <dt>Dependency path</dt>
              <dd>{model.dependencyOrder.map((id) => nodeById(id).label).join(" → ")}</dd>
            </dl>
            <div aria-label="Formula reasoning">
              <h3 style={{ margin: "0 0 0.35rem" }}>Formula reasoning</h3>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {model.equation.reasoning.map((line) => (
                  <li key={line}>{line}</li>
                ))}
                <li>
                  A valid equation for {model.target.label.toLowerCase()} must reduce to {formatDimension(model.target.dimension)}.
                </li>
              </ul>
            </div>
            <p style={{ margin: 0 }}>
              Units constrain equations because addition and equality are only meaningful when both sides have the same base dimensions.
            </p>
          </section>
        </section>
      </PredictionGate>
    </section>
  );
};

export default QuantityMapLab;
