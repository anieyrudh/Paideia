import { useMemo } from "react";
import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { zScore } from "@paideia/probability-stats";
import {
  err,
  ok,
  type ConceptPackageId,
  type KernelResult,
} from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";

export const hypothesisTestingPackageId = "hypothesis-testing" as ConceptPackageId;
export const hypothesisTestingSimId = "test-statistic-decision-lab";
export type HypothesisTestingPredictionEvent = PredictionEvent;

export type HypothesisTail = "greater" | "less" | "two-sided";

export interface HypothesisTestingState {
  readonly nullMean: number;
  readonly observedMean: number;
  readonly populationStandardDeviation: number;
  readonly sampleSize: number;
  readonly alpha: number;
  readonly tail: HypothesisTail;
}

export interface HypothesisTestingDecision {
  readonly nullMean: number;
  readonly observedMean: number;
  readonly standardError: number;
  readonly z: number;
  readonly alpha: number;
  readonly criticalBoundary: number;
  readonly rejectNull: boolean;
  readonly pValueComparison: string;
  readonly criticalRegion: string;
}

export interface HypothesisTestingModel {
  readonly state: HypothesisTestingState;
  readonly decision: HypothesisTestingDecision;
}

export const hypothesisTestingSpec: TSimulationSpec = {
  id: hypothesisTestingSimId,
  title: "Test Statistic Decision Lab",
  interaction_type: "decision-matrix",
  kernel_deps: [
    "core/sim-runtime",
    "core/content-schema",
    "core/probability-stats",
    "core/charting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A sample mean is 3.2 marks above the null mean. Before seeing the decision, predict what happens when the sample size grows but the observed mean stays fixed.",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The evidence weakens because the sample has more values to average.",
        "The evidence strengthens because the standard error becomes smaller.",
        "The p-value is the probability that the null hypothesis is true.",
        "The null hypothesis is proved false whenever the sample mean is different.",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "null-mean",
        label: "Null mean",
        kind: "slider",
        kernel_binding: "state.nullMean",
        bounds: { min: 50, max: 80, step: 0.5 },
      },
      {
        id: "observed-mean",
        label: "Observed sample mean",
        kind: "slider",
        kernel_binding: "state.observedMean",
        bounds: { min: 50, max: 80, step: 0.1 },
      },
      {
        id: "population-standard-deviation",
        label: "Population standard deviation",
        kind: "slider",
        kernel_binding: "state.populationStandardDeviation",
        bounds: { min: 4, max: 16, step: 0.5 },
      },
      {
        id: "sample-size",
        label: "Sample size",
        kind: "slider",
        kernel_binding: "state.sampleSize",
        bounds: { min: 16, max: 100, step: 1 },
      },
      {
        id: "significance-level",
        label: "Significance level",
        kind: "selector",
        kernel_binding: "state.alpha",
      },
      {
        id: "alternative",
        label: "Alternative hypothesis",
        kind: "selector",
        kernel_binding: "state.tail",
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: hypothesisTestingSimId,
        module: "@paideia/a-level-math-sims/hypothesis-testing",
        symbol: "HypothesisTestingSim",
        props_binding:
          "Show null and alternative hypotheses, z-score, critical-region comparison, p-value decision explanation, formula substitution, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Which sentence is safer: the sample result would be rare if H0 were true, or H0 is probably false? Use the p-value comparison to justify the wording.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "p-value is the probability the null hypothesis is true",
      "rejecting the null proves the alternative is true",
    ],
  },
};

const defaultState: HypothesisTestingState = {
  nullMean: 64,
  observedMean: 67.2,
  populationStandardDeviation: 8,
  sampleSize: 36,
  alpha: 0.05,
  tail: "greater",
};

const presets: readonly {
  readonly label: string;
  readonly state: HypothesisTestingState;
}[] = [
  { label: "exam claim", state: defaultState },
  {
    label: "small class",
    state: {
      nullMean: 64,
      observedMean: 67.2,
      populationStandardDeviation: 8,
      sampleSize: 16,
      alpha: 0.05,
      tail: "greater",
    },
  },
  {
    label: "two-sided check",
    state: {
      nullMean: 70,
      observedMean: 66.7,
      populationStandardDeviation: 9,
      sampleSize: 49,
      alpha: 0.05,
      tail: "two-sided",
    },
  },
];

const alphaOptions = [
  { value: 0.1, label: "10%" },
  { value: 0.05, label: "5%" },
  { value: 0.01, label: "1%" },
] as const;

const tailOptions: readonly { readonly value: HypothesisTail; readonly label: string }[] = [
  { value: "greater", label: "H1: mean is greater" },
  { value: "less", label: "H1: mean is less" },
  { value: "two-sided", label: "H1: mean is different" },
];

const criticalTable = {
  greater: {
    0.1: 1.282,
    0.05: 1.645,
    0.01: 2.326,
  },
  less: {
    0.1: 1.282,
    0.05: 1.645,
    0.01: 2.326,
  },
  "two-sided": {
    0.1: 1.645,
    0.05: 1.96,
    0.01: 2.576,
  },
} as const satisfies Record<HypothesisTail, Record<number, number>>;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const integer = (value: number): number => Math.round(value);

const supportedAlpha = (value: number): 0.1 | 0.05 | 0.01 => {
  if (value === 0.1 || value === 0.05 || value === 0.01) return value;
  return 0.05;
};

const currentState = (state: Partial<HypothesisTestingState>): HypothesisTestingState => ({
  nullMean: clamp(state.nullMean ?? defaultState.nullMean, 50, 80),
  observedMean: clamp(state.observedMean ?? defaultState.observedMean, 50, 80),
  populationStandardDeviation: clamp(
    state.populationStandardDeviation ?? defaultState.populationStandardDeviation,
    4,
    16,
  ),
  sampleSize: integer(clamp(state.sampleSize ?? defaultState.sampleSize, 16, 100)),
  alpha: supportedAlpha(state.alpha ?? defaultState.alpha),
  tail: state.tail ?? defaultState.tail,
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatAlpha = (value: number): string => `${formatNumber(value * 100, 0)}%`;

const hypothesisLabel = (state: HypothesisTestingState): string => {
  if (state.tail === "greater") return `H1: mu > ${formatNumber(state.nullMean, 1)} marks`;
  if (state.tail === "less") return `H1: mu < ${formatNumber(state.nullMean, 1)} marks`;
  return `H1: mu != ${formatNumber(state.nullMean, 1)} marks`;
};

const criticalRegion = (tail: HypothesisTail, boundary: number): string => {
  if (tail === "greater") return `z >= ${formatNumber(boundary, 3)}`;
  if (tail === "less") return `z <= -${formatNumber(boundary, 3)}`;
  return `|z| >= ${formatNumber(boundary, 3)}`;
};

const inCriticalRegion = (tail: HypothesisTail, z: number, boundary: number): boolean => {
  if (tail === "greater") return z >= boundary;
  if (tail === "less") return z <= -boundary;
  return Math.abs(z) >= boundary;
};

export const hypothesisTestingModel = (
  state: HypothesisTestingState,
): KernelResult<HypothesisTestingModel> => {
  const standardError = state.populationStandardDeviation / Math.sqrt(state.sampleSize);
  if (!Number.isFinite(standardError) || standardError <= 0) {
    return err("numerical-instability", "Standard error must be positive and finite");
  }

  const z = zScore(state.observedMean, state.nullMean, standardError);
  if (!z.ok) return z;

  const alpha = supportedAlpha(state.alpha);
  const criticalBoundary = criticalTable[state.tail][alpha];
  const rejectNull = inCriticalRegion(state.tail, z.value, criticalBoundary);
  const pValueComparison = rejectNull ? `p < ${formatAlpha(alpha)}` : `p >= ${formatAlpha(alpha)}`;

  return ok({
    state,
    decision: {
      nullMean: state.nullMean,
      observedMean: state.observedMean,
      standardError,
      z: z.value,
      alpha,
      criticalBoundary,
      rejectNull,
      pValueComparison,
      criticalRegion: criticalRegion(state.tail, criticalBoundary),
    },
  });
};

const setScenario = (
  set: <K extends keyof HypothesisTestingState>(key: K, value: HypothesisTestingState[K]) => void,
  state: HypothesisTestingState,
) => {
  set("nullMean", state.nullMean);
  set("observedMean", state.observedMean);
  set("populationStandardDeviation", state.populationStandardDeviation);
  set("sampleSize", state.sampleSize);
  set("alpha", state.alpha);
  set("tail", state.tail);
};

const DecisionScale = ({ model }: { readonly model: HypothesisTestingModel }) => {
  const boundary = model.decision.criticalBoundary;
  const observed = clamp(model.decision.z, -3.5, 3.5);
  const data = [
    { x: -3.5, y: 0, series: "z scale" },
    { x: 3.5, y: 0, series: "z scale" },
    { x: observed - 0.001, y: 0, series: "observed z" },
    { x: observed + 0.001, y: 1, series: "observed z" },
    { x: boundary - 0.001, y: 0, series: "right critical" },
    { x: boundary + 0.001, y: 1, series: "right critical" },
    { x: -boundary - 0.001, y: 0, series: "left critical" },
    { x: -boundary + 0.001, y: 1, series: "left critical" },
  ];

  return (
    <section aria-label="Decision scale" className="energy-stage">
      <LineChart
        ariaLabel="Test statistic decision scale"
        data={data}
        x={{ domain: { min: -3.5, max: 3.5 } }}
        y={{ domain: { min: 0, max: 1 } }}
      />
      <dl aria-label="Hypothesis readout" className="result-readout result-readout--cards">
        <div>
          <dt>Null hypothesis</dt>
          <dd>H0: mu = {formatNumber(model.state.nullMean, 1)} marks</dd>
        </div>
        <div>
          <dt>Alternative hypothesis</dt>
          <dd>{hypothesisLabel(model.state)}</dd>
        </div>
        <div>
          <dt>Critical region</dt>
          <dd>{model.decision.criticalRegion}</dd>
        </div>
      </dl>
    </section>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<HypothesisTestingState>();
  const current = currentState(state);
  const model = useMemo(() => hypothesisTestingModel(current), [current]);

  return (
    <section aria-label="Hypothesis test controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product">
        <p className="lab-kicker">Tune the claim</p>
        <ControlGroup legend="Sample mean test controls">
          <Slider
            label="Null mean"
            max={80}
            min={50}
            onChange={(value) => set("nullMean", value)}
            step={0.5}
            unit="marks"
            value={current.nullMean}
          />
          <Slider
            label="Observed sample mean"
            max={80}
            min={50}
            onChange={(value) => set("observedMean", value)}
            step={0.1}
            unit="marks"
            value={current.observedMean}
          />
          <Slider
            label="Population standard deviation"
            max={16}
            min={4}
            onChange={(value) => set("populationStandardDeviation", value)}
            step={0.5}
            unit="marks"
            value={current.populationStandardDeviation}
          />
          <Slider
            label="Sample size"
            max={100}
            min={16}
            onChange={(value) => set("sampleSize", integer(value))}
            step={1}
            value={current.sampleSize}
          />
          <Selector
            label="Significance level"
            onChange={(value) => set("alpha", value)}
            options={alphaOptions}
            value={current.alpha}
          />
          <Selector
            label="Alternative hypothesis"
            onChange={(value) => set("tail", value)}
            options={tailOptions}
            value={current.tail}
          />
        </ControlGroup>
        <div className="preset-strip" aria-label="Scenario presets">
          {presets.map((preset) => (
            <button key={preset.label} onClick={() => setScenario(set, preset.state)} type="button">
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Reveal decision
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Hold the claim steady, then change the evidence</h3>
        <p>
          Choose the null mean, sample mean, known standard deviation, sample size, tail, and
          significance level. The decision is hidden until you commit a prediction.
        </p>
        {model.ok ? (
          <p className="formula-note">
            Current gap: {formatNumber(current.observedMean - current.nullMean)} marks. The same
            gap can mean different evidence when the standard error changes.
          </p>
        ) : null}
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<HypothesisTestingState>>());
  const model = hypothesisTestingModel(state);

  if (!model.ok) {
    return <p role="alert">The current hypothesis-test settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <DecisionScale model={model.value} />
        <dl aria-label="Decision readout" className="result-readout result-readout--cards">
          <div>
            <dt>Test statistic</dt>
            <dd>z = {formatNumber(model.value.decision.z)}</dd>
          </div>
          <div>
            <dt>p-value comparison</dt>
            <dd>{model.value.decision.pValueComparison}</dd>
          </div>
          <div>
            <dt>Decision</dt>
            <dd>{model.value.decision.rejectNull ? "Reject H0" : "Do not reject H0"}</dd>
          </div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Standardise the sample mean before deciding</h3>
        <pre aria-label="Hypothesis test formula source" className="formula-code" tabIndex={0}>
          <code>{String.raw`\color{#60a5fa}{SE}={\color{#34d399}{\sigma}\over\sqrt{\color{#fb923c}{n}}}
\quad
\color{#60a5fa}{z}=
{\color{#34d399}{\bar{x}}-\color{#fb923c}{\mu_0}\over \color{#60a5fa}{SE}}`}</code>
        </pre>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt><span className="legend-swatch legend-swatch--blue" /> Blue symbols</dt>
            <dd>SE and z are the computed standard error and test statistic.</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--green" /> Green symbols</dt>
            <dd>sigma and the sample mean are measured in marks.</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--orange" /> Orange symbols</dt>
            <dd>The null mean and sample size define the comparison under H0.</dd>
          </div>
        </dl>
        <pre aria-label="Hypothesis test substitution" className="formula-code" tabIndex={0}>
          <code>{`SE = ${formatNumber(state.populationStandardDeviation)} / sqrt(${state.sampleSize})
   = ${formatNumber(model.value.decision.standardError)} marks

z = (${formatNumber(state.observedMean)} - ${formatNumber(state.nullMean)})
    / ${formatNumber(model.value.decision.standardError)}
  = ${formatNumber(model.value.decision.z)}

Critical region at ${formatAlpha(state.alpha)}: ${model.value.decision.criticalRegion}
p-value decision: ${model.value.decision.pValueComparison}`}</code>
        </pre>
        <p className="formula-note">
          Interpretation: the p-value is about how unusual this sample mean would be if H0 were
          true. It is not the probability that H0 is true.
        </p>
        <p>
          In this context, the sample mean {model.value.decision.rejectNull ? "is" : "is not"} far
          enough from {formatNumber(state.nullMean, 1)} marks to support the alternative at{" "}
          {formatAlpha(state.alpha)}.
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Explain the decision
        </button>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Transfer</p>
      <h3>Name the population claim before touching the p-value</h3>
      <p>
        A hypothesis test does not prove a story. It asks whether the sample result would be rare
        under the null model, then uses the significance level as the pre-agreed boundary for a
        decision.
      </p>
      <p className="formula-note">
        Try the small class preset, then increase sample size without changing the mean. The same
        observed gap crosses the decision boundary only after the standard error narrows.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another claim
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
    <section aria-label="Prediction setup" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Predict first</p>
      <h3>Will the same gap become stronger evidence?</h3>
      <p>
        Commit a prediction before the test statistic, critical region, and p-value comparison are
        revealed.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up test
      </button>
    </section>
  );
};

export const HypothesisTestingSim = () => (
  <SimRuntime packageId={hypothesisTestingPackageId} spec={hypothesisTestingSpec}>
    <StageSurface />
  </SimRuntime>
);

export default HypothesisTestingSim;
