import type { TSimulationSpec } from "@paideia/content-schema";
import {
  classifyLinear2D,
  integrateFlow,
  linearVectorField2D,
  type LinearStability2D,
  type Matrix2x2,
  type TrajectoryPoint,
} from "@paideia/dynamical-systems";
import { ParametricPlot, VectorFieldPlot } from "@paideia/plotting";
import { PredictionGate } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ok, type ConceptPackageId, type KernelResult, type Rect } from "@paideia/shared";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";
import type { CSSProperties } from "react";

type PhasePreset = "stable-spiral" | "saddle" | "center" | "unstable-node";

interface PhaseState {
  readonly preset: PhasePreset;
  readonly trace: number;
  readonly determinant: number;
  readonly initialX: number;
  readonly initialY: number;
}

interface PresetProfile {
  readonly label: string;
  readonly trace: number;
  readonly determinant: number;
  readonly initialX: number;
  readonly initialY: number;
}

interface PhaseEvidence {
  readonly state: PhaseState;
  readonly matrix: Matrix2x2;
  readonly stability: LinearStability2D;
  readonly trajectory: readonly TrajectoryPoint[];
}

const presetProfiles: Record<PhasePreset, PresetProfile> = {
  "stable-spiral": {
    label: "Stable spiral",
    trace: -0.6,
    determinant: 1.2,
    initialX: 1.4,
    initialY: 0,
  },
  saddle: {
    label: "Saddle",
    trace: 0.2,
    determinant: -0.8,
    initialX: 0.9,
    initialY: 0.8,
  },
  center: {
    label: "Centre",
    trace: 0,
    determinant: 1,
    initialX: 1.2,
    initialY: 0,
  },
  "unstable-node": {
    label: "Unstable node",
    trace: 1.2,
    determinant: 0.2,
    initialX: 0.3,
    initialY: 0.2,
  },
};

const presetOptions: readonly { readonly value: PhasePreset; readonly label: string }[] = [
  { value: "stable-spiral", label: "Stable spiral" },
  { value: "saddle", label: "Saddle" },
  { value: "center", label: "Centre" },
  { value: "unstable-node", label: "Unstable node" },
];

const defaultState: PhaseState = {
  preset: "stable-spiral",
  trace: presetProfiles["stable-spiral"].trace,
  determinant: presetProfiles["stable-spiral"].determinant,
  initialX: presetProfiles["stable-spiral"].initialX,
  initialY: presetProfiles["stable-spiral"].initialY,
};

const integrationDt = 0.035;
const integrationSteps = 120;
const region: Rect = { x: { min: -2.25, max: 2.25 }, y: { min: -2.25, max: 2.25 } };

export const odePhasePortraitPackageId = "shared/math/ode-phase-portrait" as ConceptPackageId;

export const odePhasePortraitSpec: TSimulationSpec = {
  id: "ode-phase-portrait",
  title: "ODE Phase Portrait Explorer",
  interaction_type: "function-plot-with-draggable",
  kernel_deps: [
    "core/sim-runtime",
    "core/content-schema",
    "core/dynamical-systems",
    "core/plotting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "preset",
        label: "Portrait preset",
        kind: "selector",
        kernel_binding: "state.preset",
      },
      {
        id: "trace",
        label: "Trace",
        kind: "slider",
        kernel_binding: "state.trace",
        bounds: { min: -2, max: 2, step: 0.1 },
      },
      {
        id: "determinant",
        label: "Determinant",
        kind: "slider",
        kernel_binding: "state.determinant",
        bounds: { min: -1.5, max: 2.5, step: 0.1 },
      },
      {
        id: "initial-x",
        label: "Initial x",
        kind: "slider",
        kernel_binding: "state.initialX",
        bounds: { min: -2, max: 2, step: 0.1 },
      },
      {
        id: "initial-y",
        label: "Initial y",
        kind: "slider",
        kernel_binding: "state.initialY",
        bounds: { min: -2, max: 2, step: 0.1 },
      },
    ],
  },
  predict: {
    prompt:
      "For x' = y and y' = -1.2x - 0.6y, what should a nearby trajectory do after it is released?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Spiral inward toward the equilibrium",
        "Move directly away from the equilibrium",
        "Cross the equilibrium and stop there",
      ],
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "phase-portrait-renderer",
        module: "local",
        symbol: "OdePhasePortrait",
        props_binding:
          "Show trace-determinant classification, vector-field plot, trajectory, nullclines, and formula substitution.",
      },
    ],
  },
  explain: {
    prompt:
      "How do trace, determinant, and discriminant predict the observed trajectory before you read the plotted path?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Equilibrium means nothing changes anywhere.",
      "Arrows show only physical velocity.",
    ],
  },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number, places = 2): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const format = (value: number, places = 2): string => round(value, places).toFixed(places);

const sentenceCase = (kind: string): string =>
  kind
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const currentState = (state: Partial<PhaseState>): PhaseState => ({
  preset: state.preset ?? defaultState.preset,
  trace: clamp(state.trace ?? defaultState.trace, -2, 2),
  determinant: clamp(state.determinant ?? defaultState.determinant, -1.5, 2.5),
  initialX: clamp(state.initialX ?? defaultState.initialX, -2, 2),
  initialY: clamp(state.initialY ?? defaultState.initialY, -2, 2),
});

const matrixFor = (state: PhaseState): Matrix2x2 =>
  [
    [0, 1],
    [-state.determinant, state.trace],
  ] as const;

export const odePhasePortraitEvidence = (state: PhaseState): KernelResult<PhaseEvidence> => {
  const current = currentState(state);
  const matrix = matrixFor(current);
  const stability = classifyLinear2D(matrix);
  if (!stability.ok) return stability;
  const field = linearVectorField2D(matrix);
  if (!field.ok) return field;
  const trajectory = integrateFlow(field.value, [current.initialX, current.initialY], {
    dt: integrationDt,
    steps: integrationSteps,
    method: "rk4",
    maxNorm: 120,
  });
  if (!trajectory.ok) return trajectory;

  return ok({ state: current, matrix, stability: stability.value, trajectory: trajectory.value });
};

const trajectoryCurve = (trajectory: readonly TrajectoryPoint[]) => (t: number): readonly [number, number] => {
  const scaled = clamp(t, 0, 1) * (trajectory.length - 1);
  const low = Math.floor(scaled);
  const high = Math.min(trajectory.length - 1, low + 1);
  const blend = scaled - low;
  const a = trajectory[low]?.state ?? [0, 0];
  const b = trajectory[high]?.state ?? a;
  const ax = a[0] ?? 0;
  const ay = a[1] ?? 0;
  return [ax + ((b[0] ?? ax) - ax) * blend, ay + ((b[1] ?? ay) - ay) * blend];
};

const interpretationFor = (kind: LinearStability2D["kind"]): string => {
  switch (kind) {
    case "stable-node":
      return "nearby trajectories return without rotating.";
    case "unstable-node":
      return "nearby trajectories move away without rotating.";
    case "saddle":
      return "the field splits: one direction approaches while another escapes.";
    case "stable-spiral":
      return "nearby trajectories spiral inward toward the equilibrium.";
    case "unstable-spiral":
      return "nearby trajectories spiral outward away from the equilibrium.";
    case "center":
      return "nearby trajectories circle the equilibrium without damping.";
    case "degenerate":
      return "the boundary case needs more information than this simple test gives.";
    default:
      return "the selected invariant combination sits outside the named first-pass cases.";
  }
};

const eigenvalueText = (stability: LinearStability2D): string =>
  stability.eigenvalues.kind === "real"
    ? `lambda1 = ${format(stability.eigenvalues.lambda1)}, lambda2 = ${format(stability.eigenvalues.lambda2)}`
    : `lambda = ${format(stability.eigenvalues.real)} +/- ${format(stability.eigenvalues.imaginaryMagnitude)}i`;

const surfaceStyle: CSSProperties = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "minmax(17rem, 0.85fr) minmax(18rem, 1.15fr)",
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

const plotStyle: CSSProperties = {
  "--plot-stroke": "#245c7a",
  "--plot-muted-stroke": "#c9d4df",
  "--plot-accent-stroke": "#b23b4a",
} as CSSProperties;

const formulaToken = (color: string): CSSProperties => ({
  color,
  fontWeight: 800,
});

const Metric = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <p style={panelStyle}>
    <strong>{value}</strong>
    <br />
    <span>{label}</span>
  </p>
);

const PhasePlots = ({ evidence }: { readonly evidence: PhaseEvidence }) => {
  const vectorField = linearVectorField2D(evidence.matrix);
  if (!vectorField.ok) {
    return <p role="alert">The vector field cannot be drawn for the selected system.</p>;
  }
  const field = (x: number, y: number): readonly [number, number] => {
    const derivative = vectorField.value([x, y], 0);
    return [derivative[0] ?? Number.NaN, derivative[1] ?? Number.NaN];
  };

  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))" }}>
      <figure style={{ margin: 0, ...plotStyle }}>
        <VectorFieldPlot density={12} field={field} normalize region={region} />
        <figcaption>Vector field arrows for the selected ODE.</figcaption>
      </figure>
      <figure style={{ margin: 0, ...plotStyle }}>
        <ParametricPlot curve={trajectoryCurve(evidence.trajectory)} samples={180} t={{ min: 0, max: 1 }} />
        <figcaption>Trajectory from the selected initial state.</figcaption>
      </figure>
    </div>
  );
};

const FormulaTrail = ({ evidence }: { readonly evidence: PhaseEvidence }) => {
  const state = evidence.state;
  const stability = evidence.stability;
  const a = evidence.matrix[0][0];
  const b = evidence.matrix[0][1];
  const c = evidence.matrix[1][0];
  const d = evidence.matrix[1][1];
  const final = evidence.trajectory.at(-1);
  const finalX = final?.state[0] ?? 0;
  const finalY = final?.state[1] ?? 0;

  return (
    <div aria-label="Formula used" style={panelStyle}>
      <h3>Formula used</h3>
      <pre aria-label="Trace determinant formula" style={{ overflowX: "auto" }}>
        <code>
          <span style={formulaToken("#245c7a")}>T</span>
          {" = "}
          <span style={formulaToken("#245c7a")}>a</span>
          {" + "}
          <span style={formulaToken("#245c7a")}>d</span>
          {"\n"}
          <span style={formulaToken("#b23b4a")}>D</span>
          {" = "}
          <span style={formulaToken("#b23b4a")}>ad - bc</span>
          {"\n"}
          <span style={formulaToken("#7657d8")}>Delta</span>
          {" = "}
          <span style={formulaToken("#245c7a")}>T</span>
          {"^2 - 4"}
          <span style={formulaToken("#b23b4a")}>D</span>
          {"\n"}
          <span style={formulaToken("#1f7a4d")}>lambda</span>
          {" = ("}
          <span style={formulaToken("#245c7a")}>T</span>
          {" +/- sqrt("}
          <span style={formulaToken("#7657d8")}>Delta</span>
          {")) / 2"}
        </code>
      </pre>
      <h4>Formula legend</h4>
      <dl aria-label="Formula legend" style={metricGridStyle}>
        <div>
          <dt>
            <span style={{ color: "#245c7a", fontWeight: 700 }}>Blue T</span>
          </dt>
          <dd>trace, the sum of diagonal rates, in 1/time</dd>
        </div>
        <div>
          <dt>
            <span style={{ color: "#b23b4a", fontWeight: 700 }}>Red D</span>
          </dt>
          <dd>determinant, the area-scale product, in 1/time^2</dd>
        </div>
        <div>
          <dt>
            <span style={{ color: "#7657d8", fontWeight: 700 }}>Purple Delta</span>
          </dt>
          <dd>discriminant, which separates real roots from spirals, in 1/time^2</dd>
        </div>
        <div>
          <dt>
            <span style={{ color: "#1f7a4d", fontWeight: 700 }}>Green lambda</span>
          </dt>
          <dd>eigenvalue rate that decides local growth, decay, or rotation, in 1/time</dd>
        </div>
      </dl>
      <p>
        System matrix: A = [[0, 1], [-D, T]] = [[{format(a)}, {format(b)}], [{format(c)},{" "}
        {format(d)}]], so x' = y and y' = -{format(state.determinant)}x +{" "}
        {format(state.trace)}y.
      </p>
      <p>
        Substitute trace: T = a + d = {format(a)} 1/time + {format(d)} 1/time ={" "}
        {format(stability.trace)} 1/time.
      </p>
      <p>
        Substitute determinant: D = ad - bc = ({format(a)})({format(d)}) - ({format(b)})(
        {format(c)}) = {format(stability.determinant)} 1/time^2.
      </p>
      <p>
        Substitute discriminant: Delta = T^2 - 4D = {format(stability.trace)}^2 - 4(
        {format(stability.determinant)}) = {format(stability.discriminant)} 1/time^2.
      </p>
      <p>
        Eigenvalue formula: lambda = (T +/- sqrt(Delta)) / 2, giving {eigenvalueText(stability)}.
      </p>
      <p>
        Trajectory setup: RK4 samples z' = A z from z0 = ({format(state.initialX)} state units,{" "}
        {format(state.initialY)} state units) with dt = {integrationDt} time units for{" "}
        {integrationSteps} steps; final sample z = ({format(finalX)} state units,{" "}
        {format(finalY)} state units).
      </p>
      <p>
        Nullclines: x' = 0 gives y = 0. y' = 0 gives -D x + T y = 0, so{" "}
        {Math.abs(state.trace) < 1e-9
          ? "x = 0 for this trace value."
          : `y = (D / T)x = (${format(state.determinant)} / ${format(state.trace)})x.`}
      </p>
      <p>
        Interpretation: this formula applies because every planar linear ODE near the equilibrium
        is classified by the matrix invariants T, D, and Delta before the trajectory is drawn.
      </p>
    </div>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<PhaseState>();
  const current = currentState(state);

  const applyPreset = (preset: PhasePreset): void => {
    const profile = presetProfiles[preset];
    set("preset", preset);
    set("trace", profile.trace);
    set("determinant", profile.determinant);
    set("initialX", profile.initialX);
    set("initialY", profile.initialY);
  };

  return (
    <section aria-label="Phase portrait controls" role="region" style={surfaceStyle}>
      <div style={panelStyle}>
        <h2>Set the phase plane</h2>
        <p>
          Choose a trace-determinant region and an initial state. The reveal classifies the
          equilibrium and checks the path from that point.
        </p>
        <ControlGroup legend="ODE choices">
          <Selector
            label="Portrait preset"
            onChange={applyPreset}
            options={presetOptions}
            value={current.preset}
          />
          <Slider
            label="Trace"
            max={2}
            min={-2}
            onChange={(value) => set("trace", value)}
            step={0.1}
            value={current.trace}
          />
          <Slider
            label="Determinant"
            max={2.5}
            min={-1.5}
            onChange={(value) => set("determinant", value)}
            step={0.1}
            value={current.determinant}
          />
          <Slider
            label="Initial x"
            max={2}
            min={-2}
            onChange={(value) => set("initialX", value)}
            step={0.1}
            value={current.initialX}
          />
          <Slider
            label="Initial y"
            max={2}
            min={-2}
            onChange={(value) => set("initialY", value)}
            step={0.1}
            value={current.initialY}
          />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal phase portrait
        </button>
      </div>
      <div style={panelStyle}>
        <h3>Model family</h3>
        <p>x' = y</p>
        <p>y' = -D x + T y</p>
        <p>
          Current values: T = {format(current.trace)}, D = {format(current.determinant)}, z0 = (
          {format(current.initialX)}, {format(current.initialY)}).
        </p>
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = odePhasePortraitEvidence(currentState(useSimState<Partial<PhaseState>>()));

  if (!evidence.ok) {
    return <p role="alert">This phase portrait cannot be evaluated with the selected values.</p>;
  }

  const value = evidence.value;

  return (
    <section aria-label="Observation unlocked" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Phase portrait evidence</h2>
      <div style={metricGridStyle}>
        <Metric label="Local classification" value={sentenceCase(value.stability.kind)} />
        <Metric label="Trace" value={format(value.stability.trace)} />
        <Metric label="Determinant" value={format(value.stability.determinant)} />
        <Metric label="Discriminant" value={format(value.stability.discriminant)} />
      </div>
      <PhasePlots evidence={value} />
      <FormulaTrail evidence={value} />
      <p>Interpretation: {interpretationFor(value.stability.kind)}</p>
      <button type="button" onClick={() => stage.advance()}>
        Explain the pattern
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" role="region">
      <h2>Explain before transfer</h2>
      <p>
        Use the formula trail to explain why this classification follows from the signs of
        trace, determinant, and discriminant. Which number tells you whether nearby paths
        settle, grow, rotate, or split?
      </p>
      <h3>Transfer challenge</h3>
      <p>
        A reactor operating point linearises to x' = y and y' = -0.8x + 0.4y. Use
        trace, determinant, and discriminant to decide whether a small perturbation
        settles or grows.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another portrait
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
        Predict how the default ODE behaves near the origin, then tune trace and
        determinant to test the prediction.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set phase plane
      </button>
    </section>
  );
};

export default function OdePhasePortrait() {
  void PredictionGate;

  return (
    <SimRuntime spec={odePhasePortraitSpec} packageId={odePhasePortraitPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
