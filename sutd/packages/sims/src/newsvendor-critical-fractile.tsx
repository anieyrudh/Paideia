import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  costSgdPerUnit,
  newsvendorCriticalFractile,
  orderQuantityUnits,
  type NewsvendorAnalysis as CoreNewsvendorAnalysis,
} from "@paideia/optimization";
import {
  normalizeDistribution,
  type DiscreteDistribution,
  type WeightedOutcome,
} from "@paideia/probability-stats";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";
import type { ConceptPackageId, KernelResult } from "@paideia/shared";

type DemandScenarioId = "steady" | "launch" | "volatile";

interface NewsvendorState {
  readonly scenario: DemandScenarioId;
  readonly orderQuantity: number;
  readonly underageCost: number;
  readonly overageCost: number;
}

interface NewsvendorAnalysisView extends CoreNewsvendorAnalysis {
  readonly state: NewsvendorState;
  readonly distribution: DiscreteDistribution;
}

interface DemandScenario {
  readonly id: DemandScenarioId;
  readonly label: string;
  readonly caption: string;
  readonly outcomes: readonly WeightedOutcome<string>[];
}

const scenarios: readonly DemandScenario[] = [
  {
    id: "steady",
    label: "Stable campus cafe",
    caption: "Demand is centred near 90 units, with a moderate right tail.",
    outcomes: [
      { id: "d60", value: 60, weight: 12 },
      { id: "d75", value: 75, weight: 20 },
      { id: "d90", value: 90, weight: 32 },
      { id: "d105", value: 105, weight: 24 },
      { id: "d120", value: 120, weight: 12 },
    ],
  },
  {
    id: "launch",
    label: "Product launch",
    caption: "Demand has a heavier upside tail because stockouts lose launch momentum.",
    outcomes: [
      { id: "d70", value: 70, weight: 8 },
      { id: "d90", value: 90, weight: 18 },
      { id: "d110", value: 110, weight: 30 },
      { id: "d130", value: 130, weight: 28 },
      { id: "d150", value: 150, weight: 16 },
    ],
  },
  {
    id: "volatile",
    label: "Festival weather risk",
    caption: "Demand is wider and less predictable because attendance can swing sharply.",
    outcomes: [
      { id: "d40", value: 40, weight: 16 },
      { id: "d65", value: 65, weight: 26 },
      { id: "d90", value: 90, weight: 24 },
      { id: "d120", value: 120, weight: 20 },
      { id: "d150", value: 150, weight: 14 },
    ],
  },
];

const defaultScenario = scenarios[0] as DemandScenario;

export const newsvendorCriticalFractilePackageId =
  "sutd/esd/newsvendor-critical-fractile" as ConceptPackageId;

export const newsvendorCriticalFractileSpec: TSimulationSpec = {
  id: "newsvendor-critical-fractile",
  title: "Newsvendor Critical Fractile Explorer",
  interaction_type: "decision-matrix",
  kernel_deps: [
    "core/content-schema",
    "core/shared",
    "core/sim-runtime",
    "core/probability-stats",
    "core/optimization",
    "core/charting",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "demand-setting",
        label: "Demand setting",
        kind: "selector",
        kernel_binding: "state.scenario",
      },
      {
        id: "order-quantity",
        label: "Trial order quantity",
        kind: "slider",
        kernel_binding: "state.orderQuantity",
        bounds: { min: 40, max: 150, step: 5 },
      },
      {
        id: "underage-cost",
        label: "Shortage cost per unit",
        kind: "slider",
        kernel_binding: "state.underageCost",
        bounds: { min: 2, max: 30, step: 1 },
      },
      {
        id: "overage-cost",
        label: "Leftover cost per unit",
        kind: "slider",
        kernel_binding: "state.overageCost",
        bounds: { min: 2, max: 30, step: 1 },
      },
    ],
  },
  predict: {
    prompt:
      "If one missed sale costs far more than one leftover unit, where should the stocking target move?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Above the mean-demand point",
        "Exactly at mean demand",
        "To the lowest possible order",
        "Lower, because service is always expensive",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "critical-fractile-readout",
        module: "@paideia/sutd-sims/newsvendor-critical-fractile",
        symbol: "NewsvendorCriticalFractile",
        props_binding:
          "Display critical fractile, cost curve, substituted formula, units, legend, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why the optimal order is a demand fractile chosen by shortage and leftover costs, not automatically the mean.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "The optimal stock is always mean demand.",
      "A higher service level is always cheaper.",
    ],
  },
};

const defaultState: NewsvendorState = {
  scenario: "steady",
  orderQuantity: 90,
  underageCost: 18,
  overageCost: 6,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const roundToStep = (value: number, step: number): number => Math.round(value / step) * step;

const scenarioById = (id: DemandScenarioId): DemandScenario =>
  scenarios.find((scenario) => scenario.id === id) ?? defaultScenario;

const currentState = (state: Partial<NewsvendorState>): NewsvendorState => ({
  scenario:
    state.scenario === "launch" || state.scenario === "volatile" || state.scenario === "steady"
      ? state.scenario
      : defaultState.scenario,
  orderQuantity: roundToStep(clamp(state.orderQuantity ?? defaultState.orderQuantity, 40, 150), 5),
  underageCost: clamp(state.underageCost ?? defaultState.underageCost, 2, 30),
  overageCost: clamp(state.overageCost ?? defaultState.overageCost, 2, 30),
});

const formatMoney = (value: number): string => `${Number(value).toFixed(0)} SGD`;

const formatPct = (value: number): string => `${(Number(value) * 100).toFixed(1)}%`;

const analyzeNewsvendor = (
  partialState: Partial<NewsvendorState>,
): KernelResult<NewsvendorAnalysisView> => {
  const state = currentState(partialState);
  const scenario = scenarioById(state.scenario);
  const distribution = normalizeDistribution(scenario.outcomes);
  if (!distribution.ok) return distribution;
  const analysis = newsvendorCriticalFractile({
    distribution: distribution.value,
    orderQuantity: orderQuantityUnits(state.orderQuantity),
    underageCost: costSgdPerUnit(state.underageCost),
    overageCost: costSgdPerUnit(state.overageCost),
    quantityStep: orderQuantityUnits(5),
  });
  if (!analysis.ok) return analysis;

  return {
    ok: true,
    value: {
      ...analysis.value,
    state,
    distribution: distribution.value,
    },
  };
};

const scenarioOptions = scenarios.map((scenario) => ({
  value: scenario.id,
  label: scenario.label,
}));

const presetStates: readonly {
  readonly label: string;
  readonly state: NewsvendorState;
}[] = [
  {
    label: "balanced cafe",
    state: defaultState,
  },
  {
    label: "launch stockout risk",
    state: { scenario: "launch", orderQuantity: 120, underageCost: 26, overageCost: 5 },
  },
  {
    label: "leftover-sensitive festival",
    state: { scenario: "volatile", orderQuantity: 80, underageCost: 7, overageCost: 22 },
  },
];

const presetMatches = (state: NewsvendorState, preset: NewsvendorState): boolean =>
  state.scenario === preset.scenario &&
  state.orderQuantity === preset.orderQuantity &&
  state.underageCost === preset.underageCost &&
  state.overageCost === preset.overageCost;

const DemandBars = ({ analysis }: { readonly analysis: NewsvendorAnalysisView }) => {
  const maxProbability = Math.max(
    ...analysis.distribution.map((outcome) => Number(outcome.probability)),
  );
  return (
    <>
      <div aria-hidden="true" style={styles.bars}>
        {analysis.cdf.map((point) => {
          const height = `${Math.max(8, (Number(point.probability) / maxProbability) * 92)}%`;
          return (
            <div key={Number(point.quantity)} style={styles.barColumn}>
              <div style={{ ...styles.bar, height }} />
              <span>{Number(point.quantity)}</span>
              <small>{formatPct(Number(point.probability))}</small>
            </div>
          );
        })}
      </div>
      <table aria-label="Demand distribution with cumulative probability" style={styles.dataTable}>
        <thead>
          <tr>
            <th>Demand</th>
            <th>Probability</th>
            <th>Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {analysis.cdf.map((point) => (
            <tr key={Number(point.quantity)}>
              <td>{Number(point.quantity)} units</td>
              <td>{formatPct(Number(point.probability))}</td>
              <td>{formatPct(Number(point.cumulativeProbability))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

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

const FormulaPanel = ({ analysis }: { readonly analysis: NewsvendorAnalysisView }) => (
  <section aria-label="Formula evidence" style={styles.panel}>
    <div style={styles.panelHeader}>
      <p style={styles.kicker}>Formula</p>
      <h3 style={styles.h3}>Critical fractile rule</h3>
    </div>
    <div aria-label="Formula used" style={styles.formula}>
      CR = C_under / (C_under + C_over)
      <br />
      choose the smallest Q where F(Q) {">="} CR
      <br />
      E[cost(Q)] = C_under E[(D - Q)+] + C_over E[(Q - D)+]
    </div>
    <p style={styles.kicker}>Legend</p>
    <div aria-label="Formula legend" style={styles.legendGrid}>
      <span style={{ ...styles.legendMark, background: "#1f5f8b" }} />
      <span>C_under: shortage cost per unmet unit</span>
      <span style={{ ...styles.legendMark, background: "#b54708" }} />
      <span>C_over: leftover cost per unsold unit</span>
      <span style={{ ...styles.legendMark, background: "#027a48" }} />
      <span>F(Q): probability demand is no more than Q</span>
      <span style={{ ...styles.legendMark, background: "#6941c6" }} />
      <span>Q: order quantity in units</span>
    </div>
    <p style={styles.substitution}>
      Substitution: CR = {analysis.state.underageCost} SGD/unit / (
      {analysis.state.underageCost} + {analysis.state.overageCost}) SGD/unit ={" "}
      {Number(analysis.criticalFractile).toFixed(3)} = {formatPct(analysis.criticalFractile)}.
      The first demand quantity with F(Q) at least that value is{" "}
      {analysis.recommendedQuantity} units, where F(Q) ={" "}
      {formatPct(analysis.recommendedServiceLevel)}.
    </p>
    <p style={styles.interpretation}>
      Units: costs are SGD per unit, the order quantity is in units, and the critical fractile
      and F(Q) are unitless probabilities. Result: CR ={" "}
      {formatPct(analysis.criticalFractile)}, recommended order quantity Q ={" "}
      {analysis.recommendedQuantity} units at service level {formatPct(analysis.recommendedServiceLevel)}.
    </p>
    <p style={styles.interpretation}>
      Interpretation: the fractile asks for enough inventory to make one more unit worthwhile
      until shortage and leftover penalties balance. Here the dominant penalty is{" "}
      {analysis.dominantPenalty === "shortage" ? "missing demand" : "carrying leftovers"}, so
      the rule points {analysis.dominantPenalty === "shortage" ? "above" : "below"} the centre
      of the demand distribution.
    </p>
  </section>
);

const CostChart = ({ analysis }: { readonly analysis: NewsvendorAnalysisView }) => {
  const chartData = analysis.costCurve.map((point) => ({
    x: Number(point.quantity),
    y: Number(point.expectedCost),
    series: "Expected mismatch cost",
  }));
  return (
    <section aria-label="Expected cost curve" style={styles.panel}>
      <div style={styles.panelHeader}>
        <p style={styles.kicker}>Observe</p>
        <h3 style={styles.h3}>Expected cost by trial order</h3>
      </div>
      <LineChart
        ariaLabel="Expected mismatch cost curve by order quantity"
        data={chartData}
        x={{ label: "Order quantity", domain: { min: 40, max: 150 } }}
        y={{ label: "Expected cost", domain: { min: 0, max: Math.max(...chartData.map((p) => p.y)) } }}
      />
      <p style={styles.interpretation}>
        Trial Q = {analysis.state.orderQuantity} units has expected mismatch cost{" "}
        {formatMoney(analysis.selectedExpectedCost)}. The rule's Q ={" "}
        {analysis.recommendedQuantity} units has expected mismatch cost{" "}
        {formatMoney(analysis.recommendedExpectedCost)}. Ordering at the mean demand (
        {Number(analysis.meanDemand).toFixed(1)} units) would cost about{" "}
        {formatMoney(analysis.meanDemandExpectedCost)}.
      </p>
    </section>
  );
};

const ManipulateStage = () => {
  const { state, set } = useManipulate<NewsvendorState>();
  const current = currentState(state);
  const scenario = scenarioById(current.scenario);
  const analysis = analyzeNewsvendor(current);

  const applyPreset = (preset: NewsvendorState) => {
    set("scenario", preset.scenario);
    set("orderQuantity", preset.orderQuantity);
    set("underageCost", preset.underageCost);
    set("overageCost", preset.overageCost);
  };

  return (
    <section aria-label="Newsvendor controls" style={styles.surface}>
      <div style={styles.mainGrid}>
        <section style={styles.panel}>
          <p style={styles.kicker}>Manipulate</p>
          <h2 style={styles.h2}>Set demand risk and unit costs</h2>
          <div aria-label="Scenario presets" style={styles.presets}>
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
          <ControlGroup legend="Decision inputs">
            <div style={styles.controlStack}>
              <Selector
                label="Demand setting"
                onChange={(value) => set("scenario", value)}
                options={scenarioOptions}
                value={current.scenario}
              />
              <Slider
                label="Trial order quantity"
                max={150}
                min={40}
                onChange={(value) => set("orderQuantity", value)}
                step={5}
                unit="units"
                value={current.orderQuantity}
              />
              <Slider
                label="Shortage cost per unit"
                max={30}
                min={2}
                onChange={(value) => set("underageCost", value)}
                step={1}
                unit="SGD"
                value={current.underageCost}
              />
              <Slider
                label="Leftover cost per unit"
                max={30}
                min={2}
                onChange={(value) => set("overageCost", value)}
                step={1}
                unit="SGD"
                value={current.overageCost}
              />
            </div>
          </ControlGroup>
        </section>
        <section style={styles.panel}>
          <p style={styles.kicker}>Demand</p>
          <h3 style={styles.h3}>{scenario.label}</h3>
          <p>{scenario.caption}</p>
          {analysis.ok ? <DemandBars analysis={analysis.value} /> : null}
        </section>
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const analysis = analyzeNewsvendor(useSimState<Partial<NewsvendorState>>());
  if (!analysis.ok) {
    return (
      <section aria-label="Observation unlocked" role="region">
        <p role="alert">The inventory calculation could not be completed.</p>
      </section>
    );
  }

  return (
    <section aria-label="Observation unlocked" role="region" style={styles.surface}>
      <div style={styles.metricGrid}>
        <MetricCard
          label="Critical fractile"
          note="target service level from cost balance"
          value={formatPct(analysis.value.criticalFractile)}
        />
        <MetricCard
          label="Rule order"
          note={`first demand point with F(Q) >= ${formatPct(analysis.value.criticalFractile)}`}
          value={`${analysis.value.recommendedQuantity} units`}
        />
        <MetricCard
          label="Trial service level"
          note="chance of meeting all demand"
          value={formatPct(analysis.value.selectedServiceLevel)}
        />
      </div>
      <div style={styles.mainGrid}>
        <FormulaPanel analysis={analysis.value} />
        <CostChart analysis={analysis.value} />
      </div>
      <section aria-label="Decision interpretation" style={styles.panel}>
        <p style={styles.kicker}>Explain</p>
        <h3 style={styles.h3}>What changed when you moved the controls?</h3>
        <p>
          Mean demand is {Number(analysis.value.meanDemand).toFixed(1)} units, but the
          stocking rule chooses {analysis.value.recommendedQuantity} units because the marginal
          cost of one missing unit and one leftover unit are asymmetric. A higher service level
          is cheaper only while its avoided shortage cost is larger than its added leftover cost.
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
        <h2 style={styles.h2}>Choose a stocking target for a lab kit pop-up</h2>
        <p>
          A pop-up store sells kits for one day. A shortage costs 24 SGD per missed kit and a
          leftover kit costs 8 SGD. Forecast demand has probabilities at 50, 70, 90, 110, and
          130 kits. Compute the critical fractile, locate it on the cumulative distribution, and
          state whether the answer should sit above or below mean demand.
        </p>
        <button onClick={() => stage.reset()} style={styles.primaryButton} type="button">
          Try another demand setting
        </button>
      </section>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "explain") return <ExplainStage />;
  if (stage.current === "observe") return <ObserveStage />;
  return (
    <>
      <ManipulateStage />
      <ObserveStage />
    </>
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
    background: "#fffdf7",
    border: "1px solid #cdd7d0",
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
    color: "#596b60",
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
    background: "#eef4f1",
    border: "1px solid #9fb4a8",
    borderRadius: "6px",
    color: "#172026",
    padding: "0.45rem 0.65rem",
  },
  presetButtonActive: {
    background: "#d8ebe3",
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
  bars: {
    alignItems: "end",
    display: "grid",
    gap: "0.45rem",
    gridTemplateColumns: "repeat(5, minmax(2.5rem, 1fr))",
    height: "12rem",
    marginTop: "1rem",
  },
  barColumn: {
    alignItems: "center",
    display: "grid",
    gap: "0.25rem",
    gridTemplateRows: "1fr auto auto",
    height: "100%",
  },
  bar: {
    alignSelf: "end",
    background: "#2f6f73",
    borderRadius: "6px 6px 0 0",
    minHeight: "0.5rem",
    width: "100%",
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
    background: "#f1f7f4",
    border: "1px solid #c3d4ca",
    borderRadius: "8px",
    display: "grid",
    gap: "0.2rem",
    padding: "0.85rem",
  },
  metricLabel: {
    color: "#506357",
    fontSize: "0.82rem",
    fontWeight: 700,
  },
  metricValue: {
    color: "#133f43",
    fontSize: "1.45rem",
    lineHeight: 1.1,
  },
  formula: {
    background: "#f5f1e8",
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

export default function NewsvendorCriticalFractile() {
  return (
    <SimRuntime
      packageId={newsvendorCriticalFractilePackageId}
      spec={newsvendorCriticalFractileSpec}
    >
      <StageSurface />
    </SimRuntime>
  );
}
