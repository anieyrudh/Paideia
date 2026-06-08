import type { TSimulationSpec } from "@paideia/content-schema";
import {
  densityKgPerCubicMetre,
  embodiedCarbonKgCO2ePerKg,
  pascals,
  rankMaterials,
  type MaterialProperties,
  type PerformanceGoal,
} from "@paideia/materials";
import { err, ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";

type PolymerId = "pet" | "hdpe" | "pla";

type PolymerState = {
  readonly performanceGoal: PerformanceGoal;
  readonly collectionRatePercent: number;
  readonly reuseCycles: number;
};

type PolymerEvidence = {
  readonly selected: PolymerId;
  readonly selectedName: string;
  readonly score: number;
  readonly normalizedScore: number;
  readonly landfillFraction: number;
  readonly avoidedItems: number;
  readonly topThree: readonly {
    readonly id: PolymerId;
    readonly name: string;
    readonly score: number;
  }[];
};

export const polymersPackageId =
  "sutd/10-016-science-for-a-sustainable-world/polymers-and-plastic-waste-management" as ConceptPackageId;

export const polymersSpec: TSimulationSpec = {
  id: "polymers-and-plastic-waste-management",
  title: "Polymers and Plastic Waste Management Lab",
  interaction_type: "decision-matrix",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate", "core/materials", "core/ui-sim"],
  predict: {
    prompt:
      "For a lightweight reusable food container, which evidence should be checked before choosing a polymer?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Only the recycling symbol",
        "Strength, density, embodied carbon, and collection pathway",
        "Only whether it is labelled biodegradable",
        "Only the cheapest resin price",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "performance-goal",
        label: "Selection goal",
        kind: "selector",
        kernel_binding: "state.performanceGoal",
      },
      {
        id: "collection-rate-percent",
        label: "Collected for recovery",
        kind: "slider",
        kernel_binding: "state.collectionRatePercent",
        bounds: { min: 0, max: 100, step: 5 },
      },
      {
        id: "reuse-cycles",
        label: "Reuse cycles",
        kind: "slider",
        kernel_binding: "state.reuseCycles",
        bounds: { min: 1, max: 20, step: 1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "polymer-decision-evidence",
        module: "@paideia/sutd-sims/polymers-and-plastic-waste-management",
        symbol: "PolymersAndPlasticWasteManagement",
        props_binding: "Rank candidate polymers and connect collection rate to residual waste.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why polymer selection is a trade-off between useful material properties and end-of-life system design.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Biodegradable always means lowest impact.",
      "A recycling symbol guarantees recovery.",
    ],
  },
};

const unwrap = <T,>(result: KernelResult<T>): T => {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const polymerRecords = (): readonly MaterialProperties[] => [
  {
    id: "pet",
    name: "PET bottle-grade polymer",
    class: "polymer",
    density: unwrap(densityKgPerCubicMetre(1380)),
    youngModulus: unwrap(pascals(2.4e9)),
    yieldStrength: unwrap(pascals(55e6)),
    ultimateStrength: unwrap(pascals(70e6)),
    embodiedCarbon: unwrap(embodiedCarbonKgCO2ePerKg(2.8)),
  },
  {
    id: "hdpe",
    name: "HDPE rigid packaging",
    class: "polymer",
    density: unwrap(densityKgPerCubicMetre(955)),
    youngModulus: unwrap(pascals(1.0e9)),
    yieldStrength: unwrap(pascals(28e6)),
    ultimateStrength: unwrap(pascals(35e6)),
    embodiedCarbon: unwrap(embodiedCarbonKgCO2ePerKg(1.9)),
  },
  {
    id: "pla",
    name: "PLA compostable polymer",
    class: "polymer",
    density: unwrap(densityKgPerCubicMetre(1240)),
    youngModulus: unwrap(pascals(3.2e9)),
    yieldStrength: unwrap(pascals(50e6)),
    ultimateStrength: unwrap(pascals(60e6)),
    embodiedCarbon: unwrap(embodiedCarbonKgCO2ePerKg(1.6)),
  },
];

const defaults: PolymerState = {
  performanceGoal: "low-carbon-strength",
  collectionRatePercent: 55,
  reuseCycles: 5,
};

const allowedGoals: readonly PerformanceGoal[] = [
  "specific-strength",
  "low-carbon-strength",
  "low-carbon-stiffness",
];

const currentState = (state: Partial<PolymerState>): PolymerState => {
  const goal = allowedGoals.includes(state.performanceGoal ?? defaults.performanceGoal)
    ? state.performanceGoal ?? defaults.performanceGoal
    : defaults.performanceGoal;
  return {
    performanceGoal: goal,
    collectionRatePercent: Math.min(100, Math.max(0, state.collectionRatePercent ?? defaults.collectionRatePercent)),
    reuseCycles: Math.min(20, Math.max(1, state.reuseCycles ?? defaults.reuseCycles)),
  };
};

export const polymerEvidence = (state: PolymerState): KernelResult<PolymerEvidence> => {
  if (
    !Number.isFinite(state.collectionRatePercent) ||
    state.collectionRatePercent < 0 ||
    state.collectionRatePercent > 100
  ) {
    return err(
      "out-of-domain",
      `collectionRatePercent must be finite and in [0, 100], got ${state.collectionRatePercent}`,
    );
  }
  if (!Number.isFinite(state.reuseCycles) || state.reuseCycles < 1 || state.reuseCycles > 20) {
    return err("out-of-domain", `reuseCycles must be finite and in [1, 20], got ${state.reuseCycles}`);
  }

  const ranked = rankMaterials(polymerRecords(), state.performanceGoal);
  if (!ranked.ok) return ranked;

  const best = ranked.value[0];
  if (best === undefined) {
    return err("precondition-violated", "polymer ranking returned no candidates");
  }

  const collectionFraction = state.collectionRatePercent / 100;
  const landfillFraction = 1 - collectionFraction;
  const avoidedItems = 100 - Math.ceil(100 / state.reuseCycles);
  const bestScore = best.score || 1;

  return ok({
    selected: best.material.id as PolymerId,
    selectedName: best.material.name,
    score: best.score,
    normalizedScore: best.score / bestScore,
    landfillFraction,
    avoidedItems,
    topThree: ranked.value.map((score) => ({
      id: score.material.id as PolymerId,
      name: score.material.name,
      score: score.score,
    })),
  });
};

const formatScore = (score: number): string =>
  score >= 1_000 ? score.toExponential(2) : score.toFixed(2);

const ControlPanel = () => {
  const stage = useStage();
  const { state, set } = useManipulate<PolymerState>();
  const current = currentState(state);

  return (
    <section aria-label="Polymer controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Choose the decision evidence</h2>
        <label className="sutd-control">
          <span>Selection goal: <strong>{current.performanceGoal}</strong></span>
          <select
            aria-label="Selection goal"
            onChange={(event) => set("performanceGoal", event.currentTarget.value as PerformanceGoal)}
            value={current.performanceGoal}
          >
            {allowedGoals.map((goal) => <option key={goal} value={goal}>{goal}</option>)}
          </select>
        </label>
        <label className="sutd-control">
          <span>Collected for recovery: <strong>{current.collectionRatePercent}%</strong></span>
          <input aria-label="Collected for recovery" max={100} min={0} onChange={(event) => set("collectionRatePercent", Number(event.currentTarget.value))} step={5} type="range" value={current.collectionRatePercent} />
        </label>
        <label className="sutd-control">
          <span>Reuse cycles: <strong>{current.reuseCycles}</strong></span>
          <input aria-label="Reuse cycles" max={20} min={1} onChange={(event) => set("reuseCycles", Number(event.currentTarget.value))} step={1} type="range" value={current.reuseCycles} />
        </label>
        <button type="button" onClick={() => stage.advance()}>Reveal polymer trade-off</button>
      </div>
      <section aria-label="Before reveal cue" className="sutd-formula-card">
        <p className="meta-line">Before reveal</p>
        <h3>Plastic waste is not solved by a label alone</h3>
        <p>Prediction checkpoint, then compare material performance with the recovery pathway.</p>
      </section>
    </section>
  );
};

const RankingBars = ({ evidence }: { readonly evidence: PolymerEvidence }) => (
  <svg aria-label="Polymer ranking chart" className="sutd-diagram" role="img" viewBox="0 0 320 170">
    <rect fill="#f8fafc" height="170" rx="12" width="320" />
    {evidence.topThree.map((entry, index) => {
      const topScore = evidence.topThree[0]?.score ?? entry.score;
      const width = 55 + (entry.score / topScore) * 190;
      const y = 32 + index * 42;
      return (
        <g key={entry.id}>
          <text fill="#0f172a" fontSize="13" fontWeight="700" x="18" y={y + 17}>{entry.id.toUpperCase()}</text>
          <rect fill={entry.id === evidence.selected ? "#2563eb" : "#94a3b8"} height="22" rx="5" width={width} x="72" y={y} />
          <text fill="#334155" fontSize="12" x={width + 80} y={y + 16}>{formatScore(entry.score)}</text>
        </g>
      );
    })}
    <text fill="#0f172a" fontSize="13" x="18" y="154">unrecovered fraction: {(evidence.landfillFraction * 100).toFixed(0)}%</text>
  </svg>
);

const Observation = () => {
  const state = currentState(useSimState<Partial<PolymerState>>());
  const evidence = polymerEvidence(state);
  if (!evidence.ok) {
    return <p role="alert">Unable to rank the polymer candidates.</p>;
  }
  const value = evidence.value;
  return (
    <section aria-label="Observation unlocked" className="sutd-sim-panel" role="region">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Polymer choice plus recovery pathway</h2>
        <RankingBars evidence={value} />
        <dl aria-label="Polymer readout" className="sutd-result-grid">
          <div><dt>Top candidate</dt><dd>{value.selectedName}</dd></div>
          <div><dt>Unrecovered items</dt><dd>{(value.landfillFraction * 100).toFixed(0)} out of 100</dd></div>
          <div><dt>Single-use items avoided</dt><dd>{value.avoidedItems} per 100 services</dd></div>
        </dl>
      </div>
      <section aria-label="Formula used" className="sutd-formula-card">
        <p className="meta-line">Formula used</p>
        <h3>Score the material and the system</h3>
        <pre aria-label="LaTeX formula source" className="formula-code">
          <code>{String.raw`\color{#2563eb}{I_{low-carbon-strength}} = \frac{\color{#0f766e}{\sigma_y}}{\color{#d97706}{\rho}\color{#7c3aed}{C_{CO2}}}
\qquad
\color{#dc2626}{waste} = 1 - \color{#0f766e}{collection}`}</code>
        </pre>
        <dl aria-label="Formula legend" className="formula-legend">
          <div><dt><span className="legend-swatch legend-swatch--green" /> Strength and collection</dt><dd>yield strength and collected fraction from the current scenario</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--orange" /> Density</dt><dd>polymer density supplied by the content record</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--purple" /> Embodied carbon</dt><dd>kg CO2e per kg material in the cited estimate</dd></div>
        </dl>
        <p>
          Substitution: selected score = {formatScore(value.score)} for {state.performanceGoal}; unrecovered fraction = 1 - {(state.collectionRatePercent / 100).toFixed(2)} = {value.landfillFraction.toFixed(2)}.
        </p>
        <p>
          Reuse substitution: 100 services with {state.reuseCycles} uses per item avoid about {value.avoidedItems} single-use items.
        </p>
        <p className="formula-note">
          A polymer can be strong and light but still become waste if collection, reuse, or recovery is weak.
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
      <h2>Design the recovery route with the material</h2>
      <p>For a campus takeaway container, state the polymer evidence and the collection evidence you would require before recommending reuse, recycling, or composting.</p>
      <button type="button" onClick={() => stage.reset()}>Try another scenario</button>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ControlPanel />;
  if (stage.current === "observe") return <Observation />;
  if (stage.current === "explain") return <ExplainStage />;
  return (
    <section aria-label="Prediction setup" className="sutd-formula-card">
      <p className="meta-line">Prediction checkpoint</p>
      <h1>Polymers and Plastic Waste Management Lab</h1>
      <p>Predict what evidence matters before ranking polymer choices and end-of-life pathways.</p>
      <button type="button" onClick={() => stage.advance()}>Set up polymer scenario</button>
    </section>
  );
};

const PolymersAndPlasticWasteManagementSim = () => (
  <SimRuntime packageId={polymersPackageId} spec={polymersSpec}>
    <StageSurface />
  </SimRuntime>
);

export default PolymersAndPlasticWasteManagementSim;
