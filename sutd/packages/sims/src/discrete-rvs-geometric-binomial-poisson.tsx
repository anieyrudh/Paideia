import { PredictionGate, type PredictionScope } from "@paideia/prediction-gate";
import {
  expectedValue,
  normalizeDistribution,
  variance,
  type DiscreteDistribution,
  type WeightedOutcome,
} from "@paideia/probability-stats";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { ConceptPackageId, KernelResult } from "@paideia/shared";
import { err, ok } from "@paideia/shared";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";
import type { TPredictSpec, TSimulationSpec } from "@paideia/content-schema";

type ModelKind = "binomial" | "geometric" | "poisson";
type OutcomeId = `${number}`;

export interface DiscreteRvState {
  readonly model: ModelKind;
  readonly p: number;
  readonly n: number;
  readonly lambda: number;
}

export interface DiscreteRvModel {
  readonly state: DiscreteRvState;
  readonly distribution: DiscreteDistribution<OutcomeId>;
  readonly mean: number;
  readonly variance: number;
  readonly tailProbability: number;
  readonly targetEvent: string;
  readonly formula: string;
  readonly substitution: string;
  readonly interpretation: string;
}

const defaultState: DiscreteRvState = {
  model: "binomial",
  p: 0.35,
  n: 8,
  lambda: 3,
};

export const discreteRvsPackageId =
  "sutd/10-022-modelling-uncertainty/discrete-rvs-geometric-binomial-poisson" as ConceptPackageId;

export const discreteRvsSimId = "probability-model-lab";

const predictSpec: TPredictSpec = {
  prompt:
    "Predict which model gives the largest chance of at least four events in the displayed system.",
  commit_format: {
    kind: "multiple-choice",
    options: ["Binomial", "Geometric", "Poisson"],
    correct_index: 0,
  },
  rationale_required: true,
} as const;

const clamp = (value: number, min: number, max: number, step = 0.01): number => {
  const finite = Number.isFinite(value) ? value : min;
  const snapped = Math.round(finite / step) * step;
  return Math.min(max, Math.max(min, snapped));
};

const normalizeState = (input: Partial<DiscreteRvState>): DiscreteRvState => ({
  model: input.model ?? defaultState.model,
  p: clamp(input.p ?? defaultState.p, 0.05, 0.95, 0.01),
  n: Math.round(clamp(input.n ?? defaultState.n, 2, 20, 1)),
  lambda: clamp(input.lambda ?? defaultState.lambda, 0.5, 10, 0.1),
});

const factorial = (n: number): number => {
  let value = 1;
  for (let index = 2; index <= n; index += 1) value *= index;
  return value;
};

const choose = (n: number, k: number): number => factorial(n) / (factorial(k) * factorial(n - k));

const modelWeights = (state: DiscreteRvState): readonly WeightedOutcome<OutcomeId>[] => {
  if (state.model === "binomial") {
    return Array.from({ length: state.n + 1 }, (_, k) => ({
      id: `${k}` as OutcomeId,
      value: k,
      weight: choose(state.n, k) * state.p ** k * (1 - state.p) ** (state.n - k),
    }));
  }
  if (state.model === "geometric") {
    const maxTrials = Math.min(20, Math.max(8, state.n + 8));
    return Array.from({ length: maxTrials }, (_, index) => {
      const k = index + 1;
      return {
        id: `${k}` as OutcomeId,
        value: k,
        weight: (1 - state.p) ** (k - 1) * state.p,
      };
    });
  }
  const maxCount = Math.max(12, Math.ceil(state.lambda + 5 * Math.sqrt(state.lambda)));
  return Array.from({ length: maxCount + 1 }, (_, k) => ({
    id: `${k}` as OutcomeId,
    value: k,
    weight: Math.exp(-state.lambda) * state.lambda ** k / factorial(k),
  }));
};

export const discreteRvsModel = (
  input: Partial<DiscreteRvState> = defaultState,
): KernelResult<DiscreteRvModel> => {
  const state = normalizeState(input);
  const distribution = normalizeDistribution(modelWeights(state));
  if (!distribution.ok) return distribution;
  const mean = expectedValue(distribution.value);
  if (!mean.ok) return mean;
  const varResult = variance(distribution.value);
  if (!varResult.ok) return varResult;
  const tailThreshold = state.model === "geometric" ? 6 : 4;
  const tailProbability = distribution.value
    .filter((outcome) => outcome.value >= tailThreshold)
    .reduce((sum, outcome) => sum + Number(outcome.probability), 0);
  const targetEvent =
    state.model === "geometric" ? "first success takes at least 6 trials" : "at least 4 events occur";
  return ok({
    state,
    distribution: distribution.value,
    mean: mean.value,
    variance: varResult.value,
    tailProbability,
    targetEvent,
    formula: formulaFor(state),
    substitution: substitutionFor(state),
    interpretation: interpretationFor(state, mean.value, tailProbability),
  });
};

const formulaFor = (state: DiscreteRvState): string => {
  if (state.model === "binomial") return "P(X=k)=C(n,k)p^k(1-p)^(n-k)";
  if (state.model === "geometric") return "P(X=k)=(1-p)^(k-1)p";
  return "P(X=k)=e^(-lambda)lambda^k/k!";
};

const substitutionFor = (state: DiscreteRvState): string => {
  if (state.model === "binomial") return `n=${state.n}, p=${state.p.toFixed(2)}`;
  if (state.model === "geometric") return `p=${state.p.toFixed(2)}, k=1,2,...`;
  return `lambda=${state.lambda.toFixed(1)}`;
};

const interpretationFor = (state: DiscreteRvState, mean: number, tail: number): string =>
  `${labelFor(state.model)} models ${eventMeaning(state.model)}. Its expected value is ${mean.toFixed(
    2,
  )}, and the highlighted tail probability is ${(tail * 100).toFixed(1)}%.`;

const labelFor = (model: ModelKind): string =>
  model === "binomial" ? "Binomial" : model === "geometric" ? "Geometric" : "Poisson";

const eventMeaning = (model: ModelKind): string => {
  if (model === "binomial") return "successes in a fixed number of independent trials";
  if (model === "geometric") return "the waiting time until the first success";
  return "event counts over a fixed interval";
};

export const discreteRvsSpec: TSimulationSpec = {
  id: discreteRvsSimId,
  title: "Discrete Random Variable Model Lab",
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
      {
        id: "model",
        label: "Model family",
        kind: "selector",
        kernel_binding: "state.model",
      },
      {
        id: "success-probability",
        label: "Success probability",
        kind: "slider",
        kernel_binding: "state.p",
        bounds: { min: 0.05, max: 0.95, step: 0.01 },
      },
      {
        id: "trial-count",
        label: "Trial count",
        kind: "slider",
        kernel_binding: "state.n",
        bounds: { min: 2, max: 20, step: 1 },
      },
      {
        id: "event-rate",
        label: "Event rate",
        kind: "slider",
        kernel_binding: "state.lambda",
        bounds: { min: 0.5, max: 10, step: 0.1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "pmf-readout",
        module: "@paideia/sutd-sims/discrete-rvs-geometric-binomial-poisson",
        symbol: "DiscreteRvsGeometricBinomialPoisson",
        props_binding:
          "Render PMF bars, model formula, substitution, expected value, variance, tail probability, legend, and interpretation.",
      },
    ],
  },
  explain: {
    prompt: "Explain which model family matches the system before substituting into a formula.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Choosing a formula by memory instead of matching the random process.",
      "Using a fixed-trial binomial model for waiting time until first success.",
    ],
  },
};

const ManipulateStage = () => {
  const stage = useStage();
  const state = normalizeState(useSimState<Partial<DiscreteRvState>>());
  const { set } = useManipulate<DiscreteRvState>();
  const model = discreteRvsModel(state);
  if (!model.ok) return <p role="alert">The probability model could not be evaluated.</p>;
  return (
    <section aria-label="Model setup" role="region" style={styles.surface}>
      <div style={styles.grid}>
        <section style={styles.panel}>
          <p style={styles.kicker}>Manipulate</p>
          <h1 style={styles.h1}>Choose the random-variable model</h1>
          <ControlGroup legend="Model parameters">
            <div style={styles.controlStack}>
              <Selector
                label="Model family"
                onChange={(modelKind: ModelKind) => set("model", modelKind)}
                options={[
                  { value: "binomial", label: "Binomial" },
                  { value: "geometric", label: "Geometric" },
                  { value: "poisson", label: "Poisson" },
                ]}
                value={state.model}
              />
              <Slider label="Success probability" max={0.95} min={0.05} onChange={(p) => set("p", p)} step={0.01} value={state.p} />
              <Slider label="Trial count" max={20} min={2} onChange={(n) => set("n", Math.round(n))} step={1} value={state.n} />
              <Slider label="Event rate" max={10} min={0.5} onChange={(lambda) => set("lambda", lambda)} step={0.1} value={state.lambda} />
            </div>
          </ControlGroup>
          <button onClick={() => stage.advance()} style={styles.primaryButton} type="button">
            Reveal PMF
          </button>
        </section>
        <PmfChart model={model.value} revealed={false} />
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const model = discreteRvsModel(useSimState<Partial<DiscreteRvState>>());
  if (!model.ok) return <p role="alert">The probability model could not be evaluated.</p>;
  return (
    <section aria-label="Observation unlocked" role="region" style={styles.surface}>
      <div style={styles.metricGrid}>
        <Metric label="Expected value" value={model.value.mean.toFixed(2)} note="kernel expected value" />
        <Metric label="Variance" value={model.value.variance.toFixed(2)} note="kernel distribution variance" />
        <Metric label="Tail probability" value={`${(model.value.tailProbability * 100).toFixed(1)}%`} note={model.value.targetEvent} />
      </div>
      <div style={styles.grid}>
        <PmfChart model={model.value} revealed />
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
        <h2 style={styles.h2}>Sensor fault model</h2>
        <p>
          A sensor has independent fault chances per inspection, a waiting time to first
          fault, and fault counts per hour. Match each story to binomial, geometric, or
          Poisson before calculating.
        </p>
        <button onClick={() => stage.reset()} style={styles.primaryButton} type="button">
          Try another model
        </button>
      </section>
    </section>
  );
};

const PredictStage = () => (
  <section aria-label="Prediction setup" role="region" style={styles.surface}>
    <section style={styles.panel}>
      <p style={styles.kicker}>Predict</p>
      <h1 style={styles.h1}>Which model owns the tail?</h1>
      <PredictionGate
        packageId={discreteRvsPackageId}
        predict={discreteRvsSpec.predict ?? predictSpec}
        simId={discreteRvsSpec.id as PredictionScope}
      >
        <StageAdvanceButton />
      </PredictionGate>
    </section>
  </section>
);

const StageAdvanceButton = () => {
  const stage = useStage();
  return <button onClick={() => stage.advance()} style={styles.primaryButton} type="button">Build model</button>;
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") return <ExplainStage />;
  return <PredictStage />;
};

const PmfChart = ({ model, revealed }: { readonly model: DiscreteRvModel; readonly revealed: boolean }) => {
  const maxProbability = Math.max(...model.distribution.map((outcome) => Number(outcome.probability)));
  return (
    <section aria-label="Probability mass function" style={styles.panel}>
      <p style={styles.kicker}>Visual model</p>
      <h2 style={styles.h2}>{labelFor(model.state.model)} PMF</h2>
      <svg aria-label="PMF bar chart" role="img" viewBox="0 0 640 260" style={styles.svg}>
        {model.distribution.slice(0, 16).map((outcome, index) => {
          const height = (Number(outcome.probability) / maxProbability) * 170;
          const x = 34 + index * 36;
          const y = 205 - height;
          const tail = revealed && outcome.value >= (model.state.model === "geometric" ? 6 : 4);
          return (
            <g key={outcome.id}>
              <rect fill={tail ? "#b6402a" : "#2d6a7f"} height={height} rx="3" width="22" x={x} y={y} />
              <text fill="#42525a" fontSize="10" textAnchor="middle" x={x + 11} y="226">{outcome.id}</text>
            </g>
          );
        })}
      </svg>
      <p style={styles.interpretation}>
        {revealed ? model.interpretation : "Commit a prediction to reveal moments and tail probability."}
      </p>
    </section>
  );
};

const FormulaPanel = ({ model }: { readonly model: DiscreteRvModel }) => (
  <section aria-label="Formula panel" style={styles.panel}>
    <p style={styles.kicker}>Formula</p>
    <h2 style={styles.h2}>Model before formula</h2>
    <pre style={styles.formula}>{model.formula}</pre>
    <div style={styles.legendGrid}>
      <span style={{ ...styles.legendMark, background: "#2d6a7f" }} />
      <span>Blue bars: probability mass used by the kernel distribution.</span>
      <span style={{ ...styles.legendMark, background: "#b6402a" }} />
      <span>Red bars: highlighted tail event.</span>
    </div>
    <p style={styles.substitution}>Substitution: {model.substitution}; probabilities are normalized before computing E(X) and Var(X).</p>
    <p style={styles.interpretation}>Units: outcomes are event counts or trial counts. Result: tail probability {(model.tailProbability * 100).toFixed(1)}%.</p>
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

export default function DiscreteRvsGeometricBinomialPoisson() {
  return (
    <SimRuntime packageId={discreteRvsPackageId} spec={discreteRvsSpec}>
      <StageSurface />
    </SimRuntime>
  );
}
