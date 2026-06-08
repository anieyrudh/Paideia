import type { TSimulationSpec } from "@paideia/content-schema";
import { linearRegression } from "@paideia/numerical-math";
import { ScatterPlot } from "@paideia/plotting";
import { summarize } from "@paideia/probability-stats";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { ConceptPackageId, KernelResult } from "@paideia/shared";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";

type DatasetId = "sensor" | "delivery" | "study";

export interface LinearRegressionState {
  readonly dataset: DatasetId;
  readonly outlierShift: number;
  readonly noiseLevel: number;
}

interface Dataset {
  readonly id: DatasetId;
  readonly label: string;
  readonly xLabel: string;
  readonly yLabel: string;
  readonly unit: string;
  readonly points: readonly (readonly [number, number])[];
  readonly outlierIndex: number;
  readonly caption: string;
}

export interface LinearRegressionModel {
  readonly state: LinearRegressionState;
  readonly dataset: Dataset;
  readonly points: readonly (readonly [number, number])[];
  readonly slope: number;
  readonly intercept: number;
  readonly r2: number;
  readonly meanX: number;
  readonly meanY: number;
  readonly residuals: readonly number[];
  readonly predictionX: number;
  readonly predictionY: number;
}

const datasets: readonly Dataset[] = [
  {
    id: "sensor",
    label: "Temperature calibration",
    xLabel: "Reference temperature",
    yLabel: "Sensor reading",
    unit: "deg C",
    points: [
      [18, 19.1],
      [21, 21.7],
      [24, 24.9],
      [27, 27.8],
      [30, 31.4],
      [33, 34.1],
    ],
    outlierIndex: 5,
    caption: "A lab sensor should track reference temperature with a near-linear offset.",
  },
  {
    id: "delivery",
    label: "Delivery time estimate",
    xLabel: "Distance",
    yLabel: "Travel time",
    unit: "minutes",
    points: [
      [2, 10],
      [4, 16],
      [6, 23],
      [8, 29],
      [10, 37],
      [12, 43],
    ],
    outlierIndex: 4,
    caption: "A dispatcher estimates travel time from distance with one congested route.",
  },
  {
    id: "study",
    label: "Practice and score",
    xLabel: "Practice quizzes",
    yLabel: "Score",
    unit: "marks",
    points: [
      [1, 42],
      [2, 48],
      [3, 55],
      [4, 62],
      [5, 66],
      [6, 73],
    ],
    outlierIndex: 1,
    caption: "A teaching team models the association between deliberate practice and score.",
  },
];

const defaultState: LinearRegressionState = {
  dataset: "sensor",
  outlierShift: 0,
  noiseLevel: 0,
};

const defaultDataset = datasets[0] as Dataset;

export const linearRegressionPackageId =
  "sutd/10-022-modelling-uncertainty/linear-regression" as ConceptPackageId;

export const linearRegressionSpec: TSimulationSpec = {
  id: "linear-regression",
  title: "Linear Regression Fit Lab",
  interaction_type: "other",
  kernel_deps: [
    "core/content-schema",
    "core/shared",
    "core/sim-runtime",
    "core/numerical-math",
    "core/probability-stats",
    "core/plotting",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "dataset",
        label: "Dataset",
        kind: "selector",
        kernel_binding: "state.dataset",
      },
      {
        id: "outlier-shift",
        label: "Outlier shift",
        kind: "slider",
        kernel_binding: "state.outlierShift",
        bounds: { min: -12, max: 12, step: 1 },
      },
      {
        id: "noise-level",
        label: "Pattern noise",
        kind: "slider",
        kernel_binding: "state.noiseLevel",
        bounds: { min: 0, max: 6, step: 1 },
      },
    ],
  },
  predict: {
    prompt:
      "If one high-x observation is pulled upward while the rest of the cloud stays similar, what happens to the least-squares line?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The fitted slope usually increases",
        "Only the intercept can change",
        "R squared must become exactly 1",
        "The line ignores the shifted point",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "least-squares-fit",
        module: "@paideia/sutd-sims/linear-regression",
        symbol: "LinearRegression",
        props_binding:
          "Display scatter plot, least-squares line, residual evidence, formula, substitution, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why the least-squares line balances residuals rather than passing through every point.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "The regression line must pass through all observations.",
      "A high R squared proves causation.",
    ],
  },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const datasetById = (id: DatasetId): Dataset =>
  datasets.find((dataset) => dataset.id === id) ?? defaultDataset;

const currentState = (state: Partial<LinearRegressionState>): LinearRegressionState => ({
  dataset:
    state.dataset === "delivery" || state.dataset === "study" || state.dataset === "sensor"
      ? state.dataset
      : defaultState.dataset,
  outlierShift: clamp(state.outlierShift ?? defaultState.outlierShift, -12, 12),
  noiseLevel: clamp(state.noiseLevel ?? defaultState.noiseLevel, 0, 6),
});

const adjustedPoints = (dataset: Dataset, state: LinearRegressionState) =>
  dataset.points.map((point, index) => {
    const wave = index % 2 === 0 ? state.noiseLevel : -state.noiseLevel * 0.75;
    const outlier = index === dataset.outlierIndex ? state.outlierShift : 0;
    return [point[0], point[1] + wave + outlier] as const;
  });

export const linearRegressionModel = (
  partialState: Partial<LinearRegressionState>,
): KernelResult<LinearRegressionModel> => {
  const state = currentState(partialState);
  const dataset = datasetById(state.dataset);
  const points = adjustedPoints(dataset, state);
  const regression = linearRegression(points.map(([x, y]) => [x, y]));
  if (!regression.ok) return regression;

  const xStats = summarize(points.map((point) => point[0]));
  if (!xStats.ok) return xStats;
  const yStats = summarize(points.map((point) => point[1]));
  if (!yStats.ok) return yStats;

  const residuals = points.map(([x, y]) => y - (regression.value.m * x + regression.value.b));
  const predictionX = points[Math.floor(points.length / 2)]?.[0] ?? points[0]?.[0] ?? 0;
  return {
    ok: true,
    value: {
      state,
      dataset,
      points,
      slope: regression.value.m,
      intercept: regression.value.b,
      r2: regression.value.r2,
      meanX: xStats.value.mean,
      meanY: yStats.value.mean,
      residuals,
      predictionX,
      predictionY: regression.value.m * predictionX + regression.value.b,
    },
  };
};

const formatNumber = (value: number, digits = 2): string => Number(value).toFixed(digits);
const formatSigned = (value: number, digits = 2): string =>
  `${value >= 0 ? "+" : "-"} ${Math.abs(value).toFixed(digits)}`;

const datasetOptions = datasets.map((dataset) => ({
  value: dataset.id,
  label: dataset.label,
}));

const presetStates: readonly {
  readonly label: string;
  readonly state: LinearRegressionState;
}[] = [
  { label: "calibrated sensor", state: defaultState },
  { label: "upward outlier", state: { dataset: "sensor", outlierShift: 10, noiseLevel: 1 } },
  { label: "noisy delivery", state: { dataset: "delivery", outlierShift: 5, noiseLevel: 4 } },
];

const presetMatches = (
  state: LinearRegressionState,
  preset: LinearRegressionState,
): boolean =>
  state.dataset === preset.dataset &&
  state.outlierShift === preset.outlierShift &&
  state.noiseLevel === preset.noiseLevel;

const MetricCard = ({
  label,
  value,
  note,
}: {
  readonly label: string;
  readonly value: string;
  readonly note: string;
}) => (
  <div style={styles.metric}>
    <span style={styles.metricLabel}>{label}</span>
    <strong style={styles.metricValue}>{value}</strong>
    <span>{note}</span>
  </div>
);

const FormulaPanel = ({ model }: { readonly model: LinearRegressionModel }) => (
  <section aria-label="Formula evidence" style={styles.panel}>
    <div style={styles.panelHeader}>
      <p style={styles.kicker}>Formula</p>
      <h3 style={styles.h3}>Least-squares line</h3>
    </div>
    <div aria-label="Formula used" style={styles.formula}>
      y_hat = m x + b
      <br />
      m = sum((x_i - x_bar)(y_i - y_bar)) / sum((x_i - x_bar)^2)
      <br />
      b = y_bar - m x_bar
    </div>
    <p style={styles.kicker}>Legend</p>
    <div aria-label="Formula legend" style={styles.legendGrid}>
      <span style={{ ...styles.legendMark, background: "#155e63" }} />
      <span>points: observed pairs ({model.dataset.xLabel}, {model.dataset.yLabel})</span>
      <span style={{ ...styles.legendMark, background: "#9b2c2c" }} />
      <span>line: prediction y_hat from the fitted model</span>
      <span style={{ ...styles.legendMark, background: "#b7791f" }} />
      <span>residual: observed y minus predicted y_hat</span>
    </div>
    <p style={styles.substitution}>
      Substitution: x_bar = {formatNumber(model.meanX)}, y_bar = {formatNumber(model.meanY)}, so
      y_hat = {formatNumber(model.slope, 3)}x {formatSigned(model.intercept, 3)}. At x ={" "}
      {formatNumber(model.predictionX, 1)} {model.dataset.unit}, the fitted value is{" "}
      {formatNumber(model.predictionY, 2)} {model.dataset.unit}.
    </p>
    <p style={styles.interpretation}>
      Units: {model.dataset.xLabel} is the explanatory variable; {model.dataset.yLabel} and each
      residual are measured in {model.dataset.unit}. Result: fitted line y_hat ={" "}
      {formatNumber(model.slope, 3)}x {formatSigned(model.intercept, 3)}, R^2 ={" "}
      {formatNumber(model.r2, 3)}.
    </p>
    <p style={styles.interpretation}>
      Interpretation: the least-squares line chooses the slope and intercept that minimise the sum
      of squared residuals for this cloud, so it can move when a high-leverage observation shifts.
    </p>
  </section>
);

const RegressionVisual = ({
  model,
  revealed = true,
}: {
  readonly model: LinearRegressionModel;
  readonly revealed?: boolean;
}) => (
  <section aria-label="Regression visual model" style={styles.panel}>
    <div style={styles.panelHeader}>
      <p style={styles.kicker}>Observe</p>
      <h3 style={styles.h3}>{model.dataset.label}</h3>
    </div>
    <p>{model.dataset.caption}</p>
    <ScatterPlot fit={revealed ? "linear" : "none"} points={model.points} />
    <table
      aria-label={revealed ? "Observed points and residuals" : "Observed points"}
      style={styles.dataTable}
    >
      <thead>
        <tr>
          <th>{model.dataset.xLabel}</th>
          <th>{model.dataset.yLabel}</th>
          {revealed ? <th>Residual</th> : null}
        </tr>
      </thead>
      <tbody>
        {model.points.map(([x, y], index) => (
          <tr key={`${x}:${index}`}>
            <td>{formatNumber(x, 1)}</td>
            <td>{formatNumber(y, 1)} {model.dataset.unit}</td>
            {revealed ? (
              <td>{formatSigned(model.residuals[index] ?? 0, 2)} {model.dataset.unit}</td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<LinearRegressionState>();
  const current = currentState(state);
  const model = linearRegressionModel(current);

  const applyPreset = (preset: LinearRegressionState) => {
    set("dataset", preset.dataset);
    set("outlierShift", preset.outlierShift);
    set("noiseLevel", preset.noiseLevel);
  };

  return (
    <section aria-label="Linear regression controls" style={styles.surface}>
      <div style={styles.mainGrid}>
        <section style={styles.panel}>
          <p style={styles.kicker}>Manipulate</p>
          <h2 style={styles.h2}>Shape the data cloud before fitting</h2>
          <div aria-label="Regression presets" style={styles.presets}>
            {presetStates.map((preset) => (
              <button
                aria-pressed={presetMatches(current, preset.state)}
                key={preset.label}
                onClick={() => applyPreset(preset.state)}
                style={
                  presetMatches(current, preset.state)
                    ? { ...styles.presetButton, ...styles.presetButtonActive }
                    : styles.presetButton
                }
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <ControlGroup legend="Data inputs">
            <div style={styles.controlStack}>
              <Selector
                label="Dataset"
                onChange={(value) => set("dataset", value)}
                options={datasetOptions}
                value={current.dataset}
              />
              <Slider
                label="Outlier shift"
                max={12}
                min={-12}
                onChange={(value) => set("outlierShift", value)}
                step={1}
                unit={model.ok ? model.value.dataset.unit : "units"}
                value={current.outlierShift}
              />
              <Slider
                label="Pattern noise"
                max={6}
                min={0}
                onChange={(value) => set("noiseLevel", value)}
                step={1}
                unit={model.ok ? model.value.dataset.unit : "units"}
                value={current.noiseLevel}
              />
            </div>
          </ControlGroup>
          <button onClick={() => stage.advance()} style={styles.primaryButton} type="button">
            Reveal least-squares fit
          </button>
        </section>
        {model.ok ? <RegressionVisual model={model.value} revealed={false} /> : null}
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const model = linearRegressionModel(useSimState<Partial<LinearRegressionState>>());
  if (!model.ok) {
    return (
      <section aria-label="Observation unlocked" role="region">
        <p role="alert">The regression model could not be fitted.</p>
      </section>
    );
  }

  return (
    <section aria-label="Observation unlocked" role="region" style={styles.surface}>
      <div style={styles.metricGrid}>
        <MetricCard
          label="Slope"
          note={`${model.value.dataset.unit} change in y for one x unit`}
          value={formatNumber(model.value.slope, 3)}
        />
        <MetricCard
          label="Intercept"
          note={`predicted y when x = 0, in ${model.value.dataset.unit}`}
          value={formatNumber(model.value.intercept, 2)}
        />
        <MetricCard
          label="R squared"
          note="fraction of y variation explained by the fitted line"
          value={formatNumber(model.value.r2, 3)}
        />
      </div>
      <div style={styles.mainGrid}>
        <FormulaPanel model={model.value} />
        <RegressionVisual model={model.value} />
      </div>
      <section aria-label="Regression interpretation" style={styles.panel}>
        <p style={styles.kicker}>Explain</p>
        <h3 style={styles.h3}>What the line is allowed to claim</h3>
        <p>
          The model summarises association in this dataset. It does not prove that changing x
          causes y to change, and it should not be extrapolated far beyond the observed x range.
          The useful claim is narrower: within this data cloud, the line is the least-squares
          linear prediction.
        </p>
        <button onClick={() => stage.advance()} style={styles.primaryButton} type="button">
          Transfer
        </button>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer challenge" style={styles.surface}>
      <section style={styles.panel}>
        <p style={styles.kicker}>Transfer</p>
        <h2 style={styles.h2}>Audit a campus energy regression</h2>
        <p>
          A facilities team fits daily energy use against outdoor temperature. One holiday has
          unusually low occupancy. Identify whether that point should change the slope, the
          intercept, R squared, or the modelling caveat, and explain why least squares may still
          fit a line that misses several individual days.
        </p>
        <button onClick={() => stage.reset()} style={styles.primaryButton} type="button">
          Fit another dataset
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

  return (
    <section aria-label="Prediction setup" style={styles.surface}>
      <section style={styles.panel}>
        <p style={styles.kicker}>Predict</p>
        <h1 style={styles.h1}>Which line best summarises a data cloud?</h1>
        <p>
          Before comparing with the fitted model, choose a dataset and decide how a shifted
          high-leverage point should affect the least-squares slope.
        </p>
        <button onClick={() => stage.advance()} style={styles.primaryButton} type="button">
          Set regression data
        </button>
      </section>
    </section>
  );
};

const styles = {
  surface: {
    color: "#172026",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    padding: "1rem",
  },
  mainGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
  },
  panel: {
    background: "#fbfcf8",
    border: "1px solid #c8d4d2",
    borderRadius: "8px",
    padding: "1rem",
  },
  panelHeader: {
    marginBottom: "0.75rem",
  },
  h1: {
    fontSize: "clamp(2rem, 3rem, 3rem)",
    lineHeight: 1.05,
    margin: "0 0 0.75rem",
  },
  h2: {
    fontSize: "1.55rem",
    lineHeight: 1.15,
    margin: "0 0 0.75rem",
  },
  h3: {
    fontSize: "1.1rem",
    lineHeight: 1.2,
    margin: 0,
  },
  kicker: {
    color: "#55645f",
    fontSize: "0.76rem",
    fontWeight: 700,
    letterSpacing: 0,
    margin: "0 0 0.35rem",
    textTransform: "uppercase",
  },
  controlStack: {
    display: "grid",
    gap: "0.85rem",
  },
  presets: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginBottom: "0.8rem",
  },
  presetButton: {
    background: "#edf5f4",
    border: "1px solid #9fb7b3",
    borderRadius: "6px",
    color: "#172026",
    padding: "0.45rem 0.65rem",
  },
  presetButtonActive: {
    background: "#d8ece8",
    borderColor: "#155e63",
    boxShadow: "inset 0 0 0 1px #155e63",
  },
  primaryButton: {
    background: "#155e63",
    border: "1px solid #155e63",
    borderRadius: "6px",
    color: "#ffffff",
    fontWeight: 700,
    marginTop: "1rem",
    padding: "0.65rem 0.9rem",
  },
  dataTable: {
    borderCollapse: "collapse",
    fontSize: "0.86rem",
    marginTop: "0.9rem",
    width: "100%",
  },
  metricGrid: {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
    marginBottom: "1rem",
  },
  metric: {
    background: "#eef7f5",
    border: "1px solid #c3d4d0",
    borderRadius: "8px",
    display: "grid",
    gap: "0.2rem",
    padding: "0.85rem",
  },
  metricLabel: {
    color: "#50635f",
    fontSize: "0.82rem",
    fontWeight: 700,
  },
  metricValue: {
    color: "#133f43",
    fontSize: "1.45rem",
    lineHeight: 1.1,
  },
  formula: {
    background: "#f4f1ea",
    border: "1px solid #d8ccb5",
    borderRadius: "6px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    lineHeight: 1.6,
    overflowX: "auto",
    padding: "0.8rem",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  legendGrid: {
    display: "grid",
    gap: "0.4rem 0.55rem",
    gridTemplateColumns: "0.9rem 1fr",
    marginTop: "0.8rem",
  },
  legendMark: {
    borderRadius: "999px",
    height: "0.85rem",
    marginTop: "0.2rem",
    width: "0.85rem",
  },
  substitution: {
    marginTop: "0.9rem",
  },
  interpretation: {
    marginTop: "0.7rem",
  },
} as const;

export default function LinearRegression() {
  return (
    <SimRuntime packageId={linearRegressionPackageId} spec={linearRegressionSpec}>
      <StageSurface />
    </SimRuntime>
  );
}
