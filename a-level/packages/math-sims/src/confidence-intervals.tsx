import { useMemo } from "react";
import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import type { PredictionEvent } from "@paideia/prediction-gate";
import {
  normalMeanHypothesisTest,
  type NormalMeanHypothesisTestAlpha,
} from "@paideia/probability-stats";
import {
  ok,
  type ConceptPackageId,
  type KernelResult,
} from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";

export const confidenceIntervalsPackageId = "confidence-intervals" as ConceptPackageId;
export const confidenceIntervalsSimId = "mean-interval-lab";
export type ConfidenceIntervalsPredictionEvent = PredictionEvent;

export type ConfidenceLevel = 0.9 | 0.95 | 0.99;

export interface ConfidenceIntervalsState {
  readonly sampleMean: number;
  readonly populationStandardDeviation: number;
  readonly sampleSize: number;
  readonly confidenceLevel: ConfidenceLevel;
  readonly comparisonMean: number;
}

export interface ConfidenceIntervalsModel {
  readonly state: ConfidenceIntervalsState;
  readonly alpha: NormalMeanHypothesisTestAlpha;
  readonly standardError: number;
  readonly criticalMultiplier: number;
  readonly marginOfError: number;
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly comparisonZ: number;
  readonly containsComparisonMean: boolean;
}

export const confidenceIntervalsSpec: TSimulationSpec = {
  id: confidenceIntervalsSimId,
  title: "Mean Interval Lab",
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
      "A sample mean is fixed at 68.0 marks. Before seeing the interval, predict what happens to the confidence interval when the confidence level rises from 90% to 99% while sigma and n stay fixed.",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The interval becomes narrower because higher confidence means more certainty.",
        "The interval becomes wider because the multiplier must cover more sampling variation.",
        "The sample mean moves to the centre of the population distribution.",
        "The interval gives a 99% probability that this fixed parameter is inside it.",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "sample-mean",
        label: "Sample mean",
        kind: "slider",
        kernel_binding: "state.sampleMean",
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
        id: "confidence-level",
        label: "Confidence level",
        kind: "selector",
        kernel_binding: "state.confidenceLevel",
      },
      {
        id: "comparison-mean",
        label: "Claimed population mean",
        kind: "slider",
        kernel_binding: "state.comparisonMean",
        bounds: { min: 50, max: 80, step: 0.1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: confidenceIntervalsSimId,
        module: "@paideia/a-level-math-sims/confidence-intervals",
        symbol: "ConfidenceIntervalsSim",
        props_binding:
          "Show confidence interval, standard error, critical multiplier, margin of error, substitution, units, interpretation, and legend.",
      },
    ],
  },
  explain: {
    prompt:
      "Why is it safer to say that the repeated-sampling method captures the true mean in a stated proportion of intervals, rather than that this particular interval has that probability?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "a confidence interval gives the probability the fixed parameter is inside",
      "wider intervals mean worse data in every context",
    ],
  },
};

const defaultState: ConfidenceIntervalsState = {
  sampleMean: 68,
  populationStandardDeviation: 9,
  sampleSize: 36,
  confidenceLevel: 0.95,
  comparisonMean: 65,
};

const presets: readonly {
  readonly label: string;
  readonly state: ConfidenceIntervalsState;
}[] = [
  { label: "exam marks", state: defaultState },
  {
    label: "high confidence",
    state: {
      sampleMean: 68,
      populationStandardDeviation: 9,
      sampleSize: 36,
      confidenceLevel: 0.99,
      comparisonMean: 65,
    },
  },
  {
    label: "larger sample",
    state: {
      sampleMean: 68,
      populationStandardDeviation: 9,
      sampleSize: 81,
      confidenceLevel: 0.95,
      comparisonMean: 65,
    },
  },
];

const confidenceOptions = [
  { value: 0.9, label: "90%" },
  { value: 0.95, label: "95%" },
  { value: 0.99, label: "99%" },
] as const;

const alphaForConfidence = (confidenceLevel: ConfidenceLevel): NormalMeanHypothesisTestAlpha => {
  if (confidenceLevel === 0.9) return 0.1;
  if (confidenceLevel === 0.99) return 0.01;
  return 0.05;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const integer = (value: number): number => Math.round(value);

const supportedConfidence = (value: number): ConfidenceLevel => {
  if (value === 0.9 || value === 0.95 || value === 0.99) return value;
  return 0.95;
};

const currentState = (state: Partial<ConfidenceIntervalsState>): ConfidenceIntervalsState => ({
  sampleMean: clamp(state.sampleMean ?? defaultState.sampleMean, 50, 80),
  populationStandardDeviation: clamp(
    state.populationStandardDeviation ?? defaultState.populationStandardDeviation,
    4,
    16,
  ),
  sampleSize: integer(clamp(state.sampleSize ?? defaultState.sampleSize, 16, 100)),
  confidenceLevel: supportedConfidence(state.confidenceLevel ?? defaultState.confidenceLevel),
  comparisonMean: clamp(state.comparisonMean ?? defaultState.comparisonMean, 50, 80),
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatPercent = (value: number): string => `${formatNumber(value * 100, 0)}%`;

export const confidenceIntervalsModel = (
  state: ConfidenceIntervalsState,
): KernelResult<ConfidenceIntervalsModel> => {
  const alpha = alphaForConfidence(state.confidenceLevel);
  const decision = normalMeanHypothesisTest({
    nullMean: state.comparisonMean,
    observedMean: state.sampleMean,
    populationStandardDeviation: state.populationStandardDeviation,
    sampleSize: state.sampleSize,
    alpha,
    alternative: "two-sided",
  });
  if (!decision.ok) return decision;

  const marginOfError = decision.value.criticalBoundary * decision.value.standardError;
  return ok({
    state,
    alpha,
    standardError: decision.value.standardError,
    criticalMultiplier: decision.value.criticalBoundary,
    marginOfError,
    lowerBound: state.sampleMean - marginOfError,
    upperBound: state.sampleMean + marginOfError,
    comparisonZ: decision.value.z,
    containsComparisonMean:
      state.comparisonMean >= state.sampleMean - marginOfError &&
      state.comparisonMean <= state.sampleMean + marginOfError,
  });
};

const setScenario = (
  set: <K extends keyof ConfidenceIntervalsState>(key: K, value: ConfidenceIntervalsState[K]) => void,
  state: ConfidenceIntervalsState,
) => {
  set("sampleMean", state.sampleMean);
  set("populationStandardDeviation", state.populationStandardDeviation);
  set("sampleSize", state.sampleSize);
  set("confidenceLevel", state.confidenceLevel);
  set("comparisonMean", state.comparisonMean);
};

const IntervalChart = ({ model }: { readonly model: ConfidenceIntervalsModel }) => {
  const span = Math.max(model.marginOfError * 1.6, model.standardError * 5, 1);
  const data = [
    { x: model.lowerBound, y: 0.55, series: "confidence interval" },
    { x: model.upperBound, y: 0.55, series: "confidence interval" },
    { x: model.state.sampleMean - 0.001, y: 0.15, series: "sample mean" },
    { x: model.state.sampleMean + 0.001, y: 0.95, series: "sample mean" },
    { x: model.state.comparisonMean - 0.001, y: 0.15, series: "claimed mean" },
    { x: model.state.comparisonMean + 0.001, y: 0.95, series: "claimed mean" },
  ];

  return (
    <section aria-label="Confidence interval visual" className="energy-stage">
      <LineChart
        ariaLabel="Confidence interval scale"
        data={data}
        x={{ domain: { min: model.state.sampleMean - span, max: model.state.sampleMean + span } }}
        y={{ domain: { min: 0, max: 1 } }}
      />
      <dl aria-label="Interval legend" className="result-readout result-readout--cards">
        <div>
          <dt>Interval</dt>
          <dd>
            [{formatNumber(model.lowerBound)}, {formatNumber(model.upperBound)}] marks
          </dd>
        </div>
        <div>
          <dt>Sample mean</dt>
          <dd>{formatNumber(model.state.sampleMean)} marks</dd>
        </div>
        <div>
          <dt>Claimed mean</dt>
          <dd>{formatNumber(model.state.comparisonMean)} marks</dd>
        </div>
      </dl>
    </section>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<ConfidenceIntervalsState>();
  const current = currentState(state);
  const model = useMemo(() => confidenceIntervalsModel(current), [current]);

  return (
    <section aria-label="Confidence interval controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product">
        <p className="lab-kicker">Tune the sample</p>
        <ControlGroup legend="Interval estimation controls">
          <Slider
            label="Sample mean"
            max={80}
            min={50}
            onChange={(value) => set("sampleMean", value)}
            step={0.1}
            unit="marks"
            value={current.sampleMean}
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
            label="Confidence level"
            onChange={(value) => set("confidenceLevel", value)}
            options={confidenceOptions}
            value={current.confidenceLevel}
          />
          <Slider
            label="Claimed population mean"
            max={80}
            min={50}
            onChange={(value) => set("comparisonMean", value)}
            step={0.1}
            unit="marks"
            value={current.comparisonMean}
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
          Reveal interval
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Predict how wide the uncertainty band must be</h3>
        <p>
          Choose the sample mean, known population standard deviation, sample size, confidence
          level, and a claim to test against the interval.
        </p>
        {model.ok ? (
          <p className="formula-note">
            Current standard error: {formatNumber(model.value.standardError)} marks. Higher
            confidence or smaller samples widen the margin of error.
          </p>
        ) : null}
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<ConfidenceIntervalsState>>());
  const model = confidenceIntervalsModel(state);

  if (!model.ok) {
    return <p role="alert">The current confidence-interval settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <IntervalChart model={model.value} />
        <dl aria-label="Interval readout" className="result-readout result-readout--cards">
          <div>
            <dt>Standard error</dt>
            <dd>{formatNumber(model.value.standardError)} marks</dd>
          </div>
          <div>
            <dt>Margin of error</dt>
            <dd>{formatNumber(model.value.marginOfError)} marks</dd>
          </div>
          <div>
            <dt>Claim check</dt>
            <dd>{model.value.containsComparisonMean ? "Claim lies inside" : "Claim lies outside"}</dd>
          </div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Build the interval around the sample mean</h3>
        <pre aria-label="Confidence interval formula source" className="formula-code" tabIndex={0}>
          <code>{String.raw`\color{#60a5fa}{SE}={\color{#34d399}{\sigma}\over\sqrt{\color{#fb923c}{n}}}
\quad
\color{#60a5fa}{CI}=
\color{#34d399}{\bar{x}}\pm
\color{#fb923c}{z^*}\color{#60a5fa}{SE}`}</code>
        </pre>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt><span className="legend-swatch legend-swatch--blue" /> Blue symbols</dt>
            <dd>SE and CI are the computed standard error and confidence interval.</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--green" /> Green symbols</dt>
            <dd>sigma and sample mean are measured in marks.</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--orange" /> Orange symbols</dt>
            <dd>Sample size and z* set the interval width.</dd>
          </div>
        </dl>
        <pre aria-label="Confidence interval substitution" className="formula-code" tabIndex={0}>
          <code>{`SE = ${formatNumber(state.populationStandardDeviation)} / sqrt(${state.sampleSize})
   = ${formatNumber(model.value.standardError)} marks

z* for ${formatPercent(state.confidenceLevel)} confidence = ${formatNumber(model.value.criticalMultiplier, 3)}

margin = ${formatNumber(model.value.criticalMultiplier, 3)} x ${formatNumber(model.value.standardError)}
       = ${formatNumber(model.value.marginOfError)} marks

CI = ${formatNumber(state.sampleMean)} +/- ${formatNumber(model.value.marginOfError)}
   = [${formatNumber(model.value.lowerBound)}, ${formatNumber(model.value.upperBound)}] marks`}</code>
        </pre>
        <p className="formula-note">
          Interpretation: the method would capture the fixed population mean in about{" "}
          {formatPercent(state.confidenceLevel)} of many repeated samples. This computed interval
          either contains the mean or it does not.
        </p>
        <p>
          The claimed mean of {formatNumber(state.comparisonMean)} marks{" "}
          {model.value.containsComparisonMean ? "is compatible with" : "sits outside"} this interval.
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Explain the interval
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
      <h3>Say what repeats, not what becomes random</h3>
      <p>
        The random object is the interval-making procedure before data are collected. After the
        sample is observed, the interval is fixed, so the population mean is either inside or
        outside it.
      </p>
      <p className="formula-note">
        Try the high confidence preset, then the larger sample preset. One widens the interval by
        increasing z*, while the other narrows it by reducing the standard error.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another sample
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
      <h3>Will higher confidence narrow or widen the interval?</h3>
      <p>
        Commit a prediction before the interval bounds, margin of error, and claim check are
        revealed.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up interval
      </button>
    </section>
  );
};

export const ConfidenceIntervalsSim = () => (
  <SimRuntime packageId={confidenceIntervalsPackageId} spec={confidenceIntervalsSpec}>
    <StageSurface />
  </SimRuntime>
);

export default ConfidenceIntervalsSim;
