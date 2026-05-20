import { normalizeDistribution } from "@paideia/probability-stats";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { TSimulationSpec } from "@paideia/content-schema";
import { type ConceptPackageId, err, ok, type KernelResult } from "@paideia/shared";

type BayesState = {
  readonly prevalencePercent: number;
  readonly sensitivityPercent: number;
  readonly specificityPercent: number;
};

type BayesEvidence = {
  readonly prevalence: number;
  readonly sensitivity: number;
  readonly specificity: number;
  readonly falsePositiveRate: number;
  readonly truePositiveWeight: number;
  readonly falsePositiveWeight: number;
  readonly posterior: number;
};

export const bayesUpdatingPackageId = "sutd/freshmore/bayes-updating" as ConceptPackageId;

export const bayesUpdatingSpec: TSimulationSpec = {
  id: "bayes-updating",
  title: "Bayes Updating Explorer",
  interaction_type: "decision-matrix",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate", "core/probability-stats"],
  manipulate: {
    controls: [
      {
        id: "prevalence-percent",
        label: "Prior prevalence P(H)",
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
  predict: {
    prompt: "With prior 10%, sensitivity 95%, and specificity 90%, what is P(H|+) approximately?",
    commit_format: {
      kind: "multiple-choice",
      options: ["9.5%", "34.5%", "51.4%", "90.0%"],
      correct_index: 2,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "posterior-readout",
        module: "@paideia/sutd-sims/bayes-updating",
        symbol: "BayesUpdating",
        props_binding: "Show Bayes formula with substituted values and posterior interpretation.",
      },
    ],
  },
  explain: {
    prompt: "Explain why a low prior can keep posterior moderate even when sensitivity is high.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "A positive test always implies high probability.",
      "Sensitivity alone determines posterior.",
    ],
  },
};

const defaults: BayesState = {
  prevalencePercent: 10,
  sensitivityPercent: 95,
  specificityPercent: 90,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<BayesState>): BayesState => ({
  prevalencePercent: clamp(state.prevalencePercent ?? defaults.prevalencePercent, 1, 60),
  sensitivityPercent: clamp(state.sensitivityPercent ?? defaults.sensitivityPercent, 50, 99),
  specificityPercent: clamp(state.specificityPercent ?? defaults.specificityPercent, 50, 99),
});

const fmtPct = (probability: number): string => `${(probability * 100).toFixed(1)}%`;

export const bayesEvidence = (state: BayesState): KernelResult<BayesEvidence> => {
  const prevalence = state.prevalencePercent / 100;
  const sensitivity = state.sensitivityPercent / 100;
  const specificity = state.specificityPercent / 100;
  const falsePositiveRate = 1 - specificity;
  const truePositiveWeight = sensitivity * prevalence;
  const falsePositiveWeight = falsePositiveRate * (1 - prevalence);

  const distribution = normalizeDistribution([
    { id: "true-positive", weight: truePositiveWeight, value: 1 },
    { id: "false-positive", weight: falsePositiveWeight, value: 0 },
  ]);
  if (!distribution.ok) return distribution;

  const truePositiveOutcome = distribution.value.find((outcome) => outcome.id === "true-positive");
  if (truePositiveOutcome === undefined) {
    return err("precondition-violated", "Posterior distribution is missing true-positive outcome.");
  }

  return ok({
    prevalence,
    sensitivity,
    specificity,
    falsePositiveRate,
    truePositiveWeight,
    falsePositiveWeight,
    posterior: truePositiveOutcome.probability,
  });
};

const Control = ({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  readonly label: string;
  readonly max: number;
  readonly min: number;
  readonly onChange: (value: number) => void;
  readonly step: number;
  readonly value: number;
}) => (
  <label className="sutd-control">
    <span>
      {label}: <strong>{value}%</strong>
    </span>
    <input
      aria-label={label}
      max={max}
      min={min}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
      step={step}
      type="range"
      value={value}
    />
  </label>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<BayesState>();
  const current = currentState(state);

  return (
    <section aria-label="Bayes controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Change the prior and test reliability</h2>
        <Control
          label="Prior prevalence P(H)"
          max={60}
          min={1}
          onChange={(value) => set("prevalencePercent", value)}
          step={1}
          value={current.prevalencePercent}
        />
        <Control
          label="Sensitivity P(+|H)"
          max={99}
          min={50}
          onChange={(value) => set("sensitivityPercent", value)}
          step={1}
          value={current.sensitivityPercent}
        />
        <Control
          label="Specificity P(-|not H)"
          max={99}
          min={50}
          onChange={(value) => set("specificityPercent", value)}
          step={1}
          value={current.specificityPercent}
        />
        <button type="button" onClick={() => stage.advance()}>
          Reveal posterior
        </button>
      </div>
      <section className="sutd-formula-card" aria-label="Before reveal cue">
        <p className="meta-line">Before reveal</p>
        <h3>The base rate still matters</h3>
        <p>
          Sensitivity tells how often the test catches true cases. Bayes updating also counts how
          many true cases were plausible before seeing the positive result.
        </p>
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const state = currentState(useSimState<Partial<BayesState>>());
  const evidence = bayesEvidence(state);
  if (!evidence.ok) {
    return (
      <section role="region" aria-label="Observation unlocked">
        <p role="alert">Unable to compute posterior.</p>
      </section>
    );
  }
  const { falsePositiveRate, posterior, prevalence, sensitivity } = evidence.value;
  const notPrevalence = 1 - prevalence;

  return (
    <section role="region" aria-label="Observation unlocked" className="sutd-sim-panel">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Bayes updating evidence</h2>
        <dl className="sutd-result-grid" aria-label="Posterior readout">
          <div>
            <dt>Posterior after +</dt>
            <dd>{fmtPct(posterior)}</dd>
          </div>
          <div>
            <dt>True-positive weight</dt>
            <dd>{evidence.value.truePositiveWeight.toFixed(3)}</dd>
          </div>
          <div>
            <dt>False-positive weight</dt>
            <dd>{evidence.value.falsePositiveWeight.toFixed(3)}</dd>
          </div>
        </dl>
      </div>
      <section className="sutd-formula-card" aria-label="Formula used">
        <p className="meta-line">Formula used</p>
        <h3>Normalize the positive-test cases</h3>
        <pre className="formula-code" aria-label="LaTeX formula source">
          <code>{String.raw`P(H \mid +) =
\frac{P(+ \mid H)P(H)}
{P(+ \mid H)P(H) + P(+ \mid \neg H)P(\neg H)}`}</code>
        </pre>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt><span className="legend-swatch legend-swatch--blue" /> P(H)</dt>
            <dd>prior prevalence, {fmtPct(prevalence)}</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--orange" /> P(+|H)</dt>
            <dd>sensitivity, {fmtPct(sensitivity)}</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--green" /> P(+|not H)</dt>
            <dd>false-positive rate, {fmtPct(falsePositiveRate)}</dd>
          </div>
        </dl>
        <p>
          Substitution: [{fmtPct(sensitivity)} x {fmtPct(prevalence)}] / ([{fmtPct(sensitivity)} x{" "}
          {fmtPct(prevalence)}] + [{fmtPct(falsePositiveRate)} x {fmtPct(notPrevalence)}]) ={" "}
          {fmtPct(posterior)}.
        </p>
        <p>
          Result: P(H|+) = {fmtPct(posterior)}. The value is dimensionless; percentages make the
          probability easier to compare.
        </p>
        <p className="formula-note">
          This applies because a positive result can come from a true case or a false positive. Bayes
          updating normalizes those two routes after the evidence is known.
        </p>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" className="sutd-formula-card">
      <p className="meta-line">Transfer</p>
      <h2>Transfer the base-rate reasoning</h2>
      <p>
        A rare-fault sensor gives a positive result. Explain why the posterior can remain moderate
        even when the sensor is sensitive, then name the value that would increase if the fault
        became more common.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another prior
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
    <section aria-label="Prediction setup" className="sutd-formula-card">
      <p className="meta-line">Predict first</p>
      <h1>Bayes Updating Explorer</h1>
      <p>
        Predict the posterior before the calculation is revealed. Then adjust the prior prevalence,
        sensitivity, and specificity to see how the positive-test probability changes.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up Bayes scenario
      </button>
    </section>
  );
};

const BayesUpdatingSim = () => (
  <SimRuntime packageId={bayesUpdatingPackageId} spec={bayesUpdatingSpec}>
    <StageSurface />
  </SimRuntime>
);

export default BayesUpdatingSim;
