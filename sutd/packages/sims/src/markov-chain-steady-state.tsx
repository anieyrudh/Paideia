import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  eigenvectors2,
  matrix2,
  multiplyMatrixVector2,
  vector2,
  type Matrix2,
  type Vector2,
} from "@paideia/linear-algebra";
import {
  normalizeDistribution,
  type DiscreteDistribution,
  type WeightedOutcome,
} from "@paideia/probability-stats";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { ConceptPackageId, KernelResult } from "@paideia/shared";
import { approxEqual, err, ok } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

interface MarkovState {
  readonly smoothStaysSmooth: number;
  readonly congestedRecovers: number;
  readonly initialSmooth: number;
  readonly weeks: number;
}

interface MarkovTrajectoryPoint {
  readonly week: number;
  readonly smooth: number;
  readonly congested: number;
}

interface MarkovAnalysis {
  readonly state: MarkovState;
  readonly matrix: Matrix2;
  readonly trajectory: readonly MarkovTrajectoryPoint[];
  readonly steadyDistribution: DiscreteDistribution<"smooth" | "congested">;
  readonly steadySmooth: number;
  readonly steadyCongested: number;
  readonly eigenSmooth: number;
  readonly eigenCongested: number;
  readonly startSmoothToCongestedFlow: number;
  readonly startCongestedToSmoothFlow: number;
  readonly steadySmoothToCongestedFlow: number;
  readonly steadyCongestedToSmoothFlow: number;
}

const defaultState: MarkovState = {
  smoothStaysSmooth: 0.84,
  congestedRecovers: 0.38,
  initialSmooth: 0.72,
  weeks: 10,
};

export const markovChainSteadyStatePackageId =
  "sutd/esd/markov-chain-steady-state" as ConceptPackageId;

export const markovChainSteadyStateSpec: TSimulationSpec = {
  id: "markov-chain-steady-state",
  title: "Markov Chain Steady-State Lab",
  interaction_type: "systems-flow-diagram",
  kernel_deps: [
    "core/content-schema",
    "core/shared",
    "core/sim-runtime",
    "core/probability-stats",
    "core/linear-algebra",
    "core/charting",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "smooth-stays-smooth",
        label: "Smooth week stays smooth",
        kind: "slider",
        kernel_binding: "state.smoothStaysSmooth",
        bounds: { min: 0.55, max: 0.95, step: 0.01 },
      },
      {
        id: "congested-recovers",
        label: "Congested week recovers",
        kind: "slider",
        kernel_binding: "state.congestedRecovers",
        bounds: { min: 0.05, max: 0.65, step: 0.01 },
      },
      {
        id: "initial-smooth",
        label: "Initial smooth probability",
        kind: "slider",
        kernel_binding: "state.initialSmooth",
        bounds: { min: 0.05, max: 0.95, step: 0.01 },
      },
      {
        id: "weeks",
        label: "Forecast horizon",
        kind: "slider",
        kernel_binding: "state.weeks",
        bounds: { min: 2, max: 20, step: 1 },
      },
    ],
  },
  predict: {
    prompt:
      "A system is more likely to stay smooth than to recover once it becomes congested. Before reveal, where should the long-run mix move?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Toward more smooth weeks",
        "Toward more congested weeks",
        "Exactly to the initial week mix",
        "To whichever state has the larger one-step arrow",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "steady-state-readout",
        module: "@paideia/sutd-sims/markov-chain-steady-state",
        symbol: "MarkovChainSteadyState",
        props_binding:
          "Render transition matrix, repeated update, formula substitution, probability legend, convergence chart, and long-run interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why a steady-state distribution can stay fixed while individual weeks still transition between states.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Steady state means no individual transitions happen",
      "The largest immediate transition always dominates long-run state",
    ],
  },
};

const presetStates: readonly {
  readonly label: string;
  readonly state: MarkovState;
}[] = [
  { label: "balanced operations", state: defaultState },
  {
    label: "sticky congestion",
    state: {
      smoothStaysSmooth: 0.78,
      congestedRecovers: 0.18,
      initialSmooth: 0.65,
      weeks: 12,
    },
  },
  {
    label: "fast recovery",
    state: {
      smoothStaysSmooth: 0.88,
      congestedRecovers: 0.58,
      initialSmooth: 0.4,
      weeks: 8,
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const roundToStep = (value: number, step: number): number =>
  Math.round(value / step) * step;

const currentState = (state: Partial<MarkovState>): MarkovState => ({
  smoothStaysSmooth: clamp(state.smoothStaysSmooth ?? defaultState.smoothStaysSmooth, 0.55, 0.95),
  congestedRecovers: clamp(state.congestedRecovers ?? defaultState.congestedRecovers, 0.05, 0.65),
  initialSmooth: clamp(state.initialSmooth ?? defaultState.initialSmooth, 0.05, 0.95),
  weeks: roundToStep(clamp(state.weeks ?? defaultState.weeks, 2, 20), 1),
});

const formatPct = (value: number): string => `${(value * 100).toFixed(1)}%`;

const formatMatrixCell = (value: number): string => value.toFixed(2);

const trajectoryPoint = (week: number, vector: Vector2): MarkovTrajectoryPoint => ({
  week,
  smooth: vector[0],
  congested: vector[1],
});

const steadyWeights = (
  smoothStaysSmooth: number,
  congestedRecovers: number,
): readonly WeightedOutcome<"smooth" | "congested">[] => [
  { id: "smooth", value: 1, weight: congestedRecovers },
  { id: "congested", value: 0, weight: 1 - smoothStaysSmooth },
];

const steadyFromDistribution = (
  distribution: DiscreteDistribution<"smooth" | "congested">,
  id: "smooth" | "congested",
): KernelResult<number> => {
  const outcome = distribution.find((entry) => entry.id === id);
  return outcome === undefined
    ? err("precondition-violated", `Missing ${id} steady-state probability`)
    : ok(Number(outcome.probability));
};

const eigenSteadyState = (matrix: Matrix2): KernelResult<readonly [number, number]> => {
  const eigenpairs = eigenvectors2(matrix);
  if (!eigenpairs.ok) return eigenpairs;
  const steadyPair = eigenpairs.value.find((pair) => approxEqual(pair.value, 1, 1e-8));
  if (steadyPair === undefined) {
    return err("precondition-violated", "No eigenvector at eigenvalue 1 was found");
  }

  const oriented =
    steadyPair.vector[0] + steadyPair.vector[1] < 0
      ? ([-steadyPair.vector[0], -steadyPair.vector[1]] as const)
      : steadyPair.vector;
  const total = oriented[0] + oriented[1];
  if (total <= 0 || oriented[0] < -1e-8 || oriented[1] < -1e-8) {
    return err("precondition-violated", "Steady eigenvector cannot be normalised as probabilities");
  }

  return ok([oriented[0] / total, oriented[1] / total] as const);
};

export const analyzeMarkovSteadyState = (
  partialState: Partial<MarkovState>,
): KernelResult<MarkovAnalysis> => {
  const state = currentState(partialState);
  const transition = matrix2(
    state.smoothStaysSmooth,
    state.congestedRecovers,
    1 - state.smoothStaysSmooth,
    1 - state.congestedRecovers,
  );
  if (!transition.ok) return transition;

  const initial = vector2(state.initialSmooth, 1 - state.initialSmooth);
  if (!initial.ok) return initial;

  const trajectory: MarkovTrajectoryPoint[] = [trajectoryPoint(0, initial.value)];
  let current = initial.value;
  for (let week = 1; week <= state.weeks; week += 1) {
    const next = multiplyMatrixVector2(transition.value, current);
    if (!next.ok) return next;
    current = next.value;
    trajectory.push(trajectoryPoint(week, current));
  }

  const steadyDistribution = normalizeDistribution(
    steadyWeights(state.smoothStaysSmooth, state.congestedRecovers),
  );
  if (!steadyDistribution.ok) return steadyDistribution;
  const steadySmooth = steadyFromDistribution(steadyDistribution.value, "smooth");
  if (!steadySmooth.ok) return steadySmooth;
  const steadyCongested = steadyFromDistribution(steadyDistribution.value, "congested");
  if (!steadyCongested.ok) return steadyCongested;
  const eigenSteady = eigenSteadyState(transition.value);
  if (!eigenSteady.ok) return eigenSteady;

  return ok({
    state,
    matrix: transition.value,
    trajectory,
    steadyDistribution: steadyDistribution.value,
    steadySmooth: steadySmooth.value,
    steadyCongested: steadyCongested.value,
    eigenSmooth: eigenSteady.value[0],
    eigenCongested: eigenSteady.value[1],
    startSmoothToCongestedFlow: state.initialSmooth * (1 - state.smoothStaysSmooth),
    startCongestedToSmoothFlow: (1 - state.initialSmooth) * state.congestedRecovers,
    steadySmoothToCongestedFlow: steadySmooth.value * (1 - state.smoothStaysSmooth),
    steadyCongestedToSmoothFlow: steadyCongested.value * state.congestedRecovers,
  });
};

const presetMatches = (state: MarkovState, preset: MarkovState): boolean =>
  state.smoothStaysSmooth === preset.smoothStaysSmooth &&
  state.congestedRecovers === preset.congestedRecovers &&
  state.initialSmooth === preset.initialSmooth &&
  state.weeks === preset.weeks;

const Metric = ({
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

const TransitionMatrix = ({ analysis }: { readonly analysis: MarkovAnalysis }) => (
  <table aria-label="Transition matrix" style={styles.matrixTable}>
    <thead>
      <tr>
        <th>Next \ Current</th>
        <th>Smooth now</th>
        <th>Congested now</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th>Smooth next</th>
        <td>{formatMatrixCell(analysis.matrix[0][0])}</td>
        <td>{formatMatrixCell(analysis.matrix[0][1])}</td>
      </tr>
      <tr>
        <th>Congested next</th>
        <td>{formatMatrixCell(analysis.matrix[1][0])}</td>
        <td>{formatMatrixCell(analysis.matrix[1][1])}</td>
      </tr>
    </tbody>
  </table>
);

const TrajectoryTable = ({ analysis }: { readonly analysis: MarkovAnalysis }) => (
  <table aria-label="State trajectory" style={styles.dataTable}>
    <thead>
      <tr>
        <th>Week</th>
        <th>P(smooth)</th>
        <th>P(congested)</th>
      </tr>
    </thead>
    <tbody>
      {analysis.trajectory.slice(0, 6).map((point) => (
        <tr key={point.week}>
          <td>{point.week}</td>
          <td>{formatPct(point.smooth)}</td>
          <td>{formatPct(point.congested)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const FormulaPanel = ({ analysis }: { readonly analysis: MarkovAnalysis }) => (
  <section aria-label="Formula evidence" style={styles.panel}>
    <p style={styles.kicker}>Formula</p>
    <h3 style={styles.h3}>Stationary distribution</h3>
    <div aria-label="Formula used" style={styles.formula}>
      x_(t+1) = P x_t
      <br />
      pi = P pi, with pi_S + pi_C = 1
      <br />
      pi_S = b / (b + 1 - a), pi_C = (1 - a) / (b + 1 - a)
    </div>
    <p style={styles.kicker}>Legend</p>
    <div aria-label="Formula legend" style={styles.legendGrid}>
      <span style={{ ...styles.legendMark, background: "#1f5f8b" }} />
      <span>a: probability per week that a smooth week stays smooth</span>
      <span style={{ ...styles.legendMark, background: "#b54708" }} />
      <span>b: probability per week that a congested week recovers to smooth</span>
      <span style={{ ...styles.legendMark, background: "#027a48" }} />
      <span>pi: long-run probability vector</span>
      <span style={{ ...styles.legendMark, background: "#6941c6" }} />
      <span>x_t: probability vector at week t</span>
    </div>
    <p style={styles.substitution}>
      Substitution: a = {formatPct(analysis.state.smoothStaysSmooth)} per week, b ={" "}
      {formatPct(analysis.state.congestedRecovers)} per week, so pi_S ={" "}
      {analysis.state.congestedRecovers.toFixed(2)} / (
      {analysis.state.congestedRecovers.toFixed(2)} +{" "}
      {(1 - analysis.state.smoothStaysSmooth).toFixed(2)}) ={" "}
      {formatPct(analysis.steadySmooth)}. Therefore pi_C ={" "}
      {formatPct(analysis.steadyCongested)}.
    </p>
    <p style={styles.interpretation}>
      Units: a, b, and the pi components are probabilities per week (unitless ratios).
      Result: pi_S = {formatPct(analysis.steadySmooth)}, pi_C ={" "}
      {formatPct(analysis.steadyCongested)} at steady state.
    </p>
    <p style={styles.interpretation}>
      Interpretation: after many weekly transitions, the system spends about{" "}
      {formatPct(analysis.steadySmooth)} of weeks smooth and{" "}
      {formatPct(analysis.steadyCongested)} congested. Individual weeks still move,
      but steady inflow and outflow balance.
    </p>
  </section>
);

const ConvergenceChart = ({ analysis }: { readonly analysis: MarkovAnalysis }) => {
  const data = analysis.trajectory.flatMap((point) => [
    { x: point.week, y: point.smooth, series: "Smooth" },
    { x: point.week, y: point.congested, series: "Congested" },
  ]);
  return (
    <section aria-label="Convergence chart" style={styles.panel}>
      <p style={styles.kicker}>Observe</p>
      <h3 style={styles.h3}>State mix over repeated weeks</h3>
      <LineChart
        ariaLabel="Smooth and congested probabilities by week"
        data={data}
        x={{ label: "Week", domain: { min: 0, max: analysis.state.weeks } }}
        y={{ label: "Probability", domain: { min: 0, max: 1 } }}
      />
      <div style={styles.chartLegend}>
        <span><span style={{ ...styles.legendMark, background: "#1f5f8b" }} /> Smooth</span>
        <span><span style={{ ...styles.legendMark, background: "#b42318" }} /> Congested</span>
      </div>
      <p style={styles.interpretation}>
        The eigenvector check gives ({formatPct(analysis.eigenSmooth)},{" "}
        {formatPct(analysis.eigenCongested)}) for eigenvalue 1, matching the
        probability-normalised steady state.
      </p>
    </section>
  );
};

const ManipulateStage = () => {
  const { state, set } = useManipulate<MarkovState>();
  const current = currentState(state);
  const analysis = analyzeMarkovSteadyState(current);

  const applyPreset = (preset: MarkovState) => {
    set("smoothStaysSmooth", preset.smoothStaysSmooth);
    set("congestedRecovers", preset.congestedRecovers);
    set("initialSmooth", preset.initialSmooth);
    set("weeks", preset.weeks);
  };

  return (
    <section aria-label="Markov chain controls" style={styles.surface}>
      <div style={styles.mainGrid}>
        <section style={styles.panel}>
          <p style={styles.kicker}>Manipulate</p>
          <h2 style={styles.h2}>Set the transition matrix</h2>
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
          <ControlGroup legend="Transition inputs">
            <div style={styles.controlStack}>
              <Slider
                label="Smooth week stays smooth"
                max={0.95}
                min={0.55}
                onChange={(value) => set("smoothStaysSmooth", value)}
                step={0.01}
                unit="probability per week"
                value={current.smoothStaysSmooth}
              />
              <Slider
                label="Congested week recovers"
                max={0.65}
                min={0.05}
                onChange={(value) => set("congestedRecovers", value)}
                step={0.01}
                unit="probability per week"
                value={current.congestedRecovers}
              />
              <Slider
                label="Initial smooth probability"
                max={0.95}
                min={0.05}
                onChange={(value) => set("initialSmooth", value)}
                step={0.01}
                unit="probability"
                value={current.initialSmooth}
              />
              <Slider
                label="Forecast horizon"
                max={20}
                min={2}
                onChange={(value) => set("weeks", value)}
                step={1}
                unit="weeks"
                value={current.weeks}
              />
            </div>
          </ControlGroup>
        </section>
        <section style={styles.panel}>
          <p style={styles.kicker}>Matrix</p>
          <h3 style={styles.h3}>Current transition rule</h3>
          {analysis.ok ? <TransitionMatrix analysis={analysis.value} /> : null}
          <p style={styles.interpretation}>
            Each column is a current state and sums to 1. For example, if this week is
            smooth, next week is smooth with probability {formatPct(current.smoothStaysSmooth)}
            and congested with probability {formatPct(1 - current.smoothStaysSmooth)}.
          </p>
        </section>
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const analysis = analyzeMarkovSteadyState(useSimState<Partial<MarkovState>>());
  if (!analysis.ok) {
    return (
      <section aria-label="Observation unlocked" role="region">
        <p role="alert">The Markov-chain calculation could not be completed.</p>
      </section>
    );
  }

  return (
    <section aria-label="Observation unlocked" role="region" style={styles.surface}>
      <div style={styles.metricGrid}>
        <Metric
          label="Steady smooth"
          note="long-run share of smooth weeks"
          value={formatPct(analysis.value.steadySmooth)}
        />
        <Metric
          label="Steady congested"
          note="long-run share of congested weeks"
          value={formatPct(analysis.value.steadyCongested)}
        />
        <Metric
          label="Balanced flow"
          note="smooth to congested equals congested to smooth"
          value={formatPct(analysis.value.steadySmoothToCongestedFlow)}
        />
      </div>
      <div style={styles.mainGrid}>
        <FormulaPanel analysis={analysis.value} />
        <ConvergenceChart analysis={analysis.value} />
      </div>
      <section aria-label="Repeated update table" style={styles.panel}>
        <p style={styles.kicker}>Trajectory</p>
        <h3 style={styles.h3}>First repeated updates</h3>
        <TrajectoryTable analysis={analysis.value} />
        <p style={styles.interpretation}>
          Starting flow from smooth to congested is{" "}
          {formatPct(analysis.value.startSmoothToCongestedFlow)}, while flow from
          congested to smooth is {formatPct(analysis.value.startCongestedToSmoothFlow)}.
          At steady state both flows are{" "}
          {formatPct(analysis.value.steadySmoothToCongestedFlow)} per week.
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
        <h2 style={styles.h2}>Service-ticket backlog</h2>
        <p>
          A service desk has stable and backed-up weeks. From stable, 78% of weeks stay
          stable. From backed-up, 35% recover to stable. Starting from 60% stable,
          compute the next two weekly mixes and the steady-state distribution.
        </p>
        <button onClick={() => stage.reset()} style={styles.primaryButton} type="button">
          Try another transition rule
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
    background: "#ffffff",
    border: "1px solid #c8d7cf",
    borderRadius: "8px",
    padding: "1rem",
  },
  h1: {
    fontSize: "2.4rem",
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
    margin: "0 0 0.75rem",
  },
  kicker: {
    color: "#54645c",
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
  metricGrid: {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
    marginBottom: "1rem",
  },
  metric: {
    background: "#f3f8f5",
    border: "1px solid #c4d8cd",
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
    color: "#123f43",
    fontSize: "1.45rem",
    lineHeight: 1.1,
  },
  matrixTable: {
    borderCollapse: "collapse",
    fontSize: "0.9rem",
    marginTop: "0.75rem",
    width: "100%",
  },
  dataTable: {
    borderCollapse: "collapse",
    fontSize: "0.9rem",
    marginTop: "0.75rem",
    width: "100%",
  },
  formula: {
    background: "#f6f3ec",
    border: "1px solid #d9ccb7",
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
    display: "inline-block",
    height: "0.85rem",
    marginRight: "0.3rem",
    verticalAlign: "middle",
    width: "0.85rem",
  },
  chartLegend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.8rem",
    marginTop: "0.5rem",
  },
  substitution: {
    marginTop: "0.9rem",
  },
  interpretation: {
    marginTop: "0.7rem",
  },
} as const;

export default function MarkovChainSteadyState() {
  return (
    <SimRuntime packageId={markovChainSteadyStatePackageId} spec={markovChainSteadyStateSpec}>
      <StageSurface />
    </SimRuntime>
  );
}
