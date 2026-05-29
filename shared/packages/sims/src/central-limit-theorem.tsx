import { useMemo, useState, type CSSProperties } from "react";
import { Histogram } from "@paideia/charting";
import type { TPredictSpec } from "@paideia/content-schema";
import {
  normalizeDistribution,
  samplingDistributionOfMean,
  type DiscreteDistribution,
  type WeightedOutcome,
} from "@paideia/probability-stats";
import { err, ok, type KernelResult } from "@paideia/shared";
import { PredictionGate } from "@paideia/prediction-gate";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";

export const centralLimitTheoremPackageId = "central-limit-theorem";
export const centralLimitTheoremSimId = "clt-sampler";

export const cltPredict: TPredictSpec = {
  prompt:
    "A population is strongly right-skewed. If you repeatedly take larger samples and plot their means, what should happen to the shape and spread of those sample means?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "The sample means will keep the same skew and the same spread as the population.",
      "The sample means will be more bell-shaped and less spread out.",
      "The original population will become bell-shaped.",
      "Only the largest observations will remain in the sample means.",
    ],
    correct_index: 1,
  },
  rationale_required: true,
};

export type PopulationKind = "right-skewed" | "uniform" | "two-cluster";

export interface CltSamplerState {
  readonly population: PopulationKind;
  readonly sampleSize: number;
  readonly sampleCount: number;
  readonly seed: number;
}

export interface CltSamplerModel {
  readonly populationLabel: string;
  readonly distribution: DiscreteDistribution;
  readonly populationMean: number;
  readonly populationVariance: number;
  readonly populationStandardDeviation: number;
  readonly standardError: number;
  readonly sampleMeans: readonly number[];
  readonly sampleMeanAverage: number;
  readonly sampleMeanSpread: number;
  readonly histogramBins: number;
  readonly normalApproximationReady: boolean;
  readonly interpretation: string;
}

const populations: Record<
  PopulationKind,
  {
    readonly label: string;
    readonly outcomes: readonly WeightedOutcome<string>[];
    readonly interpretation: string;
  }
> = {
  "right-skewed": {
    label: "Right-skewed points",
    outcomes: [
      { id: "zero", value: 0, weight: 10 },
      { id: "two", value: 2, weight: 4 },
      { id: "eight", value: 8, weight: 1 },
      { id: "twelve", value: 12, weight: 1 },
    ],
    interpretation:
      "The population is lopsided, but the averages become steadier because high values are diluted across each sample.",
  },
  uniform: {
    label: "Flat spinner",
    outcomes: [
      { id: "one", value: 1, weight: 1 },
      { id: "three", value: 3, weight: 1 },
      { id: "five", value: 5, weight: 1 },
      { id: "seven", value: 7, weight: 1 },
      { id: "nine", value: 9, weight: 1 },
    ],
    interpretation:
      "The population is already balanced, so the sample means quickly cluster around the centre.",
  },
  "two-cluster": {
    label: "Two-cluster scores",
    outcomes: [
      { id: "low-a", value: 1, weight: 3 },
      { id: "low-b", value: 2, weight: 3 },
      { id: "high-a", value: 9, weight: 3 },
      { id: "high-b", value: 10, weight: 3 },
    ],
    interpretation:
      "The population has two piles, yet averages mix low and high values into a single central pile.",
  },
};

const initialState: CltSamplerState = {
  population: "right-skewed",
  sampleSize: 4,
  sampleCount: 160,
  seed: 17,
};

const populationOptions: readonly { readonly value: PopulationKind; readonly label: string }[] = [
  { value: "right-skewed", label: "Right-skewed points" },
  { value: "uniform", label: "Flat spinner" },
  { value: "two-cluster", label: "Two-cluster scores" },
];

const styles = {
  swatchBlue: { background: "#1f5f8b" },
  swatchPurple: { background: "#6941c6" },
  swatchGreen: { background: "#027a48" },
  swatchAmber: { background: "#b54708" },
  chartGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  },
  miniBars: {
    alignItems: "end",
    display: "grid",
    gap: "0.25rem",
    gridTemplateColumns: "repeat(4, minmax(32px, 1fr))",
    minHeight: "180px",
  },
  miniBar: {
    background: "#1f5f8b",
    borderRadius: "6px 6px 0 0",
    color: "#ffffff",
    display: "grid",
    fontWeight: 800,
    minHeight: "28px",
    padding: "0.25rem",
    placeItems: "end center",
  },
} satisfies Record<string, CSSProperties>;

const formatHundredths = (value: number): string => value.toFixed(2);

const makeRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
};

const randomThresholdSamples = (
  sampleSize: number,
  sampleCount: number,
  seed: number,
): readonly (readonly number[])[] => {
  const samples: number[][] = [];

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const random = makeRandom(seed + sampleIndex * 7919);
    const thresholds: number[] = [];
    for (let drawIndex = 0; drawIndex < sampleSize; drawIndex += 1) {
      thresholds.push(random());
    }
    samples.push(thresholds);
  }

  return samples;
};

export const cltSamplerModel = (state: CltSamplerState): KernelResult<CltSamplerModel> => {
  if (!Number.isInteger(state.sampleSize) || state.sampleSize <= 0) {
    return err("precondition-violated", `Invalid sampleSize: ${state.sampleSize}`);
  }
  if (!Number.isInteger(state.sampleCount) || state.sampleCount <= 0) {
    return err("precondition-violated", `Invalid sampleCount: ${state.sampleCount}`);
  }
  if (!Number.isFinite(state.seed)) {
    return err("precondition-violated", `Invalid seed: ${state.seed}`);
  }

  const population = populations[state.population];
  if (population === undefined) {
    return err("precondition-violated", `Unknown population: ${state.population}`);
  }

  const distribution = normalizeDistribution(population.outcomes);
  if (!distribution.ok) return distribution;

  const sampling = samplingDistributionOfMean({
    distribution: distribution.value,
    thresholdSamples: randomThresholdSamples(state.sampleSize, state.sampleCount, state.seed),
    histogramBinCount: 8,
  });
  if (!sampling.ok) return sampling;

  return ok({
    populationLabel: population.label,
    distribution: distribution.value,
    populationMean: sampling.value.populationMean,
    populationVariance: sampling.value.populationVariance,
    populationStandardDeviation: sampling.value.populationStandardDeviation,
    standardError: sampling.value.standardError,
    sampleMeans: sampling.value.sampleMeans,
    sampleMeanAverage: sampling.value.sampleMeanSummary.mean,
    sampleMeanSpread: sampling.value.sampleMeanSummary.standardDeviation,
    histogramBins: sampling.value.histogram.length,
    normalApproximationReady: state.sampleSize >= 30 || state.population === "uniform",
    interpretation: population.interpretation,
  });
};

const PopulationBars = ({ model }: { readonly model: CltSamplerModel }) => {
  const maxProbability = Math.max(...model.distribution.map((outcome) => Number(outcome.probability)));

  return (
    <figure aria-label="Population distribution" style={{ margin: 0 }}>
      <div style={styles.miniBars}>
        {model.distribution.map((outcome) => {
          const probability = Number(outcome.probability);
          return (
            <div
              key={outcome.id}
              style={{
                ...styles.miniBar,
                height: `${Math.max(18, (probability / maxProbability) * 160)}px`,
              }}
            >
              <span>{outcome.value}</span>
              <small>{Math.round(probability * 100)}%</small>
            </div>
          );
        })}
      </div>
      <figcaption>{model.populationLabel}</figcaption>
    </figure>
  );
};

const FormulaPanel = ({
  model,
  sampleSize,
}: {
  readonly model: CltSamplerModel;
  readonly sampleSize: number;
}) => (
  <section className="formula-panel formula-panel--product" aria-label="Formula used">
    <p className="lab-kicker">Formula used</p>
    <h3>Sampling distribution of the mean</h3>
    <p>
      In words: the sample means stay centred on the population mean, and their
      spread is the population spread divided by the square root of the sample size.
    </p>
    <pre aria-label="LaTeX formula" className="formula-code">
      <code>{`\\mu_{\\bar X} = \\mu
\\qquad
\\sigma_{\\bar X} = \\frac{\\sigma}{\\sqrt{n}}`}</code>
    </pre>
    <p className="lab-kicker">Legend</p>
    <dl aria-label="Formula legend" className="formula-legend">
      <div>
        <dt>
          <span aria-hidden="true" className="legend-swatch" style={styles.swatchBlue} /> mu
        </dt>
        <dd>population mean and centre of the sample means, in score units</dd>
      </div>
      <div>
        <dt>
          <span aria-hidden="true" className="legend-swatch" style={styles.swatchPurple} /> sigma-bar
        </dt>
        <dd>standard error of the sample mean, in score units</dd>
      </div>
      <div>
        <dt>
          <span aria-hidden="true" className="legend-swatch" style={styles.swatchGreen} /> sigma
        </dt>
        <dd>population standard deviation, in score units</dd>
      </div>
      <div>
        <dt>
          <span aria-hidden="true" className="legend-swatch" style={styles.swatchAmber} /> n
        </dt>
        <dd>number of observations in each sample</dd>
      </div>
    </dl>
    <p>Units: means, standard deviations, and standard errors are measured in score units.</p>
    <p>
      Substitution: sigma-bar = {formatHundredths(model.populationStandardDeviation)} score units /
      sqrt({sampleSize}) = {formatHundredths(model.standardError)} score units.
    </p>
    <p>
      Result: sample means stay centred near {formatHundredths(model.populationMean)} score units
      while their spread shrinks as n grows.
    </p>
    <p className="formula-note">
      This formula applies because each sample mean averages n independent draws from the same
      population, so averaging preserves the centre and divides the standard deviation by sqrt(n).
    </p>
  </section>
);

export const CentralLimitTheoremSim = () => {
  const [state, setState] = useState<CltSamplerState>(initialState);
  const model = useMemo(() => cltSamplerModel(state), [state]);

  return (
    <PredictionGate
      packageId={centralLimitTheoremPackageId}
      predict={cltPredict}
      simId={centralLimitTheoremSimId}
    >
      <section aria-label="Central limit theorem sampler" className="vector-lab vector-lab--product">
        <div className="vector-controls vector-controls--product" aria-label="Sampler controls">
          <p className="lab-kicker">Tune the sampler</p>
          <ControlGroup legend="Sampling controls">
            <Selector
              label="Population shape"
              onChange={(value) => setState((current) => ({ ...current, population: value }))}
              options={populationOptions}
              value={state.population}
            />
            <Slider
              label="Sample size"
              max={64}
              min={2}
              onChange={(value) => setState((current) => ({ ...current, sampleSize: value }))}
              step={1}
              unit="draws"
              value={state.sampleSize}
            />
            <Slider
              label="Number of samples"
              max={320}
              min={80}
              onChange={(value) => setState((current) => ({ ...current, sampleCount: value }))}
              step={20}
              unit="samples"
              value={state.sampleCount}
            />
          </ControlGroup>
          <div className="preset-strip" aria-label="Sample size presets">
            {[4, 16, 64].map((sampleSize) => (
              <button
                key={sampleSize}
                onClick={() => setState((current) => ({ ...current, sampleSize }))}
                type="button"
              >
                n = {sampleSize}
              </button>
            ))}
          </div>
        </div>

        {model.ok ? (
          <section aria-label="Observation unlocked" className="vector-stage vector-stage--product">
            <section aria-label="CLT visual comparison" style={styles.chartGrid}>
              <PopulationBars model={model.value} />
              <figure aria-label="Sample mean histogram" style={{ margin: 0 }}>
                <Histogram bins={8} density samples={model.value.sampleMeans} />
                <figcaption>Sample means from {state.sampleCount} repeated samples</figcaption>
              </figure>
            </section>
            <dl aria-label="CLT readout" className="result-readout result-readout--cards">
              <div>
                <dt>Population mean</dt>
                <dd>{formatHundredths(model.value.populationMean)}</dd>
              </div>
              <div>
                <dt>Standard error</dt>
                <dd>{formatHundredths(model.value.standardError)}</dd>
              </div>
              <div>
                <dt>Sample-mean spread</dt>
                <dd>{formatHundredths(model.value.sampleMeanSpread)}</dd>
              </div>
              <div>
                <dt>Normal approximation</dt>
                <dd>{model.value.normalApproximationReady ? "reasonable" : "emerging"}</dd>
              </div>
            </dl>
            <p>{model.value.interpretation}</p>
            <FormulaPanel model={model.value} sampleSize={state.sampleSize} />
          </section>
        ) : (
          <p role="alert">The sampler cannot evaluate the current settings.</p>
        )}
      </section>
    </PredictionGate>
  );
};

export default CentralLimitTheoremSim;
