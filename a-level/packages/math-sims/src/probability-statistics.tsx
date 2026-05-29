import { useMemo } from "react";
import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import type { PredictionEvent } from "@paideia/prediction-gate";
import {
  expectedValue,
  normalizeDistribution,
  variance,
  zScore,
  type DiscreteDistribution,
} from "@paideia/probability-stats";
import {
  err,
  ok,
  type ConceptPackageId,
  type KernelResult,
} from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const probabilityStatisticsPackageId = "probability-statistics" as ConceptPackageId;
export const probabilityStatisticsSimId = "probability-statistics-lab";
export type ProbabilityStatisticsPredictionEvent = PredictionEvent;

type OutcomeId = "low" | "typical" | "high";

export interface ProbabilityStatisticsState {
  readonly lowWeight: number;
  readonly typicalWeight: number;
  readonly highWeight: number;
  readonly highScore: number;
  readonly observedMean: number;
  readonly sampleSize: number;
}

export interface ProbabilityStatisticsDecision {
  readonly nullMean: number;
  readonly standardError: number;
  readonly z: number;
  readonly criticalZ: number;
  readonly rejectNull: boolean;
}

export interface ProbabilityStatisticsModel {
  readonly distribution: DiscreteDistribution<OutcomeId>;
  readonly expectedScore: number;
  readonly variance: number;
  readonly standardDeviation: number;
  readonly probabilityTotal: number;
  readonly decision: ProbabilityStatisticsDecision;
}

export const probabilityStatisticsSpec: TSimulationSpec = {
  id: probabilityStatisticsSimId,
  title: "Distribution and Decision Lab",
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
      "A score distribution has many ordinary outcomes and a few high-score outcomes. If the high-score outcome becomes rarer but worth more marks, what can happen before the data sample is revealed?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The expected score must fall whenever the high score becomes rarer.",
        "The expected score can stay close while the spread increases.",
        "The most likely score must become the same as the expected score.",
        "The hypothesis decision no longer needs a sample size.",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "low-weight",
        label: "Low-score weight",
        kind: "slider",
        kernel_binding: "state.lowWeight",
        bounds: { min: 1, max: 12, step: 1 },
      },
      {
        id: "typical-weight",
        label: "Typical-score weight",
        kind: "slider",
        kernel_binding: "state.typicalWeight",
        bounds: { min: 1, max: 12, step: 1 },
      },
      {
        id: "high-weight",
        label: "High-score weight",
        kind: "slider",
        kernel_binding: "state.highWeight",
        bounds: { min: 1, max: 12, step: 1 },
      },
      {
        id: "high-score",
        label: "High outcome score",
        kind: "slider",
        kernel_binding: "state.highScore",
        bounds: { min: 6, max: 14, step: 1 },
      },
      {
        id: "observed-mean",
        label: "Observed sample mean",
        kind: "slider",
        kernel_binding: "state.observedMean",
        bounds: { min: 0, max: 14, step: 0.1 },
      },
      {
        id: "sample-size",
        label: "Sample size",
        kind: "slider",
        kernel_binding: "state.sampleSize",
        bounds: { min: 16, max: 100, step: 1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: probabilityStatisticsSimId,
        module: "@paideia/a-level-math-sims/probability-statistics",
        symbol: "ProbabilityStatisticsSim",
        props_binding:
          "Show distribution probabilities, expected value, variance, z-score decision, formula substitution, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Why can the expected score be different from the most likely score, and why does a larger sample size make the same observed mean more suspicious?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Independent and mutually exclusive mean the same thing.",
      "Expected value is the most likely outcome.",
      "A hypothesis-test decision depends only on the observed mean.",
    ],
  },
};

const defaultState: ProbabilityStatisticsState = {
  lowWeight: 3,
  typicalWeight: 5,
  highWeight: 2,
  highScore: 10,
  observedMean: 5.4,
  sampleSize: 36,
};

const presets: readonly {
  readonly label: string;
  readonly state: ProbabilityStatisticsState;
}[] = [
  { label: "balanced class", state: defaultState },
  {
    label: "rare high score",
    state: {
      lowWeight: 3,
      typicalWeight: 8,
      highWeight: 1,
      highScore: 14,
      observedMean: 5.2,
      sampleSize: 36,
    },
  },
  {
    label: "tight distribution",
    state: {
      lowWeight: 1,
      typicalWeight: 10,
      highWeight: 1,
      highScore: 6,
      observedMean: 4.8,
      sampleSize: 64,
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const integer = (value: number): number => Math.round(value);

const currentState = (state: Partial<ProbabilityStatisticsState>): ProbabilityStatisticsState => ({
  lowWeight: integer(clamp(state.lowWeight ?? defaultState.lowWeight, 1, 12)),
  typicalWeight: integer(clamp(state.typicalWeight ?? defaultState.typicalWeight, 1, 12)),
  highWeight: integer(clamp(state.highWeight ?? defaultState.highWeight, 1, 12)),
  highScore: integer(clamp(state.highScore ?? defaultState.highScore, 6, 14)),
  observedMean: clamp(state.observedMean ?? defaultState.observedMean, 0, 14),
  sampleSize: integer(clamp(state.sampleSize ?? defaultState.sampleSize, 16, 100)),
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatProbability = (value: number): string => `${formatNumber(value * 100, 1)}%`;

export const probabilityStatisticsModel = (
  state: ProbabilityStatisticsState,
): KernelResult<ProbabilityStatisticsModel> => {
  const distribution = normalizeDistribution<OutcomeId>([
    { id: "low", weight: state.lowWeight, value: 0 },
    { id: "typical", weight: state.typicalWeight, value: 4 },
    { id: "high", weight: state.highWeight, value: state.highScore },
  ]);
  if (!distribution.ok) return distribution;

  const expected = expectedValue(distribution.value);
  if (!expected.ok) return expected;
  const spread = variance(distribution.value);
  if (!spread.ok) return spread;

  const standardDeviation = Math.sqrt(spread.value);
  const standardError = standardDeviation / Math.sqrt(state.sampleSize);
  const z = zScore(state.observedMean, expected.value, standardError);
  if (!z.ok) return z;

  const probabilityTotal = distribution.value.reduce(
    (total, outcome) => total + Number(outcome.probability),
    0,
  );

  if (!Number.isFinite(standardDeviation) || !Number.isFinite(standardError)) {
    return err("numerical-instability", "Standard deviation and standard error must be finite");
  }

  const criticalZ = 1.96;
  return ok({
    distribution: distribution.value,
    expectedScore: expected.value,
    variance: spread.value,
    standardDeviation,
    probabilityTotal,
    decision: {
      nullMean: expected.value,
      standardError,
      z: z.value,
      criticalZ,
      rejectNull: Math.abs(z.value) >= criticalZ,
    },
  });
};

const setScenario = (
  set: <K extends keyof ProbabilityStatisticsState>(key: K, value: ProbabilityStatisticsState[K]) => void,
  state: ProbabilityStatisticsState,
) => {
  set("lowWeight", state.lowWeight);
  set("typicalWeight", state.typicalWeight);
  set("highWeight", state.highWeight);
  set("highScore", state.highScore);
  set("observedMean", state.observedMean);
  set("sampleSize", state.sampleSize);
};

const outcomeLabel = (id: OutcomeId): string => {
  if (id === "low") return "Low score";
  if (id === "typical") return "Typical score";
  return "High score";
};

const DistributionChart = ({ model }: { readonly model: ProbabilityStatisticsModel }) => {
  const chartData = model.distribution.map((outcome) => ({
    x: outcome.value,
    y: Number(outcome.probability),
    series: "Probability",
  }));

  return (
    <div className="energy-stage" aria-label="Probability distribution visual">
      <LineChart
        data={chartData}
        x={{ domain: { min: 0, max: Math.max(14, ...model.distribution.map((outcome) => outcome.value)) } }}
        y={{ domain: { min: 0, max: 1 } }}
      />
      <dl aria-label="Outcome probabilities" className="result-readout result-readout--cards">
        {model.distribution.map((outcome) => (
          <div key={outcome.id}>
            <dt>{outcomeLabel(outcome.id)}</dt>
            <dd>
              {formatProbability(Number(outcome.probability))} at {formatNumber(outcome.value, 0)} marks
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<ProbabilityStatisticsState>();
  const current = currentState(state);
  const model = useMemo(() => probabilityStatisticsModel(current), [current]);

  return (
    <section aria-label="Probability controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product">
        <p className="lab-kicker">Tune the distribution</p>
        <ControlGroup legend="Outcome weights and sample controls">
          <Slider
            label="Low-score weight"
            max={12}
            min={1}
            onChange={(value) => set("lowWeight", integer(value))}
            step={1}
            value={current.lowWeight}
          />
          <Slider
            label="Typical-score weight"
            max={12}
            min={1}
            onChange={(value) => set("typicalWeight", integer(value))}
            step={1}
            value={current.typicalWeight}
          />
          <Slider
            label="High-score weight"
            max={12}
            min={1}
            onChange={(value) => set("highWeight", integer(value))}
            step={1}
            value={current.highWeight}
          />
          <Slider
            label="High outcome score"
            max={14}
            min={6}
            onChange={(value) => set("highScore", integer(value))}
            step={1}
            unit="marks"
            value={current.highScore}
          />
          <Slider
            label="Observed sample mean"
            max={14}
            min={0}
            onChange={(value) => set("observedMean", value)}
            step={0.1}
            unit="marks"
            value={current.observedMean}
          />
          <Slider
            label="Sample size"
            max={100}
            min={16}
            onChange={(value) => set("sampleSize", integer(value))}
            step={1}
            value={current.sampleSize}
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
        <h3>Separate centre, spread, and evidence</h3>
        <p>
          Set the outcome weights, high-score value, observed mean, and sample size. Commit your
          prediction before the centre, spread, and hypothesis decision are shown.
        </p>
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<ProbabilityStatisticsState>>());
  const model = probabilityStatisticsModel(state);

  if (!model.ok) {
    return <p role="alert">The current probability settings are outside the supported range.</p>;
  }

  const outcomeRows = model.value.distribution.map((outcome) => (
    <tr key={outcome.id}>
      <th scope="row">{outcomeLabel(outcome.id)}</th>
      <td>{formatNumber(outcome.value, 0)} marks</td>
      <td>{formatProbability(Number(outcome.probability))}</td>
    </tr>
  ));

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <DistributionChart model={model.value} />
        <dl aria-label="Distribution readout" className="result-readout result-readout--cards">
          <div>
            <dt>Expected score</dt>
            <dd>{formatNumber(model.value.expectedScore)} marks</dd>
          </div>
          <div>
            <dt>Standard deviation</dt>
            <dd>{formatNumber(model.value.standardDeviation)} marks</dd>
          </div>
          <div>
            <dt>Decision</dt>
            <dd>{model.value.decision.rejectNull ? "Reject H0" : "Do not reject H0"}</dd>
          </div>
        </dl>
        <table aria-label="Distribution table">
          <thead>
            <tr>
              <th scope="col">Outcome</th>
              <th scope="col">Value</th>
              <th scope="col">Probability</th>
            </tr>
          </thead>
          <tbody>{outcomeRows}</tbody>
        </table>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Expected value and z-score decision</h3>
        <pre aria-label="Expected value and z-score formula source" className="formula-code" tabIndex={0}>
          <code>{String.raw`\color{#60a5fa}{E(X)}=\sum \color{#34d399}{x}\color{#fb923c}{P(X=x)}
\quad
\color{#60a5fa}{z}=
{\color{#34d399}{\bar{x}}-\color{#fb923c}{\mu_0}\over
\color{#34d399}{\sigma}/\sqrt{\color{#fb923c}{n}}}`}</code>
        </pre>
        <p className="lab-kicker">Legend</p>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt><span className="legend-swatch legend-swatch--blue" /> Blue symbols</dt>
            <dd>E(X) is expected score, and z is the standardised test statistic.</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--green" /> Green symbols</dt>
            <dd>x, sample mean, and standard deviation come from the observed score scale.</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--orange" /> Orange symbols</dt>
            <dd>P(X=x), null mean, and sample size set the probability model.</dd>
          </div>
        </dl>
        <p>Units: scores are measured in marks; probabilities and z-scores are dimensionless.</p>
        <p>Substitution:</p>
        <pre aria-label="Expected value and z-score substitution" className="formula-code" tabIndex={0}>
          <code>{`E(X) = 0(${formatProbability(Number(model.value.distribution[0]?.probability ?? 0))})
     + 4(${formatProbability(Number(model.value.distribution[1]?.probability ?? 0))})
     + ${formatNumber(state.highScore, 0)}(${formatProbability(Number(model.value.distribution[2]?.probability ?? 0))})
     = ${formatNumber(model.value.expectedScore)} marks

z = (${formatNumber(state.observedMean)} - ${formatNumber(model.value.decision.nullMean)})
    / (${formatNumber(model.value.standardDeviation)} / sqrt(${state.sampleSize}))
  = ${formatNumber(model.value.decision.z)}`}</code>
        </pre>
        <p>
          Result: expected score = {formatNumber(model.value.expectedScore)} marks and z ={" "}
          {formatNumber(model.value.decision.z)}.
        </p>
        <p className="formula-note">
          Reason: the mean uses every outcome weighted by its probability. The test statistic asks
          how many standard errors the observed sample mean sits from the null mean.
        </p>
        <p>
          With critical values +/-{formatNumber(model.value.decision.criticalZ)}, this sample{" "}
          {model.value.decision.rejectNull ? "falls in" : "does not reach"} the two-sided 5% rejection region.
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
      <h3>Ask what the parameter means</h3>
      <p>
        If a game changes from one high-value prize to many modest prizes, the expected value can
        stay similar while the variance changes. A hypothesis test then needs both the sample mean
        and the sample size before it can call the difference unusual.
      </p>
      <p className="formula-note">
        Try the rare high score preset, then increase the sample size without changing the observed
        mean. Watch the same difference become stronger evidence.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another distribution
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
      <p className="lab-kicker">Prediction checkpoint</p>
      <h3>Will a rare high score pull the whole model up?</h3>
      <p>
        Commit a prediction before the expected value, spread, and test decision are revealed.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up distribution
      </button>
    </section>
  );
};

export const ProbabilityStatisticsSim = () => (
  <SimRuntime packageId={probabilityStatisticsPackageId} spec={probabilityStatisticsSpec}>
    <StageSurface />
  </SimRuntime>
);

export default ProbabilityStatisticsSim;
