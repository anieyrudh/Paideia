import type { TSimulationSpec } from "@paideia/content-schema";
import { treeLayout, type LayoutResult2D, type TreeNode } from "@paideia/graph-layout";
import { norm2, normalize2, scale2, vector2 } from "@paideia/linear-algebra";
import { netForce } from "@paideia/mechanics";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  metres,
  newtons,
  ok,
  type ConceptPackageId,
  type KernelResult,
} from "@paideia/shared";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";
import type { CSSProperties } from "react";

type BraceSize = "light" | "standard" | "deep";
type LoadDirection = "left-to-right" | "right-to-left";

export interface StructuralLoadPathState {
  readonly lateralLoadKn: number;
  readonly roofLoadKn: number;
  readonly bayWidthM: number;
  readonly storeyHeightM: number;
  readonly braceSize: BraceSize;
  readonly loadDirection: LoadDirection;
}

interface BraceProfile {
  readonly label: string;
  readonly capacityKn: number;
  readonly stiffnessFactor: number;
}

export interface StructuralLoadPathEvidence {
  readonly state: StructuralLoadPathState;
  readonly braceLabel: string;
  readonly braceAngleDegrees: number;
  readonly braceAxialKn: number;
  readonly braceVectorKn: readonly [number, number];
  readonly braceUtilizationPercent: number;
  readonly overturningDeltaKn: number;
  readonly windwardReactionKn: number;
  readonly leewardReactionKn: number;
  readonly horizontalReactionKn: number;
  readonly residualMagnitudeKn: number;
  readonly status: "clear-path" | "brace-overstress" | "uplift-risk";
  readonly layout: LayoutResult2D;
}

const braceProfiles: Record<BraceSize, BraceProfile> = {
  light: { label: "Light diagonal", capacityKn: 30, stiffnessFactor: 0.9 },
  standard: { label: "Standard diagonal", capacityKn: 48, stiffnessFactor: 1 },
  deep: { label: "Deep truss bay", capacityKn: 72, stiffnessFactor: 1.1 },
};

const defaultState: StructuralLoadPathState = {
  lateralLoadKn: 24,
  roofLoadKn: 84,
  bayWidthM: 6,
  storeyHeightM: 4,
  braceSize: "standard",
  loadDirection: "left-to-right",
};

const braceOptions: readonly { readonly value: BraceSize; readonly label: string }[] = [
  { value: "light", label: "Light diagonal" },
  { value: "standard", label: "Standard diagonal" },
  { value: "deep", label: "Deep truss bay" },
];

const directionOptions: readonly { readonly value: LoadDirection; readonly label: string }[] = [
  { value: "left-to-right", label: "Wind from left" },
  { value: "right-to-left", label: "Wind from right" },
];

export const structuralLoadPathPackageId =
  "sutd/asd/structural-load-path-diagram" as ConceptPackageId;

export const structuralLoadPathSpec: TSimulationSpec = {
  id: "structural-load-path-diagram",
  title: "Structural Load Path Diagram",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/mechanics",
    "core/linear-algebra",
    "core/graph-layout",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A braced bay takes a strong sideways load. Before calculating, which part is most likely to govern the load path?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The diagonal brace force, because it resolves the sideways load.",
        "The roof load, because all members carry the same force.",
        "The supports, because loads disappear when they reach the ground.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "load-direction",
        label: "Load direction",
        kind: "selector",
        kernel_binding: "state.loadDirection",
      },
      {
        id: "brace-size",
        label: "Brace size",
        kind: "selector",
        kernel_binding: "state.braceSize",
      },
      {
        id: "lateral-load",
        label: "Sideways load",
        kind: "slider",
        kernel_binding: "state.lateralLoadKn",
        bounds: { min: 10, max: 54, step: 2 },
      },
      {
        id: "roof-load",
        label: "Roof gravity load",
        kind: "slider",
        kernel_binding: "state.roofLoadKn",
        bounds: { min: 48, max: 132, step: 6 },
      },
      {
        id: "bay-width",
        label: "Bay width",
        kind: "slider",
        kernel_binding: "state.bayWidthM",
        bounds: { min: 4, max: 9, step: 0.5 },
      },
      {
        id: "storey-height",
        label: "Storey height",
        kind: "slider",
        kernel_binding: "state.storeyHeightM",
        bounds: { min: 3, max: 6, step: 0.5 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "structural-load-path-renderer",
        module: "local",
        symbol: "StructuralLoadPathDiagram",
        props_binding:
          "Resolve lateral load through a diagonal brace, calculate support reactions, and label compression or tension paths.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why the diagonal force is larger than the applied sideways load, then transfer the same reasoning to a canopy frame.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Loads disappear at supports.",
      "All members carry equal force.",
    ],
  },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<StructuralLoadPathState>): StructuralLoadPathState => ({
  lateralLoadKn: clamp(state.lateralLoadKn ?? defaultState.lateralLoadKn, 10, 54),
  roofLoadKn: clamp(state.roofLoadKn ?? defaultState.roofLoadKn, 48, 132),
  bayWidthM: clamp(state.bayWidthM ?? defaultState.bayWidthM, 4, 9),
  storeyHeightM: clamp(state.storeyHeightM ?? defaultState.storeyHeightM, 3, 6),
  braceSize: state.braceSize ?? defaultState.braceSize,
  loadDirection: state.loadDirection ?? defaultState.loadDirection,
});

const round = (value: number, places = 1): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const format = (value: number, places = 1): string => round(value, places).toFixed(places);

const structuralTree: TreeNode = {
  id: "sideways load",
  children: [
    {
      id: "roof diaphragm",
      children: [
        { id: "diagonal brace", children: [{ id: "foundation tie" }] },
        { id: "windward column", children: [{ id: "windward base" }] },
        { id: "leeward column", children: [{ id: "leeward base" }] },
      ],
    },
  ],
};

const buildLayout = (): KernelResult<LayoutResult2D> =>
  treeLayout(structuralTree, { orientation: "horizontal", nodeSpacing: 72 });

export const structuralLoadPathModel = (
  input: StructuralLoadPathState,
): KernelResult<StructuralLoadPathEvidence> => {
  const state = currentState(input);
  const profile = braceProfiles[state.braceSize];
  const widthM = metres(state.bayWidthM);
  const heightM = metres(state.storeyHeightM);
  const lateralN = newtons(state.lateralLoadKn * 1000);
  const roofN = newtons(state.roofLoadKn * 1000);
  const directionSign = state.loadDirection === "left-to-right" ? 1 : -1;

  const braceDirection = vector2(widthM, heightM);
  if (!braceDirection.ok) return braceDirection;
  const unitBrace = normalize2(braceDirection.value);
  if (!unitBrace.ok) return unitBrace;

  const braceAngleRadians = Math.atan2(heightM, widthM);
  const braceAxialKn =
    (lateralN / 1000 / Math.max(0.15, Math.cos(braceAngleRadians))) *
    profile.stiffnessFactor;
  const braceVector = scale2(unitBrace.value, braceAxialKn);
  if (!braceVector.ok) return braceVector;

  const overturningDeltaKn = (lateralN / 1000 * heightM) / widthM;
  const windwardReactionKn = roofN / 1000 / 2 - overturningDeltaKn;
  const leewardReactionKn = roofN / 1000 / 2 + overturningDeltaKn;
  const horizontalReactionKn = lateralN / 1000;
  const equilibrium = netForce([
    { x: directionSign * lateralN, y: -roofN },
    { x: -directionSign * lateralN, y: windwardReactionKn * 1000 + leewardReactionKn * 1000 },
  ]);
  if (!equilibrium.ok) return equilibrium;
  const residualVector = vector2(equilibrium.value.x, equilibrium.value.y);
  if (!residualVector.ok) return residualVector;
  const residualNorm = normalizeResidualKn(residualVector.value);
  if (!residualNorm.ok) return residualNorm;

  const braceUtilizationPercent = (braceAxialKn / profile.capacityKn) * 100;
  const status =
    windwardReactionKn < 0
      ? "uplift-risk"
      : braceUtilizationPercent > 100
        ? "brace-overstress"
        : "clear-path";
  const layout = buildLayout();
  if (!layout.ok) return layout;

  return ok({
    state,
    braceLabel: profile.label,
    braceAngleDegrees: (braceAngleRadians * 180) / Math.PI,
    braceAxialKn,
    braceVectorKn: [directionSign * braceVector.value[0], braceVector.value[1]],
    braceUtilizationPercent,
    overturningDeltaKn,
    windwardReactionKn,
    leewardReactionKn,
    horizontalReactionKn,
    residualMagnitudeKn: residualNorm.value,
    status,
    layout: layout.value,
  });
};

const normalizeResidualKn = (
  residualVectorNewtons: readonly [number, number],
): KernelResult<number> => {
  const residual = vector2(residualVectorNewtons[0], residualVectorNewtons[1]);
  if (!residual.ok) return residual;
  const magnitude = norm2(residual.value);
  if (!magnitude.ok) return magnitude;
  return ok(magnitude.value / 1000);
};

const surfaceStyle: CSSProperties = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(20rem, 100%), 1fr))",
  minWidth: 0,
};

const panelStyle: CSSProperties = {
  border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
  borderRadius: "8px",
  boxSizing: "border-box",
  minWidth: 0,
  overflowWrap: "break-word",
  padding: "1rem",
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(10rem, 100%), 1fr))",
  minWidth: 0,
};

const formulaGridStyle: CSSProperties = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(16rem, 100%), 1fr))",
  minWidth: 0,
};

const svgStyle: CSSProperties = {
  display: "block",
  maxWidth: "100%",
  width: "100%",
};

const formulaBlockStyle: CSSProperties = {
  boxSizing: "border-box",
  maxWidth: "100%",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
};

const tableStyle: CSSProperties = {
  borderCollapse: "collapse",
  display: "block",
  maxWidth: "100%",
  overflowX: "auto",
};

const Metric = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <p style={panelStyle}>
    <strong>{value}</strong>
    <br />
    <span>{label}</span>
  </p>
);

const statusText = (status: StructuralLoadPathEvidence["status"]): string => {
  if (status === "clear-path") return "Clear path: reactions stay downward and the brace is within capacity.";
  if (status === "brace-overstress") return "Brace overstress: the diagonal is the governing member.";
  return "Uplift risk: overturning has made the windward reaction negative.";
};

const labelForNode = (id: string, evidence: StructuralLoadPathEvidence): string => {
  if (id === "diagonal brace") return `${id}: ${format(evidence.braceAxialKn)} kN`;
  if (id === "windward base") return `${id}: ${format(evidence.windwardReactionKn)} kN`;
  if (id === "leeward base") return `${id}: ${format(evidence.leewardReactionKn)} kN`;
  if (id === "sideways load") return `${id}: ${format(evidence.state.lateralLoadKn)} kN`;
  return id;
};

const LoadPathGraph = ({ evidence }: { readonly evidence: StructuralLoadPathEvidence }) => {
  const nodes = evidence.layout.nodes;
  const links = evidence.layout.links;
  const positions = new Map(nodes.map((node) => [node.id, node]));
  const width = Math.max(...nodes.map((node) => node.x)) + 180;
  const height = Math.max(...nodes.map((node) => node.y)) + 72;

  return (
    <svg aria-label="Load path graph" role="img" style={svgStyle} viewBox={`-24 -28 ${width} ${height}`}>
      <rect fill="#fbfaf7" height={height} rx="8" width={width} x="-24" y="-28" />
      <g stroke="#7a6a58" strokeWidth="2">
        {links.map((link, index) => {
          const source = positions.get(link.source);
          const target = positions.get(link.target);
          if (source === undefined || target === undefined) return null;
          const isBrace = link.target === "diagonal brace" || link.source === "diagonal brace";
          return (
            <line
              key={`${link.source}-${link.target}-${index}`}
              stroke={isBrace ? "#1f6f8b" : "#6b7280"}
              strokeDasharray={isBrace ? undefined : "5 4"}
              x1={source.x}
              x2={target.x}
              y1={source.y}
              y2={target.y}
            />
          );
        })}
      </g>
      <g>
        {nodes.map((node) => {
          const isBrace = node.id === "diagonal brace";
          const isBase = node.id.endsWith("base") || node.id === "foundation tie";
          return (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                fill={isBrace ? "#d9f0f5" : isBase ? "#e7e0d2" : "#eef2e6"}
                r="12"
                stroke={isBrace ? "#1f6f8b" : "#5f6f52"}
                strokeWidth="2"
              />
              <text fill="#1f2933" fontSize="10" x={node.x + 16} y={node.y + 4}>
                {labelForNode(node.id, evidence)}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

const FrameDiagram = ({ evidence }: { readonly evidence: StructuralLoadPathEvidence }) => {
  const braceColor = evidence.status === "brace-overstress" ? "#b42318" : "#1f6f8b";
  const directionLeft = evidence.state.loadDirection === "left-to-right";
  const leftReactionKn = directionLeft ? evidence.windwardReactionKn : evidence.leewardReactionKn;
  const rightReactionKn = directionLeft ? evidence.leewardReactionKn : evidence.windwardReactionKn;
  const leftReactionColor = leftReactionKn < 0 ? "#b45309" : "#4f6f3a";
  const rightReactionColor = rightReactionKn < 0 ? "#b45309" : "#4f6f3a";
  const leftLabel = directionLeft ? "windward" : "leeward";
  const rightLabel = directionLeft ? "leeward" : "windward";

  return (
    <svg aria-label="Braced frame load path diagram" role="img" style={svgStyle} viewBox="0 0 280 190">
      <rect fill="#fbfaf7" height="190" rx="8" width="280" />
      <line stroke="#5b6470" strokeWidth="8" x1="68" x2="68" y1="48" y2="150" />
      <line stroke="#5b6470" strokeWidth="8" x1="212" x2="212" y1="48" y2="150" />
      <line stroke="#5b6470" strokeWidth="8" x1="60" x2="220" y1="50" y2="50" />
      <line stroke="#5b6470" strokeWidth="8" x1="56" x2="224" y1="150" y2="150" />
      <line stroke={braceColor} strokeLinecap="round" strokeWidth="8" x1="68" x2="212" y1="150" y2="50" />
      <line markerEnd="url(#side-arrow)" stroke="#b42318" strokeWidth="5" x1={directionLeft ? 18 : 262} x2={directionLeft ? 62 : 218} y1="76" y2="76" />
      <line markerEnd="url(#down-arrow)" stroke="#475467" strokeWidth="5" x1="140" x2="140" y1="14" y2="47" />
      <line markerEnd="url(#left-up-arrow)" stroke={leftReactionColor} strokeWidth="5" x1="68" x2="68" y1="180" y2={leftReactionKn < 0 ? 170 : 154} />
      <line markerEnd="url(#right-up-arrow)" stroke={rightReactionColor} strokeWidth="5" x1="212" x2="212" y1="180" y2={rightReactionKn < 0 ? 170 : 154} />
      <defs>
        <marker id="side-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 Z" fill="#b42318" />
        </marker>
        <marker id="down-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 Z" fill="#475467" />
        </marker>
        <marker id="left-up-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 Z" fill={leftReactionColor} />
        </marker>
        <marker id="right-up-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 Z" fill={rightReactionColor} />
        </marker>
      </defs>
      <text fill="#1f2933" fontSize="10" x="24" y="68">
        H = {format(evidence.state.lateralLoadKn)} kN
      </text>
      <text fill="#1f2933" fontSize="10" x="116" y="24">
        W = {format(evidence.state.roofLoadKn)} kN
      </text>
      <text fill="#1f2933" fontSize="10" x="84" y="108">
        brace {format(evidence.braceAxialKn)} kN
      </text>
      <text fill="#1f2933" fontSize="10" x="36" y="170">
        {leftLabel} {format(leftReactionKn)} kN
      </text>
      <text fill="#1f2933" fontSize="10" x="178" y="170">
        {rightLabel} {format(rightReactionKn)} kN
      </text>
    </svg>
  );
};

const Legend = () => (
  <table style={tableStyle}>
    <thead>
      <tr>
        <th>Color</th>
        <th>Symbol</th>
        <th>Meaning</th>
        <th>Unit</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Red</td>
        <td>H</td>
        <td>sideways load</td>
        <td>kN</td>
      </tr>
      <tr>
        <td>Blue</td>
        <td>F_b</td>
        <td>axial force in the diagonal brace</td>
        <td>kN</td>
      </tr>
      <tr>
        <td>Green</td>
        <td>R</td>
        <td>vertical support reaction</td>
        <td>kN</td>
      </tr>
      <tr>
        <td>Amber</td>
        <td>Delta R</td>
        <td>reaction shift caused by overturning</td>
        <td>kN</td>
      </tr>
    </tbody>
  </table>
);

const FormulaPanel = ({ evidence }: { readonly evidence: StructuralLoadPathEvidence }) => (
  <div style={panelStyle}>
    <h3>Formula trail</h3>
    <div style={formulaGridStyle}>
      <div>
        <pre style={formulaBlockStyle}>
          <code>{String.raw`\color{#1f6f8b}{F_b} = \frac{\color{#b42318}{H}}{\cos(\color{#6b7280}{\theta})}`}</code>
        </pre>
        <p>
          Substitution: F_b = {format(evidence.state.lateralLoadKn)} kN / cos(
          {format(evidence.braceAngleDegrees)} deg) = {format(evidence.braceAxialKn)} kN.
        </p>
        <p>
          Reason: only the horizontal component of the diagonal balances the sideways load, so
          the axial brace force is larger than H.
        </p>
      </div>
      <Legend />
    </div>
    <pre style={formulaBlockStyle}>
      <code>{String.raw`\color{#b45309}{\Delta R} = \frac{\color{#b42318}{H}\color{#6b7280}{h}}{\color{#6b7280}{L}}`}</code>
    </pre>
    <p>
      Substitution: Delta R = ({format(evidence.state.lateralLoadKn)} kN)(
      {format(evidence.state.storeyHeightM)} m) / {format(evidence.state.bayWidthM)} m ={" "}
      {format(evidence.overturningDeltaKn)} kN.
    </p>
    <p>
      Support reactions: R_windward = W/2 - Delta R = {format(evidence.state.roofLoadKn / 2)} -{" "}
      {format(evidence.overturningDeltaKn)} = {format(evidence.windwardReactionKn)} kN; R_leeward =
      W/2 + Delta R = {format(evidence.leewardReactionKn)} kN.
    </p>
    <p>Interpretation: {statusText(evidence.status)}</p>
  </div>
);

const PreviewPanel = ({ evidence }: { readonly evidence: StructuralLoadPathEvidence }) => (
  <div style={panelStyle}>
    <FrameDiagram evidence={evidence} />
    <p>
      Legend: red is applied sideways load, blue is diagonal brace force, green is downward
      support reaction, amber marks uplift risk.
    </p>
  </div>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<StructuralLoadPathState>();
  const current = currentState(state);
  const evidence = structuralLoadPathModel(current);

  return (
    <section aria-label="Structural bay controls" role="region" style={surfaceStyle}>
      <div style={panelStyle}>
        <h2>Set the bay</h2>
        <p>
          Change the load, geometry, and brace size. The reveal resolves the load into the
          member path and support reactions.
        </p>
        <ControlGroup legend="Design inputs">
          <Selector
            label="Load direction"
            onChange={(value) => set("loadDirection", value)}
            options={directionOptions}
            value={current.loadDirection}
          />
          <Selector
            label="Brace size"
            onChange={(value) => set("braceSize", value)}
            options={braceOptions}
            value={current.braceSize}
          />
          <Slider
            label="Sideways load"
            max={54}
            min={10}
            onChange={(value) => set("lateralLoadKn", value)}
            step={2}
            unit="kN"
            value={current.lateralLoadKn}
          />
          <Slider
            label="Roof gravity load"
            max={132}
            min={48}
            onChange={(value) => set("roofLoadKn", value)}
            step={6}
            unit="kN"
            value={current.roofLoadKn}
          />
          <Slider
            label="Bay width"
            max={9}
            min={4}
            onChange={(value) => set("bayWidthM", value)}
            step={0.5}
            unit="m"
            value={current.bayWidthM}
          />
          <Slider
            label="Storey height"
            max={6}
            min={3}
            onChange={(value) => set("storeyHeightM", value)}
            step={0.5}
            unit="m"
            value={current.storeyHeightM}
          />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal load path
        </button>
      </div>
      {evidence.ok ? <PreviewPanel evidence={evidence.value} /> : <p role="alert">The bay cannot be evaluated.</p>}
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = structuralLoadPathModel(currentState(useSimState<Partial<StructuralLoadPathState>>()));

  if (!evidence.ok) {
    return <p role="alert">The selected bay cannot be evaluated.</p>;
  }

  const value = evidence.value;

  return (
    <section aria-label="Load path evidence" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Structural load path evidence</h2>
      <div style={surfaceStyle}>
        <PreviewPanel evidence={value} />
        <div style={metricGridStyle}>
          <Metric label="Brace axial force" value={`${format(value.braceAxialKn)} kN`} />
          <Metric label="Brace utilization" value={`${format(value.braceUtilizationPercent)}%`} />
          <Metric label="Windward reaction" value={`${format(value.windwardReactionKn)} kN`} />
          <Metric label="Leeward reaction" value={`${format(value.leewardReactionKn)} kN`} />
          <Metric label="Horizontal base reaction" value={`${format(value.horizontalReactionKn)} kN`} />
          <Metric label="Equilibrium residual" value={`${format(value.residualMagnitudeKn, 2)} kN`} />
        </div>
      </div>
      <div style={panelStyle}>
        <h3>Load path graph</h3>
        <LoadPathGraph evidence={value} />
      </div>
      <FormulaPanel evidence={value} />
      <button type="button" onClick={() => stage.advance()}>
        Explain transfer
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Transfer</h2>
      <p>
        A lightweight canopy uses the same braced bay idea, but the roof load is smaller and
        wind suction can reverse the loaded side. Sketch the load path, label the tension or
        compression diagonal, and calculate whether either base risks uplift.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another bay
      </button>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") return <ExplainStage />;

  return (
    <section aria-label="Prediction setup" role="region">
      <h2>Before the reveal</h2>
      <p>
        Predict which part of a braced bay will govern the load path. Then tune the loads and
        geometry to test the prediction with force equilibrium.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set bay inputs
      </button>
    </section>
  );
};

export default function StructuralLoadPathDiagram() {
  return (
    <SimRuntime spec={structuralLoadPathSpec} packageId={structuralLoadPathPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
