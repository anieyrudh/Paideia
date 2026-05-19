import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import { vector2, norm2 } from "@paideia/linear-algebra";
import { netForce } from "@paideia/mechanics";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";
import type { CSSProperties } from "react";

type BraceMode = "moment-frame" | "diagonal-brace" | "x-brace";

interface BayState {
  readonly apertureRatio: number;
  readonly braceMode: BraceMode;
  readonly lateralLoadKn: number;
  readonly bayHeightM: number;
}

interface BraceProfile {
  readonly label: string;
  readonly baseCapacityKn: number;
  readonly openingPenalty: number;
  readonly obstructionRatio: number;
}

interface TradeoffEvidence {
  readonly state: BayState;
  readonly daylightScore: number;
  readonly lateralCapacityKn: number;
  readonly residualKn: number;
  readonly residualMagnitudeKn: number;
  readonly braceAxialKn: number;
  readonly braceAngleDegrees: number;
  readonly columnReactionKn: number;
  readonly reservePercent: number;
  readonly decision: "balanced" | "too-flexible" | "too-dark";
}

const braceProfiles: Record<BraceMode, BraceProfile> = {
  "moment-frame": {
    label: "Moment frame",
    baseCapacityKn: 22,
    openingPenalty: 0.35,
    obstructionRatio: 0.04,
  },
  "diagonal-brace": {
    label: "Diagonal brace",
    baseCapacityKn: 38,
    openingPenalty: 0.48,
    obstructionRatio: 0.16,
  },
  "x-brace": {
    label: "X-brace",
    baseCapacityKn: 52,
    openingPenalty: 0.58,
    obstructionRatio: 0.3,
  },
};

const defaultState: BayState = {
  apertureRatio: 0.55,
  braceMode: "diagonal-brace",
  lateralLoadKn: 24,
  bayHeightM: 4,
};

const braceOptions: readonly { readonly value: BraceMode; readonly label: string }[] = [
  { value: "moment-frame", label: "Moment frame" },
  { value: "diagonal-brace", label: "Diagonal brace" },
  { value: "x-brace", label: "X-brace" },
];

const bayWidthM = 6;
const gravityLoadKn = 90;

export const loadPathDaylightPackageId =
  "sutd/asd/load-path-and-daylight-tradeoff" as ConceptPackageId;

export const loadPathDaylightSpec: TSimulationSpec = {
  id: "load-path-and-daylight-tradeoff",
  title: "Load Path and Daylight Tradeoff Explorer",
  interaction_type: "systems-flow-diagram",
  kernel_deps: [
    "core/sim-runtime",
    "core/linear-algebra",
    "core/mechanics",
    "core/charting",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "aperture-ratio",
        label: "Opening ratio",
        kind: "slider",
        kernel_binding: "state.apertureRatio",
        bounds: { min: 0.25, max: 0.8, step: 0.05 },
      },
      {
        id: "lateral-load",
        label: "Lateral load",
        kind: "slider",
        kernel_binding: "state.lateralLoadKn",
        bounds: { min: 12, max: 42, step: 2 },
      },
      {
        id: "bay-height",
        label: "Bay height",
        kind: "slider",
        kernel_binding: "state.bayHeightM",
        bounds: { min: 3, max: 6, step: 0.5 },
      },
    ],
  },
  predict: {
    prompt:
      "For a single bay with a useful window opening, which option is most likely to keep a clear load path while preserving usable daylight?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Large opening with no brace",
        "Medium opening with diagonal brace",
        "Small opening with X-brace",
      ],
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "load-path-daylight-renderer",
        module: "local",
        symbol: "LoadPathAndDaylightTradeoff",
        props_binding:
          "Show lateral demand, resisting path, daylight proxy, and the formula-backed tradeoff for one bay.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why a larger opening can improve daylight but weaken the lateral path, and identify the design move that restores equilibrium.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "More glass always improves performance.",
      "Loads travel only vertically.",
    ],
  },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<BayState>): BayState => ({
  apertureRatio: clamp(state.apertureRatio ?? defaultState.apertureRatio, 0.25, 0.8),
  braceMode: state.braceMode ?? defaultState.braceMode,
  lateralLoadKn: clamp(state.lateralLoadKn ?? defaultState.lateralLoadKn, 12, 42),
  bayHeightM: clamp(state.bayHeightM ?? defaultState.bayHeightM, 3, 6),
});

const round = (value: number, places = 1): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const format = (value: number, places = 1): string => round(value, places).toFixed(places);

const evaluateTradeoff = (state: BayState): KernelResult<TradeoffEvidence> => {
  const profile = braceProfiles[state.braceMode];
  const openingFactor = Math.max(0.2, 1 - profile.openingPenalty * state.apertureRatio);
  const lateralCapacityKn = profile.baseCapacityKn * openingFactor;
  const residualKn = state.lateralLoadKn - lateralCapacityKn;
  const forceBalance = netForce([
    { x: state.lateralLoadKn, y: -gravityLoadKn },
    { x: -lateralCapacityKn, y: gravityLoadKn },
  ]);
  if (!forceBalance.ok) return forceBalance;
  const residualVector = vector2(forceBalance.value.x, forceBalance.value.y);
  if (!residualVector.ok) return residualVector;
  const residualMagnitude = norm2(residualVector.value);
  if (!residualMagnitude.ok) return residualMagnitude;

  const braceAngle = Math.atan2(state.bayHeightM, bayWidthM);
  const axialFactor = state.braceMode === "moment-frame" ? 0.35 : 1 / Math.max(0.1, Math.cos(braceAngle));
  const braceAxialKn = Math.min(state.lateralLoadKn, lateralCapacityKn) * axialFactor;
  const columnReactionKn = gravityLoadKn / 2 + (braceAxialKn * Math.sin(braceAngle)) / 2;
  const daylightScore = state.apertureRatio * (1 - profile.obstructionRatio) * 100;
  const reservePercent = ((lateralCapacityKn - state.lateralLoadKn) / state.lateralLoadKn) * 100;
  const decision =
    residualKn > 0
      ? "too-flexible"
      : daylightScore < 42
        ? "too-dark"
        : "balanced";

  return ok({
    state,
    daylightScore,
    lateralCapacityKn,
    residualKn,
    residualMagnitudeKn: residualMagnitude.value,
    braceAxialKn,
    braceAngleDegrees: (braceAngle * 180) / Math.PI,
    columnReactionKn,
    reservePercent,
    decision,
  });
};

const chartData = (state: BayState) =>
  [0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.8].flatMap((ratio) => {
    const evidence = evaluateTradeoff({ ...state, apertureRatio: ratio });
    if (!evidence.ok) return [];
    return [
      { x: ratio * 100, y: evidence.value.daylightScore, series: "Daylight proxy" },
      { x: ratio * 100, y: Math.max(0, evidence.value.reservePercent + 50), series: "Stability margin" },
    ];
  });

const surfaceStyle: CSSProperties = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "minmax(16rem, 0.9fr) minmax(18rem, 1.1fr)",
};

const panelStyle: CSSProperties = {
  border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
  borderRadius: "8px",
  padding: "1rem",
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
};

const BayDiagram = ({ evidence }: { readonly evidence: TradeoffEvidence }) => {
  const openingWidth = 120 * evidence.state.apertureRatio;
  const openingX = 90 - openingWidth / 2;
  const profile = braceProfiles[evidence.state.braceMode];

  return (
    <svg aria-label="Single bay load path diagram" role="img" viewBox="0 0 220 160">
      <rect fill="#f8faf6" height="160" width="220" />
      <line stroke="#58665a" strokeWidth="7" x1="40" x2="40" y1="25" y2="135" />
      <line stroke="#58665a" strokeWidth="7" x1="180" x2="180" y1="25" y2="135" />
      <line stroke="#58665a" strokeWidth="7" x1="35" x2="185" y1="28" y2="28" />
      <line stroke="#58665a" strokeWidth="7" x1="35" x2="185" y1="135" y2="135" />
      <rect fill="#f7c948" height="58" opacity="0.55" width={openingWidth} x={openingX} y="57" />
      {evidence.state.braceMode === "diagonal-brace" || evidence.state.braceMode === "x-brace" ? (
        <line stroke="#1d5f8a" strokeLinecap="round" strokeWidth="7" x1="43" x2="177" y1="132" y2="31" />
      ) : null}
      {evidence.state.braceMode === "x-brace" ? (
        <line stroke="#1d5f8a" strokeLinecap="round" strokeWidth="7" x1="43" x2="177" y1="31" y2="132" />
      ) : null}
      <line markerEnd="url(#arrow)" stroke="#b42318" strokeWidth="4" x1="12" x2="48" y1="48" y2="48" />
      <line markerEnd="url(#down)" stroke="#475467" strokeWidth="4" x1="110" x2="110" y1="6" y2="28" />
      <defs>
        <marker id="arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 Z" fill="#b42318" />
        </marker>
        <marker id="down" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
          <path d="M0,0 L8,4 L0,8 Z" fill="#475467" />
        </marker>
      </defs>
      <text fill="#26332b" fontSize="9" x="12" y="43">
        lateral load
      </text>
      <text fill="#26332b" fontSize="9" x="80" y="52">
        daylight opening
      </text>
      <text fill="#26332b" fontSize="9" x="58" y="151">
        {profile.label}
      </text>
    </svg>
  );
};

const Metric = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <p style={panelStyle}>
    <strong>{value}</strong>
    <br />
    <span>{label}</span>
  </p>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<BayState>();
  const current = currentState(state);
  const evidence = evaluateTradeoff(current);

  return (
    <section aria-label="Bay design controls" role="region" style={surfaceStyle}>
      <div style={panelStyle}>
        <h2>Set one bay</h2>
        <p>
          Choose a structural system, the window opening, and the wind load. The reveal checks
          both the load path and a daylight proxy.
        </p>
        <ControlGroup legend="Design choices">
          <Selector
            label="Structural system"
            onChange={(value) => set("braceMode", value)}
            options={braceOptions}
            value={current.braceMode}
          />
          <Slider
            label="Opening ratio"
            max={0.8}
            min={0.25}
            onChange={(value) => set("apertureRatio", value)}
            step={0.05}
            value={current.apertureRatio}
          />
          <Slider
            label="Lateral load"
            max={42}
            min={12}
            onChange={(value) => set("lateralLoadKn", value)}
            step={2}
            unit="kN"
            value={current.lateralLoadKn}
          />
          <Slider
            label="Bay height"
            max={6}
            min={3}
            onChange={(value) => set("bayHeightM", value)}
            step={0.5}
            unit="m"
            value={current.bayHeightM}
          />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal tradeoff
        </button>
      </div>
      <div style={panelStyle}>
        {evidence.ok ? <BayDiagram evidence={evidence.value} /> : <p role="alert">Preview unavailable.</p>}
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = evaluateTradeoff(currentState(useSimState<Partial<BayState>>()));

  if (!evidence.ok) {
    return <p role="alert">This bay cannot be evaluated with the selected values.</p>;
  }

  const value = evidence.value;
  const state = value.state;
  const profile = braceProfiles[state.braceMode];

  return (
    <section aria-label="Observation unlocked" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Load path and daylight evidence</h2>
      <div style={surfaceStyle}>
        <div style={panelStyle}>
          <BayDiagram evidence={value} />
        </div>
        <div style={metricGridStyle}>
          <Metric label="Daylight proxy" value={`${format(value.daylightScore)} / 100`} />
          <Metric label="Lateral capacity proxy" value={`${format(value.lateralCapacityKn)} kN`} />
          <Metric label="Residual lateral force" value={`${format(value.residualKn)} kN`} />
          <Metric label="Brace axial estimate" value={`${format(value.braceAxialKn)} kN`} />
        </div>
      </div>
      <div style={panelStyle}>
        <h3>Formula trail</h3>
        <p>
          Daylight proxy = opening ratio × clear area after obstruction × 100 ={" "}
          {format(state.apertureRatio, 2)} × (1 - {format(profile.obstructionRatio, 2)}) × 100 ={" "}
          {format(value.daylightScore)}.
        </p>
        <p>
          Lateral capacity proxy = base system capacity × opening factor = {profile.baseCapacityKn} ×
          (1 - {format(profile.openingPenalty, 2)} × {format(state.apertureRatio, 2)}) ={" "}
          {format(value.lateralCapacityKn)} kN.
        </p>
        <p>
          Residual lateral force = demand - capacity = {format(state.lateralLoadKn)} -{" "}
          {format(value.lateralCapacityKn)} = {format(value.residualKn)} kN. The residual vector
          magnitude from the force balance is {format(value.residualMagnitudeKn)} kN.
        </p>
        <p>
          Brace axial estimate = resisted lateral force / cos(theta), where theta ={" "}
          tan^-1({format(state.bayHeightM)} / {bayWidthM}) = {format(value.braceAngleDegrees)}°. This
          gives about {format(value.braceAxialKn)} kN in the brace path.
        </p>
      </div>
      <div style={panelStyle}>
        <h3>Tradeoff curve</h3>
        <LineChart
          data={chartData(state)}
          x={{ domain: { min: 25, max: 80 } }}
          y={{ domain: { min: 0, max: 100 } }}
        />
      </div>
      <p>
        Interpretation:{" "}
        {value.decision === "balanced"
          ? "the bay keeps a useful opening while leaving lateral reserve."
          : value.decision === "too-flexible"
            ? "the opening/system combination leaves unbalanced lateral demand."
            : "the structure is strong, but the daylight opening is too restricted for this target."}
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Explain transfer
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" role="region">
      <h2>Transfer</h2>
      <p>
        A studio facade must increase the opening ratio from 0.45 to 0.7 after a daylight review.
        Use the same equations to decide whether the structural system must change, then explain
        the tradeoff to a non-engineer client.
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
        Predict which bay choice will keep a lateral path while preserving useful daylight. Then
        tune the opening and bracing to test that prediction.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set bay options
      </button>
    </section>
  );
};

export default function LoadPathAndDaylightTradeoff() {
  return (
    <SimRuntime spec={loadPathDaylightSpec} packageId={loadPathDaylightPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
