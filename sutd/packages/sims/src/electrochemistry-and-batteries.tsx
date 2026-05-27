import { nernstPotential, volts } from "@paideia/chemistry";
import type { TSimulationSpec } from "@paideia/content-schema";
import { ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";

type BatteryState = {
  readonly standardPotentialVolts: number;
  readonly reactionQuotient: number;
  readonly electronCount: number;
};

type BatteryEvidence = {
  readonly cellPotentialVolts: number;
  readonly voltageDropVolts: number;
  readonly spontaneity: "drives-load" | "near-flat" | "needs-charging";
  readonly loadPowerWatts: number;
};

export const electrochemistryPackageId =
  "sutd/10-016-science-for-a-sustainable-world/electrochemistry-and-batteries" as ConceptPackageId;

export const electrochemistrySpec: TSimulationSpec = {
  id: "electrochemistry-and-batteries",
  title: "Electrochemistry and Batteries Lab",
  interaction_type: "comparative-matrix",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate", "core/chemistry", "core/ui-sim"],
  predict: {
    prompt: "If products build up in a galvanic cell, what happens to the cell voltage?",
    commit_format: {
      kind: "multiple-choice",
      options: ["Voltage increases", "Voltage decreases", "Voltage is unrelated to composition", "Voltage becomes exactly zero"],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "standard-potential-volts",
        label: "Standard potential",
        kind: "slider",
        kernel_binding: "state.standardPotentialVolts",
        bounds: { min: 0.2, max: 1.5, step: 0.05 },
      },
      {
        id: "reaction-quotient",
        label: "Reaction quotient",
        kind: "slider",
        kernel_binding: "state.reactionQuotient",
        bounds: { min: 0.1, max: 20, step: 0.1 },
      },
      {
        id: "electron-count",
        label: "Electrons transferred",
        kind: "slider",
        kernel_binding: "state.electronCount",
        bounds: { min: 1, max: 4, step: 1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "battery-nernst-evidence",
        module: "@paideia/sutd-sims/electrochemistry-and-batteries",
        symbol: "ElectrochemistryAndBatteries",
        props_binding: "Show Nernst voltage, voltage drop, and battery-load interpretation.",
      },
    ],
  },
  explain: {
    prompt: "Explain why battery voltage depends on both electrode chemistry and reaction composition.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "A battery has a fixed voltage regardless of concentration.",
      "More products always mean more stored energy.",
    ],
  },
};

const defaults: BatteryState = {
  standardPotentialVolts: 1.1,
  reactionQuotient: 1,
  electronCount: 2,
};

const currentState = (state: Partial<BatteryState>): BatteryState => ({
  standardPotentialVolts: Math.min(1.5, Math.max(0.2, state.standardPotentialVolts ?? defaults.standardPotentialVolts)),
  reactionQuotient: Math.min(20, Math.max(0.1, state.reactionQuotient ?? defaults.reactionQuotient)),
  electronCount: Math.round(Math.min(4, Math.max(1, state.electronCount ?? defaults.electronCount))),
});

export const batteryEvidence = (state: BatteryState): KernelResult<BatteryEvidence> => {
  const standardPotential = volts(state.standardPotentialVolts);
  if (!standardPotential.ok) return standardPotential;
  const cell = nernstPotential({
    standardPotentialVolts: standardPotential.value,
    electronCount: state.electronCount,
    reactionQuotient: state.reactionQuotient,
  });
  if (!cell.ok) return cell;

  const voltageDropVolts = state.standardPotentialVolts - cell.value;
  return ok({
    cellPotentialVolts: cell.value,
    voltageDropVolts,
    spontaneity: cell.value > 0.15 ? "drives-load" : cell.value >= 0 ? "near-flat" : "needs-charging",
    loadPowerWatts: Math.max(0, cell.value * 0.25),
  });
};

const Control = ({
  label,
  max,
  min,
  onChange,
  step,
  suffix,
  value,
}: {
  readonly label: string;
  readonly max: number;
  readonly min: number;
  readonly onChange: (value: number) => void;
  readonly step: number;
  readonly suffix: string;
  readonly value: number;
}) => (
  <label className="sutd-control">
    <span>{label}: <strong>{value.toFixed(step < 1 ? 2 : 0)} {suffix}</strong></span>
    <input aria-label={label} max={max} min={min} onChange={(event) => onChange(Number(event.currentTarget.value))} step={step} type="range" value={value} />
  </label>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<BatteryState>();
  const current = currentState(state);
  return (
    <section aria-label="Electrochemistry controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Set the cell conditions</h2>
        <Control label="Standard potential" max={1.5} min={0.2} onChange={(value) => set("standardPotentialVolts", value)} step={0.05} suffix="V" value={current.standardPotentialVolts} />
        <Control label="Reaction quotient" max={20} min={0.1} onChange={(value) => set("reactionQuotient", value)} step={0.1} suffix="" value={current.reactionQuotient} />
        <Control label="Electrons transferred" max={4} min={1} onChange={(value) => set("electronCount", value)} step={1} suffix="e-" value={current.electronCount} />
        <button type="button" onClick={() => stage.advance()}>Reveal battery voltage</button>
      </div>
      <section aria-label="Before reveal cue" className="sutd-formula-card">
        <p className="meta-line">Before reveal</p>
        <h3>Composition shifts voltage</h3>
        <p>Predict first, then compare standard voltage with the concentration-corrected cell voltage.</p>
      </section>
    </section>
  );
};

const BatteryDiagram = ({ evidence }: { readonly evidence: BatteryEvidence }) => {
  const fillWidth = Math.max(10, Math.min(210, evidence.cellPotentialVolts * 140));
  return (
    <svg aria-label="Battery voltage diagram" className="sutd-diagram" role="img" viewBox="0 0 320 160">
      <rect fill="#f8fafc" height="160" rx="12" width="320" />
      <rect fill="#e2e8f0" height="54" rx="10" width="230" x="45" y="52" />
      <rect fill="#2563eb" height="54" rx="10" width={fillWidth} x="45" y="52" />
      <rect fill="#64748b" height="24" rx="4" width="16" x="276" y="67" />
      <text fill="#0f172a" fontSize="18" fontWeight="700" x="58" y="87">{evidence.cellPotentialVolts.toFixed(2)} V</text>
      <text fill="#334155" fontSize="13" x="58" y="126">load power at 0.25 A: {evidence.loadPowerWatts.toFixed(2)} W</text>
    </svg>
  );
};

const ObserveStage = () => {
  const state = currentState(useSimState<Partial<BatteryState>>());
  const evidence = batteryEvidence(state);
  if (!evidence.ok) return <p role="alert">Unable to compute cell potential.</p>;
  const value = evidence.value;
  return (
    <section aria-label="Observation unlocked" className="sutd-sim-panel" role="region">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Nernst voltage and battery state</h2>
        <BatteryDiagram evidence={value} />
        <dl aria-label="Battery readout" className="sutd-result-grid">
          <div><dt>Cell voltage</dt><dd>{value.cellPotentialVolts.toFixed(2)} V</dd></div>
          <div><dt>Voltage drop</dt><dd>{value.voltageDropVolts.toFixed(2)} V from standard</dd></div>
          <div><dt>Interpretation</dt><dd>{value.spontaneity}</dd></div>
        </dl>
      </div>
      <section aria-label="Formula used" className="sutd-formula-card">
        <p className="meta-line">Formula used</p>
        <h3>Apply the Nernst equation</h3>
        <pre aria-label="LaTeX formula source" className="formula-code">
          <code>{String.raw`\color{#2563eb}{E} = \color{#0f766e}{E^\circ} - \frac{RT}{\color{#d97706}{n}F}\ln\color{#7c3aed}{Q}`}</code>
        </pre>
        <dl aria-label="Formula legend" className="formula-legend">
          <div><dt><span className="legend-swatch legend-swatch--green" /> E0</dt><dd>standard potential {state.standardPotentialVolts.toFixed(2)} V</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--orange" /> n</dt><dd>{state.electronCount} electrons transferred</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--purple" /> Q</dt><dd>reaction quotient {state.reactionQuotient.toFixed(2)}</dd></div>
        </dl>
        <p>
          Substitution: E = {state.standardPotentialVolts.toFixed(2)} V - RT/({state.electronCount}F) ln({state.reactionQuotient.toFixed(2)}) = {value.cellPotentialVolts.toFixed(2)} V.
        </p>
        <p className="formula-note">
          Product build-up raises Q, so the logarithm term subtracts more voltage from the standard cell potential.
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
      <h2>Connect voltage to battery management</h2>
      <p>For a rechargeable battery, explain why voltage, composition, and current together determine whether the cell can drive a load safely.</p>
      <button type="button" onClick={() => stage.reset()}>Try another cell</button>
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
      <h1>Electrochemistry and Batteries Lab</h1>
      <p>Predict how composition changes voltage before the Nernst calculation is revealed.</p>
      <button type="button" onClick={() => stage.advance()}>Set up battery cell</button>
    </section>
  );
};

const ElectrochemistryAndBatteriesSim = () => (
  <SimRuntime packageId={electrochemistryPackageId} spec={electrochemistrySpec}>
    <StageSurface />
  </SimRuntime>
);

export default ElectrochemistryAndBatteriesSim;
