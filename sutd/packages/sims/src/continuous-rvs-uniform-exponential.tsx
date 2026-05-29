import { PredictionGate, type PredictionScope } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { ConceptPackageId, KernelResult } from "@paideia/shared";
import { err, ok } from "@paideia/shared";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";
import type { TPredictSpec, TSimulationSpec } from "@paideia/content-schema";

type ContinuousModelKind = "uniform" | "exponential";

export interface ContinuousRvState {
  readonly model: ContinuousModelKind;
  readonly min: number;
  readonly max: number;
  readonly rate: number;
  readonly lower: number;
  readonly upper: number;
}

export interface DensityPoint {
  readonly x: number;
  readonly density: number;
}

export interface ContinuousRvModel {
  readonly state: ContinuousRvState;
  readonly mean: number;
  readonly variance: number;
  readonly intervalProbability: number;
  readonly formula: string;
  readonly substitution: string;
  readonly interpretation: string;
  readonly points: readonly DensityPoint[];
}

const defaultState: ContinuousRvState = {
  model: "uniform",
  min: 1,
  max: 7,
  rate: 0.4,
  lower: 2,
  upper: 5,
};

export const continuousRvsPackageId =
  "sutd/10-022-modelling-uncertainty/continuous-rvs-uniform-exponential" as ConceptPackageId;

export const continuousRvsSimId = "continuous-density-lab";

const predictSpec: TPredictSpec = {
  prompt:
    "A component has already survived 3 hours. Predict which model can keep the same remaining-life law after that update.",
  commit_format: {
    kind: "multiple-choice",
    options: ["Uniform", "Exponential"],
    correct_index: 1,
  },
  rationale_required: true,
} as const;

const clamp = (value: number, min: number, max: number, step = 0.1): number => {
  const finite = Number.isFinite(value) ? value : min;
  const snapped = Math.round(finite / step) * step;
  return Math.min(max, Math.max(min, snapped));
};

const normalizeState = (input: Partial<ContinuousRvState>): ContinuousRvState => {
  const min = clamp(input.min ?? defaultState.min, 0, 9, 0.1);
  const max = Math.max(min + 0.5, clamp(input.max ?? defaultState.max, 0.5, 10, 0.1));
  const lower = clamp(input.lower ?? defaultState.lower, 0, 10, 0.1);
  const upper = Math.max(lower + 0.1, clamp(input.upper ?? defaultState.upper, 0.1, 12, 0.1));
  return {
    model: input.model ?? defaultState.model,
    min,
    max,
    rate: clamp(input.rate ?? defaultState.rate, 0.1, 2, 0.01),
    lower,
    upper,
  };
};

const uniformDensity = (state: ContinuousRvState, x: number): number =>
  x >= state.min && x <= state.max ? 1 / (state.max - state.min) : 0;

const exponentialDensity = (state: ContinuousRvState, x: number): number =>
  x >= 0 ? state.rate * Math.exp(-state.rate * x) : 0;

const intervalProbability = (state: ContinuousRvState): number => {
  if (state.model === "uniform") {
    const left = Math.max(state.lower, state.min);
    const right = Math.min(state.upper, state.max);
    return Math.max(0, right - left) / (state.max - state.min);
  }
  const left = Math.max(0, state.lower);
  const right = Math.max(left, state.upper);
  return Math.exp(-state.rate * left) - Math.exp(-state.rate * right);
};

const densityPoints = (state: ContinuousRvState): readonly DensityPoint[] => {
  const domainMax = state.model === "uniform" ? Math.max(state.max, state.upper) : Math.max(8, state.upper);
  return Array.from({ length: 49 }, (_, index) => {
    const x = (domainMax * index) / 48;
    return {
      x,
      density: state.model === "uniform" ? uniformDensity(state, x) : exponentialDensity(state, x),
    };
  });
};

const formulaFor = (state: ContinuousRvState): string =>
  state.model === "uniform"
    ? "f(x)=1/(b-a), a<=x<=b"
    : "f(x)=lambda e^(-lambda x), x>=0";

const substitutionFor = (state: ContinuousRvState): string =>
  state.model === "uniform"
    ? `a=${state.min.toFixed(1)}, b=${state.max.toFixed(1)}, L=${state.lower.toFixed(1)}, U=${state.upper.toFixed(1)}`
    : `lambda=${state.rate.toFixed(2)}, L=${state.lower.toFixed(1)}, U=${state.upper.toFixed(1)}`;

const labelFor = (model: ContinuousModelKind): string =>
  model === "uniform" ? "Uniform" : "Exponential";

const interpretationFor = (state: ContinuousRvState, probability: number): string =>
  state.model === "uniform"
    ? `Uniform spreads density evenly across [${state.min.toFixed(1)}, ${state.max.toFixed(1)}], so interval probability is proportional to overlap length: ${(probability * 100).toFixed(1)}%.`
    : `Exponential puts more density near zero and has memoryless survival, so the interval probability is the CDF difference: ${(probability * 100).toFixed(1)}%.`;

export const continuousRvsModel = (
  input: Partial<ContinuousRvState> = defaultState,
): KernelResult<ContinuousRvModel> => {
  const state = normalizeState(input);
  if (state.model !== "uniform" && state.model !== "exponential") {
    return err("precondition-violated", `Unknown continuous model ${state.model}`);
  }
  const probability = intervalProbability(state);
  if (!Number.isFinite(probability) || probability < -1e-10 || probability > 1 + 1e-10) {
    return err("numerical-instability", `Interval probability out of range: ${probability}`);
  }
  const mean = state.model === "uniform" ? (state.min + state.max) / 2 : 1 / state.rate;
  const variance =
    state.model === "uniform" ? (state.max - state.min) ** 2 / 12 : 1 / state.rate ** 2;
  return ok({
    state,
    mean,
    variance,
    intervalProbability: Math.min(1, Math.max(0, probability)),
    formula: formulaFor(state),
    substitution: substitutionFor(state),
    interpretation: interpretationFor(state, probability),
    points: densityPoints(state),
  });
};

export const continuousRvsSpec: TSimulationSpec = {
  id: continuousRvsSimId,
  title: "Continuous Random Variable Density Lab",
  interaction_type: "comparative-matrix",
  kernel_deps: [
    "core/content-schema",
    "core/shared",
    "core/probability-stats",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  predict: predictSpec,
  manipulate: {
    controls: [
      { id: "model", label: "Density family", kind: "selector", kernel_binding: "state.model" },
      {
        id: "minimum",
        label: "Uniform minimum",
        kind: "slider",
        kernel_binding: "state.min",
        bounds: { min: 0, max: 9, step: 0.1 },
      },
      {
        id: "maximum",
        label: "Uniform maximum",
        kind: "slider",
        kernel_binding: "state.max",
        bounds: { min: 0.5, max: 10, step: 0.1 },
      },
      {
        id: "rate",
        label: "Exponential rate",
        kind: "slider",
        kernel_binding: "state.rate",
        bounds: { min: 0.1, max: 2, step: 0.01 },
      },
      {
        id: "lower-bound",
        label: "Interval lower bound",
        kind: "slider",
        kernel_binding: "state.lower",
        bounds: { min: 0, max: 10, step: 0.1 },
      },
      {
        id: "upper-bound",
        label: "Interval upper bound",
        kind: "slider",
        kernel_binding: "state.upper",
        bounds: { min: 0.1, max: 12, step: 0.1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "density-readout",
        module: "@paideia/sutd-sims/continuous-rvs-uniform-exponential",
        symbol: "ContinuousRvsUniformExponential",
        props_binding:
          "Render PDF curve, interval shading, formula, legend, substitution, mean, variance, probability, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt: "Explain why continuous probabilities come from area under a density, not point height.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Reading a point on the density curve as a probability.",
      "Treating exponential waiting time like a bounded uniform interval.",
    ],
  },
};

const PredictStage = () => (
  <section aria-label="Prediction setup" role="region" style={styles.surface}>
    <section style={styles.panel}>
      <p style={styles.kicker}>Predict</p>
      <h1 style={styles.h1}>Which continuous model keeps its tail shape?</h1>
      <PredictionGate
        packageId={continuousRvsPackageId}
        predict={continuousRvsSpec.predict ?? predictSpec}
        simId={continuousRvsSpec.id as PredictionScope}
      >
        <StageAdvanceButton />
      </PredictionGate>
    </section>
  </section>
);

const StageAdvanceButton = () => {
  const stage = useStage();
  return (
    <button onClick={() => stage.advance()} style={styles.primaryButton} type="button">
      Build density
    </button>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const state = normalizeState(useSimState<Partial<ContinuousRvState>>());
  const { set } = useManipulate<ContinuousRvState>();
  const model = continuousRvsModel(state);
  if (!model.ok) return <p role="alert">The density model could not be evaluated.</p>;
  return (
    <section aria-label="Density setup" role="region" style={styles.surface}>
      <div style={styles.grid}>
        <section style={styles.panel}>
          <p style={styles.kicker}>Manipulate</p>
          <h1 style={styles.h1}>Choose the density and interval</h1>
          <ControlGroup legend="Density controls">
            <div style={styles.controlStack}>
              <Selector
                label="Density family"
                onChange={(kind: ContinuousModelKind) => set("model", kind)}
                options={[
                  { value: "uniform", label: "Uniform" },
                  { value: "exponential", label: "Exponential" },
                ]}
                value={state.model}
              />
              <Slider label="Uniform minimum" max={9} min={0} onChange={(min) => set("min", min)} step={0.1} value={state.min} />
              <Slider label="Uniform maximum" max={10} min={0.5} onChange={(max) => set("max", max)} step={0.1} value={state.max} />
              <Slider label="Exponential rate" max={2} min={0.1} onChange={(rate) => set("rate", rate)} step={0.01} value={state.rate} />
              <Slider label="Interval lower bound" max={10} min={0} onChange={(lower) => set("lower", lower)} step={0.1} value={state.lower} />
              <Slider label="Interval upper bound" max={12} min={0.1} onChange={(upper) => set("upper", upper)} step={0.1} value={state.upper} />
            </div>
          </ControlGroup>
          <button onClick={() => stage.advance()} style={styles.primaryButton} type="button">
            Reveal area
          </button>
        </section>
        <DensityChart model={model.value} revealed={false} />
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const model = continuousRvsModel(useSimState<Partial<ContinuousRvState>>());
  if (!model.ok) return <p role="alert">The density model could not be evaluated.</p>;
  return (
    <section aria-label="Observation unlocked" role="region" style={styles.surface}>
      <div style={styles.metricGrid}>
        <Metric label="Expected value" value={model.value.mean.toFixed(2)} note="centre or mean waiting time" />
        <Metric label="Variance" value={model.value.variance.toFixed(2)} note="spread of the continuous variable" />
        <Metric label="Interval probability" value={`${(model.value.intervalProbability * 100).toFixed(1)}%`} note="area under the PDF" />
      </div>
      <div style={styles.grid}>
        <DensityChart model={model.value} revealed />
        <FormulaPanel model={model.value} />
      </div>
      <button onClick={() => stage.advance()} style={styles.primaryButton} type="button">
        Transfer
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer challenge" role="region" style={styles.surface}>
      <section style={styles.panel}>
        <p style={styles.kicker}>Transfer</p>
        <h2 style={styles.h2}>Battery lifetime model</h2>
        <p>
          A batch has a bounded test range, but field failures are measured as waiting time
          until the next failure. Choose the density family, then compute an interval probability
          from area under the curve.
        </p>
        <button onClick={() => stage.reset()} style={styles.primaryButton} type="button">
          Try another density
        </button>
      </section>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") return <ExplainStage />;
  return <PredictStage />;
};

const DensityChart = ({ model, revealed }: { readonly model: ContinuousRvModel; readonly revealed: boolean }) => {
  const maxDensity = Math.max(...model.points.map((point) => point.density), 0.001);
  const maxX = Math.max(...model.points.map((point) => point.x), 1);
  const polyline = model.points
    .map((point) => `${40 + (point.x / maxX) * 560},${218 - (point.density / maxDensity) * 168}`)
    .join(" ");
  const left = 40 + (Math.min(model.state.lower, maxX) / maxX) * 560;
  const right = 40 + (Math.min(model.state.upper, maxX) / maxX) * 560;
  return (
    <section aria-label="Probability density function" style={styles.panel}>
      <p style={styles.kicker}>Visual model</p>
      <h2 style={styles.h2}>{labelFor(model.state.model)} PDF</h2>
      <svg aria-label="PDF curve with interval area" role="img" viewBox="0 0 640 260" style={styles.svg}>
        <line stroke="#7d8a84" strokeWidth="1" x1="40" x2="610" y1="218" y2="218" />
        <line stroke="#7d8a84" strokeWidth="1" x1="40" x2="40" y1="28" y2="218" />
        {revealed ? (
          <rect fill="#b6402a" opacity="0.22" x={left} y="38" width={Math.max(0, right - left)} height="180" />
        ) : null}
        <polyline fill="none" points={polyline} stroke="#2d6a7f" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        <text fill="#42525a" fontSize="12" x="42" y="240">x</text>
        <text fill="#42525a" fontSize="12" x="52" y="42">density</text>
      </svg>
      <p style={styles.interpretation}>
        {revealed ? model.interpretation : "Commit a prediction to reveal interval probability and moments."}
      </p>
    </section>
  );
};

const FormulaPanel = ({ model }: { readonly model: ContinuousRvModel }) => (
  <section aria-label="Formula panel" style={styles.panel}>
    <p style={styles.kicker}>Formula</p>
    <h2 style={styles.h2}>Area, not point height</h2>
    <pre style={styles.formula}>{model.formula}</pre>
    <div style={styles.legendGrid}>
      <span style={{ ...styles.legendMark, background: "#2d6a7f" }} />
      <span>Blue curve: probability density f(x), with units of probability per x-unit.</span>
      <span style={{ ...styles.legendMark, background: "#b6402a" }} />
      <span>Red band: interval from lower bound to upper bound.</span>
    </div>
    <p style={styles.substitution}>Substitution: {model.substitution}.</p>
    <p style={styles.interpretation}>Units: x is a continuous measurement; probability is unitless area. Result: interval probability {(model.intervalProbability * 100).toFixed(1)}%.</p>
  </section>
);

const Metric = ({ label, note, value }: { readonly label: string; readonly note: string; readonly value: string }) => (
  <section style={styles.metric}>
    <span style={styles.metricLabel}>{label}</span>
    <strong style={styles.metricValue}>{value}</strong>
    <span>{note}</span>
  </section>
);

const styles = {
  surface: { color: "#172026", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", padding: "1rem" },
  grid: { display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))" },
  panel: { background: "#fff", border: "1px solid #c8d7cf", borderRadius: "8px", padding: "1rem" },
  kicker: { color: "#54645c", fontSize: "0.76rem", fontWeight: 700, letterSpacing: 0, margin: "0 0 0.35rem", textTransform: "uppercase" },
  h1: { fontSize: "2rem", lineHeight: 1.08, margin: "0 0 0.75rem" },
  h2: { fontSize: "1.35rem", lineHeight: 1.15, margin: "0 0 0.75rem" },
  controlStack: { display: "grid", gap: "0.8rem" },
  primaryButton: { background: "#155e63", border: "1px solid #155e63", borderRadius: "6px", color: "#fff", fontWeight: 700, marginTop: "1rem", padding: "0.65rem 0.9rem" },
  metricGrid: { display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", marginBottom: "1rem" },
  metric: { background: "#f3f8f5", border: "1px solid #c4d8cd", borderRadius: "8px", display: "grid", gap: "0.2rem", padding: "0.85rem" },
  metricLabel: { color: "#506357", fontSize: "0.82rem", fontWeight: 700 },
  metricValue: { color: "#123f43", fontSize: "1.35rem", lineHeight: 1.15 },
  svg: { display: "block", maxWidth: "100%", width: "100%" },
  formula: { background: "#f6f3ec", border: "1px solid #d9ccb7", borderRadius: "6px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", lineHeight: 1.6, padding: "0.8rem", whiteSpace: "pre-wrap" },
  legendGrid: { display: "grid", gap: "0.4rem 0.55rem", gridTemplateColumns: "0.9rem 1fr", marginTop: "0.8rem" },
  legendMark: { borderRadius: "999px", display: "inline-block", height: "0.85rem", width: "0.85rem" },
  substitution: { marginTop: "0.9rem" },
  interpretation: { marginTop: "0.7rem" },
} as const;

export default function ContinuousRvsUniformExponential() {
  return (
    <SimRuntime packageId={continuousRvsPackageId} spec={continuousRvsSpec}>
      <StageSurface />
    </SimRuntime>
  );
}
