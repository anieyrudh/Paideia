import type { CSSProperties } from "react";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  classifyLinear2D,
  integrateFlow,
  linearVectorField2D,
  type LinearStability2D,
  type Matrix2x2,
  type TrajectoryPoint,
} from "@paideia/dynamical-systems";
import { checkEigenvector2, eigenvectors2, type Eigenpair2 } from "@paideia/linear-algebra";
import { PlotFrame, VectorFieldPlot } from "@paideia/plotting";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ok, type Brand, type ConceptPackageId, type KernelResult, type Rect } from "@paideia/shared";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";

type StabilityPreset = "damped-oscillator" | "fast-settling-node" | "saddle-split" | "growing-spiral";
type PerTimeUnit = Brand<number, "PerTimeUnit">;
type StateUnits = Brand<number, "StateUnits">;
type TimeUnits = Brand<number, "TimeUnits">;

const perTimeUnit = (value: number): PerTimeUnit => value as PerTimeUnit;
const stateUnits = (value: number): StateUnits => value as StateUnits;
const timeUnits = (value: number): TimeUnits => value as TimeUnits;

interface StabilityState {
  readonly preset: StabilityPreset;
  readonly aPerTimeUnit: PerTimeUnit;
  readonly bPerTimeUnit: PerTimeUnit;
  readonly cPerTimeUnit: PerTimeUnit;
  readonly dPerTimeUnit: PerTimeUnit;
  readonly initialXStateUnits: StateUnits;
  readonly initialYStateUnits: StateUnits;
}

interface StabilityPresetProfile {
  readonly label: string;
  readonly aPerTimeUnit: PerTimeUnit;
  readonly bPerTimeUnit: PerTimeUnit;
  readonly cPerTimeUnit: PerTimeUnit;
  readonly dPerTimeUnit: PerTimeUnit;
  readonly initialXStateUnits: StateUnits;
  readonly initialYStateUnits: StateUnits;
}

interface StabilityEvidence {
  readonly state: StabilityState;
  readonly matrix: Matrix2x2;
  readonly stability: LinearStability2D;
  readonly trajectory: readonly TrajectoryPoint[];
  readonly eigenpairs: readonly [Eigenpair2, Eigenpair2] | null;
  readonly eigendirectionCheck: ReturnType<typeof checkEigenvector2> | null;
}

const presetProfiles: Record<StabilityPreset, StabilityPresetProfile> = {
  "damped-oscillator": {
    label: "Damped oscillator",
    aPerTimeUnit: perTimeUnit(0),
    bPerTimeUnit: perTimeUnit(1),
    cPerTimeUnit: perTimeUnit(-1.2),
    dPerTimeUnit: perTimeUnit(-0.6),
    initialXStateUnits: stateUnits(1.35),
    initialYStateUnits: stateUnits(0.1),
  },
  "fast-settling-node": {
    label: "Fast settling node",
    aPerTimeUnit: perTimeUnit(-1.2),
    bPerTimeUnit: perTimeUnit(0.25),
    cPerTimeUnit: perTimeUnit(0),
    dPerTimeUnit: perTimeUnit(-0.45),
    initialXStateUnits: stateUnits(1.2),
    initialYStateUnits: stateUnits(-0.6),
  },
  "saddle-split": {
    label: "Saddle split",
    aPerTimeUnit: perTimeUnit(0.25),
    bPerTimeUnit: perTimeUnit(1),
    cPerTimeUnit: perTimeUnit(1.1),
    dPerTimeUnit: perTimeUnit(-0.35),
    initialXStateUnits: stateUnits(0.05),
    initialYStateUnits: stateUnits(0.04),
  },
  "growing-spiral": {
    label: "Growing spiral",
    aPerTimeUnit: perTimeUnit(0.3),
    bPerTimeUnit: perTimeUnit(1),
    cPerTimeUnit: perTimeUnit(-1.4),
    dPerTimeUnit: perTimeUnit(0.3),
    initialXStateUnits: stateUnits(0.35),
    initialYStateUnits: stateUnits(0.2),
  },
};

const presetOptions: readonly { readonly value: StabilityPreset; readonly label: string }[] = [
  { value: "damped-oscillator", label: "Damped oscillator" },
  { value: "fast-settling-node", label: "Fast settling node" },
  { value: "saddle-split", label: "Saddle split" },
  { value: "growing-spiral", label: "Growing spiral" },
];

const defaultState: StabilityState = {
  preset: "damped-oscillator",
  aPerTimeUnit: presetProfiles["damped-oscillator"].aPerTimeUnit,
  bPerTimeUnit: presetProfiles["damped-oscillator"].bPerTimeUnit,
  cPerTimeUnit: presetProfiles["damped-oscillator"].cPerTimeUnit,
  dPerTimeUnit: presetProfiles["damped-oscillator"].dPerTimeUnit,
  initialXStateUnits: presetProfiles["damped-oscillator"].initialXStateUnits,
  initialYStateUnits: presetProfiles["damped-oscillator"].initialYStateUnits,
};

const integrationDt = timeUnits(0.04);
const integrationSteps = 80;
const region: Rect = { x: { min: -2.4, max: 2.4 }, y: { min: -2.4, max: 2.4 } };

export const linearSystemStabilityPackageId =
  "sutd/smt/linear-system-stability" as ConceptPackageId;

export const linearSystemStabilitySpec: TSimulationSpec = {
  id: "linear-system-stability",
  title: "Linear System Stability Lab",
  interaction_type: "function-plot-with-draggable",
  kernel_deps: [
    "core/sim-runtime",
    "core/content-schema",
    "core/dynamical-systems",
    "core/linear-algebra",
    "core/plotting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "preset",
        label: "System preset",
        kind: "selector",
        kernel_binding: "state.preset",
      },
      {
        id: "a-entry",
        label: "a coefficient",
        kind: "slider",
        kernel_binding: "state.aPerTimeUnit",
        bounds: { min: -2, max: 2, step: 0.05 },
      },
      {
        id: "b-entry",
        label: "b coefficient",
        kind: "slider",
        kernel_binding: "state.bPerTimeUnit",
        bounds: { min: -2, max: 2, step: 0.05 },
      },
      {
        id: "c-entry",
        label: "c coefficient",
        kind: "slider",
        kernel_binding: "state.cPerTimeUnit",
        bounds: { min: -2, max: 2, step: 0.05 },
      },
      {
        id: "d-entry",
        label: "d coefficient",
        kind: "slider",
        kernel_binding: "state.dPerTimeUnit",
        bounds: { min: -2, max: 2, step: 0.05 },
      },
      {
        id: "initial-x",
        label: "Initial x",
        kind: "slider",
        kernel_binding: "state.initialXStateUnits",
        bounds: { min: -2, max: 2, step: 0.05 },
      },
      {
        id: "initial-y",
        label: "Initial y",
        kind: "slider",
        kernel_binding: "state.initialYStateUnits",
        bounds: { min: -2, max: 2, step: 0.05 },
      },
    ],
  },
  predict: {
    prompt:
      "For the system matrix you just set, what should happen to a small perturbation from the origin?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "It spirals inward and settles near the origin",
        "It shoots away along one direction",
        "It stops immediately because the origin is stable",
        "It grows outward while rotating",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "linear-stability-renderer",
        module: "@paideia/sutd-sims/linear-system-stability",
        symbol: "LinearSystemStability",
        props_binding:
          "Show matrix coefficients, stability class, phase portrait, trajectory, eigenvalue formula substitution, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Which evidence in the formula panel tells you whether every nearby direction settles, and where could one escaping direction hide?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Stable means every state stops moving instantly",
      "Only one eigenvalue matters",
    ],
  },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<StabilityState>): StabilityState => ({
  preset: state.preset ?? defaultState.preset,
  aPerTimeUnit: perTimeUnit(clamp(state.aPerTimeUnit ?? defaultState.aPerTimeUnit, -2, 2)),
  bPerTimeUnit: perTimeUnit(clamp(state.bPerTimeUnit ?? defaultState.bPerTimeUnit, -2, 2)),
  cPerTimeUnit: perTimeUnit(clamp(state.cPerTimeUnit ?? defaultState.cPerTimeUnit, -2, 2)),
  dPerTimeUnit: perTimeUnit(clamp(state.dPerTimeUnit ?? defaultState.dPerTimeUnit, -2, 2)),
  initialXStateUnits: stateUnits(clamp(state.initialXStateUnits ?? defaultState.initialXStateUnits, -2, 2)),
  initialYStateUnits: stateUnits(clamp(state.initialYStateUnits ?? defaultState.initialYStateUnits, -2, 2)),
});

const matrixFor = (state: StabilityState): Matrix2x2 =>
  [
    [state.aPerTimeUnit, state.bPerTimeUnit],
    [state.cPerTimeUnit, state.dPerTimeUnit],
  ] as const;

export const linearSystemStabilityEvidence = (
  state: StabilityState,
): KernelResult<StabilityEvidence> => {
  const current = currentState(state);
  const matrix = matrixFor(current);
  const stability = classifyLinear2D(matrix);
  if (!stability.ok) return stability;
  const field = linearVectorField2D(matrix);
  if (!field.ok) return field;
  const trajectory = integrateFlow(field.value, [current.initialXStateUnits, current.initialYStateUnits], {
    dt: integrationDt,
    steps: integrationSteps,
    method: "rk4",
    maxNorm: 160,
  });
  if (!trajectory.ok) return trajectory;
  const eigenpairs = eigenvectors2(matrix);
  const eigendirectionCheck = eigenpairs.ok ? checkEigenvector2(matrix, eigenpairs.value[0].vector) : null;

  return ok({
    state: current,
    matrix,
    stability: stability.value,
    trajectory: trajectory.value,
    eigenpairs: eigenpairs.ok ? eigenpairs.value : null,
    eigendirectionCheck: eigendirectionCheck?.ok ? eigendirectionCheck : null,
  });
};

const round = (value: number, places = 2): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const fmt = (value: number, places = 2): string => {
  const rounded = round(value, places);
  return Object.is(rounded, -0) ? "0.00" : rounded.toFixed(places);
};

const kindLabel = (kind: LinearStability2D["kind"]): string =>
  kind
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const coordinate = (value: number): string => `${fmt(value)} state units`;

const rate = (value: number): string => `${fmt(value)} per time unit`;

const eigenvalueText = (stability: LinearStability2D): string =>
  stability.eigenvalues.kind === "real"
    ? `lambda1 = ${rate(stability.eigenvalues.lambda1)}, lambda2 = ${rate(stability.eigenvalues.lambda2)}`
    : `lambda = ${rate(stability.eigenvalues.real)} +/- ${rate(stability.eigenvalues.imaginaryMagnitude)} i`;

const interpretationFor = (stability: LinearStability2D): string => {
  switch (stability.kind) {
    case "stable-node":
      return "both eigenvalues are negative, so nearby states return without rotating.";
    case "unstable-node":
      return "both eigenvalues are positive, so nearby states move away without rotating.";
    case "saddle":
      return "one eigenvalue is positive and one is negative, so one direction settles while another escapes.";
    case "stable-spiral":
      return "the real part is negative, so the rotation loses amplitude and spirals inward.";
    case "unstable-spiral":
      return "the real part is positive, so the rotation gains amplitude and spirals outward.";
    case "center":
      return "the real part is zero, so the linear model predicts sustained rotation rather than settling.";
    case "degenerate":
      return "the eigenvalue test sits on a boundary, so this linear check is inconclusive.";
  }
};

const svgWidth = 640;
const svgHeight = 420;
const svgPadding = 36;

const toSvgPoint = (point: readonly [number, number]): { readonly x: number; readonly y: number } => {
  const xSpan = region.x.max - region.x.min;
  const ySpan = region.y.max - region.y.min;
  return {
    x: svgPadding + ((point[0] - region.x.min) / xSpan) * (svgWidth - 2 * svgPadding),
    y: svgHeight - svgPadding - ((point[1] - region.y.min) / ySpan) * (svgHeight - 2 * svgPadding),
  };
};

const trajectoryPath = (trajectory: readonly TrajectoryPoint[]): string =>
  trajectory
    .map((point, index) => {
      const x = point.state[0] ?? 0;
      const y = point.state[1] ?? 0;
      const svg = toSvgPoint([x, y]);
      return `${index === 0 ? "M" : "L"} ${svg.x.toFixed(3)} ${svg.y.toFixed(3)}`;
    })
    .join(" ");

const panelStyle: CSSProperties = {
  border: "1px solid color-mix(in srgb, currentColor 14%, transparent)",
  borderRadius: "8px",
  padding: "1rem",
};

const surfaceStyle: CSSProperties = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
};

const plotStyle = {
  "--plot-stroke": "#0f766e",
  "--plot-muted-stroke": "#cbd5e1",
  "--plot-accent-stroke": "#b91c1c",
} as CSSProperties;

const traceMetricStyle: CSSProperties = { ...panelStyle, borderColor: "#0f766e" };
const determinantMetricStyle: CSSProperties = { ...panelStyle, borderColor: "#2563eb" };
const discriminantMetricStyle: CSSProperties = { ...panelStyle, borderColor: "#b91c1c" };

const Metric = ({
  label,
  value,
  style = panelStyle,
}: {
  readonly label: string;
  readonly value: string;
  readonly style?: CSSProperties;
}) => (
  <p style={style}>
    <strong>{value}</strong>
    <br />
    <span>{label}</span>
  </p>
);

const LegendItem = ({
  color,
  label,
  text,
}: {
  readonly color: string;
  readonly label: string;
  readonly text: string;
}) => (
  <p style={{ display: "flex", gap: "0.5rem", margin: 0 }}>
    <span
      aria-hidden="true"
      style={{ background: color, borderRadius: "999px", display: "inline-block", height: "0.9rem", width: "0.9rem" }}
    />
    <span>
      <strong>{label}</strong>: {text}
    </span>
  </p>
);

const VectorPlots = ({ evidence }: { readonly evidence: StabilityEvidence }) => {
  const vectorField = linearVectorField2D(evidence.matrix);
  if (!vectorField.ok) {
    return <p role="alert">The selected linear system cannot be drawn.</p>;
  }

  const field = (x: number, y: number): readonly [number, number] => {
    const derivative = vectorField.value([x, y], 0);
    return [derivative[0] ?? Number.NaN, derivative[1] ?? Number.NaN];
  };

  const start = evidence.trajectory[0]?.state ?? [0, 0];
  const finish = evidence.trajectory.at(-1)?.state ?? start;
  const startPoint = toSvgPoint([start[0] ?? 0, start[1] ?? 0]);
  const finishPoint = toSvgPoint([finish[0] ?? 0, finish[1] ?? 0]);

  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))" }}>
      <figure aria-label="Vector field for selected matrix" style={{ margin: 0, ...plotStyle }}>
        <VectorFieldPlot density={12} field={field} normalize region={region} />
        <figcaption>Rate arrows for the selected matrix.</figcaption>
      </figure>
      <figure aria-label="Trajectory from starting state" style={{ margin: 0, ...plotStyle }}>
        <PlotFrame domain={region}>
          <path
            d={trajectoryPath(evidence.trajectory)}
            fill="none"
            stroke="#0f766e"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <circle cx={startPoint.x} cy={startPoint.y} fill="#2563eb" r="5" />
          <circle cx={finishPoint.x} cy={finishPoint.y} fill="#b91c1c" r="5" />
        </PlotFrame>
        <figcaption>Path on the same fixed domain: blue start, red latest sample.</figcaption>
      </figure>
    </div>
  );
};

const FormulaPanel = ({ evidence }: { readonly evidence: StabilityEvidence }) => {
  const [[a, b], [c, d]] = evidence.matrix;
  const stability = evidence.stability;
  const trace = stability.trace;
  const determinant = stability.determinant;
  const discriminant = stability.discriminant;
  const final = evidence.trajectory.at(-1);
  const finalX = final?.state[0] ?? 0;
  const finalY = final?.state[1] ?? 0;
  const firstEigen = evidence.eigenpairs?.[0];
  const eigenCheck = evidence.eigendirectionCheck;

  return (
    <section aria-label="Formula panel" style={panelStyle}>
      <h3>Formula panel</h3>
      <h4>Legend</h4>
      <div style={{ display: "grid", gap: "0.5rem", marginBlockEnd: "0.75rem" }}>
        <LegendItem color="#0f766e" label="Trace T" text="net local growth rate, measured per time unit" />
        <LegendItem color="#2563eb" label="Determinant D" text="area-rate sign that separates saddles from paired behaviour" />
        <LegendItem color="#b91c1c" label="Discriminant Delta" text="tells whether the eigenvalues are real or spiral-paired" />
      </div>
      <p>
        System: x' = ax + by and y' = cx + dy, with A = [[{fmt(a)}, {fmt(b)}], [{fmt(c)},{" "}
        {fmt(d)}]].
      </p>
      <p>
        Trace formula: T = a + d = {fmt(a)} + {fmt(d)} = {rate(trace)}.
      </p>
      <p>
        Determinant formula: D = ad - bc = ({fmt(a)})({fmt(d)}) - ({fmt(b)})({fmt(c)}) ={" "}
        {fmt(determinant)} per time unit squared.
      </p>
      <p>
        Discriminant formula: Delta = T^2 - 4D = {fmt(trace)}^2 - 4({fmt(determinant)}) ={" "}
        {fmt(discriminant)} per time unit squared.
      </p>
      <p>Eigenvalue formula: lambda = (T +/- sqrt(Delta)) / 2, giving {eigenvalueText(stability)}.</p>
      <p>
        Substitution path: start z0 = ({coordinate(evidence.state.initialXStateUnits)},{" "}
        {coordinate(evidence.state.initialYStateUnits)}); sampled final state is ({coordinate(finalX)},{" "}
        {coordinate(finalY)}).
      </p>
      {firstEigen && eigenCheck?.ok ? (
        <p>
          Eigendirection check: for v = ({fmt(firstEigen.vector[0])}, {fmt(firstEigen.vector[1])}), Av
          stays on the same line with scale {fmt(eigenCheck.value.lambda)} and residual{" "}
          {fmt(eigenCheck.value.residual, 4)}.
        </p>
      ) : (
        <p>Real eigendirections are not drawn here because this case uses a spiral pair.</p>
      )}
      <p>Result: {stability.kind}. Interpretation: {interpretationFor(stability)}</p>
    </section>
  );
};

const ManipulateStage = () => {
  const { state, set } = useManipulate<StabilityState>();
  const current = currentState(state);

  const applyPreset = (preset: StabilityPreset): void => {
    const profile = presetProfiles[preset];
    set("preset", preset);
    set("aPerTimeUnit", profile.aPerTimeUnit);
    set("bPerTimeUnit", profile.bPerTimeUnit);
    set("cPerTimeUnit", profile.cPerTimeUnit);
    set("dPerTimeUnit", profile.dPerTimeUnit);
    set("initialXStateUnits", profile.initialXStateUnits);
    set("initialYStateUnits", profile.initialYStateUnits);
  };

  return (
    <section aria-label="Linear system controls" role="region" style={surfaceStyle}>
      <div style={panelStyle}>
        <h2>Set the system matrix</h2>
        <p>
          Choose a preset or tune the four entries of A. The reveal checks whether the starting
          state settles, splits, or grows.
        </p>
        <ControlGroup legend="Matrix and starting state">
          <Selector
            label="System preset"
            onChange={applyPreset}
            options={presetOptions}
            value={current.preset}
          />
          <Slider label="a coefficient" max={2} min={-2} onChange={(value) => set("aPerTimeUnit", perTimeUnit(value))} step={0.05} value={current.aPerTimeUnit} />
          <Slider label="b coefficient" max={2} min={-2} onChange={(value) => set("bPerTimeUnit", perTimeUnit(value))} step={0.05} value={current.bPerTimeUnit} />
          <Slider label="c coefficient" max={2} min={-2} onChange={(value) => set("cPerTimeUnit", perTimeUnit(value))} step={0.05} value={current.cPerTimeUnit} />
          <Slider label="d coefficient" max={2} min={-2} onChange={(value) => set("dPerTimeUnit", perTimeUnit(value))} step={0.05} value={current.dPerTimeUnit} />
          <Slider
            label="Initial x"
            max={2}
            min={-2}
            onChange={(value) => set("initialXStateUnits", stateUnits(value))}
            step={0.05}
            value={current.initialXStateUnits}
          />
          <Slider
            label="Initial y"
            max={2}
            min={-2}
            onChange={(value) => set("initialYStateUnits", stateUnits(value))}
            step={0.05}
            value={current.initialYStateUnits}
          />
        </ControlGroup>
      </div>
      <div style={panelStyle}>
        <h3>Current matrix</h3>
        <p>
          A = [[{fmt(current.aPerTimeUnit)}, {fmt(current.bPerTimeUnit)}], [{fmt(current.cPerTimeUnit)}, {fmt(current.dPerTimeUnit)}]]
        </p>
        <p>
          Starting state: ({coordinate(current.initialXStateUnits)}, {coordinate(current.initialYStateUnits)}).
        </p>
        <p>Changing a coefficient changes the arrows, the sampled path, and the stability class.</p>
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = linearSystemStabilityEvidence(currentState(useSimState<Partial<StabilityState>>()));

  if (!evidence.ok) {
    return <p role="alert">This linear system cannot be evaluated with the selected values.</p>;
  }

  const value = evidence.value;

  return (
    <section aria-label="Observation unlocked" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Stability evidence</h2>
      <div style={metricGridStyle}>
        <Metric label="Local stability class" value={kindLabel(value.stability.kind)} />
        <Metric label="Trace" style={traceMetricStyle} value={rate(value.stability.trace)} />
        <Metric
          label="Determinant"
          style={determinantMetricStyle}
          value={`${fmt(value.stability.determinant)} per time unit squared`}
        />
        <Metric
          label="Discriminant"
          style={discriminantMetricStyle}
          value={`${fmt(value.stability.discriminant)} per time unit squared`}
        />
      </div>
      <VectorPlots evidence={value} />
      <FormulaPanel evidence={value} />
      <button type="button" onClick={() => stage.advance()}>
        Explain the decision
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Explain before transfer</h2>
      <p>
        Use the formula panel to decide which evidence rules out an escaping direction. What would
        have to change for the same matrix shape to grow instead?
      </p>
      <p>
        Transfer challenge: a control loop linearises to A = [[0, 1], [-0.8, 0.4]]. Classify the
        equilibrium, then name one sign change that would make the perturbation settle.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another system
      </button>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "explain") return <ExplainStage />;
  if (stage.current === "observe") return <ObserveStage />;
  return (
    <>
      <ManipulateStage />
      <ObserveStage />
    </>
  );
};

export default function LinearSystemStability() {
  return (
    <SimRuntime spec={linearSystemStabilitySpec} packageId={linearSystemStabilityPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
