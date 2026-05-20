import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { TSimulationSpec } from "@paideia/content-schema";
import { type ConceptPackageId, ok, type KernelResult } from "@paideia/shared";

type BayesState = {
  prevalencePercent: number;
  sensitivityPercent: number;
  specificityPercent: number;
};

type BayesEvidence = {
  prevalence: number;
  sensitivity: number;
  specificity: number;
  falsePositiveRate: number;
  posterior: number;
};

export const bayesUpdatingPackageId = "sutd/freshmore/bayes-updating" as ConceptPackageId;

export const bayesUpdatingSpec: TSimulationSpec = {
  id: "bayes-updating",
  title: "Bayes Updating Explorer",
  interaction_type: "decision-matrix",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate", "core/probability-stats"],
  manipulate: {
    controls: [
      { id: "prevalence-percent", label: "Prior prevalence P(H)", kind: "slider", kernel_binding: "state.prevalencePercent", bounds: { min: 1, max: 60, step: 1 } },
      { id: "sensitivity-percent", label: "Sensitivity P(+|H)", kind: "slider", kernel_binding: "state.sensitivityPercent", bounds: { min: 50, max: 99, step: 1 } },
      { id: "specificity-percent", label: "Specificity P(-|¬H)", kind: "slider", kernel_binding: "state.specificityPercent", bounds: { min: 50, max: 99, step: 1 } },
    ],
  },
  predict: {
    prompt: "With prior 10%, sensitivity 95%, and specificity 90%, what is P(H|+) approximately?",
    commit_format: { kind: "multiple-choice", options: ["9.5%", "34.5%", "51.3%", "90.0%"] },
    rationale_required: true,
  },
  observe: { renderers: [{ id: "posterior-readout", module: "local", symbol: "bayes-posterior", props_binding: "Show Bayes formula with substituted values and posterior interpretation." }] },
  explain: {
    prompt: "Explain why a low prior can keep posterior moderate even when sensitivity is high.",
    socratic: true,
    expected_misconceptions_surfaced: ["A positive test always implies high probability.", "Sensitivity alone determines posterior."],
  },
};

const defaults: BayesState = { prevalencePercent: 10, sensitivityPercent: 95, specificityPercent: 90 };
const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const currentState = (state: Partial<BayesState>): BayesState => ({
  prevalencePercent: clamp(state.prevalencePercent ?? defaults.prevalencePercent, 1, 60),
  sensitivityPercent: clamp(state.sensitivityPercent ?? defaults.sensitivityPercent, 50, 99),
  specificityPercent: clamp(state.specificityPercent ?? defaults.specificityPercent, 50, 99),
});

const fmtPct = (p: number): string => `${(p * 100).toFixed(1)}%`;

export const bayesEvidence = (state: BayesState): KernelResult<BayesEvidence> => {
  const prevalence = state.prevalencePercent / 100;
  const sensitivity = state.sensitivityPercent / 100;
  const specificity = state.specificityPercent / 100;
  const falsePositiveRate = 1 - specificity;
  const numerator = sensitivity * prevalence;
  const denominator = numerator + falsePositiveRate * (1 - prevalence);
  const posterior = denominator === 0 ? 0 : numerator / denominator;
  return ok({ prevalence, sensitivity, specificity, falsePositiveRate, posterior });
};

const Control = ({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void; }) => (
  <label>
    <span>{label}: {value}%</span>
    <input aria-label={label} min={min} max={max} step={step} type="range" value={value} onChange={(e) => onChange(Number(e.currentTarget.value))} />
  </label>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<BayesState>();
  const s = currentState(state);
  return (
    <section role="region" aria-label="Bayes controls">
      <p>Adjust prior prevalence and test quality, then reveal posterior after a positive test.</p>
      <Control label="Prior prevalence P(H)" min={1} max={60} step={1} value={s.prevalencePercent} onChange={(v) => set("prevalencePercent", v)} />
      <Control label="Sensitivity P(+|H)" min={50} max={99} step={1} value={s.sensitivityPercent} onChange={(v) => set("sensitivityPercent", v)} />
      <Control label="Specificity P(-|¬H)" min={50} max={99} step={1} value={s.specificityPercent} onChange={(v) => set("specificityPercent", v)} />
      <button type="button" onClick={() => stage.advance()}>Reveal posterior</button>
    </section>
  );
};

const ObserveStage = () => {
  const state = useSimState<BayesState>();
  const s = currentState(state);
  const e = bayesEvidence(s);
  if (!e.ok) return <section role="region" aria-label="Observation unlocked"><p>Unable to compute posterior.</p></section>;
  const { prevalence, sensitivity, falsePositiveRate, posterior } = e.value;
  return (
    <section role="region" aria-label="Observation unlocked">
      <h2>Bayes updating evidence</h2>
      <p>Posterior probability after positive evidence: <strong>{fmtPct(posterior)}</strong>.</p>
      <p>
        Formula used: P(H|+) = [P(+|H) × P(H)] / [[P(+|H) × P(H)] + [P(+|¬H) × P(¬H)]].
      </p>
      <p>
        Substitution: [{fmtPct(sensitivity)} × {fmtPct(prevalence)}] / ([{fmtPct(sensitivity)} × {fmtPct(prevalence)}] + [{fmtPct(falsePositiveRate)} × {fmtPct(1 - prevalence)}]) = {fmtPct(posterior)}.
      </p>
      <p>Interpretation: even strong tests can yield moderate posterior when prior prevalence is low.</p>
    </section>
  );
};

const BayesUpdatingSim = () => (
  <SimRuntime packageId={bayesUpdatingPackageId} spec={bayesUpdatingSpec}>
    <div>
      <h1>Bayes Updating Explorer</h1>
      <p>Predict → manipulate priors/test quality → observe posterior → explain base-rate effects.</p>
      <ManipulateStage />
      <ObserveStage />
    </div>
  </SimRuntime>
);

export default BayesUpdatingSim;
