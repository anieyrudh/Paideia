import { AnnotatableText } from "@paideia/annotation";
import type { Annotation, TagDef } from "@paideia/annotation";
import { LineChart } from "@paideia/charting";
import { isRevealed } from "@paideia/prediction-gate";
import {
  thresholdClassificationEvidence,
  type ThresholdClassificationEvidence,
  type ThresholdClassifierCase,
} from "@paideia/probability-stats";
import { err, ok, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type GroupId = "group-a" | "group-b";

type FairnessAuditState = {
  readonly globalThresholdPercent: number;
  readonly groupBAdjustmentPercent: number;
  readonly falseNegativeCost: number;
  readonly falsePositiveCost: number;
};

type GroupCases = {
  readonly id: GroupId;
  readonly label: string;
  readonly cases: readonly ThresholdClassifierCase[];
};

type GroupAudit = {
  readonly id: GroupId;
  readonly label: string;
  readonly thresholdPercent: number;
  readonly evidence: ThresholdClassificationEvidence;
};

export type FairnessAuditEvidence = {
  readonly groupA: GroupAudit;
  readonly groupB: GroupAudit;
  readonly recallGap: number;
  readonly accuracyGap: number;
  readonly costGap: number;
  readonly totalCost: number;
  readonly auditFlag: "review-required" | "monitor";
};

type Preset = {
  readonly id: string;
  readonly label: string;
  readonly state: FairnessAuditState;
};

export const fairnessThresholdAuditPackageId =
  "sutd/dai/fairness-threshold-audit" as Parameters<typeof SimRuntime>[0]["packageId"];

export const fairnessThresholdAuditSpec = {
  id: "fairness-threshold-audit",
  title: "Fairness Threshold Audit Lab",
  interaction_type: "decision-matrix",
  kernel_deps: [
    "core/sim-runtime",
    "core/probability-stats",
    "core/charting",
    "core/annotation",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "global-threshold-percent",
        label: "Global threshold",
        kind: "slider",
        kernel_binding: "state.globalThresholdPercent",
        bounds: { min: 40, max: 85, step: 5 },
      },
      {
        id: "group-b-adjustment-percent",
        label: "Group B threshold adjustment",
        kind: "slider",
        kernel_binding: "state.groupBAdjustmentPercent",
        bounds: { min: -15, max: 15, step: 5 },
      },
      {
        id: "false-negative-cost",
        label: "False-negative cost",
        kind: "slider",
        kernel_binding: "state.falseNegativeCost",
        bounds: { min: 10, max: 45, step: 5 },
      },
      {
        id: "false-positive-cost",
        label: "False-positive cost",
        kind: "slider",
        kernel_binding: "state.falsePositiveCost",
        bounds: { min: 2, max: 18, step: 2 },
      },
    ],
  },
  predict: {
    prompt:
      "Two student groups receive the same risk-score model. If both groups use one 70% threshold, which audit result is most plausible?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Equal overall accuracy means the threshold is fair enough",
        "The group with lower recall can carry more missed-support harm",
        "A lower threshold always makes every group better off",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "fairness-threshold-audit-renderer",
        module: "@paideia/sutd-sims/fairness-threshold-audit",
        symbol: "FairnessThresholdAudit",
        props_binding:
          "Compare group confusion matrices, recall gap, weighted stakeholder cost, charted threshold curves, and annotated harm claims.",
      },
    ],
  },
  explain: {
    prompt:
      "Which threshold policy would you defend to the affected students, and which metric stops the audit from relying on accuracy alone?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Equal accuracy means equal impact",
      "One global threshold is always fairest",
    ],
  },
} satisfies Parameters<typeof SimRuntime>[0]["spec"];

const groupCases: readonly GroupCases[] = [
  {
    id: "group-a",
    label: "Group A",
    cases: [
      { id: "A1", score: 0.92, actual: "actual-positive" },
      { id: "A2", score: 0.86, actual: "actual-positive" },
      { id: "A3", score: 0.81, actual: "actual-negative" },
      { id: "A4", score: 0.77, actual: "actual-positive" },
      { id: "A5", score: 0.71, actual: "actual-negative" },
      { id: "A6", score: 0.64, actual: "actual-positive" },
      { id: "A7", score: 0.58, actual: "actual-negative" },
      { id: "A8", score: 0.52, actual: "actual-positive" },
      { id: "A9", score: 0.45, actual: "actual-negative" },
      { id: "A10", score: 0.35, actual: "actual-negative" },
    ],
  },
  {
    id: "group-b",
    label: "Group B",
    cases: [
      { id: "B1", score: 0.88, actual: "actual-positive" },
      { id: "B2", score: 0.79, actual: "actual-negative" },
      { id: "B3", score: 0.72, actual: "actual-negative" },
      { id: "B4", score: 0.68, actual: "actual-positive" },
      { id: "B5", score: 0.62, actual: "actual-positive" },
      { id: "B6", score: 0.57, actual: "actual-negative" },
      { id: "B7", score: 0.5, actual: "actual-positive" },
      { id: "B8", score: 0.44, actual: "actual-negative" },
      { id: "B9", score: 0.39, actual: "actual-positive" },
      { id: "B10", score: 0.28, actual: "actual-negative" },
    ],
  },
];

const defaults: FairnessAuditState = {
  globalThresholdPercent: 70,
  groupBAdjustmentPercent: 0,
  falseNegativeCost: 25,
  falsePositiveCost: 6,
};

const presets: readonly Preset[] = [
  {
    id: "single-threshold",
    label: "Single threshold",
    state: defaults,
  },
  {
    id: "equalise-recall",
    label: "Lower Group B threshold",
    state: {
      globalThresholdPercent: 70,
      groupBAdjustmentPercent: -10,
      falseNegativeCost: 25,
      falsePositiveCost: 6,
    },
  },
  {
    id: "reduce-review-load",
    label: "Reduce review load",
    state: {
      globalThresholdPercent: 80,
      groupBAdjustmentPercent: 0,
      falseNegativeCost: 20,
      falsePositiveCost: 12,
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<FairnessAuditState>): FairnessAuditState => ({
  globalThresholdPercent: clamp(state.globalThresholdPercent ?? defaults.globalThresholdPercent, 40, 85),
  groupBAdjustmentPercent: clamp(
    state.groupBAdjustmentPercent ?? defaults.groupBAdjustmentPercent,
    -15,
    15,
  ),
  falseNegativeCost: clamp(state.falseNegativeCost ?? defaults.falseNegativeCost, 10, 45),
  falsePositiveCost: clamp(state.falsePositiveCost ?? defaults.falsePositiveCost, 2, 18),
});

const groupThreshold = (state: FairnessAuditState, id: GroupId): number => {
  const raw =
    id === "group-b"
      ? state.globalThresholdPercent + state.groupBAdjustmentPercent
      : state.globalThresholdPercent;
  return clamp(raw, 40, 85);
};

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;
const pointGap = (value: number): string => `${(value * 100).toFixed(1)} percentage points`;

export const fairnessThresholdAuditEvidence = (
  state: FairnessAuditState,
  groups: readonly GroupCases[] = groupCases,
): KernelResult<FairnessAuditEvidence> => {
  const current = currentState(state);
  const audits: GroupAudit[] = [];

  for (const group of groups) {
    const thresholdPercent = groupThreshold(current, group.id);
    const evidence = thresholdClassificationEvidence({
      cases: group.cases,
      threshold: thresholdPercent / 100,
      falseNegativeCost: current.falseNegativeCost,
      falsePositiveCost: current.falsePositiveCost,
      curveThresholds: [0.4, 0.5, 0.6, 0.7, 0.8, 0.85],
    });

    if (!evidence.ok) {
      return err("precondition-violated", `Unable to audit ${group.label}`, evidence.error);
    }

    audits.push({
      id: group.id,
      label: group.label,
      thresholdPercent,
      evidence: evidence.value,
    });
  }

  const [groupA, groupB] = audits;
  if (groupA === undefined || groupB === undefined) {
    return err("precondition-violated", "Fairness audit requires exactly two learner groups");
  }

  const recallGap = Math.abs(groupA.evidence.recall - groupB.evidence.recall);
  const accuracyGap = Math.abs(groupA.evidence.accuracy - groupB.evidence.accuracy);
  const costGap = Math.abs(groupA.evidence.totalCost - groupB.evidence.totalCost);
  const totalCost = groupA.evidence.totalCost + groupB.evidence.totalCost;

  return ok({
    groupA,
    groupB,
    recallGap,
    accuracyGap,
    costGap,
    totalCost,
    auditFlag: recallGap >= 0.15 || costGap >= 30 ? "review-required" : "monitor",
  });
};

const useSetState = () => {
  const { state, set } = useManipulate<FairnessAuditState>();
  const current = currentState(state);
  const setAll = (next: FairnessAuditState): void => {
    set("globalThresholdPercent", next.globalThresholdPercent);
    set("groupBAdjustmentPercent", next.groupBAdjustmentPercent);
    set("falseNegativeCost", next.falseNegativeCost);
    set("falsePositiveCost", next.falsePositiveCost);
  };

  return { current, set, setAll };
};

const swatchStyle = (colour: string) => ({
  background: colour,
  borderRadius: "999px",
  display: "inline-block",
  height: "0.8rem",
  marginRight: "0.35rem",
  verticalAlign: "middle",
  width: "0.8rem",
});

const metricGridStyle = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
};

const GroupPanel = ({ audit }: { readonly audit: GroupAudit }) => {
  const { counts } = audit.evidence;

  return (
    <article
      aria-label={`${audit.label} audit result`}
      style={{ border: "1px solid #d0d5dd", borderRadius: "8px", padding: "1rem" }}
    >
      <h3>{audit.label}</h3>
      <p>Threshold: {audit.thresholdPercent}%</p>
      <dl style={metricGridStyle}>
        <div>
          <dt>Recall</dt>
          <dd>{percent(audit.evidence.recall)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{percent(audit.evidence.accuracy)}</dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>{audit.evidence.totalCost} cost units</dd>
        </div>
      </dl>
      <dl
        aria-label={`${audit.label} confusion matrix counts`}
        style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(4, minmax(4rem, 1fr))" }}
      >
        <div>
          <dt>True positives (TP)</dt>
          <dd>{counts.truePositive}</dd>
        </div>
        <div>
          <dt>False positives (FP)</dt>
          <dd>{counts.falsePositive}</dd>
        </div>
        <div>
          <dt>True negatives (TN)</dt>
          <dd>{counts.trueNegative}</dd>
        </div>
        <div>
          <dt>False negatives (FN)</dt>
          <dd>{counts.falseNegative}</dd>
        </div>
      </dl>
    </article>
  );
};

const FormulaPanel = ({ audit }: { readonly audit: FairnessAuditEvidence }) => {
  const { groupA, groupB } = audit;
  const dominant =
    groupB.evidence.totalCost > groupA.evidence.totalCost ? groupB.label : groupA.label;

  return (
    <section aria-label="Formula and substitution" style={{ borderTop: "1px solid #d0d5dd", paddingTop: "1rem" }}>
      <h3>Formula used</h3>
      <pre aria-label="Formula block" style={{ overflowX: "auto", whiteSpace: "pre-wrap" }}>
        <code>{`Recall_g = TP_g / (TP_g + FN_g)
Cost_g = FP_g x C_FP + FN_g x C_FN
Recall gap = |Recall_A - Recall_B|`}</code>
      </pre>
      <dl aria-label="Formula legend" style={{ display: "grid", gap: "0.5rem" }}>
        <div>
          <dt><span style={swatchStyle("#2563eb")} />Recall_g</dt>
          <dd>share of actually positive cases in group g that receive support, reported as a percentage.</dd>
        </div>
        <div>
          <dt><span style={swatchStyle("#7c3aed")} />Cost_g</dt>
          <dd>weighted stakeholder harm for group g, measured in cost units.</dd>
        </div>
        <div>
          <dt><span style={swatchStyle("#d97706")} />RecallGap</dt>
          <dd>absolute recall difference between Group A and Group B, measured in percentage points.</dd>
        </div>
      </dl>
      <p>
        Group A substitution: recall = {groupA.evidence.counts.truePositive} / (
        {groupA.evidence.counts.truePositive} + {groupA.evidence.counts.falseNegative}) ={" "}
        {percent(groupA.evidence.recall)}; cost = {groupA.evidence.counts.falsePositive} cases x{" "}
        {groupA.evidence.falsePositiveCost} cost units + {groupA.evidence.counts.falseNegative} cases x{" "}
        {groupA.evidence.falseNegativeCost} cost units = {groupA.evidence.totalCost} cost units.
      </p>
      <p>
        Group B substitution: recall = {groupB.evidence.counts.truePositive} / (
        {groupB.evidence.counts.truePositive} + {groupB.evidence.counts.falseNegative}) ={" "}
        {percent(groupB.evidence.recall)}; cost = {groupB.evidence.counts.falsePositive} cases x{" "}
        {groupB.evidence.falsePositiveCost} cost units + {groupB.evidence.counts.falseNegative} cases x{" "}
        {groupB.evidence.falseNegativeCost} cost units = {groupB.evidence.totalCost} cost units.
      </p>
      <p>
        Audit substitution: recall gap = |{percent(groupA.evidence.recall)} -{" "}
        {percent(groupB.evidence.recall)}| = {pointGap(audit.recallGap)}; weighted harm gap =
        |{groupA.evidence.totalCost} - {groupB.evidence.totalCost}| = {audit.costGap} cost units.
      </p>
      <p>
        Interpretation: {dominant} carries the larger weighted harm under this policy, so the audit
        should not stop at overall accuracy.
      </p>
    </section>
  );
};

const stakeholderText =
  "An equal threshold can still miss support for one group more often. A threshold adjustment is defensible only when the audit explains whose false positives and false negatives change.";

const stakeholderTags: readonly TagDef[] = [
  { id: "missed-support", label: "Missed support", colour: "#fde2e1" },
  { id: "policy-justification", label: "Policy justification", colour: "#dbeafe" },
];

const annotationFor = (needle: string, id: string, tag: string, note: string): Annotation => {
  const start = stakeholderText.indexOf(needle);
  const safeStart = start >= 0 ? start : 0;
  return {
    id,
    target: { kind: "text", start: safeStart, end: safeStart + needle.length },
    tag,
    note,
    createdAt: 0,
  };
};

const stakeholderAnnotations: readonly Annotation[] = [
  annotationFor("miss support for one group more often", "missed-support-note", "missed-support", "Recall harm"),
  annotationFor(
    "explains whose false positives and false negatives change",
    "justification-note",
    "policy-justification",
    "Threshold change evidence",
  ),
];

const ManipulateStage = () => {
  const stage = useStage();
  const { current, set, setAll } = useSetState();

  return (
    <section aria-label="Audit controls" style={{ display: "grid", gap: "1rem" }}>
      <header>
        <p>Manipulate</p>
        <h2>Set the threshold policy before the audit table is revealed</h2>
      </header>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }} aria-label="Preset policies">
        {presets.map((preset) => (
          <button key={preset.id} type="button" onClick={() => setAll(preset.state)}>
            {preset.label}
          </button>
        ))}
      </div>
      <ControlGroup legend="Threshold audit controls">
        <Slider
          label="Global threshold"
          max={85}
          min={40}
          onChange={(value) => set("globalThresholdPercent", value)}
          step={5}
          unit="%"
          value={current.globalThresholdPercent}
        />
        <Slider
          label="Group B threshold adjustment"
          max={15}
          min={-15}
          onChange={(value) => set("groupBAdjustmentPercent", value)}
          step={5}
          unit="percentage points"
          value={current.groupBAdjustmentPercent}
        />
        <Slider
          label="False-negative cost"
          max={45}
          min={10}
          onChange={(value) => set("falseNegativeCost", value)}
          step={5}
          unit="cost units"
          value={current.falseNegativeCost}
        />
        <Slider
          label="False-positive cost"
          max={18}
          min={2}
          onChange={(value) => set("falsePositiveCost", value)}
          step={2}
          unit="cost units"
          value={current.falsePositiveCost}
        />
      </ControlGroup>
      <section aria-label="Policy preview">
        <h3>Current policy</h3>
        <p>
          Group A uses {groupThreshold(current, "group-a")}%. Group B uses{" "}
          {groupThreshold(current, "group-b")}%. The revealed audit will compare recall,
          accuracy, and weighted harm for the two groups.
        </p>
      </section>
      <button type="button" onClick={() => stage.advance()}>
        Reveal fairness audit
      </button>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<FairnessAuditState>>());
  const audit = fairnessThresholdAuditEvidence(state);

  if (!audit.ok) {
    return (
      <section aria-label="Observation unlocked" role="region">
        <p role="alert">Unable to compute the fairness audit.</p>
      </section>
    );
  }

  const chartData = groupCases.flatMap((group) => {
    const evidence = thresholdClassificationEvidence({
      cases: group.cases,
      threshold: state.globalThresholdPercent / 100,
      falseNegativeCost: state.falseNegativeCost,
      falsePositiveCost: state.falsePositiveCost,
      curveThresholds: [0.4, 0.5, 0.6, 0.7, 0.8, 0.85],
    });
    if (!evidence.ok) return [];
    return evidence.value.curve.map((point) => ({
      x: point.thresholdPercent,
      y: point.recall,
      series: `${group.label} recall`,
    }));
  });
  const predictionCommitted = isRevealed(fairnessThresholdAuditPackageId, fairnessThresholdAuditSpec.id);

  return (
    <section aria-label="Observation unlocked" role="region" style={{ display: "grid", gap: "1.25rem" }}>
      <header>
        <p>Observe</p>
        <h2>
          Recall gap {pointGap(audit.value.recallGap)} and harm gap {audit.value.costGap} cost units
        </h2>
        <p>{predictionCommitted ? "Prediction committed before reveal." : "Prediction not committed."}</p>
      </header>
      <dl aria-label="Fairness audit summary" style={metricGridStyle}>
        <div>
          <dt>Audit status</dt>
          <dd>{audit.value.auditFlag === "review-required" ? "Review required" : "Monitor"}</dd>
        </div>
        <div>
          <dt>Total weighted harm</dt>
          <dd>{audit.value.totalCost} cost units</dd>
        </div>
        <div>
          <dt>Accuracy gap</dt>
          <dd>{pointGap(audit.value.accuracyGap)}</dd>
        </div>
      </dl>
      <section aria-label="Group audit cards" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))" }}>
        <GroupPanel audit={audit.value.groupA} />
        <GroupPanel audit={audit.value.groupB} />
      </section>
      <section aria-label="Recall threshold curve">
        <h3>Recall across thresholds</h3>
        <LineChart
          ariaLabel="Group recall threshold curve"
          data={chartData}
          x={{ domain: { min: 40, max: 85 }, label: "threshold percent" }}
          y={{ domain: { min: 0, max: 1 }, label: "recall" }}
        />
      </section>
      <FormulaPanel audit={audit.value} />
      <section aria-label="Stakeholder annotation">
        <h3>Stakeholder interpretation</h3>
        <AnnotatableText
          annotations={stakeholderAnnotations}
          tags={stakeholderTags}
          text={stakeholderText}
        />
      </section>
      <button type="button" onClick={() => stage.advance()}>
        Explain audit decision
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" style={{ display: "grid", gap: "1rem" }}>
      <p>Transfer</p>
      <h2>Audit a hiring shortlist threshold</h2>
      <p>
        A shortlist model screens two applicant groups. Compute each group's TP, FP, TN, and FN,
        then compare recall gap and weighted harm gap before deciding whether one global threshold
        is acceptable.
      </p>
      <p>
        Your explanation should name the stakeholder harm that changes, the formula you used, and
        the policy change you would defend.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another threshold policy
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
    <section aria-label="Prediction setup" style={{ display: "grid", gap: "1rem" }}>
      <p>Prediction checkpoint</p>
      <h1>Fairness Threshold Audit Lab</h1>
      <p>
        Commit a prediction about one shared threshold before seeing the group audit. Then tune the
        policy and test whether accuracy, recall, and stakeholder harm tell the same story.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set audit policy
      </button>
    </section>
  );
};

const FairnessThresholdAudit = () => (
  <SimRuntime packageId={fairnessThresholdAuditPackageId} spec={fairnessThresholdAuditSpec}>
    <StageSurface />
  </SimRuntime>
);

export default FairnessThresholdAudit;
