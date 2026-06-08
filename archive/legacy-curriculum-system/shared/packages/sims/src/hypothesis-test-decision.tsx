import { useMemo, useState, type CSSProperties } from "react";
import { LineChart } from "@paideia/charting";
import type { TPredictSpec, TSimulationSpec } from "@paideia/content-schema";
import {
  normalMeanHypothesisTest,
  type NormalMeanHypothesisTestAlpha,
  type NormalMeanHypothesisTestAlternative,
} from "@paideia/probability-stats";
import { PredictionGate } from "@paideia/prediction-gate";
import { ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { ControlGroup, Selector, Slider, Stepper } from "@paideia/ui-sim";

export const hypothesisTestDecisionPackageId =
  "shared/math/hypothesis-test-decision" as ConceptPackageId;
export const hypothesisTestDecisionSimId = "hypothesis-test-decision";

export const hypothesisTestDecisionPredict: TPredictSpec = {
  prompt:
    "A process is claimed to have mean 50. A sample of 36 observations has mean 51.3 and known population standard deviation 6.0. For a 5% upper-tail test, what decision should the test make?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "Reject the null hypothesis because the observed mean is above 50.",
      "Do not reject the null hypothesis because the z statistic is below the 5% critical boundary.",
      "Reject the null hypothesis because the p-value is the probability the null is true.",
      "Do not reject the null hypothesis because significance never applies to sample means.",
    ],
    correct_index: 1,
  },
  rationale_required: true,
};

export const hypothesisTestDecisionSpec: TSimulationSpec = {
  id: hypothesisTestDecisionSimId,
  title: "Hypothesis Test Decision Lab",
  interaction_type: "decision-matrix",
  kernel_deps: [
    "core/probability-stats",
    "core/charting",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  predict: hypothesisTestDecisionPredict,
  manipulate: {
    controls: [
      {
        id: "observed-mean",
        label: "Observed sample mean",
        kind: "slider",
        kernel_binding: "state.observedMean",
        bounds: { min: 46, max: 55, step: 0.1 },
      },
      {
        id: "sample-size",
        label: "Sample size",
        kind: "stepper",
        kernel_binding: "state.sampleSize",
        bounds: { min: 9, max: 100, step: 1 },
      },
      {
        id: "alpha",
        label: "Significance level",
        kind: "selector",
        kernel_binding: "state.alpha",
      },
      {
        id: "alternative",
        label: "Alternative hypothesis",
        kind: "selector",
        kernel_binding: "state.alternative",
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "decision-readout",
        module: "@paideia/shared-sims/hypothesis-test-decision",
        symbol: "HypothesisTestDecisionSim",
        props_binding:
          "state -> normal mean test decision, rejection-region trace, formula panel, and contextual interpretation",
      },
    ],
  },
  explain: {
    prompt:
      "Which comparison actually made the decision: the sample mean's direction, the z statistic's distance from zero, or the practical size of the effect?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "P-value is the probability the null is true",
      "Statistical significance as practical importance",
      "Any sample mean above the null rejects an upper-tail test",
    ],
  },
};

export interface HypothesisTestDecisionState {
  readonly nullMean: number;
  readonly observedMean: number;
  readonly populationStandardDeviation: number;
  readonly sampleSize: number;
  readonly alpha: NormalMeanHypothesisTestAlpha;
  readonly alternative: NormalMeanHypothesisTestAlternative;
}

export interface HypothesisTestDecisionModel {
  readonly state: HypothesisTestDecisionState;
  readonly standardError: number;
  readonly z: number;
  readonly criticalBoundary: number;
  readonly rejectNull: boolean;
  readonly pValueRelation: "less-than-alpha" | "at-least-alpha";
  readonly decisionLabel: string;
  readonly alternativeLabel: string;
  readonly rejectionRule: string;
  readonly interpretation: string;
  readonly chartData: readonly { readonly x: number; readonly y: number; readonly series: string }[];
}

const defaultState: HypothesisTestDecisionState = {
  nullMean: 50,
  observedMean: 51.3,
  populationStandardDeviation: 6,
  sampleSize: 36,
  alpha: 0.05,
  alternative: "greater",
};

const alphaOptions: readonly {
  readonly value: NormalMeanHypothesisTestAlpha;
  readonly label: string;
}[] = [
  { value: 0.1, label: "alpha = 10%" },
  { value: 0.05, label: "alpha = 5%" },
  { value: 0.01, label: "alpha = 1%" },
];

const alternativeOptions: readonly {
  readonly value: NormalMeanHypothesisTestAlternative;
  readonly label: string;
}[] = [
  { value: "greater", label: "mean is greater than 50" },
  { value: "less", label: "mean is less than 50" },
  { value: "two-sided", label: "mean is different from 50" },
];

const styles = {
  chartGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "minmax(260px, 1.2fr) minmax(240px, 0.8fr)",
  },
  swatchBlue: { background: "#1f5f8b" },
  swatchPurple: { background: "#6941c6" },
  swatchGreen: { background: "#027a48" },
  swatchAmber: { background: "#b54708" },
} satisfies Record<string, CSSProperties>;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const normalizeState = (
  state: Partial<HypothesisTestDecisionState>,
): HypothesisTestDecisionState => ({
  nullMean:
    state.nullMean !== undefined && Number.isFinite(state.nullMean)
      ? state.nullMean
      : defaultState.nullMean,
  observedMean: clamp(state.observedMean ?? defaultState.observedMean, 46, 55),
  populationStandardDeviation: clamp(
    state.populationStandardDeviation ?? defaultState.populationStandardDeviation,
    1,
    12,
  ),
  sampleSize: Math.round(clamp(state.sampleSize ?? defaultState.sampleSize, 9, 100)),
  alpha: state.alpha ?? defaultState.alpha,
  alternative: state.alternative ?? defaultState.alternative,
});

const normalDensity = (z: number): number => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

const rejectionSeries = (
  alternative: NormalMeanHypothesisTestAlternative,
  boundary: number,
): readonly { readonly x: number; readonly y: number; readonly series: string }[] => {
  const points: { readonly x: number; readonly y: number; readonly series: string }[] = [];
  for (let index = 0; index <= 120; index += 1) {
    const x = -3.6 + index * 0.06;
    const inRegion =
      alternative === "greater"
        ? x >= boundary
        : alternative === "less"
          ? x <= -boundary
          : Math.abs(x) >= boundary;
    points.push({
      x,
      y: inRegion ? normalDensity(x) : 0,
      series: "rejection region",
    });
  }
  return points;
};

const decisionChartData = (
  z: number,
  alternative: NormalMeanHypothesisTestAlternative,
  boundary: number,
): readonly { readonly x: number; readonly y: number; readonly series: string }[] => {
  const density: { readonly x: number; readonly y: number; readonly series: string }[] = [];
  for (let index = 0; index <= 120; index += 1) {
    const x = -3.6 + index * 0.06;
    density.push({ x, y: normalDensity(x), series: "null model" });
  }
  const zMarker = [
    { x: z, y: 0, series: "observed z" },
    { x: z, y: normalDensity(z), series: "observed z" },
  ];
  return [...density, ...rejectionSeries(alternative, boundary), ...zMarker];
};

const alternativeLabel = (alternative: NormalMeanHypothesisTestAlternative): string => {
  if (alternative === "greater") return "mean is greater than the null mean";
  if (alternative === "less") return "mean is less than the null mean";
  return "mean is different from the null mean";
};

const rejectionRule = (
  alternative: NormalMeanHypothesisTestAlternative,
  boundary: number,
): string => {
  if (alternative === "greater") return `Reject when z >= ${boundary.toFixed(3)}.`;
  if (alternative === "less") return `Reject when z <= -${boundary.toFixed(3)}.`;
  return `Reject when |z| >= ${boundary.toFixed(3)}.`;
};

export const hypothesisTestDecisionModel = (
  state: Partial<HypothesisTestDecisionState>,
): KernelResult<HypothesisTestDecisionModel> => {
  const current = normalizeState(state);
  const decision = normalMeanHypothesisTest(current);
  if (!decision.ok) return decision;

  const decisionLabel = decision.value.rejectNull
    ? "Reject the null hypothesis"
    : "Do not reject the null hypothesis";
  const pValuePhrase =
    decision.value.pValueRelation === "less-than-alpha"
      ? "the tail evidence is below alpha"
      : "the tail evidence is at least alpha";
  const interpretation = decision.value.rejectNull
    ? `The statistic enters the rejection region, so ${pValuePhrase}. There is statistically significant evidence that the ${alternativeLabel(
        current.alternative,
      )}.`
    : `The statistic stays outside the rejection region, so ${pValuePhrase}. The sample does not provide enough evidence to reject the null at this alpha.`;

  return ok({
    state: current,
    standardError: decision.value.standardError,
    z: decision.value.z,
    criticalBoundary: decision.value.criticalBoundary,
    rejectNull: decision.value.rejectNull,
    pValueRelation: decision.value.pValueRelation,
    decisionLabel,
    alternativeLabel: alternativeLabel(current.alternative),
    rejectionRule: rejectionRule(current.alternative, decision.value.criticalBoundary),
    interpretation,
    chartData: decisionChartData(
      decision.value.z,
      current.alternative,
      decision.value.criticalBoundary,
    ),
  });
};

const formatOne = (value: number): string => value.toFixed(1);
const formatTwo = (value: number): string => value.toFixed(2);
const formatThree = (value: number): string => value.toFixed(3);
const formatAlpha = (alpha: NormalMeanHypothesisTestAlpha): string =>
  `${Math.round(alpha * 100)}%`;

const DecisionRegionChart = ({
  model,
}: {
  readonly model: HypothesisTestDecisionModel;
}) => (
  <figure aria-label="Decision-region visualizer" style={{ margin: 0 }}>
    <LineChart
      ariaLabel="Null-model density, rejection region, and observed z statistic"
      data={model.chartData}
      x={{ domain: { min: -3.6, max: 3.6 }, label: "z statistic" }}
      y={{ domain: { min: 0, max: 0.42 }, label: "relative density" }}
    />
    <figcaption>
      Blue curve: null-model z distribution. Red trace: rejection region. Green marker: observed z.
    </figcaption>
  </figure>
);

const FormulaPanel = ({
  model,
}: {
  readonly model: HypothesisTestDecisionModel;
}) => (
  <section aria-label="Formula used" className="formula-panel formula-panel--product">
    <p className="lab-kicker">Formula used</p>
    <h3>Convert the sample mean into a z statistic</h3>
    <pre aria-label="LaTeX formula" className="formula-code">
      <code>{`\\color{#6941c6}{z}
= \\frac{\\color{#1f5f8b}{\\bar{x}} - \\color{#b54708}{\\mu_0}}
{\\color{#027a48}{\\sigma / \\sqrt{n}}}`}</code>
    </pre>
    <dl aria-label="Formula legend" className="formula-legend">
      <div>
        <dt>
          <span aria-hidden="true" className="legend-swatch" style={styles.swatchBlue} /> xbar
        </dt>
        <dd>observed sample mean, {formatOne(model.state.observedMean)} units</dd>
      </div>
      <div>
        <dt>
          <span aria-hidden="true" className="legend-swatch" style={styles.swatchAmber} /> mu0
        </dt>
        <dd>null mean, {formatOne(model.state.nullMean)} units</dd>
      </div>
      <div>
        <dt>
          <span aria-hidden="true" className="legend-swatch" style={styles.swatchGreen} /> sigma / sqrt(n)
        </dt>
        <dd>standard error, {formatTwo(model.standardError)} units</dd>
      </div>
      <div>
        <dt>
          <span aria-hidden="true" className="legend-swatch" style={styles.swatchPurple} /> z
        </dt>
        <dd>standardized distance from the null, {formatTwo(model.z)}</dd>
      </div>
    </dl>
    <p>
      Substitution: z = ({formatOne(model.state.observedMean)} units -{" "}
      {formatOne(model.state.nullMean)} units) / ({formatOne(model.state.populationStandardDeviation)}{" "}
      units / sqrt({model.state.sampleSize})) = {formatTwo(model.z)}.
    </p>
    <p>
      Result: standard error = {formatTwo(model.standardError)} units; z = {formatTwo(model.z)}.
      The z statistic is unitless because the numerator and denominator are both measured in the
      original units.
    </p>
    <p className="formula-note">
      This formula applies because the null model predicts how much sample means vary; the test
      judges the observed mean by that sampling variation, not by raw direction alone.
    </p>
  </section>
);

const DecisionReadout = ({
  model,
}: {
  readonly model: HypothesisTestDecisionModel;
}) => (
  <section aria-label="Observation unlocked" className="vector-stage vector-stage--product">
    <p className="lab-kicker">Observe</p>
    <h2>Compare the statistic with the rejection region</h2>
    <dl aria-label="Decision readout" className="result-readout result-readout--cards">
      <div>
        <dt>Decision</dt>
        <dd>{model.decisionLabel}</dd>
      </div>
      <div>
        <dt>Standard error</dt>
        <dd>{formatTwo(model.standardError)} units</dd>
      </div>
      <div>
        <dt>z statistic</dt>
        <dd>{formatTwo(model.z)}</dd>
      </div>
      <div>
        <dt>Critical boundary</dt>
        <dd>{formatThree(model.criticalBoundary)}</dd>
      </div>
    </dl>
    <div style={styles.chartGrid}>
      <DecisionRegionChart model={model} />
      <section aria-label="Decision interpretation">
        <h3>{model.rejectionRule}</h3>
        <p>
          Alternative: the {model.alternativeLabel}. Alpha is {formatAlpha(model.state.alpha)}.
        </p>
        <p>{model.interpretation}</p>
        <p>
          Practical importance is a separate question: this decision says whether the sample crossed
          the statistical threshold, not whether the effect is large enough to matter operationally.
        </p>
      </section>
    </div>
    <FormulaPanel model={model} />
  </section>
);

export const HypothesisTestDecisionSim = () => {
  const [state, setState] = useState<HypothesisTestDecisionState>(defaultState);
  const current = normalizeState(state);
  const model = useMemo(() => hypothesisTestDecisionModel(current), [current]);

  const updateState = (patch: Partial<HypothesisTestDecisionState>): void => {
    setState((next) => normalizeState({ ...next, ...patch }));
  };

  return (
    <PredictionGate
      packageId={hypothesisTestDecisionPackageId}
      predict={hypothesisTestDecisionPredict}
      simId={hypothesisTestDecisionSimId}
    >
      <section aria-label="Hypothesis test decision lab" className="vector-lab vector-lab--product">
        <div aria-label="Hypothesis test controls" className="vector-controls vector-controls--product">
          <p className="lab-kicker">Manipulate</p>
          <h2>Set the evidence and decision rule</h2>
          <ControlGroup legend="Hypothesis test controls">
            <Slider
              label="Observed sample mean"
              max={55}
              min={46}
              onChange={(value) => updateState({ observedMean: value })}
              step={0.1}
              unit="units"
              value={current.observedMean}
            />
            <Stepper
              label="Sample size"
              max={100}
              min={9}
              onChange={(value) => updateState({ sampleSize: value })}
              step={1}
              value={current.sampleSize}
            />
            <Selector
              label="Significance level"
              onChange={(value) => updateState({ alpha: value })}
              options={alphaOptions}
              value={current.alpha}
            />
            <Selector
              label="Alternative hypothesis"
              onChange={(value) => updateState({ alternative: value })}
              options={alternativeOptions}
              value={current.alternative}
            />
          </ControlGroup>
          <div aria-label="Scenario presets" className="preset-strip">
            <button onClick={() => setState(defaultState)} type="button">
              borderline upper-tail
            </button>
            <button
              onClick={() =>
                setState({
                  ...defaultState,
                  observedMean: 52.4,
                  sampleSize: 49,
                })
              }
              type="button"
            >
              clear rejection
            </button>
            <button
              onClick={() =>
                setState({
                  ...defaultState,
                  observedMean: 48.3,
                  populationStandardDeviation: 5,
                  alternative: "less",
                })
              }
              type="button"
            >
              lower-tail quality
            </button>
          </div>
        </div>

        {model.ok ? (
          <DecisionReadout model={model.value} />
        ) : (
          <section role="alert">The hypothesis test cannot be computed for these settings.</section>
        )}
      </section>
    </PredictionGate>
  );
};

export default HypothesisTestDecisionSim;
