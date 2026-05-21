import { useMemo } from "react";
import { LineChart } from "@paideia/charting";
import {
  solveSeriesAcCircuit,
  type SeriesAcCircuitSolution,
} from "@paideia/circuits";
import type { TSimulationSpec } from "@paideia/content-schema";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  err,
  ok,
  type ConceptPackageId,
  type KernelResult,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const alternatingCurrentPackageId = "alternating-current" as ConceptPackageId;
export const alternatingCurrentSimId = "ac-rms-phase-lab";
export type AlternatingCurrentPredictionEvent = PredictionEvent;

export interface AlternatingCurrentState {
  readonly sourceVoltageRmsVolts: number;
  readonly frequencyHertz: number;
  readonly resistanceOhms: number;
  readonly inductanceMilliHenrys: number;
  readonly capacitanceMicroFarads: number;
  readonly sampleTimeMilliseconds: number;
}

export interface AlternatingCurrentWavePoint {
  readonly phaseDegrees: number;
  readonly value: number;
  readonly series: "voltage" | "current";
}

export interface AlternatingCurrentModel {
  readonly solution: SeriesAcCircuitSolution;
  readonly angularFrequencyRadiansPerSecond: number;
  readonly voltagePeakVolts: number;
  readonly currentPeakAmps: number;
  readonly inductiveReactanceOhms: number;
  readonly capacitiveReactanceOhms: number;
  readonly netReactanceOhms: number;
  readonly impedancePhaseDegrees: number;
  readonly currentPhaseDegrees: number;
  readonly samplePhaseDegrees: number;
  readonly sampleVoltageVolts: number;
  readonly sampleCurrentAmps: number;
  readonly regime: "inductive" | "capacitive" | "nearly resistive";
  readonly waveform: readonly AlternatingCurrentWavePoint[];
}

export const alternatingCurrentSpec: TSimulationSpec = {
  id: alternatingCurrentSimId,
  title: "AC RMS and Phase Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/content-schema",
    "core/circuits",
    "core/charting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A sinusoidal supply has the same peak voltage but its frequency is doubled. Before revealing the lab, what happens to the rms voltage of the supply?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The rms voltage doubles because the wave oscillates twice as often.",
        "The rms voltage stays the same because rms depends on amplitude, not frequency.",
        "The rms voltage halves because each cycle takes less time.",
        "The rms voltage becomes zero because positive and negative halves cancel.",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "source-voltage",
        label: "Supply rms voltage",
        kind: "slider",
        kernel_binding: "state.sourceVoltageRmsVolts",
        bounds: { min: 4, max: 24, step: 1 },
      },
      {
        id: "frequency",
        label: "Frequency",
        kind: "slider",
        kernel_binding: "state.frequencyHertz",
        bounds: { min: 20, max: 200, step: 5 },
      },
      {
        id: "resistance",
        label: "Resistance",
        kind: "slider",
        kernel_binding: "state.resistanceOhms",
        bounds: { min: 10, max: 120, step: 5 },
      },
      {
        id: "inductance",
        label: "Inductance",
        kind: "slider",
        kernel_binding: "state.inductanceMilliHenrys",
        bounds: { min: 10, max: 500, step: 10 },
      },
      {
        id: "capacitance",
        label: "Capacitance",
        kind: "slider",
        kernel_binding: "state.capacitanceMicroFarads",
        bounds: { min: 20, max: 500, step: 10 },
      },
      {
        id: "sample-time",
        label: "Time marker",
        kind: "slider",
        kernel_binding: "state.sampleTimeMilliseconds",
        bounds: { min: 0, max: 40, step: 1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: alternatingCurrentSimId,
        module: "@paideia/a-level-physics-sims/alternating-current",
        symbol: "AlternatingCurrentSim",
        props_binding:
          "Show rms-to-peak conversion, series RLC impedance, current phase, power factor, formula substitution, units, interpretation, and symbol legend.",
      },
    ],
  },
  explain: {
    prompt:
      "Which quantities are set by waveform amplitude, which are set by impedance, and how does phase decide whether current leads or lags voltage?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "RMS is an arithmetic average voltage.",
      "Higher frequency always means higher rms value.",
      "Resistance alone sets current in every AC circuit.",
      "Leading and lagging phase are interchangeable.",
    ],
  },
};

const defaultState: AlternatingCurrentState = {
  sourceVoltageRmsVolts: 12,
  frequencyHertz: 50,
  resistanceOhms: 40,
  inductanceMilliHenrys: 180,
  capacitanceMicroFarads: 120,
  sampleTimeMilliseconds: 5,
};

const presets: readonly {
  readonly label: string;
  readonly state: AlternatingCurrentState;
}[] = [
  { label: "balanced mains model", state: defaultState },
  {
    label: "inductive load",
    state: {
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 50,
      resistanceOhms: 40,
      inductanceMilliHenrys: 260,
      capacitanceMicroFarads: 220,
      sampleTimeMilliseconds: 5,
    },
  },
  {
    label: "capacitive load",
    state: {
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 50,
      resistanceOhms: 40,
      inductanceMilliHenrys: 60,
      capacitanceMicroFarads: 120,
      sampleTimeMilliseconds: 5,
    },
  },
  {
    label: "near resonance",
    state: {
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 50,
      resistanceOhms: 35,
      inductanceMilliHenrys: 180,
      capacitanceMicroFarads: 56,
      sampleTimeMilliseconds: 5,
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<AlternatingCurrentState>): AlternatingCurrentState => ({
  sourceVoltageRmsVolts: clamp(
    state.sourceVoltageRmsVolts ?? defaultState.sourceVoltageRmsVolts,
    4,
    24,
  ),
  frequencyHertz: clamp(state.frequencyHertz ?? defaultState.frequencyHertz, 20, 200),
  resistanceOhms: clamp(state.resistanceOhms ?? defaultState.resistanceOhms, 10, 120),
  inductanceMilliHenrys: clamp(
    state.inductanceMilliHenrys ?? defaultState.inductanceMilliHenrys,
    10,
    500,
  ),
  capacitanceMicroFarads: clamp(
    state.capacitanceMicroFarads ?? defaultState.capacitanceMicroFarads,
    20,
    500,
  ),
  sampleTimeMilliseconds: clamp(
    state.sampleTimeMilliseconds ?? defaultState.sampleTimeMilliseconds,
    0,
    40,
  ),
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatSigned = (value: number, places = 1): string =>
  value >= 0 ? `+${formatNumber(value, places)}` : formatNumber(value, places);
const formatVolts = (value: number): string => `${formatNumber(value, 2)} V`;
const formatAmps = (value: number): string => `${formatNumber(value, 3)} A`;
const formatOhms = (value: number): string => `${formatNumber(value, 2)} ohm`;
const formatWatts = (value: number): string => `${formatNumber(value, 2)} W`;
const formatVars = (value: number): string => `${formatSigned(value, 2)} var`;
const formatDegrees = (value: number): string => `${formatSigned(value, 1)} degrees`;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

const waveformData = (
  solution: SeriesAcCircuitSolution,
): readonly AlternatingCurrentWavePoint[] => {
  const points: AlternatingCurrentWavePoint[] = [];
  for (let index = 0; index <= 96; index += 1) {
    const phase = (index / 96) * 2 * Math.PI;
    const phaseDegrees = toDegrees(phase);
    points.push({
      phaseDegrees,
      value: Math.sin(phase),
      series: "voltage",
    });
    points.push({
      phaseDegrees,
      value: Math.sin(phase + solution.currentPhaseRadians),
      series: "current",
    });
  }
  return points;
};

export const alternatingCurrentModel = (
  state: AlternatingCurrentState,
): KernelResult<AlternatingCurrentModel> => {
  const solution = solveSeriesAcCircuit({
    sourceVoltageRmsVolts: state.sourceVoltageRmsVolts,
    frequencyHertz: state.frequencyHertz,
    elements: [
      { kind: "resistor", resistanceOhms: state.resistanceOhms },
      { kind: "inductor", inductanceHenrys: state.inductanceMilliHenrys / 1000 },
      { kind: "capacitor", capacitanceFarads: state.capacitanceMicroFarads / 1_000_000 },
    ],
  });
  if (!solution.ok) return solution;

  const inductor = solution.value.elementImpedances[1];
  const capacitor = solution.value.elementImpedances[2];
  if (inductor === undefined || capacitor === undefined) {
    return err("numerical-instability", "Series AC solution is missing element reactance terms.");
  }

  const angularFrequencyRadiansPerSecond = 2 * Math.PI * state.frequencyHertz;
  const voltagePeakVolts = state.sourceVoltageRmsVolts * Math.SQRT2;
  const currentPeakAmps = solution.value.currentRmsAmps * Math.SQRT2;
  const netReactanceOhms = solution.value.impedance.imaginaryOhms;
  const samplePhaseRadians =
    angularFrequencyRadiansPerSecond * (state.sampleTimeMilliseconds / 1000);
  const sampleVoltageVolts = voltagePeakVolts * Math.sin(samplePhaseRadians);
  const sampleCurrentAmps =
    currentPeakAmps * Math.sin(samplePhaseRadians + solution.value.currentPhaseRadians);
  const regime =
    Math.abs(netReactanceOhms) < 0.75
      ? "nearly resistive"
      : netReactanceOhms > 0
        ? "inductive"
        : "capacitive";

  return ok({
    solution: solution.value,
    angularFrequencyRadiansPerSecond,
    voltagePeakVolts,
    currentPeakAmps,
    inductiveReactanceOhms: inductor.imaginaryOhms,
    capacitiveReactanceOhms: Math.abs(capacitor.imaginaryOhms),
    netReactanceOhms,
    impedancePhaseDegrees: toDegrees(solution.value.impedancePhaseRadians),
    currentPhaseDegrees: toDegrees(solution.value.currentPhaseRadians),
    samplePhaseDegrees: toDegrees(samplePhaseRadians % (2 * Math.PI)),
    sampleVoltageVolts,
    sampleCurrentAmps,
    regime,
    waveform: waveformData(solution.value),
  });
};

const polarPoint = (
  magnitude: number,
  phaseRadians: number,
  scale: number,
): { readonly x: number; readonly y: number } => ({
  x: 170 + magnitude * Math.cos(phaseRadians) * scale,
  y: 140 - magnitude * Math.sin(phaseRadians) * scale,
});

export const AlternatingCurrentDiagram = ({
  model,
}: {
  readonly model: AlternatingCurrentModel;
}) => {
  const maxMagnitude = Math.max(
    1,
    model.solution.impedanceMagnitudeOhms,
    Math.abs(model.netReactanceOhms),
    model.solution.impedance.realOhms,
  );
  const scale = 88 / maxMagnitude;
  const resistance = polarPoint(model.solution.impedance.realOhms, 0, scale);
  const impedance = {
    x: resistance.x,
    y: resistance.y - model.netReactanceOhms * scale,
  };
  const current = polarPoint(70, model.solution.currentPhaseRadians, 1);

  return (
    <svg aria-label="AC phasor diagram" role="img" viewBox="0 0 340 280">
      <rect fill="#f8fbff" height="280" rx="18" width="340" />
      <line stroke="#98a2b3" strokeWidth="1.5" x1="42" x2="298" y1="140" y2="140" />
      <line stroke="#98a2b3" strokeWidth="1.5" x1="170" x2="170" y1="38" y2="242" />
      <line stroke="#1f5f8b" strokeWidth="5" x1="170" x2={resistance.x} y1="140" y2="140" />
      <line
        stroke="#b54708"
        strokeDasharray="7 5"
        strokeWidth="5"
        x1={resistance.x}
        x2={impedance.x}
        y1="140"
        y2={impedance.y}
      />
      <line stroke="#6941c6" strokeWidth="5" x1="170" x2={impedance.x} y1="140" y2={impedance.y} />
      <circle cx={impedance.x} cy={impedance.y} fill="#6941c6" r="5" />
      <line
        stroke="#027a48"
        strokeLinecap="round"
        strokeWidth="4"
        x1="170"
        x2={current.x}
        y1="230"
        y2={current.y + 90}
      />
      <circle cx={current.x} cy={current.y + 90} fill="#027a48" r="5" />
      <text fill="#10201a" fontSize="12" fontWeight="800" x="46" y="32">
        Z = R + jX
      </text>
      <text fill="#1f5f8b" fontSize="12" fontWeight="800" x="196" y="132">
        R
      </text>
      <text fill="#b54708" fontSize="12" fontWeight="800" x={resistance.x + 8} y={(140 + impedance.y) / 2}>
        X
      </text>
      <text fill="#6941c6" fontSize="12" fontWeight="800" x={impedance.x + 8} y={impedance.y}>
        Z
      </text>
      <text fill="#027a48" fontSize="12" fontWeight="800" x="186" y="258">
        current phase
      </text>
    </svg>
  );
};

const setScenario = (
  set: (
    key: keyof AlternatingCurrentState,
    value: AlternatingCurrentState[keyof AlternatingCurrentState],
  ) => void,
  state: AlternatingCurrentState,
) => {
  set("sourceVoltageRmsVolts", state.sourceVoltageRmsVolts);
  set("frequencyHertz", state.frequencyHertz);
  set("resistanceOhms", state.resistanceOhms);
  set("inductanceMilliHenrys", state.inductanceMilliHenrys);
  set("capacitanceMicroFarads", state.capacitanceMicroFarads);
  set("sampleTimeMilliseconds", state.sampleTimeMilliseconds);
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<AlternatingCurrentState>();
  const current = useMemo(() => currentState(state), [state]);

  return (
    <section aria-label="AC controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product" aria-label="AC circuit controls">
        <p className="lab-kicker">Tune the AC circuit</p>
        <ControlGroup legend="Supply and series RLC controls">
          <Slider label="Supply rms voltage" max={24} min={4} onChange={(value) => set("sourceVoltageRmsVolts", value)} step={1} unit="V rms" value={current.sourceVoltageRmsVolts} />
          <Slider label="Frequency" max={200} min={20} onChange={(value) => set("frequencyHertz", value)} step={5} unit="Hz" value={current.frequencyHertz} />
          <Slider label="Resistance" max={120} min={10} onChange={(value) => set("resistanceOhms", value)} step={5} unit="ohm" value={current.resistanceOhms} />
          <Slider label="Inductance" max={500} min={10} onChange={(value) => set("inductanceMilliHenrys", value)} step={10} unit="mH" value={current.inductanceMilliHenrys} />
          <Slider label="Capacitance" max={500} min={20} onChange={(value) => set("capacitanceMicroFarads", value)} step={10} unit="microF" value={current.capacitanceMicroFarads} />
          <Slider label="Time marker" max={40} min={0} onChange={(value) => set("sampleTimeMilliseconds", value)} step={1} unit="ms" value={current.sampleTimeMilliseconds} />
        </ControlGroup>
        <div className="preset-strip" aria-label="AC presets">
          {presets.map((preset) => (
            <button key={preset.label} onClick={() => setScenario(set, preset.state)} type="button">
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Reveal AC result
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Separate amplitude from frequency</h3>
        <p>
          Set the supply and RLC values, then predict whether rms value, impedance, or both will
          change before any waveform, current, phase, or power readout appears.
        </p>
      </section>
    </section>
  );
};

const SymbolLegend = () => (
  <dl aria-label="Symbol legend" className="formula-legend">
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> V_rms, V_peak</dt>
      <dd>supply rms voltage and peak voltage, in volts</dd>
    </div>
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> I_rms, I_peak</dt>
      <dd>series current rms and peak current, in amperes</dd>
    </div>
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> Z</dt>
      <dd>series impedance, in ohms</dd>
    </div>
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> X_L, X_C, X</dt>
      <dd>inductive, capacitive, and net reactance, in ohms</dd>
    </div>
  </dl>
);

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<AlternatingCurrentState>>());
  const model = alternatingCurrentModel(state);

  if (!model.ok) {
    return <p role="alert">The selected AC circuit is outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <AlternatingCurrentDiagram model={model.value} />
        <dl aria-label="AC readout" className="result-readout result-readout--cards">
          <div><dt>Peak voltage</dt><dd>{formatVolts(model.value.voltagePeakVolts)}</dd></div>
          <div><dt>Impedance magnitude</dt><dd>{formatOhms(model.value.solution.impedanceMagnitudeOhms)}</dd></div>
          <div><dt>RMS current</dt><dd>{formatAmps(model.value.solution.currentRmsAmps)}</dd></div>
          <div><dt>Current phase</dt><dd>{formatDegrees(model.value.currentPhaseDegrees)}</dd></div>
          <div><dt>Power factor</dt><dd>{formatNumber(model.value.solution.powerFactor, 3)}</dd></div>
          <div><dt>Real power</dt><dd>{formatWatts(model.value.solution.realPowerWatts)}</dd></div>
          <div><dt>Reactive power</dt><dd>{formatVars(model.value.solution.reactivePowerVars)}</dd></div>
          <div><dt>Circuit character</dt><dd>{model.value.regime}</dd></div>
        </dl>
      </div>

      <section aria-label="Voltage and current waveform chart" className="formula-panel formula-panel--product">
        <p className="lab-kicker">Waveform check</p>
        <h3>Voltage is the phase reference</h3>
        <LineChart
          ariaLabel="Voltage and current waveform comparison"
          data={model.value.waveform.map((point) => ({
            x: point.phaseDegrees,
            y: point.value,
            series: point.series,
          }))}
          x={{ label: "phase angle", domain: { min: 0, max: 360 } }}
          y={{ label: "normalised amplitude", domain: { min: -1.1, max: 1.1 } }}
        />
        <p>
          Formula: v = V_peak sin(omega t), i = I_peak sin(omega t + phi_I).
          Substitution at {formatNumber(state.sampleTimeMilliseconds, 0)} ms: phase ={" "}
          {formatNumber(model.value.samplePhaseDegrees, 1)} degrees, v ={" "}
          {formatVolts(model.value.sampleVoltageVolts)}, i ={" "}
          {formatAmps(model.value.sampleCurrentAmps)}.
        </p>
        <p className="formula-note">
          Interpretation: positive phase means the current trace reaches a crest before the
          voltage trace; negative phase means it lags.
        </p>
      </section>

      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>RMS, impedance, phase, and power</h3>
        <pre aria-label="AC formula set" className="formula-code">
          <code>{`V_peak = sqrt(2) V_rms
X_L = 2 pi f L
X_C = 1 / (2 pi f C)
Z = R + j(X_L - X_C)
|Z| = sqrt(R^2 + X^2)
I_rms = V_rms / |Z|
phi_I = -atan2(X, R)
P = V_rms I_rms cos(phi)`}</code>
        </pre>
        <SymbolLegend />
        <p>
          RMS conversion: V_peak = sqrt(2) x {formatVolts(state.sourceVoltageRmsVolts)} ={" "}
          {formatVolts(model.value.voltagePeakVolts)}. I_peak = sqrt(2) x{" "}
          {formatAmps(model.value.solution.currentRmsAmps)} = {formatAmps(model.value.currentPeakAmps)}.
        </p>
        <p>
          Reactance substitution: X_L = 2 pi x {formatNumber(state.frequencyHertz, 0)} Hz x{" "}
          {formatNumber(state.inductanceMilliHenrys / 1000, 3)} H ={" "}
          {formatOhms(model.value.inductiveReactanceOhms)}; X_C = 1 / (2 pi x{" "}
          {formatNumber(state.frequencyHertz, 0)} Hz x{" "}
          {formatNumber(state.capacitanceMicroFarads / 1_000_000, 6)} F) ={" "}
          {formatOhms(model.value.capacitiveReactanceOhms)}.
        </p>
        <p>
          Impedance substitution: X = X_L - X_C = {formatOhms(model.value.netReactanceOhms)} and
          |Z| = sqrt(({formatOhms(state.resistanceOhms)})^2 + (
          {formatOhms(model.value.netReactanceOhms)})^2) ={" "}
          {formatOhms(model.value.solution.impedanceMagnitudeOhms)}.
        </p>
        <p>
          Current substitution: I_rms = {formatVolts(state.sourceVoltageRmsVolts)} /{" "}
          {formatOhms(model.value.solution.impedanceMagnitudeOhms)} ={" "}
          {formatAmps(model.value.solution.currentRmsAmps)}.
        </p>
        <p>
          Phase substitution: phi_I = -atan2({formatOhms(model.value.netReactanceOhms)},{" "}
          {formatOhms(state.resistanceOhms)}) = {formatDegrees(model.value.currentPhaseDegrees)}.
          The current {model.value.currentPhaseDegrees >= 0 ? "leads" : "lags"} the voltage.
        </p>
        <p>
          Power substitution: P = {formatVolts(state.sourceVoltageRmsVolts)} x{" "}
          {formatAmps(model.value.solution.currentRmsAmps)} x{" "}
          {formatNumber(model.value.solution.powerFactor, 3)} ={" "}
          {formatWatts(model.value.solution.realPowerWatts)}.
        </p>
        <p className="formula-note">
          Interpretation: frequency does not appear in the rms conversion for the source, but it
          does change X_L and X_C, so it can change current, phase, and power in an RLC load.
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Explain the phase
        </button>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Transfer</p>
      <h3>Compare two adapters with the same rms supply</h3>
      <p>
        One adapter behaves mainly inductively and another mainly capacitively. Which one has
        current lagging the voltage, which has current leading, and why can both still have the
        same supply rms voltage?
      </p>
      <p className="formula-note">
        Use X = X_L - X_C for phase, and use V_peak = sqrt(2) V_rms for the supply amplitude.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another AC circuit
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
    <section aria-label="Prediction setup" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Predict first</p>
      <h3>What does rms ignore?</h3>
      <p>
        Commit a prediction before the waveform, current, impedance, phase, and power readouts
        appear.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Build AC circuit
      </button>
    </section>
  );
};

export const AlternatingCurrentSim = () => (
  <SimRuntime packageId={alternatingCurrentPackageId} spec={alternatingCurrentSpec}>
    <StageSurface />
  </SimRuntime>
);

export default AlternatingCurrentSim;
