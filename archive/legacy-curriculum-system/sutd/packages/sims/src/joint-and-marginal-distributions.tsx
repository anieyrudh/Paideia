import { Sankey, type SankeyLink, type SankeyNode } from "@paideia/charting";
import { normalizeDistribution, type DiscreteDistribution } from "@paideia/probability-stats";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { ConceptPackageId, KernelResult } from "@paideia/shared";
import { ok } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";
import type { TPredictSpec, TSimulationSpec } from "@paideia/content-schema";

type JointCellId = "a-b" | "a-not-b" | "not-a-b" | "not-a-not-b";

export interface JointMarginalState {
  readonly eventA: number;
  readonly eventB: number;
  readonly association: number;
}

export interface JointCell {
  readonly id: JointCellId;
  readonly label: string;
  readonly probability: number;
}

export interface JointMarginalModel {
  readonly state: JointMarginalState;
  readonly cells: readonly JointCell[];
  readonly distribution: DiscreteDistribution<JointCellId>;
  readonly marginalA: number;
  readonly marginalB: number;
  readonly conditionalAGivenB: number;
  readonly independentExpected: number;
  readonly lift: number;
  readonly formula: string;
  readonly substitution: string;
  readonly interpretation: string;
}

const defaultState: JointMarginalState = {
  eventA: 0.4,
  eventB: 0.5,
  association: 0.35,
};

export const jointMarginalPackageId =
  "sutd/10-022-modelling-uncertainty/joint-and-marginal-distributions" as ConceptPackageId;

export const jointMarginalSimId = "joint-table-lab";

const predictSpec: TPredictSpec = {
  prompt:
    "If the events are positively associated, predict how P(A given B) compares with marginal P(A).",
  commit_format: {
    kind: "multiple-choice",
    options: ["It is lower than P(A)", "It equals P(A)", "It is higher than P(A)"],
    correct_index: 2,
  },
  rationale_required: true,
} as const;

const clamp = (value: number, min: number, max: number, step = 0.01): number => {
  const finite = Number.isFinite(value) ? value : min;
  const snapped = Math.round(finite / step) * step;
  return Math.min(max, Math.max(min, snapped));
};

const normalizeState = (input: Partial<JointMarginalState>): JointMarginalState => ({
  eventA: clamp(input.eventA ?? defaultState.eventA, 0.05, 0.95, 0.01),
  eventB: clamp(input.eventB ?? defaultState.eventB, 0.05, 0.95, 0.01),
  association: clamp(input.association ?? defaultState.association, -0.95, 0.95, 0.01),
});

const jointCells = (state: JointMarginalState): readonly JointCell[] => {
  const independent = state.eventA * state.eventB;
  const negativeRoom = Math.min(independent, (1 - state.eventA) * (1 - state.eventB));
  const positiveRoom = Math.min(state.eventA * (1 - state.eventB), (1 - state.eventA) * state.eventB);
  const delta = state.association >= 0 ? state.association * positiveRoom : state.association * negativeRoom;
  const both = independent + delta;
  const aOnly = state.eventA - both;
  const bOnly = state.eventB - both;
  const neither = 1 - both - aOnly - bOnly;
  return [
    { id: "a-b", label: "A and B", probability: both },
    { id: "a-not-b", label: "A and not B", probability: aOnly },
    { id: "not-a-b", label: "not A and B", probability: bOnly },
    { id: "not-a-not-b", label: "neither", probability: neither },
  ];
};

const formatPct = (value: number): string => `${(value * 100).toFixed(1)}%`;

export const jointMarginalModel = (
  input: Partial<JointMarginalState> = defaultState,
): KernelResult<JointMarginalModel> => {
  const state = normalizeState(input);
  const cells = jointCells(state);
  const distribution = normalizeDistribution(
    cells.map((cell, index) => ({ id: cell.id, value: index, weight: cell.probability })),
  );
  if (!distribution.ok) return distribution;
  const both = cells[0]?.probability ?? 0;
  const marginalA = (cells[0]?.probability ?? 0) + (cells[1]?.probability ?? 0);
  const marginalB = (cells[0]?.probability ?? 0) + (cells[2]?.probability ?? 0);
  const conditionalAGivenB = both / marginalB;
  const independentExpected = marginalA * marginalB;
  const lift = conditionalAGivenB / marginalA;
  return ok({
    state,
    cells,
    distribution: distribution.value,
    marginalA,
    marginalB,
    conditionalAGivenB,
    independentExpected,
    lift,
    formula: "P(A|B)=P(A and B)/P(B)",
    substitution: `P(A and B)=${formatPct(both)}, P(B)=${formatPct(marginalB)}`,
    interpretation:
      lift > 1.02
        ? `Seeing B raises A from ${formatPct(marginalA)} to ${formatPct(conditionalAGivenB)}.`
        : lift < 0.98
          ? `Seeing B lowers A from ${formatPct(marginalA)} to ${formatPct(conditionalAGivenB)}.`
          : `Seeing B leaves A near its marginal rate of ${formatPct(marginalA)}.`,
  });
};

export const jointMarginalSpec: TSimulationSpec = {
  id: jointMarginalSimId,
  title: "Joint and Marginal Distribution Table Lab",
  interaction_type: "comparative-matrix",
  kernel_deps: [
    "core/content-schema",
    "core/shared",
    "core/probability-stats",
    "core/prediction-gate",
    "core/charting",
    "core/ui-sim",
  ],
  predict: predictSpec,
  manipulate: {
    controls: [
      {
        id: "event-a-rate",
        label: "Marginal P(A)",
        kind: "slider",
        kernel_binding: "state.eventA",
        bounds: { min: 0.05, max: 0.95, step: 0.01 },
      },
      {
        id: "event-b-rate",
        label: "Marginal P(B)",
        kind: "slider",
        kernel_binding: "state.eventB",
        bounds: { min: 0.05, max: 0.95, step: 0.01 },
      },
      {
        id: "association",
        label: "Association",
        kind: "slider",
        kernel_binding: "state.association",
        bounds: { min: -0.95, max: 0.95, step: 0.01 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "joint-flow",
        module: "@paideia/sutd-sims/joint-and-marginal-distributions",
        symbol: "JointAndMarginalDistributions",
        props_binding:
          "Render a Sankey flow from {A, not A} sources to {B, not B} targets with link widths set to joint probabilities, plus marginals, conditional formula, substitution, units, legend, and interpretation.",
      },
    ],
  },
  explain: {
    prompt: "Explain how summing joint cells creates marginals and why conditioning changes the denominator.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Treating joint and conditional probability as interchangeable.",
      "Reading a row total as if it were a joint cell.",
    ],
  },
};

const ManipulateStage = () => {
  const state = normalizeState(useSimState<Partial<JointMarginalState>>());
  const { set } = useManipulate<JointMarginalState>();
  return (
    <section aria-label="Joint table controls" role="region" style={styles.surface}>
      <section style={styles.panel}>
        <p style={styles.kicker}>Manipulate</p>
        <h1 style={styles.h1}>Set the marginals and association</h1>
        <ControlGroup legend="Probability controls">
          <div style={styles.controlStack}>
            <Slider label="Marginal P(A)" max={0.95} min={0.05} onChange={(eventA) => set("eventA", eventA)} step={0.01} value={state.eventA} />
            <Slider label="Marginal P(B)" max={0.95} min={0.05} onChange={(eventB) => set("eventB", eventB)} step={0.01} value={state.eventB} />
            <Slider label="Association" max={0.95} min={-0.95} onChange={(association) => set("association", association)} step={0.01} value={state.association} />
          </div>
        </ControlGroup>
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const model = jointMarginalModel(useSimState<Partial<JointMarginalState>>());
  if (!model.ok) {
    return (
      <section aria-label="Observation unlocked" role="region" style={styles.surface}>
        <p role="alert">The joint table could not be evaluated.</p>
      </section>
    );
  }
  return (
    <section aria-label="Observation unlocked" role="region" style={styles.surface}>
      <div style={styles.metricGrid}>
        <Metric label="P(A)" value={formatPct(model.value.marginalA)} note="row total" />
        <Metric label="P(B)" value={formatPct(model.value.marginalB)} note="column total" />
        <Metric label="P(A|B)" value={formatPct(model.value.conditionalAGivenB)} note="conditional rate" />
      </div>
      <div style={styles.grid}>
        <JointFlowDiagram model={model.value} />
        <FormulaPanel model={model.value} />
      </div>
      <button onClick={() => stage.advance()} style={styles.primaryButton} type="button">
        Explain transfer
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer challenge" role="region" style={styles.surface}>
      <section style={styles.panel}>
        <p style={styles.kicker}>Transfer</p>
        <h2 style={styles.h2}>Sensor alarm audit</h2>
        <p>
          A sensor can be faulty, an alarm can fire, and the two events may be associated.
          Build the joint table, then compare the marginal alarm rate with the conditional
          probability of alarm given a fault.
        </p>
        <button onClick={() => stage.reset()} style={styles.primaryButton} type="button">
          Try another table
        </button>
      </section>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "explain") return <ExplainStage />;
  return (
    <>
      <ManipulateStage />
      <ObserveStage />
    </>
  );
};

const SANKEY_NODES: readonly SankeyNode[] = [
  { id: "A", label: "A" },
  { id: "notA", label: "not A" },
  { id: "B", label: "B" },
  { id: "notB", label: "not B" },
];

const sankeyLinks = (model: JointMarginalModel): readonly SankeyLink[] => {
  const lookup = new Map(model.cells.map((cell) => [cell.id, Math.max(0, cell.probability)]));
  return [
    { source: "A", target: "B", value: lookup.get("a-b") ?? 0 },
    { source: "A", target: "notB", value: lookup.get("a-not-b") ?? 0 },
    { source: "notA", target: "B", value: lookup.get("not-a-b") ?? 0 },
    { source: "notA", target: "notB", value: lookup.get("not-a-not-b") ?? 0 },
  ];
};

const JointFlowDiagram = ({ model }: { readonly model: JointMarginalModel }) => {
  const links = sankeyLinks(model);
  return (
    <section aria-label="Joint probability flow" style={styles.panel}>
      <p style={styles.kicker}>Visual model</p>
      <h2 style={styles.h2}>Joint distribution flow</h2>
      <div role="img" aria-label="Sankey flow from event A or not A to event B or not B; ribbon width is joint probability.">
        <Sankey nodes={SANKEY_NODES} links={links} />
      </div>
      <ul style={styles.marginalList}>
        <li><strong>P(A and B):</strong> {formatPct(links[0]?.value ?? 0)}</li>
        <li><strong>P(A and not B):</strong> {formatPct(links[1]?.value ?? 0)}</li>
        <li><strong>P(not A and B):</strong> {formatPct(links[2]?.value ?? 0)}</li>
        <li><strong>P(not A and not B):</strong> {formatPct(links[3]?.value ?? 0)}</li>
      </ul>
      <p style={styles.interpretation}>{model.interpretation}</p>
    </section>
  );
};

const FormulaPanel = ({ model }: { readonly model: JointMarginalModel }) => (
  <section aria-label="Formula used" style={styles.panel}>
    <p style={styles.kicker}>Formula</p>
    <h2 style={styles.h2}>Conditioning changes the denominator</h2>
    <pre style={styles.formula}>{model.formula}</pre>
    <p style={styles.substitution}>Substitution: {model.substitution}.</p>
    <p style={styles.interpretation}>Units: probabilities are unitless proportions.</p>
    <p style={styles.interpretation}>Result: P(A|B)={formatPct(model.conditionalAGivenB)}.</p>
    <p style={styles.kicker}>Legend</p>
    <dl aria-label="Formula legend" style={styles.legendGrid}>
      <div>
        <dt>
          <span style={{ ...styles.legendMark, background: "#1f5f8b" }} />
          Blue ribbons
        </dt>
        <dd>joint probabilities; ribbon widths sum to 1.</dd>
      </div>
      <div>
        <dt>
          <span style={{ ...styles.legendMark, background: "#b6402a" }} />
          Red readout
        </dt>
        <dd>conditional probability P(A|B) using only the inflow into B.</dd>
      </div>
    </dl>
  </section>
);

const Metric = ({ label, note, value }: { readonly label: string; readonly note: string; readonly value: string }) => (
  <section style={styles.metric}>
    <span style={styles.metricLabel}>{label}</span>
    <strong style={styles.metricValue}>{value}</strong>
    <span>{note}</span>
  </section>
);

const styles = {
  surface: { color: "#172026", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", padding: "1rem" },
  grid: { display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))" },
  panel: { background: "#fff", border: "1px solid #c8d7cf", borderRadius: "8px", padding: "1rem" },
  kicker: { color: "#54645c", fontSize: "0.76rem", fontWeight: 700, letterSpacing: 0, margin: "0 0 0.35rem", textTransform: "uppercase" },
  h1: { fontSize: "2rem", lineHeight: 1.08, margin: "0 0 0.75rem" },
  h2: { fontSize: "1.35rem", lineHeight: 1.15, margin: "0 0 0.75rem" },
  controlStack: { display: "grid", gap: "0.8rem" },
  primaryButton: { background: "#155e63", border: "1px solid #155e63", borderRadius: "6px", color: "#fff", fontWeight: 700, marginTop: "1rem", padding: "0.65rem 0.9rem" },
  metricGrid: { display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", marginBottom: "1rem" },
  metric: { background: "#f3f8f5", border: "1px solid #c4d8cd", borderRadius: "8px", display: "grid", gap: "0.2rem", padding: "0.85rem" },
  metricLabel: { color: "#506357", fontSize: "0.82rem", fontWeight: 700 },
  metricValue: { color: "#123f43", fontSize: "1.35rem", lineHeight: 1.15 },
  marginalList: { display: "grid", gap: "0.35rem", listStyle: "none", margin: "0.6rem 0 0", padding: 0 },
  formula: { background: "#f6f3ec", border: "1px solid #d9ccb7", borderRadius: "6px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", lineHeight: 1.6, padding: "0.8rem", whiteSpace: "pre-wrap" },
  legendGrid: { display: "grid", gap: "0.4rem", margin: "0.4rem 0 0", padding: 0 },
  legendMark: { borderRadius: "999px", display: "inline-block", height: "0.85rem", width: "0.85rem" },
  substitution: { marginTop: "0.9rem" },
  interpretation: { marginTop: "0.7rem" },
} as const;

export default function JointAndMarginalDistributions() {
  return (
    <SimRuntime packageId={jointMarginalPackageId} spec={jointMarginalSpec}>
      <StageSurface />
    </SimRuntime>
  );
}
