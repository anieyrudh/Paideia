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

export const normalDistributionPackageId = "normal-distribution" as ConceptPackageId;
export const normalDistributionSimId = "normal-area-standardisation-lab";
export type NormalDistributionPredictionEvent = PredictionEvent;

export type NormalAreaMode = "between" | "left-tail" | "right-tail";

export interface NormalDistributionState {
  readonly mean: number;
  readonly standardDeviation: number;
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly mode: NormalAreaMode;
}

export interface NormalDistributionModel {
  readonly state: NormalDistributionState;
  readonly zLower: number;
  readonly zUpper: number;
  readonly probability: number;
  readonly density: readonly { readonly x: number; readonly y: number; readonly series: string }[];
  readonly intervalLabel: string;
  readonly probabilityLabel: string;
  readonly interpretation: string;
}

export const normalDistributionSpec: TSimulationSpec = {
  id: normalDistributionSimId,
  title: "Normal Area Standardisation Lab",
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
      "A score is modelled as normal with mean 100 and standard deviation 12. Before seeing the area, predict which probability is larger.",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The central interval from 88 to 112 marks is larger.",
        "The upper tail above 124 marks is larger.",
        "Both regions are equal because the normal curve is symmetric.",
        "The z-score itself is the probability area.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "mean",
        label: "Mean",
        kind: "slider",
        kernel_binding: "state.mean",
        bounds: { min: 60, max: 140, step: 1 },
      },
      {
        id: "standard-deviation",
        label: "Standard deviation",
        kind: "slider",
        kernel_binding: "state.standardDeviation",
        bounds: { min: 4, max: 24, step: 0.5 },
      },
      {
        id: "lower-bound",
        label: "Lower bound",
        kind: "slider",
        kernel_binding: "state.lowerBound",
        bounds: { min: 40, max: 160, step: 1 },
      },
      {
        id: "upper-bound",
        label: "Upper bound",
        kind: "slider",
        kernel_binding: "state.upperBound",
        bounds: { min: 40, max: 160, step: 1 },
      },
      {
        id: "area-mode",
        label: "Area mode",
        kind: "selector",
        kernel_binding: "state.mode",
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: normalDistributionSimId,
        module: "@paideia/a-level-math-sims/normal-distribution",
        symbol: "NormalDistributionSim",
        props_binding:
          "Show normal density curve, interval or tail markers, z-standardisation, area probability, formula substitution, units, interpretation, and legend.",
      },
    ],
  },
  explain: {
    prompt:
      "Why is the z-score not itself a probability, and why does symmetry only let you mirror equal distances from the mean?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "z-score is a probability",
      "symmetric distributions make every interval equally likely",
    ],
  },
};

const defaultState: NormalDistributionState = {
  mean: 100,
  standardDeviation: 12,
  lowerBound: 88,
  upperBound: 112,
  mode: "between",
};

const presets: readonly {
  readonly label: string;
  readonly state: NormalDistributionState;
}[] = [
  { label: "central band", state: defaultState },
  {
    label: "upper tail",
    state: {
      mean: 100,
      standardDeviation: 12,
      lowerBound: 88,
      upperBound: 124,
      mode: "right-tail",
    },
  },
  {
    label: "shifted exam",
    state: {
      mean: 72,
      standardDeviation: 9,
      lowerBound: 65,
      upperBound: 80,
      mode: "between",
    },
  },
];

const modeOptions: readonly { readonly value: NormalAreaMode; readonly label: string }[] = [
  { value: "between", label: "Between lower and upper" },
  { value: "left-tail", label: "Left tail below lower" },
  { value: "right-tail", label: "Right tail above upper" },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const supportedMode = (value: unknown): NormalAreaMode => {
  if (value === "between" || value === "left-tail" || value === "right-tail") return value;
  return defaultState.mode;
};

const currentState = (state: Partial<NormalDistributionState>): NormalDistributionState => ({
  mean: clamp(state.mean ?? defaultState.mean, 60, 140),
  standardDeviation: clamp(state.standardDeviation ?? defaultState.standardDeviation, 4, 24),
  lowerBound: clamp(state.lowerBound ?? defaultState.lowerBound, 40, 160),
  upperBound: clamp(state.upperBound ?? defaultState.upperBound, 40, 160),
  mode: supportedMode(state.mode),
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatProbability = (value: number): string => `${formatNumber(value * 100, 1)}%`;

const normalPdf = (x: number, mean: number, standardDeviation: number): number => {
  const z = (x - mean) / standardDeviation;
  return Math.exp(-0.5 * z * z) / (standardDeviation * Math.sqrt(2 * Math.PI));
};

const erfApproximation = (x: number): number => {
  const sign = x < 0 ? -1 : 1;
  const absolute = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * absolute);
  const polynomial =
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
    t;
  return sign * (1 - polynomial * Math.exp(-absolute * absolute));
};

const normalCdf = (z: number): number => 0.5 * (1 + erfApproximation(z / Math.SQRT2));

const probabilityFor = (mode: NormalAreaMode, zLower: number, zUpper: number): number => {
  if (mode === "left-tail") return normalCdf(zLower);
  if (mode === "right-tail") return 1 - normalCdf(zUpper);
  return normalCdf(zUpper) - normalCdf(zLower);
};

const makeDensity = (
  mean: number,
  standardDeviation: number,
  lowerBound: number,
  upperBound: number,
): readonly { readonly x: number; readonly y: number; readonly series: string }[] => {
  const min = mean - 4 * standardDeviation;
  const max = mean + 4 * standardDeviation;
  const step = (max - min) / 80;
  const curve = Array.from({ length: 81 }, (_, index) => {
    const x = min + index * step;
    return { x, y: normalPdf(x, mean, standardDeviation), series: "normal density" };
  });
  const lowerY = normalPdf(lowerBound, mean, standardDeviation);
  const upperY = normalPdf(upperBound, mean, standardDeviation);
  return [
    ...curve,
    { x: lowerBound - 0.001, y: 0, series: "lower bound" },
    { x: lowerBound, y: lowerY, series: "lower bound" },
    { x: upperBound - 0.001, y: 0, series: "upper bound" },
    { x: upperBound, y: upperY, series: "upper bound" },
  ];
};

const intervalLabel = (state: NormalDistributionState, lower: number, upper: number): string => {
  if (state.mode === "left-tail") return `P(X <= ${formatNumber(lower, 0)})`;
  if (state.mode === "right-tail") return `P(X >= ${formatNumber(upper, 0)})`;
  return `P(${formatNumber(lower, 0)} <= X <= ${formatNumber(upper, 0)})`;
};

const interpretationFor = (state: NormalDistributionState, probability: number): string => {
  if (state.mode === "left-tail") {
    return `About ${formatProbability(probability)} of observations are expected to be at or below ${formatNumber(state.lowerBound, 0)} marks.`;
  }
  if (state.mode === "right-tail") {
    return `About ${formatProbability(probability)} of observations are expected to be at or above ${formatNumber(state.upperBound, 0)} marks.`;
  }
  return `About ${formatProbability(probability)} of observations are expected to fall inside this interval.`;
};

export const normalDistributionModel = (
  state: NormalDistributionState,
): KernelResult<NormalDistributionModel> => {
  const lower = Math.min(state.lowerBound, state.upperBound);
  const upper = Math.max(state.lowerBound, state.upperBound);
  const lowerZ = zScore(lower, state.mean, state.standardDeviation);
  if (!lowerZ.ok) return lowerZ;
  const upperZ = zScore(upper, state.mean, state.standardDeviation);
  if (!upperZ.ok) return upperZ;

  const probability = probabilityFor(state.mode, lowerZ.value, upperZ.value);
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    return err("numerical-instability", "Normal probability must be a finite value in [0, 1]");
  }

  return ok({
    state,
    zLower: lowerZ.value,
    zUpper: upperZ.value,
    probability,
    density: makeDensity(state.mean, state.standardDeviation, lower, upper),
    intervalLabel: intervalLabel(state, lower, upper),
    probabilityLabel: formatProbability(probability),
    interpretation: interpretationFor(state, probability),
  });
};

const setScenario = (
  set: <K extends keyof NormalDistributionState>(key: K, value: NormalDistributionState[K]) => void,
  state: NormalDistributionState,
) => {
  set("mean", state.mean);
  set("standardDeviation", state.standardDeviation);
  set("lowerBound", state.lowerBound);
  set("upperBound", state.upperBound);
  set("mode", state.mode);
};

const NormalCurve = ({ model }: { readonly model: NormalDistributionModel }) => {
  const xMin = model.state.mean - 4 * model.state.standardDeviation;
  const xMax = model.state.mean + 4 * model.state.standardDeviation;
  const yMax = normalPdf(model.state.mean, model.state.mean, model.state.standardDeviation) * 1.1;

  return (
    <section aria-label="Normal curve visual" className="energy-stage">
      <LineChart
        ariaLabel="Normal density curve with interval markers"
        data={model.density}
        x={{ domain: { min: xMin, max: xMax } }}
        y={{ domain: { min: 0, max: yMax } }}
      />
      <dl aria-label="Normal area legend" className="result-readout result-readout--cards">
        <div>
          <dt><span className="legend-swatch legend-swatch--blue" /> Curve</dt>
          <dd>Normal density for X in marks.</dd>
        </div>
        <div>
          <dt><span className="legend-swatch legend-swatch--red" /> Lower</dt>
          <dd>z = {formatNumber(model.zLower)}</dd>
        </div>
        <div>
          <dt><span className="legend-swatch legend-swatch--green" /> Upper</dt>
          <dd>z = {formatNumber(model.zUpper)}</dd>
        </div>
      </dl>
    </section>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<NormalDistributionState>();
  const current = currentState(state);
  const model = useMemo(() => normalDistributionModel(current), [current]);

  return (
    <section aria-label="Normal distribution controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product">
        <p className="lab-kicker">Tune the model</p>
        <ControlGroup legend="Normal area controls">
          <Slider
            label="Mean"
            max={140}
            min={60}
            onChange={(value) => set("mean", value)}
            step={1}
            unit="marks"
            value={current.mean}
          />
          <Slider
            label="Standard deviation"
            max={24}
            min={4}
            onChange={(value) => set("standardDeviation", value)}
            step={0.5}
            unit="marks"
            value={current.standardDeviation}
          />
          <Slider
            label="Lower bound"
            max={160}
            min={40}
            onChange={(value) => set("lowerBound", value)}
            step={1}
            unit="marks"
            value={current.lowerBound}
          />
          <Slider
            label="Upper bound"
            max={160}
            min={40}
            onChange={(value) => set("upperBound", value)}
            step={1}
            unit="marks"
            value={current.upperBound}
          />
          <Selector
            label="Area mode"
            onChange={(value) => set("mode", value)}
            options={modeOptions}
            value={current.mode}
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
          Reveal area
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Predict the area before standardising</h3>
        <p>
          Set the mean, standard deviation, bounds, and tail mode. The curve and probability area
          stay hidden until you commit a prediction.
        </p>
        {model.ok ? (
          <p className="formula-note">
            Current target: {model.value.intervalLabel}. Compare distance from the mean in standard
            deviations, not raw marks alone.
          </p>
        ) : null}
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<NormalDistributionState>>());
  const model = normalDistributionModel(state);

  if (!model.ok) {
    return <p role="alert">The current normal-distribution settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <NormalCurve model={model.value} />
        <dl aria-label="Area readout" className="result-readout result-readout--cards">
          <div>
            <dt>Target probability</dt>
            <dd>{model.value.intervalLabel}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>{model.value.probabilityLabel}</dd>
          </div>
          <div>
            <dt>Standardised interval</dt>
            <dd>
              z from {formatNumber(model.value.zLower)} to {formatNumber(model.value.zUpper)}
            </dd>
          </div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Convert raw marks to the standard normal scale</h3>
        <pre aria-label="Normal standardisation formula source" className="formula-code" tabIndex={0}>
          <code>{String.raw`\color{#60a5fa}{Z}=
{\color{#34d399}{X}-\color{#fb923c}{\mu}\over \color{#a78bfa}{\sigma}}
\quad
\color{#60a5fa}{P(a<X<b)}=
\Phi(z_b)-\Phi(z_a)`}</code>
        </pre>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt><span className="legend-swatch legend-swatch--blue" /> Blue symbols</dt>
            <dd>Z and Phi belong to the standard normal scale.</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--green" /> Green symbols</dt>
            <dd>X, lower, and upper bounds are measured in marks.</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--orange" /> Orange symbols</dt>
            <dd>mu is the mean of the raw score model.</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--purple" /> Purple symbols</dt>
            <dd>sigma is the standard deviation, also in marks.</dd>
          </div>
        </dl>
        <pre aria-label="Normal area substitution" className="formula-code" tabIndex={0}>
          <code>{`z_lower = (${formatNumber(Math.min(state.lowerBound, state.upperBound), 0)} - ${formatNumber(state.mean, 0)}) / ${formatNumber(state.standardDeviation)}
        = ${formatNumber(model.value.zLower)}

z_upper = (${formatNumber(Math.max(state.lowerBound, state.upperBound), 0)} - ${formatNumber(state.mean, 0)}) / ${formatNumber(state.standardDeviation)}
        = ${formatNumber(model.value.zUpper)}

${model.value.intervalLabel} = ${model.value.probabilityLabel}`}</code>
        </pre>
        <p className="formula-note">{model.value.interpretation}</p>
        <p>
          A z-score is a location measured in standard deviations. The probability is the area under
          the standard normal curve over the matching region.
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Explain the area
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
      <h3>Use symmetry only after standardising</h3>
      <p>
        The normal curve is symmetric about the mean, so equal z-distances on opposite sides have
        equal tail areas. Intervals with different widths or different distances from the mean do
        not automatically have equal probabilities.
      </p>
      <p className="formula-note">
        Try the upper tail preset, then increase the standard deviation. The raw cutoff stays the
        same, but the z-score moves closer to the mean and the tail area grows.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another region
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
      <h3>Which normal area is larger?</h3>
      <p>
        Commit a prediction before the z-scores, curve, and probability area are revealed.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up normal model
      </button>
    </section>
  );
};

export const NormalDistributionSim = () => (
  <SimRuntime packageId={normalDistributionPackageId} spec={normalDistributionSpec}>
    <StageSurface />
  </SimRuntime>
);

export default NormalDistributionSim;
