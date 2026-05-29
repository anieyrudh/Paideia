import { AnnotatableText } from "@paideia/annotation";
import type { Annotation, TagDef } from "@paideia/annotation";
import { LineChart } from "@paideia/charting";
import { isRevealed } from "@paideia/prediction-gate";
import {
  thresholdCaseOutcomes,
  thresholdClassificationEvidence,
  type BinaryConfusionCell,
  type BinaryConfusionCounts,
  type ThresholdClassificationEvidence,
  type ThresholdClassifierCase,
} from "@paideia/probability-stats";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type ThresholdState = {
  readonly thresholdPercent: number;
  readonly falseNegativeCost: number;
  readonly falsePositiveCost: number;
};

type ClassifierCase = ThresholdClassifierCase;
type ConfusionCounts = BinaryConfusionCounts;
type ThresholdEvidence = ThresholdClassificationEvidence;

type Preset = {
  readonly id: string;
  readonly label: string;
  readonly state: ThresholdState;
};

export const confusionMatrixThresholdsPackageId =
  "sutd/dai/confusion-matrix-thresholds" as Parameters<typeof SimRuntime>[0]["packageId"];

export const confusionMatrixThresholdsSpec = {
  id: "confusion-matrix-thresholds",
  title: "Confusion Matrix Threshold Explorer",
  interaction_type: "decision-matrix",
  kernel_deps: [
    "core/sim-runtime",
    "core/probability-stats",
    "core/charting",
    "core/annotation",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "threshold-percent",
        label: "Decision threshold",
        kind: "slider",
        kernel_binding: "state.thresholdPercent",
        bounds: { min: 35, max: 85, step: 5 },
      },
      {
        id: "false-negative-cost",
        label: "False-negative cost",
        kind: "slider",
        kernel_binding: "state.falseNegativeCost",
        bounds: { min: 5, max: 45, step: 5 },
      },
      {
        id: "false-positive-cost",
        label: "False-positive cost",
        kind: "slider",
        kernel_binding: "state.falsePositiveCost",
        bounds: { min: 1, max: 15, step: 1 },
      },
    ],
  },
  predict: {
    prompt:
      "If the threshold rises from 65% to 80% while false negatives are costly, what is most likely to happen?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Precision and recall both increase",
        "Recall falls, so missed-positive cost can rise",
        "Accuracy is unchanged",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "confusion-matrix-threshold-renderer",
        module: "@paideia/sutd-sims/confusion-matrix-thresholds",
        symbol: "ConfusionMatrixThresholds",
        props_binding:
          "Show thresholded cases, confusion-matrix counts, precision, recall, accuracy, and cost formula with substituted values.",
      },
    ],
  },
  explain: {
    prompt:
      "Which cell in your confusion matrix would you defend first to a stakeholder, and what evidence shows that accuracy alone is not enough?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Accuracy is enough for every deployment",
      "A single threshold is neutral for all groups",
    ],
  },
} satisfies Parameters<typeof SimRuntime>[0]["spec"];

const cases: readonly ClassifierCase[] = [
  { id: "A", score: 0.94, actual: "actual-positive" },
  { id: "B", score: 0.88, actual: "actual-negative" },
  { id: "C", score: 0.83, actual: "actual-positive" },
  { id: "D", score: 0.78, actual: "actual-positive" },
  { id: "E", score: 0.73, actual: "actual-negative" },
  { id: "F", score: 0.69, actual: "actual-positive" },
  { id: "G", score: 0.64, actual: "actual-negative" },
  { id: "H", score: 0.59, actual: "actual-positive" },
  { id: "I", score: 0.54, actual: "actual-negative" },
  { id: "J", score: 0.49, actual: "actual-negative" },
  { id: "K", score: 0.44, actual: "actual-positive" },
  { id: "L", score: 0.39, actual: "actual-negative" },
  { id: "M", score: 0.34, actual: "actual-positive" },
  { id: "N", score: 0.29, actual: "actual-negative" },
  { id: "O", score: 0.24, actual: "actual-negative" },
  { id: "P", score: 0.18, actual: "actual-positive" },
];

const presets: readonly Preset[] = [
  {
    id: "balanced-review",
    label: "Balanced review",
    state: { thresholdPercent: 65, falseNegativeCost: 25, falsePositiveCost: 6 },
  },
  {
    id: "catch-more-positives",
    label: "Catch more positives",
    state: { thresholdPercent: 45, falseNegativeCost: 35, falsePositiveCost: 5 },
  },
  {
    id: "reduce-false-alarms",
    label: "Reduce false alarms",
    state: { thresholdPercent: 80, falseNegativeCost: 20, falsePositiveCost: 10 },
  },
];

const defaults: ThresholdState = {
  thresholdPercent: 65,
  falseNegativeCost: 25,
  falsePositiveCost: 6,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<ThresholdState>): ThresholdState => ({
  thresholdPercent: clamp(state.thresholdPercent ?? defaults.thresholdPercent, 35, 85),
  falseNegativeCost: clamp(state.falseNegativeCost ?? defaults.falseNegativeCost, 5, 45),
  falsePositiveCost: clamp(state.falsePositiveCost ?? defaults.falsePositiveCost, 1, 15),
});

const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;

export const confusionMatrixThresholdEvidence = (
  state: ThresholdState,
  data: readonly ClassifierCase[] = cases,
) => {
  const current = currentState(state);
  return thresholdClassificationEvidence({
    cases: data,
    threshold: current.thresholdPercent / 100,
    falseNegativeCost: current.falseNegativeCost,
    falsePositiveCost: current.falsePositiveCost,
    curveThresholds: [0.35, 0.45, 0.55, 0.65, 0.75, 0.85],
  });
};

const useSetState = () => {
  const { state, set } = useManipulate<ThresholdState>();
  const current = currentState(state);
  const setAll = (next: ThresholdState): void => {
    set("thresholdPercent", next.thresholdPercent);
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

const matrixCellStyle = (colour: string) => ({
  background: colour,
  border: "1px solid #98a2b3",
  borderRadius: "6px",
  minHeight: "5.5rem",
  padding: "0.75rem",
});

const cellColour = (cell: BinaryConfusionCell): string => {
  if (cell === "true-positive") return "#d8f3dc";
  if (cell === "false-positive") return "#ffe8cc";
  if (cell === "true-negative") return "#e7f0ff";
  return "#fde2e1";
};

const CaseStrip = ({ threshold }: { readonly threshold: number }) => {
  const outcomes = thresholdCaseOutcomes(cases, threshold);
  if (!outcomes.ok) {
    return <p role="alert">Unable to preview thresholded cases.</p>;
  }

  return (
    <div aria-label="Thresholded cases" role="list" style={{ display: "grid", gap: "0.4rem" }}>
      {outcomes.value.map((entry) => (
        <div
          key={entry.id}
          role="listitem"
          style={{
            alignItems: "center",
            background: cellColour(entry.cell),
            border: "1px solid #d0d5dd",
            borderRadius: "6px",
            display: "grid",
            gridTemplateColumns: "2rem 4rem 1fr",
            padding: "0.35rem 0.5rem",
          }}
        >
          <strong>{entry.id}</strong>
          <span>{percent(entry.score)}</span>
          <span>{entry.predictedPositive ? "predicted positive" : "predicted negative"}</span>
        </div>
      ))}
    </div>
  );
};

const ConfusionMatrix = ({ counts }: { readonly counts: ConfusionCounts }) => (
  <section aria-label="Confusion matrix counts">
    <h3>Confusion matrix counts</h3>
    <div
      style={{
        display: "grid",
        gap: "0.5rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
      }}
    >
      <div style={matrixCellStyle("#d8f3dc")}>
        <strong>TP</strong>
        <p>{counts.truePositive} cases</p>
        <p>flagged and actually positive</p>
      </div>
      <div style={matrixCellStyle("#ffe8cc")}>
        <strong>FP</strong>
        <p>{counts.falsePositive} cases</p>
        <p>flagged but actually negative</p>
      </div>
      <div style={matrixCellStyle("#e7f0ff")}>
        <strong>TN</strong>
        <p>{counts.trueNegative} cases</p>
        <p>not flagged and actually negative</p>
      </div>
      <div style={matrixCellStyle("#fde2e1")}>
        <strong>FN</strong>
        <p>{counts.falseNegative} cases</p>
        <p>missed but actually positive</p>
      </div>
    </div>
  </section>
);

const FormulaPanel = ({ evidence }: { readonly evidence: ThresholdEvidence }) => {
  const { counts } = evidence;
  const dominantError =
    evidence.falseNegativeCostTotal >= evidence.falsePositiveCostTotal
      ? "missed actual positives"
      : "unnecessary positive flags";
  return (
    <section aria-label="Formula and substitution" style={{ borderTop: "1px solid #d0d5dd", paddingTop: "1rem" }}>
      <h3>Formula used</h3>
      <pre aria-label="Formula block" style={{ overflowX: "auto", whiteSpace: "pre-wrap" }}>
        <code>{String.raw`Precision = TP / (TP + FP)
Recall = TP / (TP + FN)
Accuracy = (TP + TN) / N
Cost = FP \times C_FP + FN \times C_FN`}</code>
      </pre>
      <dl aria-label="Formula legend" style={{ display: "grid", gap: "0.5rem" }}>
        <div>
          <dt><span style={swatchStyle("#d8f3dc")} />TP</dt>
          <dd>true positives, {counts.truePositive} cases</dd>
        </div>
        <div>
          <dt><span style={swatchStyle("#ffe8cc")} />FP</dt>
          <dd>false positives, {counts.falsePositive} cases</dd>
        </div>
        <div>
          <dt><span style={swatchStyle("#e7f0ff")} />TN</dt>
          <dd>true negatives, {counts.trueNegative} cases</dd>
        </div>
        <div>
          <dt><span style={swatchStyle("#fde2e1")} />FN</dt>
          <dd>false negatives, {counts.falseNegative} cases</dd>
        </div>
        <div>
          <dt>N</dt>
          <dd>total dataset size, {cases.length} cases</dd>
        </div>
        <div>
          <dt>C_FP and C_FN</dt>
          <dd>error costs, {evidence.falsePositiveCost} and {evidence.falseNegativeCost} cost units</dd>
        </div>
      </dl>
      <p>
        Substitution: precision = {counts.truePositive} / ({counts.truePositive} +{" "}
        {counts.falsePositive}) = {percent(evidence.precision)}; recall ={" "}
        {counts.truePositive} / ({counts.truePositive} + {counts.falseNegative}) ={" "}
        {percent(evidence.recall)}.
      </p>
      <p>
        Accuracy substitution: ({counts.truePositive} + {counts.trueNegative}) / {cases.length} ={" "}
        {percent(evidence.accuracy)}. Accuracy is dimensionless; the counts are measured in cases.
      </p>
      <p>
        Cost substitution: {counts.falsePositive} cases x {evidence.falsePositiveCost} cost
        units + {counts.falseNegative} cases x {evidence.falseNegativeCost} cost units ={" "}
        {evidence.totalCost} cost units.
      </p>
      <p>
        Interpretation: the threshold flags {counts.truePositive + counts.falsePositive} cases.
        The main deployment risk is {dominantError} because that error cell contributes the
        larger weighted cost.
      </p>
    </section>
  );
};

const stakeholderText =
  "False negatives are missed positive cases: the system says no action is needed when a stakeholder needed support. False positives are unnecessary positive flags: the system sends a stakeholder into review even when the case was actually negative.";

const stakeholderTags: readonly TagDef[] = [
  { id: "harm-fn", label: "Missed support", colour: "#fde2e1" },
  { id: "harm-fp", label: "Unnecessary burden", colour: "#ffe8cc" },
];

const stakeholderAnnotations: readonly Annotation[] = [
  {
    id: "fn-note",
    target: { kind: "text", start: 0, end: 61 },
    tag: "harm-fn",
    note: "False-negative stakeholder harm",
    createdAt: 0,
  },
  {
    id: "fp-note",
    target: { kind: "text", start: 139, end: 198 },
    tag: "harm-fp",
    note: "False-positive stakeholder harm",
    createdAt: 0,
  },
];

const ManipulateStage = () => {
  const stage = useStage();
  const { current, set, setAll } = useSetState();

  return (
    <section aria-label="Threshold controls" style={{ display: "grid", gap: "1rem" }}>
      <header>
        <p>Manipulate the policy before comparing with the counts.</p>
        <h2>Set the threshold and error costs</h2>
      </header>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }} aria-label="Preset policies">
        {presets.map((preset) => (
          <button key={preset.id} type="button" onClick={() => setAll(preset.state)}>
            {preset.label}
          </button>
        ))}
      </div>
      <ControlGroup legend="Policy controls">
        <Slider
          label="Decision threshold"
          max={85}
          min={35}
          onChange={(value) => set("thresholdPercent", value)}
          step={5}
          unit="%"
          value={current.thresholdPercent}
        />
        <Slider
          label="False-negative cost"
          max={45}
          min={5}
          onChange={(value) => set("falseNegativeCost", value)}
          step={5}
          unit="cost units"
          value={current.falseNegativeCost}
        />
        <Slider
          label="False-positive cost"
          max={15}
          min={1}
          onChange={(value) => set("falsePositiveCost", value)}
          step={1}
          unit="cost units"
          value={current.falsePositiveCost}
        />
      </ControlGroup>
      <section aria-label="Live threshold preview">
        <h3>Current threshold line</h3>
        <p>
          Cases at or above {current.thresholdPercent}% will be predicted positive after reveal.
        </p>
        <CaseStrip threshold={current.thresholdPercent / 100} />
      </section>
      <button type="button" onClick={() => stage.advance()}>
        Reveal confusion matrix
      </button>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<ThresholdState>>());
  const evidence = confusionMatrixThresholdEvidence(state);

  if (!evidence.ok) {
    return (
      <section aria-label="Observation unlocked" role="region">
        <p role="alert">Unable to compute threshold evidence.</p>
      </section>
    );
  }

  const data = evidence.value.curve.flatMap((point) => [
    { x: point.thresholdPercent, y: point.precision, series: "precision" },
    { x: point.thresholdPercent, y: point.recall, series: "recall" },
  ]);
  const predictionCommitted = isRevealed(
    confusionMatrixThresholdsPackageId,
    confusionMatrixThresholdsSpec.id,
  );

  return (
    <section aria-label="Observation unlocked" role="region" style={{ display: "grid", gap: "1.25rem" }}>
      <header>
        <p>Observe</p>
        <h2>Threshold {state.thresholdPercent}% produces {evidence.value.totalCost} cost units</h2>
        <p>{predictionCommitted ? "Prediction committed before reveal." : "Prediction not committed."}</p>
      </header>
      <dl
        aria-label="Metric readout"
        style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))" }}
      >
        <div>
          <dt>Precision</dt>
          <dd>{percent(evidence.value.precision)}</dd>
        </div>
        <div>
          <dt>Recall</dt>
          <dd>{percent(evidence.value.recall)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{percent(evidence.value.accuracy)}</dd>
        </div>
        <div>
          <dt>Base rate</dt>
          <dd>{percent(evidence.value.baseRate)}</dd>
        </div>
      </dl>
      <ConfusionMatrix counts={evidence.value.counts} />
      <section aria-label="Precision recall threshold curve">
        <h3>Precision and recall across thresholds</h3>
        <LineChart
          ariaLabel="Precision and recall threshold curve"
          data={data}
          x={{ domain: { min: 35, max: 85 }, label: "threshold percent" }}
          y={{ domain: { min: 0, max: 1 }, label: "metric value" }}
        />
      </section>
      <FormulaPanel evidence={evidence.value} />
      <section aria-label="Stakeholder annotation">
        <h3>Stakeholder interpretation</h3>
        <AnnotatableText
          annotations={stakeholderAnnotations}
          tags={stakeholderTags}
          text={stakeholderText}
        />
      </section>
      <button type="button" onClick={() => stage.advance()}>
        Explain deployment choice
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" style={{ display: "grid", gap: "1rem" }}>
      <p>Transfer</p>
      <h2>Apply the same count update in loan review</h2>
      <p>
        A loan-review model flags applications for manual review. False positives delay eligible
        applicants; false negatives approve risky applications. Choose a threshold, compute TP,
        FP, TN, and FN, then defend the policy with precision, recall, and cost units.
      </p>
      <p>
        Before using one shared threshold, compare whether each group would see the same error
        pattern and stakeholder cost. What count pattern would make you revise the policy?
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another threshold
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
      <h1>Confusion Matrix Threshold Explorer</h1>
      <p>
        Predict the effect of a stricter threshold before the count table is revealed. Then tune the
        threshold and error costs to see how precision, recall, accuracy, and stakeholder cost move.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set threshold policy
      </button>
    </section>
  );
};

const ConfusionMatrixThresholds = () => (
  <SimRuntime packageId={confusionMatrixThresholdsPackageId} spec={confusionMatrixThresholdsSpec}>
    <StageSurface />
  </SimRuntime>
);

export default ConfusionMatrixThresholds;
