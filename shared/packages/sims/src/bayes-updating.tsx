import { useMemo, useState } from "react";
import { Sankey } from "@paideia/charting";
import type { TPredictSpec, TSimulationSpec } from "@paideia/content-schema";
import { bayesPositiveEvidence } from "@paideia/probability-stats";
import { PredictionGate } from "@paideia/prediction-gate";
import { ok, probability, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export interface BayesState {
  readonly prevalencePercent: number;
  readonly sensitivityPercent: number;
  readonly specificityPercent: number;
}

export interface BayesEvidence {
  readonly prevalence: number;
  readonly sensitivity: number;
  readonly specificity: number;
  readonly falsePositiveRate: number;
  readonly truePositiveWeight: number;
  readonly falsePositiveWeight: number;
  readonly posterior: number;
}

export const bayesUpdatingPackageId = "shared/math/bayes-updating" as ConceptPackageId;
export const bayesUpdatingSimId = "bayes-updating";

export const bayesUpdatingPredict: TPredictSpec = {
  prompt: "With prior 10%, sensitivity 95%, and specificity 90%, what is P(H|+) approximately?",
  commit_format: {
    kind: "multiple-choice",
    options: ["9.5%", "34.5%", "51.4%", "90.0%"],
    correct_index: 2,
  },
  rationale_required: true,
};

export const bayesUpdatingSpec: TSimulationSpec = {
  id: bayesUpdatingSimId,
  title: "Bayes Updating Explorer",
  interaction_type: "decision-matrix",
  kernel_deps: [
    "core/probability-stats",
    "core/charting",
    "core/prediction-gate",
    "core/ui-sim",
    "core/shared",
  ],
  predict: bayesUpdatingPredict,
  manipulate: {
    controls: [
      {
        id: "prevalence-percent",
        label: "Prior probability P(H)",
        kind: "slider",
        kernel_binding: "state.prevalencePercent",
        bounds: { min: 1, max: 60, step: 1 },
      },
      {
        id: "sensitivity-percent",
        label: "Sensitivity P(+|H)",
        kind: "slider",
        kernel_binding: "state.sensitivityPercent",
        bounds: { min: 50, max: 99, step: 1 },
      },
      {
        id: "specificity-percent",
        label: "Specificity P(-|not H)",
        kind: "slider",
        kernel_binding: "state.specificityPercent",
        bounds: { min: 50, max: 99, step: 1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "posterior-readout",
        module: "@paideia/shared-sims/bayes-updating",
        symbol: "BayesUpdatingSim",
        props_binding: "state -> positive-evidence routes, posterior readout, and formula panel",
      },
    ],
  },
  explain: {
    prompt: "Which route contributes most to the positive results, and how can you tell?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "A positive test always means high probability",
      "Sensitivity alone determines posterior",
      "Confusing P(H|+) with P(+|H)",
    ],
  },
};

const defaults: BayesState = {
  prevalencePercent: 10,
  sensitivityPercent: 95,
  specificityPercent: 90,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const normalizeState = (state: Partial<BayesState>): BayesState => ({
  prevalencePercent: clamp(state.prevalencePercent ?? defaults.prevalencePercent, 1, 60),
  sensitivityPercent: clamp(state.sensitivityPercent ?? defaults.sensitivityPercent, 50, 99),
  specificityPercent: clamp(state.specificityPercent ?? defaults.specificityPercent, 50, 99),
});

const formatPercent = (probability: number): string => `${(probability * 100).toFixed(1)}%`;
const formatWeight = (weight: number): string => weight.toFixed(3);

export const bayesEvidence = (state: BayesState): KernelResult<BayesEvidence> => {
  const current = normalizeState(state);
  const prevalence = probability(current.prevalencePercent / 100);
  if (!prevalence.ok) return prevalence;
  const sensitivity = probability(current.sensitivityPercent / 100);
  if (!sensitivity.ok) return sensitivity;
  const specificity = probability(current.specificityPercent / 100);
  if (!specificity.ok) return specificity;

  const update = bayesPositiveEvidence({
    prior: prevalence.value,
    sensitivity: sensitivity.value,
    specificity: specificity.value,
  });
  if (!update.ok) return update;

  return ok({
    prevalence: Number(update.value.prior),
    sensitivity: Number(update.value.sensitivity),
    specificity: Number(update.value.specificity),
    falsePositiveRate: Number(update.value.falsePositiveRate),
    truePositiveWeight: update.value.truePositiveWeight,
    falsePositiveWeight: update.value.falsePositiveWeight,
    posterior: Number(update.value.posterior),
  });
};

const EvidenceRouteChart = ({ evidence }: { readonly evidence: BayesEvidence }) => (
  <section aria-label="Positive evidence route chart" className="bayes-route-chart">
    <Sankey
      links={[
        { source: "h", target: "true-positive", value: evidence.truePositiveWeight * 100 },
        { source: "not-h", target: "false-positive", value: evidence.falsePositiveWeight * 100 },
      ]}
      nodes={[
        { id: "h", label: "H before evidence" },
        { id: "not-h", label: "not H before evidence" },
        { id: "true-positive", label: "+ from H" },
        { id: "false-positive", label: "+ from not H" },
      ]}
    />
  </section>
);

const FormulaPanel = ({ evidence }: { readonly evidence: BayesEvidence }) => {
  const notPrevalence = 1 - evidence.prevalence;

  return (
    <section aria-label="Formula used" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Formula used</p>
      <h3>Normalize the positive evidence routes</h3>
      <pre aria-label="LaTeX formula" className="formula-code">
        <code>
          <span className="formula-var formula-var--blue">P(H | +)</span> = ({" "}
          <span className="formula-var formula-var--orange">P(+ | H)</span>{" "}
          <span className="formula-var formula-var--blue">P(H)</span> ) / ({" "}
          <span className="formula-var formula-var--orange">P(+ | H)</span>{" "}
          <span className="formula-var formula-var--blue">P(H)</span> +{" "}
          <span className="formula-var formula-var--green">P(+ | not H)</span>{" "}
          <span className="formula-var formula-var--purple">P(not H)</span> )
        </code>
      </pre>
      <dl aria-label="Formula legend" className="formula-legend">
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> P(H)
          </dt>
          <dd>prior probability of the hypothesis, {formatPercent(evidence.prevalence)}</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> P(+|H)
          </dt>
          <dd>sensitivity, {formatPercent(evidence.sensitivity)}</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> P(+|not H)
          </dt>
          <dd>false-positive rate, {formatPercent(evidence.falsePositiveRate)}</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> P(not H)
          </dt>
          <dd>complement of the prior, {formatPercent(notPrevalence)}</dd>
        </div>
      </dl>
      <p>
        Substitution: [{formatPercent(evidence.sensitivity)} x {formatPercent(evidence.prevalence)}
        ] / ([{formatPercent(evidence.sensitivity)} x {formatPercent(evidence.prevalence)}] + [
        {formatPercent(evidence.falsePositiveRate)} x {formatPercent(notPrevalence)}]) ={" "}
        {formatPercent(evidence.posterior)}.
      </p>
      <p>
        Result: P(H|+) = {formatPercent(evidence.posterior)}. The result is dimensionless; it is a
        probability after the positive evidence is known.
      </p>
      <p className="formula-note">
        This formula applies because a positive result can arrive through a true-positive route or a
        false-positive route, so the positive cases must be normalized against each other.
      </p>
    </section>
  );
};

const EvidenceReadout = ({ evidence }: { readonly evidence: BayesEvidence }) => (
  <section aria-label="Observation unlocked" className="vector-stage vector-stage--product">
    <p className="lab-kicker">Observe</p>
    <h2>Positive evidence reweights the prior</h2>
    <dl aria-label="Posterior readout" className="result-readout result-readout--cards">
      <div>
        <dt>Posterior after +</dt>
        <dd>{formatPercent(evidence.posterior)}</dd>
      </div>
      <div>
        <dt>True-positive weight</dt>
        <dd>{formatWeight(evidence.truePositiveWeight)}</dd>
      </div>
      <div>
        <dt>False-positive weight</dt>
        <dd>{formatWeight(evidence.falsePositiveWeight)}</dd>
      </div>
    </dl>
    <EvidenceRouteChart evidence={evidence} />
    <FormulaPanel evidence={evidence} />
  </section>
);

export const BayesUpdatingSim = () => {
  const [state, setState] = useState<BayesState>(defaults);
  const current = normalizeState(state);
  const evidence = useMemo(() => bayesEvidence(current), [current]);

  return (
    <PredictionGate
      packageId={bayesUpdatingPackageId}
      predict={bayesUpdatingPredict}
      simId={bayesUpdatingSimId}
    >
      <section aria-label="Bayes updating explorer" className="vector-lab vector-lab--product">
        <div aria-label="Bayes controls" className="vector-controls vector-controls--product">
          <p className="lab-kicker">Manipulate</p>
          <h2>Change the prior and test reliability</h2>
          <ControlGroup legend="Bayes scenario controls">
            <Slider
              label="Prior probability P(H)"
              max={60}
              min={1}
              onChange={(value) => setState((next) => ({ ...next, prevalencePercent: value }))}
              step={1}
              unit="%"
              value={current.prevalencePercent}
            />
            <Slider
              label="Sensitivity P(+|H)"
              max={99}
              min={50}
              onChange={(value) => setState((next) => ({ ...next, sensitivityPercent: value }))}
              step={1}
              unit="%"
              value={current.sensitivityPercent}
            />
            <Slider
              label="Specificity P(-|not H)"
              max={99}
              min={50}
              onChange={(value) => setState((next) => ({ ...next, specificityPercent: value }))}
              step={1}
              unit="%"
              value={current.specificityPercent}
            />
          </ControlGroup>
          <div aria-label="Scenario presets" className="preset-strip">
            <button onClick={() => setState(defaults)} type="button">
              screening test
            </button>
            <button
              onClick={() =>
                setState({
                  prevalencePercent: 30,
                  sensitivityPercent: 95,
                  specificityPercent: 90,
                })
              }
              type="button"
            >
              common condition
            </button>
          </div>
        </div>

        {evidence.ok ? (
          <EvidenceReadout evidence={evidence.value} />
        ) : (
          <section role="alert">The posterior cannot be computed for these settings.</section>
        )}
      </section>
    </PredictionGate>
  );
};

export default BayesUpdatingSim;
