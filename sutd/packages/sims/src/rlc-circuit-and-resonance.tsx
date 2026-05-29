import type { TSimulationSpec } from "@paideia/content-schema";
import {
  farads,
  henrys,
  hertz,
  ohms,
  seriesRlcResonanceModel,
  volts,
  type SeriesRlcResonanceModel,
} from "@paideia/circuits";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type RlcState = {
  readonly sourceVoltageRmsVolts: number;
  readonly resistanceOhms: number;
  readonly inductanceMilliHenrys: number;
  readonly capacitanceMicroFarads: number;
  readonly frequencyHertz: number;
};

type RlcEvidence = {
  readonly state: RlcState;
  readonly model: SeriesRlcResonanceModel;
};

export const rlcCircuitAndResonancePackageId =
  "sutd/10-017-technological-world-e-and-m/rlc-circuit-and-resonance" as ConceptPackageId;

export const rlcCircuitAndResonanceSpec: TSimulationSpec = {
  id: "rlc-circuit-and-resonance",
  title: "RLC Circuit and Resonance",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/shared",
    "core/content-schema",
    "core/sim-runtime",
    "core/circuits",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      { id: "frequency", label: "Drive frequency", kind: "slider", kernel_binding: "state.frequencyHertz", bounds: { min: 20, max: 240, step: 1 } },
      { id: "resistance", label: "Resistance", kind: "slider", kernel_binding: "state.resistanceOhms", bounds: { min: 5, max: 80, step: 1 } },
      { id: "inductance", label: "Inductance", kind: "slider", kernel_binding: "state.inductanceMilliHenrys", bounds: { min: 20, max: 300, step: 5 } },
      { id: "capacitance", label: "Capacitance", kind: "slider", kernel_binding: "state.capacitanceMicroFarads", bounds: { min: 20, max: 300, step: 5 } },
      { id: "source-voltage", label: "Source voltage", kind: "slider", kernel_binding: "state.sourceVoltageRmsVolts", bounds: { min: 2, max: 24, step: 0.5 } },
    ],
  },
  predict: {
    prompt:
      "A series RLC circuit is driven at its resonant frequency. What happens to the net reactance and RMS current?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Net reactance is near zero, so impedance is mostly resistance and current is largest.",
        "Inductive reactance becomes infinite, so current is zero.",
        "Capacitive reactance disappears, so voltage across the capacitor is zero.",
        "Resistance cancels reactance, so total impedance is zero.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "rlc-resonance-readout",
        module: "@paideia/sutd-sims/rlc-circuit-and-resonance",
        symbol: "RlcCircuitAndResonance",
        props_binding:
          "Show series RLC schematic, reactance balance, resonant frequency, current, Q, bandwidth, formula substitution, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Why does resonance maximise current without making total impedance zero?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Resonance means zero impedance.",
      "The larger reactance always gives larger current.",
      "High Q is always better.",
    ],
  },
};

const defaults: RlcState = {
  capacitanceMicroFarads: 100,
  frequencyHertz: 50,
  inductanceMilliHenrys: 100,
  resistanceOhms: 20,
  sourceVoltageRmsVolts: 10,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<RlcState>): RlcState => ({
  capacitanceMicroFarads: clamp(
    state.capacitanceMicroFarads ?? defaults.capacitanceMicroFarads,
    20,
    300,
  ),
  frequencyHertz: clamp(state.frequencyHertz ?? defaults.frequencyHertz, 20, 240),
  inductanceMilliHenrys: clamp(
    state.inductanceMilliHenrys ?? defaults.inductanceMilliHenrys,
    20,
    300,
  ),
  resistanceOhms: clamp(state.resistanceOhms ?? defaults.resistanceOhms, 5, 80),
  sourceVoltageRmsVolts: clamp(
    state.sourceVoltageRmsVolts ?? defaults.sourceVoltageRmsVolts,
    2,
    24,
  ),
});

const fmt = (value: number, places = 2): string => value.toFixed(places);
const deg = (radians: number): number => (radians * 180) / Math.PI;

export const rlcEvidence = (state: RlcState): KernelResult<RlcEvidence> => {
  const model = seriesRlcResonanceModel({
    capacitanceFarads: farads(state.capacitanceMicroFarads / 1_000_000),
    frequencyHertz: hertz(state.frequencyHertz),
    inductanceHenrys: henrys(state.inductanceMilliHenrys / 1000),
    resistanceOhms: ohms(state.resistanceOhms),
    sourceVoltageRmsVolts: volts(state.sourceVoltageRmsVolts),
  });
  return model.ok ? ok({ model: model.value, state }) : model;
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<RlcState>();
  const current = currentState(state);

  return (
    <section aria-label="RLC controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <ControlGroup legend="Series RLC values">
          <Slider label="Drive frequency" max={240} min={20} onChange={(value) => set("frequencyHertz", value)} step={1} unit="Hz" value={current.frequencyHertz} />
          <Slider label="Resistance" max={80} min={5} onChange={(value) => set("resistanceOhms", value)} step={1} unit="ohm" value={current.resistanceOhms} />
          <Slider label="Inductance" max={300} min={20} onChange={(value) => set("inductanceMilliHenrys", value)} step={5} unit="mH" value={current.inductanceMilliHenrys} />
          <Slider label="Capacitance" max={300} min={20} onChange={(value) => set("capacitanceMicroFarads", value)} step={5} unit="microF" value={current.capacitanceMicroFarads} />
          <Slider label="Source voltage" max={24} min={2} onChange={(value) => set("sourceVoltageRmsVolts", value)} step={0.5} unit="V RMS" value={current.sourceVoltageRmsVolts} />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal resonance readout
        </button>
      </div>
      <section aria-label="RLC preview" className="sutd-formula-card">
        <p className="meta-line">Manipulate</p>
        <h2>Tune reactance around resonance</h2>
        <p>
          Drive at {fmt(current.frequencyHertz, 0)} Hz with R ={" "}
          {fmt(current.resistanceOhms, 0)} ohm, L ={" "}
          {fmt(current.inductanceMilliHenrys, 0)} mH, C ={" "}
          {fmt(current.capacitanceMicroFarads, 0)} microF.
        </p>
      </section>
    </section>
  );
};

const RlcDiagram = ({ evidence }: { readonly evidence: RlcEvidence }) => {
  const { model } = evidence;
  const center = 150;
  const scale = 1.2;
  const xlHeight = Math.min(96, Math.abs(model.inductiveReactanceOhms) * scale);
  const xcHeight = Math.min(96, Math.abs(model.capacitiveReactanceOhms) * scale);
  const netY = center - Math.max(-96, Math.min(96, model.netReactanceOhms * scale));

  return (
    <svg role="img" aria-label="Series RLC circuit and reactance balance" viewBox="0 0 520 280">
      <rect x="18" y="18" width="484" height="244" rx="12" fill="#f8fafc" stroke="#cbd5e1" />
      <path d="M70 92 H130 M130 92 v36 M130 152 v36 M130 188 H220" stroke="#334155" strokeWidth="5" fill="none" />
      <path d="M220 188 h34 m10 -22 v44 m14 -44 v44 m10 -22 h54" stroke="#334155" strokeWidth="5" fill="none" />
      <path d="M342 188 h28 c14 0 14 -30 28 -30 c14 0 14 30 28 30 h24" stroke="#334155" strokeWidth="5" fill="none" />
      <path d="M450 188 V92 H70" stroke="#334155" strokeWidth="5" fill="none" />
      <text x="104" y="146" fill="#0f172a" fontSize="16" fontWeight="700">R</text>
      <text x="268" y="232" fill="#0f172a" fontSize="16" fontWeight="700">C</text>
      <text x="390" y="232" fill="#0f172a" fontSize="16" fontWeight="700">L</text>
      <text x="58" y="66" fill="#0f172a" fontSize="16" fontWeight="700">AC</text>
      <line x1="76" y1={center} x2="196" y2={center} stroke="#64748b" strokeDasharray="5 5" />
      <line x1="96" y1={center} x2="96" y2={center - xlHeight} stroke="#7c3aed" strokeWidth="10" />
      <line x1="150" y1={center} x2="150" y2={center + xcHeight} stroke="#059669" strokeWidth="10" />
      <circle cx="196" cy={netY} r="8" fill="#f97316" />
      <text x="74" y="252" fill="#7c3aed" fontSize="14">XL</text>
      <text x="132" y="252" fill="#059669" fontSize="14">XC</text>
      <text x="174" y="252" fill="#f97316" fontSize="14">net</text>
    </svg>
  );
};

const FormulaPanel = ({ evidence }: { readonly evidence: RlcEvidence }) => {
  const { state, model } = evidence;
  const inductanceHenrys = state.inductanceMilliHenrys / 1000;
  const capacitanceFarads = state.capacitanceMicroFarads / 1_000_000;

  return (
    <section aria-label="Formula used" className="sutd-formula-card">
      <p className="meta-line">Formula used</p>
      <h3>Resonance cancels reactance, not resistance</h3>
      <pre className="formula-code" aria-label="RLC resonance formula">
        <code>{String.raw`\color{#2563eb}{f_0} =
\frac{1}{2\pi\sqrt{\color{#7c3aed}{L}\color{#059669}{C}}}

\color{#dc2626}{Z} =
\color{#64748b}{R} + j(\color{#7c3aed}{X_L} - \color{#059669}{X_C})

\color{#f97316}{I_{\mathrm{rms}}} =
\frac{\color{#0f766e}{V_{\mathrm{rms}}}}{|\color{#dc2626}{Z}|}`}</code>
      </pre>
      <p className="formula-note">Legend</p>
      <dl className="formula-legend" aria-label="Formula legend">
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> f0</dt><dd>resonant frequency, hertz</dd></div>
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> L, XL</dt><dd>inductance and inductive reactance</dd></div>
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> C, XC</dt><dd>capacitance and capacitive reactance</dd></div>
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> I</dt><dd>RMS current, ampere</dd></div>
      </dl>
      <p className="formula-note">Substitution</p>
      <pre className="formula-code" aria-label="RLC resonance substitution">
        <code>{String.raw`f_0 = \frac{1}{2\pi\sqrt{(${fmt(inductanceHenrys, 3)}\ H)(${fmt(capacitanceFarads, 6)}\ F)}}
= ${fmt(model.resonantFrequencyHertz, 2)}\ Hz

X_L = 2\pi(${fmt(state.frequencyHertz, 1)}\ Hz)(${fmt(inductanceHenrys, 3)}\ H)
= ${fmt(model.inductiveReactanceOhms, 2)}\ \Omega

X_C = \frac{1}{2\pi(${fmt(state.frequencyHertz, 1)}\ Hz)(${fmt(capacitanceFarads, 6)}\ F)}
= ${fmt(model.capacitiveReactanceOhms, 2)}\ \Omega

|Z| = \sqrt{(${fmt(state.resistanceOhms, 1)}\ \Omega)^2 + (${fmt(model.netReactanceOhms, 2)}\ \Omega)^2}
= ${fmt(model.impedanceMagnitudeOhms, 2)}\ \Omega

I_{\mathrm{rms}} = \frac{${fmt(state.sourceVoltageRmsVolts, 1)}\ V}{${fmt(model.impedanceMagnitudeOhms, 2)}\ \Omega}
= ${fmt(model.currentRmsAmps, 3)}\ A`}</code>
      </pre>
      <p>
        Units: frequency is in Hz, inductance is in H, capacitance is in F,
        resistance and impedance are in ohm, voltage is in V RMS, and current is in A.
      </p>
      <p>
        Result: Q = {fmt(model.qualityFactor, 2)}, bandwidth ={" "}
        {fmt(model.bandwidthHertz, 2)} Hz, current phase ={" "}
        {fmt(deg(model.currentPhaseRadians), 1)} degrees.
      </p>
      <p className="formula-note">Interpretation: {model.interpretation}.</p>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = rlcEvidence(currentState(useSimState<Partial<RlcState>>()));

  if (!evidence.ok) {
    return <section role="region" aria-label="Observation unlocked"><p role="alert">{evidence.error.message}</p></section>;
  }

  return (
    <section role="region" aria-label="Observation unlocked" className="sutd-sim-panel">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>RLC resonance evidence</h2>
        <RlcDiagram evidence={evidence.value} />
        <dl className="sutd-result-grid" aria-label="RLC readout">
          <div><dt>Resonant frequency</dt><dd>{fmt(evidence.value.model.resonantFrequencyHertz, 2)} Hz</dd></div>
          <div><dt>Net reactance</dt><dd>{fmt(evidence.value.model.netReactanceOhms, 2)} ohm</dd></div>
          <div><dt>RMS current</dt><dd>{fmt(evidence.value.model.currentRmsAmps, 3)} A</dd></div>
          <div><dt>Power factor</dt><dd>{fmt(evidence.value.model.powerFactor, 2)}</dd></div>
        </dl>
        <button type="button" onClick={() => stage.advance()}>
          Explain resonance
        </button>
      </div>
      <FormulaPanel evidence={evidence.value} />
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Explain and transfer" className="sutd-sim-panel">
      <section aria-label="Explain resonance" className="sutd-formula-card">
        <p className="meta-line">Explain</p>
        <h2>Stored energy swaps, resistance still dissipates</h2>
        <p>
          At resonance, the inductor and capacitor exchange energy each cycle.
          Their reactances cancel in the series total, but the resistor still
          dissipates energy and limits the current.
        </p>
      </section>
      <section aria-label="Transfer challenge" className="sutd-formula-card">
        <p className="meta-line">Transfer</p>
        <h2>Tune a receiver</h2>
        <p>
          Choose a capacitor for an 800 Hz target with a 0.20 H coil, then use
          the source voltage and resistance to estimate current at resonance.
        </p>
        <button type="button" onClick={() => stage.reset()}>
          Try another tuning
        </button>
      </section>
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
      <h1>RLC Circuit and Resonance</h1>
      <p>
        Predict what remains in the impedance at resonance before revealing
        the reactance balance and current readout.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Prepare RLC model
      </button>
    </section>
  );
};

const RlcCircuitAndResonance = () => (
  <SimRuntime packageId={rlcCircuitAndResonancePackageId} spec={rlcCircuitAndResonanceSpec}>
    <StageSurface />
  </SimRuntime>
);

export default RlcCircuitAndResonance;
