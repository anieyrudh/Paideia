import type { CSSProperties } from "react";
import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import { integral } from "@paideia/numerical-math";
import { FunctionPlot } from "@paideia/plotting";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  err,
  ok,
  type ConceptPackageId,
  type Function2D,
  type KernelResult,
} from "@paideia/shared";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";

type TargetShape = "centre-pluck" | "two-lobed" | "edge-rich";
type ModeNumber = 1 | 2 | 3 | 4;

interface FourierState {
  readonly targetShape: TargetShape;
  readonly coefficient1Metres: number;
  readonly coefficient2Metres: number;
  readonly coefficient3Metres: number;
  readonly coefficient4Metres: number;
  readonly focusMode: ModeNumber;
}

interface TargetProfile {
  readonly label: string;
  readonly description: string;
  readonly f: Function2D;
}

interface CurveDatum {
  readonly x: number;
  readonly y: number;
  readonly series: string;
}

interface FourierEvidence {
  readonly state: FourierState;
  readonly target: Function2D;
  readonly reconstruction: Function2D;
  readonly projectionCoefficientsMetres: readonly number[];
  readonly currentCoefficientsMetres: readonly number[];
  readonly dominantMode: ModeNumber;
  readonly rmsErrorMetres: number;
  readonly curveData: readonly CurveDatum[];
  readonly coefficientData: readonly CurveDatum[];
}

const stringLengthMetres = 1;
const modeNumbers = [1, 2, 3, 4] as const;
const sampleCount = 121;

const targetProfiles: Record<TargetShape, TargetProfile> = {
  "centre-pluck": {
    label: "Centre pluck",
    description: "A broad single-lobed displacement with fixed ends.",
    f: (x: number): number => 0.18 * Math.sin(Math.PI * x) + 0.035 * Math.sin(3 * Math.PI * x),
  },
  "two-lobed": {
    label: "Two-lobed shape",
    description: "A shape that changes sign once, so the second mode should dominate.",
    f: (x: number): number => 0.15 * Math.sin(2 * Math.PI * x) + 0.03 * Math.sin(4 * Math.PI * x),
  },
  "edge-rich": {
    label: "Edge-rich kink",
    description: "A sharper profile with visible high-mode content.",
    f: (x: number): number =>
      0.1 * Math.sin(Math.PI * x) - 0.055 * Math.sin(2 * Math.PI * x) + 0.065 * Math.sin(3 * Math.PI * x) - 0.025 * Math.sin(4 * Math.PI * x),
  },
};

const targetOptions: readonly { readonly value: TargetShape; readonly label: string }[] = [
  { value: "centre-pluck", label: "Centre pluck" },
  { value: "two-lobed", label: "Two-lobed shape" },
  { value: "edge-rich", label: "Edge-rich kink" },
];

const focusOptions: readonly { readonly value: ModeNumber; readonly label: string }[] = [
  { value: 1, label: "Mode 1" },
  { value: 2, label: "Mode 2" },
  { value: 3, label: "Mode 3" },
  { value: 4, label: "Mode 4" },
];

const defaultState: FourierState = {
  targetShape: "centre-pluck",
  coefficient1Metres: 0.12,
  coefficient2Metres: 0,
  coefficient3Metres: 0,
  coefficient4Metres: 0,
  focusMode: 1,
};

export const fourierModeSuperpositionPackageId =
  "sutd/smt/fourier-mode-superposition" as ConceptPackageId;

export const fourierModeSuperpositionSpec: TSimulationSpec = {
  id: "fourier-mode-superposition",
  title: "Fourier Mode Superposition Lab",
  interaction_type: "function-plot-with-draggable",
  kernel_deps: [
    "core/sim-runtime",
    "core/numerical-math",
    "core/charting",
    "core/plotting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "For the selected target shape, which basis mode do you expect to carry the largest coefficient after projection?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Mode 1, the longest single arch",
        "Mode 2, the two-lobed shape",
        "Mode 3, the three-lobed shape",
        "Mode 4, the four-lobed shape",
      ],
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "target-shape",
        label: "Target shape",
        kind: "selector",
        kernel_binding: "state.targetShape",
      },
      {
        id: "coefficient-one",
        label: "Mode 1 coefficient",
        kind: "slider",
        kernel_binding: "state.coefficient1Metres",
        bounds: { min: -0.24, max: 0.24, step: 0.005 },
      },
      {
        id: "coefficient-two",
        label: "Mode 2 coefficient",
        kind: "slider",
        kernel_binding: "state.coefficient2Metres",
        bounds: { min: -0.24, max: 0.24, step: 0.005 },
      },
      {
        id: "coefficient-three",
        label: "Mode 3 coefficient",
        kind: "slider",
        kernel_binding: "state.coefficient3Metres",
        bounds: { min: -0.24, max: 0.24, step: 0.005 },
      },
      {
        id: "coefficient-four",
        label: "Mode 4 coefficient",
        kind: "slider",
        kernel_binding: "state.coefficient4Metres",
        bounds: { min: -0.24, max: 0.24, step: 0.005 },
      },
      {
        id: "focus-mode",
        label: "Focus mode",
        kind: "selector",
        kernel_binding: "state.focusMode",
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "mode-superposition-renderer",
        module: "@paideia/sutd-sims/fourier-mode-superposition",
        symbol: "FourierModeSuperposition",
        props_binding:
          "Show target and reconstructed shape, coefficient chart, basis-mode plot, projection formula substitution, units, legend, and RMS error.",
      },
    ],
  },
  explain: {
    prompt:
      "Which coefficient changed the residual most, and how does its sign pattern match the part of the target that the current reconstruction misses?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "One mode must explain every shape",
      "Coefficients are arbitrary visual sliders",
    ],
  },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<FourierState>): FourierState => ({
  targetShape: state.targetShape ?? defaultState.targetShape,
  coefficient1Metres: clamp(state.coefficient1Metres ?? defaultState.coefficient1Metres, -0.24, 0.24),
  coefficient2Metres: clamp(state.coefficient2Metres ?? defaultState.coefficient2Metres, -0.24, 0.24),
  coefficient3Metres: clamp(state.coefficient3Metres ?? defaultState.coefficient3Metres, -0.24, 0.24),
  coefficient4Metres: clamp(state.coefficient4Metres ?? defaultState.coefficient4Metres, -0.24, 0.24),
  focusMode: state.focusMode ?? defaultState.focusMode,
});

const basisMode = (mode: ModeNumber, x: number): number =>
  Math.sin((mode * Math.PI * x) / stringLengthMetres);

const coefficientsOf = (state: FourierState): readonly number[] => [
  state.coefficient1Metres,
  state.coefficient2Metres,
  state.coefficient3Metres,
  state.coefficient4Metres,
];

const reconstructionFrom = (coefficients: readonly number[]): Function2D => (x: number): number =>
  modeNumbers.reduce((sum, mode, index) => sum + (coefficients[index] ?? 0) * basisMode(mode, x), 0);

const projectCoefficient = (target: Function2D, mode: ModeNumber): KernelResult<number> => {
  const projected = integral(
    (x: number): number => target(x) * basisMode(mode, x),
    { min: 0, max: stringLengthMetres },
    { method: "simpson", n: 240 },
  );
  if (!projected.ok) return projected;
  return ok((2 / stringLengthMetres) * projected.value);
};

const projectionCoefficients = (target: Function2D): KernelResult<readonly number[]> => {
  const coefficients: number[] = [];
  for (const mode of modeNumbers) {
    const coefficient = projectCoefficient(target, mode);
    if (!coefficient.ok) {
      return err(coefficient.error.code, coefficient.error.message, coefficient.error.cause);
    }
    coefficients.push(coefficient.value);
  }
  return ok(coefficients);
};

const dominantModeOf = (coefficients: readonly number[]): ModeNumber => {
  let mode: ModeNumber = 1;
  let bestMagnitude = Number.NEGATIVE_INFINITY;
  for (const candidate of modeNumbers) {
    const magnitude = Math.abs(coefficients[candidate - 1] ?? 0);
    if (magnitude > bestMagnitude) {
      bestMagnitude = magnitude;
      mode = candidate;
    }
  }
  return mode;
};

const sampledXs = (): readonly number[] =>
  Array.from({ length: sampleCount }, (_, index) => (index / (sampleCount - 1)) * stringLengthMetres);

const rmsError = (target: Function2D, reconstruction: Function2D): number => {
  const xs = sampledXs();
  const meanSquare =
    xs.reduce((sum, x) => {
      const residual = target(x) - reconstruction(x);
      return sum + residual * residual;
    }, 0) / xs.length;
  return Math.sqrt(meanSquare);
};

const curveDataFor = (target: Function2D, reconstruction: Function2D): readonly CurveDatum[] =>
  sampledXs().flatMap((x) => [
    { x, y: target(x), series: "Target" },
    { x, y: reconstruction(x), series: "Current reconstruction" },
  ]);

const coefficientDataFor = (
  projection: readonly number[],
  current: readonly number[],
): readonly CurveDatum[] =>
  modeNumbers.flatMap((mode, index) => [
    { x: mode, y: projection[index] ?? 0, series: "Projection" },
    { x: mode, y: current[index] ?? 0, series: "Current" },
  ]);

export const fourierModeEvidence = (
  state: Partial<FourierState>,
): KernelResult<FourierEvidence> => {
  const current = currentState(state);
  const target = targetProfiles[current.targetShape].f;
  const currentCoefficientsMetres = coefficientsOf(current);
  const projection = projectionCoefficients(target);
  if (!projection.ok) return projection;
  const reconstruction = reconstructionFrom(currentCoefficientsMetres);

  return ok({
    state: current,
    target,
    reconstruction,
    projectionCoefficientsMetres: projection.value,
    currentCoefficientsMetres,
    dominantMode: dominantModeOf(projection.value),
    rmsErrorMetres: rmsError(target, reconstruction),
    curveData: curveDataFor(target, reconstruction),
    coefficientData: coefficientDataFor(projection.value, currentCoefficientsMetres),
  });
};

const round = (value: number, places = 3): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const fmt = (value: number, places = 3): string => {
  const rounded = round(value, places);
  return Object.is(rounded, -0) ? "0.000" : rounded.toFixed(places);
};

const modeLabel = (mode: ModeNumber): string => `Mode ${mode}`;

const coefficientText = (value: number): string => `${fmt(value)} m`;

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

const modeColours: Record<ModeNumber, string> = {
  1: "#2563eb",
  2: "#7c3aed",
  3: "#d97706",
  4: "#0f766e",
};

const Metric = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) => (
  <p style={panelStyle}>
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

const FormulaPanel = ({ evidence }: { readonly evidence: FourierEvidence }) => {
  const mode = evidence.dominantMode;
  const dominantCoefficient = evidence.projectionCoefficientsMetres[mode - 1] ?? 0;
  const currentCoefficient = evidence.currentCoefficientsMetres[mode - 1] ?? 0;

  return (
    <section aria-label="Formula panel" style={panelStyle}>
      <h3>Formula panel</h3>
      <h4>Legend</h4>
      <div style={{ display: "grid", gap: "0.5rem", marginBlockEnd: "0.75rem" }}>
        <LegendItem color="#2563eb" label="c_n" text="projection coefficient, measured in metres" />
        <LegendItem color="#7c3aed" label="f(x)" text="target displacement along the one metre interval" />
        <LegendItem color="#d97706" label="phi_n" text="basis mode sin(n pi x / L)" />
        <LegendItem color="#0f766e" label="E_rms" text="root-mean-square reconstruction error" />
      </div>
      <pre>
        <code>c_n = (2 / L) * integral from 0 to L of f(x) * sin(n pi x / L) dx</code>
      </pre>
      <p>
        Substitution for the dominant term: c_{mode} = 2 / ({fmt(stringLengthMetres, 2)} m) times
        the integral of the target displacement against sin({mode} pi x / {fmt(stringLengthMetres, 2)} m),
        giving {coefficientText(dominantCoefficient)}.
      </p>
      <pre>
        <code>E_rms = sqrt((1 / M) * sum from i = 1 to M of (f(x_i) - sum from n = 1 to 4 of c_n * phi_n(x_i))^2)</code>
      </pre>
      <p>
        Substitution: with M = {sampleCount} samples and current {modeLabel(mode)} coefficient{" "}
        {coefficientText(currentCoefficient)}, the RMS mismatch is {coefficientText(evidence.rmsErrorMetres)}.
      </p>
      <p>
        Units: coefficients and the RMS error are in metres of displacement; the basis modes phi_n
        are unitless shape functions on the [0, L] interval. Result: dominant mode is {modeLabel(mode)}
        with coefficient {coefficientText(dominantCoefficient)} and RMS mismatch {coefficientText(evidence.rmsErrorMetres)}.
      </p>
      <p>
        Interpretation: {modeLabel(mode)} carries the largest projection for this target, so its sign
        pattern is the strongest first correction to compare against the current reconstruction.
      </p>
    </section>
  );
};

const ManipulateStage = () => {
  const { state, set } = useManipulate<FourierState>();
  const current = currentState(state);
  const target = targetProfiles[current.targetShape];

  return (
    <section aria-label="Mode controls" role="region" style={surfaceStyle}>
      <div style={panelStyle}>
        <h2>Set coefficients before reveal</h2>
        <p>{target.description}</p>
        <ControlGroup legend="Target and first four modes">
          <Selector
            label="Target shape"
            onChange={(value) => set("targetShape", value)}
            options={targetOptions}
            value={current.targetShape}
          />
          <Slider
            label="Mode 1 coefficient"
            max={0.24}
            min={-0.24}
            onChange={(value) => set("coefficient1Metres", value)}
            step={0.005}
            unit="m"
            value={current.coefficient1Metres}
          />
          <Slider
            label="Mode 2 coefficient"
            max={0.24}
            min={-0.24}
            onChange={(value) => set("coefficient2Metres", value)}
            step={0.005}
            unit="m"
            value={current.coefficient2Metres}
          />
          <Slider
            label="Mode 3 coefficient"
            max={0.24}
            min={-0.24}
            onChange={(value) => set("coefficient3Metres", value)}
            step={0.005}
            unit="m"
            value={current.coefficient3Metres}
          />
          <Slider
            label="Mode 4 coefficient"
            max={0.24}
            min={-0.24}
            onChange={(value) => set("coefficient4Metres", value)}
            step={0.005}
            unit="m"
            value={current.coefficient4Metres}
          />
          <Selector
            label="Focus mode"
            onChange={(value) => set("focusMode", value)}
            options={focusOptions}
            value={current.focusMode}
          />
        </ControlGroup>
      </div>
      <div style={panelStyle}>
        <h3>Current trial coefficients</h3>
        <p>
          c1 = {coefficientText(current.coefficient1Metres)}, c2 ={" "}
          {coefficientText(current.coefficient2Metres)}, c3 ={" "}
          {coefficientText(current.coefficient3Metres)}, c4 ={" "}
          {coefficientText(current.coefficient4Metres)}.
        </p>
        <p>
          Use the reveal to compare this trial against the projection coefficients and residual
          error. The numerical evidence is hidden until the prediction is committed.
        </p>
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = fourierModeEvidence(currentState(useSimState<Partial<FourierState>>()));

  if (!evidence.ok) {
    return <p role="alert">The selected target cannot be projected with the current settings.</p>;
  }

  const value = evidence.value;
  const focusedCoefficient = value.currentCoefficientsMetres[value.state.focusMode - 1] ?? 0;
  const focusedMode = (x: number): number => focusedCoefficient * basisMode(value.state.focusMode, x);

  return (
    <section aria-label="Observation unlocked" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Reconstruction evidence</h2>
      <div style={metricGridStyle}>
        <Metric label="Target shape" value={targetProfiles[value.state.targetShape].label} />
        <Metric label="Dominant projection" value={modeLabel(value.dominantMode)} />
        <Metric label="RMS mismatch" value={coefficientText(value.rmsErrorMetres)} />
        <Metric label="Focus coefficient" value={coefficientText(focusedCoefficient)} />
      </div>
      <section aria-label="Target and reconstruction chart" style={panelStyle}>
        <h3>Target and reconstruction</h3>
        <LineChart
          ariaLabel="Target and reconstruction chart"
          data={value.curveData}
          x={{ label: "Position along string, m", domain: { min: 0, max: stringLengthMetres } }}
          y={{ label: "Displacement, m", domain: { min: -0.24, max: 0.24 } }}
        />
      </section>
      <div style={surfaceStyle}>
        <section aria-label="Coefficient comparison" style={panelStyle}>
          <h3>Coefficient comparison</h3>
          <LineChart
            ariaLabel="Projection and current coefficient chart"
            data={value.coefficientData}
            x={{ label: "Mode number", domain: { min: 1, max: 4 } }}
            y={{ label: "Coefficient, m", domain: { min: -0.24, max: 0.24 } }}
          />
        </section>
        <section aria-label="Focused basis mode" style={panelStyle}>
          <h3>{modeLabel(value.state.focusMode)} contribution</h3>
          <figure style={{ margin: 0, ...plotStyle }}>
            <FunctionPlot
              domain={{ min: 0, max: stringLengthMetres }}
              f={focusedMode}
              range={{ min: -0.24, max: 0.24 }}
              samples={160}
            />
            <figcaption>
              The focused trace uses the same sign and displacement scale as the coefficient slider.
            </figcaption>
          </figure>
        </section>
      </div>
      <FormulaPanel evidence={value} />
      <button type="button" onClick={() => stage.advance()}>
        Explain and transfer
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
        Identify the mode whose sign pattern best matches the remaining residual. Explain whether
        the current coefficient is too small, too large, or has the wrong sign.
      </p>
      <p>
        Transfer challenge: a heat rod starts with a centre-warm temperature profile and fixed
        reference-temperature ends. Use the same sine projection formula to decide which first
        four modes carry the initial condition.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another target
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

export default function FourierModeSuperposition() {
  return (
    <SimRuntime spec={fourierModeSuperpositionSpec} packageId={fourierModeSuperpositionPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
