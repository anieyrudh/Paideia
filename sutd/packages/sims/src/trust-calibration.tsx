import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { TSimulationSpec } from "@paideia/content-schema";
import { expectedValue, normalizeDistribution } from "@paideia/probability-stats";
import { ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";

type TrustState = {
  thresholdPercent: number;
  falseNegativeCost: number;
  reviewCost: number;
};

type TriageCase = {
  id: string;
  confidence: number;
  action: "auto-clear" | "escalate";
};

type TrustEvidence = {
  threshold: number;
  acceptedCount: number;
  reviewedCount: number;
  meanAcceptedErrorRisk: number;
  automationCost: number;
  reviewCost: number;
  totalCost: number;
};

const cases: readonly TriageCase[] = [
  { id: "A", confidence: 0.92, action: "auto-clear" },
  { id: "B", confidence: 0.86, action: "auto-clear" },
  { id: "C", confidence: 0.81, action: "escalate" },
  { id: "D", confidence: 0.74, action: "auto-clear" },
  { id: "E", confidence: 0.68, action: "escalate" },
  { id: "F", confidence: 0.61, action: "auto-clear" },
  { id: "G", confidence: 0.57, action: "escalate" },
  { id: "H", confidence: 0.48, action: "auto-clear" },
];

export const trustCalibrationPackageId = "sutd/dai/trust-calibration" as ConceptPackageId;

export const trustCalibrationSpec: TSimulationSpec = {
  id: "trust-calibration",
  title: "Trust Calibration Explorer",
  interaction_type: "decision-matrix",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate", "core/probability-stats"],
  manipulate: {
    controls: [
      {
        id: "threshold-percent",
        label: "Automation confidence threshold",
        kind: "slider",
        kernel_binding: "state.thresholdPercent",
        bounds: { min: 50, max: 90, step: 5 },
      },
      {
        id: "false-negative-cost",
        label: "Cost of an automated wrong decision",
        kind: "slider",
        kernel_binding: "state.falseNegativeCost",
        bounds: { min: 5, max: 40, step: 5 },
      },
      {
        id: "review-cost",
        label: "Cost of human review",
        kind: "slider",
        kernel_binding: "state.reviewCost",
        bounds: { min: 1, max: 8, step: 1 },
      },
    ],
  },
  predict: {
    prompt:
      "Which automation threshold will most likely reduce total decision cost when wrong automated decisions are expensive?",
    commit_format: {
      kind: "multiple-choice",
      options: ["50% threshold", "70% threshold", "85% threshold"],
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "trust-cost-readout",
        module: "local",
        symbol: "cost-summary",
        props_binding:
          "Show accepted coverage, mean accepted error risk, review count, and total expected cost.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why a policy with lower automation coverage can still be better when the wrong-decision cost is high.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Confidence equals correctness.",
      "Accuracy is the only metric.",
    ],
  },
};

const defaultState: TrustState = {
  thresholdPercent: 70,
  falseNegativeCost: 20,
  reviewCost: 3,
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const currentState = (state: Partial<TrustState>): TrustState => ({
  thresholdPercent: clamp(state.thresholdPercent ?? defaultState.thresholdPercent, 50, 90),
  falseNegativeCost: clamp(state.falseNegativeCost ?? defaultState.falseNegativeCost, 5, 40),
  reviewCost: clamp(state.reviewCost ?? defaultState.reviewCost, 1, 8),
});

const format = (value: number, places = 2): string => value.toFixed(places);

export const trustCalibrationEvidence = (state: TrustState): KernelResult<TrustEvidence> => {
  const threshold = state.thresholdPercent / 100;
  const accepted = cases.filter((entry) => entry.confidence >= threshold);
  const reviewedCount = cases.length - accepted.length;
  const riskDistribution = normalizeDistribution(
    accepted.map((entry) => ({
      id: entry.id,
      weight: 1,
      value: 1 - entry.confidence,
    })),
  );
  const meanRisk =
    accepted.length === 0
      ? ok(0)
      : riskDistribution.ok
        ? expectedValue(riskDistribution.value)
        : riskDistribution;
  if (!meanRisk.ok) return meanRisk;

  const automationCost = accepted.reduce(
    (total, entry) => total + (1 - entry.confidence) * state.falseNegativeCost,
    0,
  );
  const humanReviewCost = reviewedCount * state.reviewCost;

  return ok({
    threshold,
    acceptedCount: accepted.length,
    reviewedCount,
    meanAcceptedErrorRisk: meanRisk.value,
    automationCost,
    reviewCost: humanReviewCost,
    totalCost: automationCost + humanReviewCost,
  });
};

const RangeControl = ({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) => (
  <label>
    <span>{label}: {value}</span>
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
  const { state, set } = useManipulate<TrustState>();
  const current = currentState(state);

  return (
    <section aria-label="Trust policy controls" role="region">
      <p>
        Choose when the system may act on its own. Lower thresholds automate more cases, but
        expose you to more wrong-decision risk.
      </p>
      <RangeControl
        label="Automation confidence threshold"
        max={90}
        min={50}
        onChange={(value) => set("thresholdPercent", value)}
        step={5}
        value={current.thresholdPercent}
      />
      <RangeControl
        label="Cost of an automated wrong decision"
        max={40}
        min={5}
        onChange={(value) => set("falseNegativeCost", value)}
        step={5}
        value={current.falseNegativeCost}
      />
      <RangeControl
        label="Cost of human review"
        max={8}
        min={1}
        onChange={(value) => set("reviewCost", value)}
        step={1}
        value={current.reviewCost}
      />
      <button type="button" onClick={() => stage.advance()}>
        Reveal policy cost
      </button>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<TrustState>>());
  const evidence = trustCalibrationEvidence(state);

  if (!evidence.ok) {
    return <p role="alert">This policy could not be evaluated.</p>;
  }

  return (
    <section aria-label="Observation unlocked" role="region">
      <h2>Trust calibration evidence</h2>
      <p>
        Threshold {format(evidence.value.threshold * 100, 0)}% accepts{" "}
        {evidence.value.acceptedCount} cases and sends {evidence.value.reviewedCount} cases to
        human review.
      </p>
      <p>
        Mean error risk among accepted cases = {format(evidence.value.meanAcceptedErrorRisk * 100, 1)}%.
      </p>
      <p>
        Formula used: total cost = Σ(1 - confidence) × wrong-decision cost + reviewed cases ×
        review cost.
      </p>
      <p>
        Automation cost = {format(evidence.value.automationCost)}; review cost ={" "}
        {format(evidence.value.reviewCost)}; total expected cost = {format(evidence.value.totalCost)}.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Explain trust tradeoff
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" role="region">
      <p>
        Transfer: in clinic triage, false negatives can be much more costly than false positives.
        Pick a threshold, compute the same total-cost formula, and justify when a human override
        is worth the review cost.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another policy
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
    <section aria-label="Prediction setup" role="region">
      <p>
        First predict which threshold should be trusted. Then reveal the cost calculation behind
        the policy.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Choose trust policy
      </button>
    </section>
  );
};

export default function TrustCalibration() {
  return (
    <SimRuntime spec={trustCalibrationSpec} packageId={trustCalibrationPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
