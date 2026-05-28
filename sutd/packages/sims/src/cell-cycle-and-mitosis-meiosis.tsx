import {
  attemptPhaseAdvance,
  divideMeiosis,
  divideMitosis,
  initialCell,
  type CellState,
  type CheckpointConditions,
  type CheckpointStatus,
  type Phase,
} from "@paideia/cell-cycle";
import type { TSimulationSpec } from "@paideia/content-schema";
import { err, ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";

type DivisionMode = "mitosis" | "meiosis";

type CycleState = {
  readonly dnaDamaged: boolean;
  readonly replicationComplete: boolean;
  readonly chromosomesAligned: boolean;
  readonly nutrientsSufficient: boolean;
  readonly divisionMode: DivisionMode;
};

type CycleEvidence = {
  readonly trajectory: ReadonlyArray<{
    readonly phase: Phase;
    readonly checkpoint: CheckpointStatus | null;
    readonly advanced: boolean;
  }>;
  readonly finalCell: CellState;
  readonly daughters: ReadonlyArray<CellState>;
  readonly divisionMode: DivisionMode;
  readonly divisionError: string | null;
};

export const cellCyclePackageId =
  "sutd/10-019-science-and-technology-for-healthcare/cell-cycle-and-mitosis-meiosis" as ConceptPackageId;

export const cellCycleSpec: TSimulationSpec = {
  id: "cell-cycle-and-mitosis-meiosis",
  title: "Cell Cycle Phase Wheel",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/content-schema",
    "core/shared",
    "core/sim-runtime",
    "core/cell-cycle",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A diploid cell at M phase with replicated DNA divides via mitosis. Before reveal, what are the two daughter cells' ploidy and DNA-content multiplier?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Two diploid (n = 2) G1 daughters, each with DNA content 1 (unreplicated).",
        "Two haploid (n = 1) gametes, each with DNA content 1.",
        "Four haploid gametes, each with DNA content 1.",
        "Two diploid daughters, each with DNA content 2 (still replicated).",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      { id: "dna-damaged", label: "DNA damaged", kind: "toggle", kernel_binding: "state.dnaDamaged" },
      { id: "replication-complete", label: "Replication complete", kind: "toggle", kernel_binding: "state.replicationComplete" },
      { id: "chromosomes-aligned", label: "Chromosomes aligned", kind: "toggle", kernel_binding: "state.chromosomesAligned" },
      { id: "nutrients-sufficient", label: "Nutrients sufficient", kind: "toggle", kernel_binding: "state.nutrientsSufficient" },
      { id: "division-mode", label: "Division mode", kind: "selector", kernel_binding: "state.divisionMode" },
    ],
  },
  observe: {
    renderers: [
      {
        id: "cell-cycle-readout",
        module: "@paideia/sutd-sims/cell-cycle-and-mitosis-meiosis",
        symbol: "CellCycleAndMitosisMeiosis",
        props_binding:
          "Show the phase wheel with current and traversed phases highlighted, the active checkpoint status, the parent cell's ploidy + DNA content, and the daughter cells produced after the chosen division.",
      },
    ],
  },
  explain: {
    prompt: "Explain why mitosis and meiosis produce different daughter-cell ploidy from the same M-phase replicated parent.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Mitosis halves chromosome number",
      "Checkpoints are time-based",
    ],
  },
};

const defaults: CycleState = {
  dnaDamaged: false,
  replicationComplete: true,
  chromosomesAligned: true,
  nutrientsSufficient: true,
  divisionMode: "mitosis",
};

const isDivisionMode = (value: unknown): value is DivisionMode =>
  value === "mitosis" || value === "meiosis";

const currentState = (state: Partial<CycleState>): CycleState => ({
  dnaDamaged: state.dnaDamaged ?? defaults.dnaDamaged,
  replicationComplete: state.replicationComplete ?? defaults.replicationComplete,
  chromosomesAligned: state.chromosomesAligned ?? defaults.chromosomesAligned,
  nutrientsSufficient: state.nutrientsSufficient ?? defaults.nutrientsSufficient,
  divisionMode: isDivisionMode(state.divisionMode) ? state.divisionMode : defaults.divisionMode,
});

export const cycleEvidence = (raw: CycleState): KernelResult<CycleEvidence> => {
  if (
    typeof raw.dnaDamaged !== "boolean" ||
    typeof raw.replicationComplete !== "boolean" ||
    typeof raw.chromosomesAligned !== "boolean" ||
    typeof raw.nutrientsSufficient !== "boolean"
  ) {
    return err("precondition-violated", "CycleState booleans must be supplied.");
  }
  if (!isDivisionMode(raw.divisionMode)) {
    return err("precondition-violated", `Unknown divisionMode "${String(raw.divisionMode)}".`);
  }
  const conditions: CheckpointConditions = {
    dnaDamaged: raw.dnaDamaged,
    replicationComplete: raw.replicationComplete,
    chromosomesAligned: raw.chromosomesAligned,
    nutrientsSufficient: raw.nutrientsSufficient,
  };

  let cell = initialCell();
  const trajectory: {
    phase: Phase;
    checkpoint: CheckpointStatus | null;
    advanced: boolean;
  }[] = [];
  for (let step = 0; step < 6; step += 1) {
    const next = attemptPhaseAdvance(cell, conditions);
    if (!next.ok) return next;
    trajectory.push({
      phase: next.value.next.phase,
      checkpoint: next.value.checkpoint,
      advanced: next.value.advanced,
    });
    cell = next.value.next;
    if (cell.phase === "M") {
      const spindleNext = attemptPhaseAdvance(cell, conditions);
      if (spindleNext.ok) {
        trajectory.push({
          phase: spindleNext.value.next.phase,
          checkpoint: spindleNext.value.checkpoint,
          advanced: spindleNext.value.advanced,
        });
      } else {
        return err(spindleNext.error.code, spindleNext.error.message, spindleNext.error.cause);
      }
      break;
    }
    if (!next.value.advanced) break;
  }

  let daughters: ReadonlyArray<CellState> = [];
  let divisionError: string | null = null;
  if (cell.phase === "M" && cell.dnaContent === 2) {
    if (raw.chromosomesAligned) {
      if (raw.divisionMode === "mitosis") {
        const result = divideMitosis(cell);
        if (result.ok) daughters = result.value;
        else divisionError = result.error.message;
      } else {
        const result = divideMeiosis(cell);
        if (result.ok) daughters = result.value;
        else divisionError = result.error.message;
      }
    } else {
      divisionError = "Spindle checkpoint not satisfied; cell cannot divide.";
    }
  }

  return ok({
    trajectory,
    finalCell: cell,
    daughters,
    divisionMode: raw.divisionMode,
    divisionError,
  });
};

const Toggle = ({
  label,
  onChange,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: boolean) => void;
  readonly value: boolean;
}) => (
  <label className="sutd-control" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
    <input aria-label={label} checked={value} onChange={(event) => onChange(event.currentTarget.checked)} type="checkbox" />
    <span>{label}</span>
  </label>
);

const Select = ({
  label,
  onChange,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: DivisionMode) => void;
  readonly value: DivisionMode;
}) => (
  <label className="sutd-control">
    <span>{label}</span>
    <select
      aria-label={label}
      onChange={(event) => onChange(event.currentTarget.value as DivisionMode)}
      value={value}
    >
      <option value="mitosis">Mitosis</option>
      <option value="meiosis">Meiosis</option>
    </select>
  </label>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<CycleState>();
  const current = currentState(state);
  return (
    <section aria-label="Cell cycle controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Set the checkpoint conditions</h2>
        <Toggle label="DNA damaged" onChange={(v) => set("dnaDamaged", v)} value={current.dnaDamaged} />
        <Toggle label="Replication complete" onChange={(v) => set("replicationComplete", v)} value={current.replicationComplete} />
        <Toggle label="Chromosomes aligned" onChange={(v) => set("chromosomesAligned", v)} value={current.chromosomesAligned} />
        <Toggle label="Nutrients sufficient" onChange={(v) => set("nutrientsSufficient", v)} value={current.nutrientsSufficient} />
        <Select label="Division mode" onChange={(v) => set("divisionMode", v)} value={current.divisionMode} />
        <button type="button" onClick={() => stage.advance()}>Reveal division outcome</button>
      </div>
      <section className="sutd-formula-card" aria-label="Before reveal cue">
        <p className="meta-line">Before reveal</p>
        <h3>Checkpoints gate every advance</h3>
        <p>Predict first. Then watch the cell traverse the phase wheel under the active checkpoint conditions and see which division mode produces which daughters.</p>
      </section>
    </section>
  );
};

const PhaseWheel = ({ activePhase }: { readonly activePhase: Phase }) => {
  const segments: ReadonlyArray<{ phase: Exclude<Phase, "G0">; colour: string; angleStart: number; angleEnd: number }> = [
    { phase: "G1", colour: "#2563eb", angleStart: -Math.PI / 2, angleEnd: 0 },
    { phase: "S",  colour: "#059669", angleStart: 0, angleEnd: Math.PI / 2 },
    { phase: "G2", colour: "#f59e0b", angleStart: Math.PI / 2, angleEnd: Math.PI },
    { phase: "M",  colour: "#7c3aed", angleStart: Math.PI, angleEnd: 3 * Math.PI / 2 },
  ];
  const cx = 100;
  const cy = 100;
  const r = 64;
  const arcPath = (a0: number, a1: number, radius: number, sweep: 0 | 1): string => {
    const x0 = cx + radius * Math.cos(a0);
    const y0 = cy + radius * Math.sin(a0);
    const x1 = cx + radius * Math.cos(a1);
    const y1 = cy + radius * Math.sin(a1);
    return `M ${x0} ${y0} A ${radius} ${radius} 0 0 ${sweep} ${x1} ${y1}`;
  };
  return (
    <svg
      aria-label="Cell cycle phase wheel"
      className="sutd-diagram"
      role="img"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
      viewBox="0 0 200 200"
    >
      {segments.map((seg) => {
        const isActive = activePhase === seg.phase;
        return (
          <path
            key={seg.phase}
            d={arcPath(seg.angleStart, seg.angleEnd, r, 1)}
            fill="none"
            stroke={isActive ? seg.colour : "#cbd5e1"}
            strokeWidth={isActive ? 14 : 8}
          />
        );
      })}
      <text x={cx + 32} y={cy - 32} fill="#1e3a8a" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700">G1</text>
      <text x={cx + 32} y={cy + 40} fill="#065f46" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700">S</text>
      <text x={cx - 44} y={cy + 40} fill="#b45309" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700">G2</text>
      <text x={cx - 44} y={cy - 32} fill="#5b21b6" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700">M</text>
      {activePhase === "G0" && (
        <text x={cx - 12} y={cy + 6} fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700">G0</text>
      )}
    </svg>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<CycleState>>());
  const evidence = cycleEvidence(state);
  if (!evidence.ok) {
    return (
      <section className="sutd-formula-card" role="region" aria-label="Observation unlocked">
        <p role="alert">{evidence.error.message}</p>
      </section>
    );
  }
  const value = evidence.value;
  const lastCheckpoint = [...value.trajectory].reverse().find((t) => t.checkpoint !== null)?.checkpoint;
  return (
    <section aria-label="Observation unlocked" className="sutd-sim-panel" role="region">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Cell cycle trajectory</h2>
        <PhaseWheel activePhase={value.finalCell.phase} />
        <dl aria-label="Cycle readout" className="sutd-result-grid">
          <div><dt>Final phase</dt><dd>{value.finalCell.phase}</dd></div>
          <div><dt>Ploidy</dt><dd>n = {value.finalCell.ploidy}</dd></div>
          <div><dt>DNA content</dt><dd>{value.finalCell.dnaContent} (1 = unreplicated, 2 = replicated)</dd></div>
          <div><dt>Divisions</dt><dd>{value.finalCell.divisions}</dd></div>
          {lastCheckpoint && (
            <div>
              <dt>Last checkpoint</dt>
              <dd>
                {lastCheckpoint.name}: {lastCheckpoint.satisfied ? "passed" : "failed"}
                {lastCheckpoint.satisfied ? "" : ` (${lastCheckpoint.reasons.join("; ")})`}
              </dd>
            </div>
          )}
        </dl>
        <h3>Daughter cells</h3>
        {value.daughters.length === 0 && (
          <p>No division occurred. {value.divisionError ?? "Advance the cell to M with a satisfied spindle checkpoint to divide."}</p>
        )}
        {value.daughters.length > 0 && (
          <dl aria-label="Daughter cells" className="sutd-result-grid">
            {value.daughters.map((daughter, index) => (
              <div key={`daughter-${index}`}>
                <dt>Daughter {index + 1}</dt>
                <dd>
                  phase {daughter.phase}; n = {daughter.ploidy}; DNA content {daughter.dnaContent}; divisions {daughter.divisions}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <section aria-label="Formula used" className="sutd-formula-card">
        <p className="meta-line">Formula used</p>
        <h3>Phase, ploidy, and DNA content</h3>
        <pre aria-label="LaTeX formula source" className="formula-code">
          <code>{String.raw`\text{ploidy}_{\text{parent}} = n,\quad
\text{dnaContent}_{\text{parent}} = 2

\text{mitosis: } 2 \text{ daughters}, \;
n_{\text{daughter}} = n, \;
\text{dnaContent}_{\text{daughter}} = 1

\text{meiosis: } 4 \text{ daughters}, \;
n_{\text{daughter}} = n/2, \;
\text{dnaContent}_{\text{daughter}} = 1`}</code>
        </pre>
        <dl aria-label="Formula legend" className="formula-legend">
          <div><dt><span className="legend-swatch legend-swatch--blue" /> ploidy</dt><dd>chromosome-set count n (haploid = 1, diploid = 2)</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--orange" /> DNA content</dt><dd>multiplier (1 unreplicated, 2 replicated)</dd></div>
          <div><dt>checkpoint</dt><dd>conditional gate on phase advance</dd></div>
        </dl>
        <p>
          The parent cell entered with ploidy 2 and DNA content {value.finalCell.dnaContent}. {value.divisionMode === "mitosis" ? "Mitosis preserves ploidy: each daughter is diploid with DNA content 1." : "Meiosis halves ploidy: each gamete is haploid with DNA content 1."}
        </p>
        <p className="formula-note">
          Checkpoints gate transitions. With the current conditions, the cell {value.finalCell.phase === "M" ? "reached M and divided as configured." : `is parked in ${value.finalCell.phase}.`}
        </p>
        <button type="button" onClick={() => stage.advance()}>Explain the daughter cells</button>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" className="sutd-formula-card">
      <p className="meta-line">Transfer</p>
      <h2>DNA damage and G1/S arrest</h2>
      <p>
        Toggle "DNA damaged" on with all other checkpoints satisfied and explain why the cell parks in G1, what the G1/S checkpoint reports, and what would have to change for the cell to advance.
      </p>
      <button type="button" onClick={() => stage.reset()}>Try another condition set</button>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") return <ExplainStage />;
  return (
    <section className="sutd-formula-card" aria-label="Prediction setup">
      <p className="meta-line">Predict first</p>
      <h1>Cell Cycle Phase Wheel</h1>
      <p>Predict the daughter cells of a mitotic diploid cell before stepping through the phase wheel.</p>
      <button type="button" onClick={() => stage.advance()}>Set up cell cycle</button>
    </section>
  );
};

const CellCycleAndMitosisMeiosisSim = () => (
  <SimRuntime packageId={cellCyclePackageId} spec={cellCycleSpec}>
    <StageSurface />
  </SimRuntime>
);

export default CellCycleAndMitosisMeiosisSim;
export { CellCycleAndMitosisMeiosisSim as CellCycleAndMitosisMeiosis };
