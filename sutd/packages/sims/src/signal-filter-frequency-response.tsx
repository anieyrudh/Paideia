import type { TSimulationSpec } from "@paideia/content-schema";
import { LineChart } from "@paideia/charting";
import { solveSeriesAcCircuit } from "@paideia/circuits";
import {
  bode,
  transferFunction,
  type FrequencyResponsePoint,
  type TransferFunction,
} from "@paideia/control-systems";
import { ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";

type FilterMode = "low-pass" | "high-pass";

export interface FilterState {
  readonly mode: FilterMode;
  readonly resistanceKiloOhms: number;
  readonly capacitanceMicroFarads: number;
  readonly probeFrequencyHertz: number;
}

interface FilterCircuitCheck {
  readonly seriesImpedanceOhms: number;
  readonly currentMilliAmps: number;
  readonly capacitorReactanceOhms: number;
  readonly powerFactor: number;
}

export interface FilterEvidence {
  readonly state: FilterState;
  readonly resistanceOhms: number;
  readonly capacitanceFarads: number;
  readonly timeConstantSeconds: number;
  readonly cutoffHertz: number;
  readonly cutoffRadPerSecond: number;
  readonly probe: FrequencyResponsePoint;
  readonly cutoffPoint: FrequencyResponsePoint;
  readonly decadeAbove: FrequencyResponsePoint;
  readonly points: readonly FrequencyResponsePoint[];
  readonly circuit: FilterCircuitCheck;
  readonly interpretation: string;
}

export const signalFilterFrequencyResponsePackageId =
  "sutd/epd/signal-filter-frequency-response" as ConceptPackageId;

export const signalFilterFrequencyResponseSpec: TSimulationSpec = {
  id: "signal-filter-frequency-response",
  title: "RC Filter Frequency Response Lab",
  interaction_type: "comparative-matrix",
  kernel_deps: [
    "core/shared",
    "core/content-schema",
    "core/sim-runtime",
    "core/control-systems",
    "core/circuits",
    "core/charting",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "filter-mode",
        label: "Filter mode",
        kind: "selector",
        kernel_binding: "state.mode",
      },
      {
        id: "resistance",
        label: "Resistance",
        kind: "slider",
        kernel_binding: "state.resistanceKiloOhms",
        bounds: { min: 1, max: 47, step: 1 },
      },
      {
        id: "capacitance",
        label: "Capacitance",
        kind: "slider",
        kernel_binding: "state.capacitanceMicroFarads",
        bounds: { min: 0.01, max: 0.47, step: 0.01 },
      },
      {
        id: "probe-frequency",
        label: "Probe frequency",
        kind: "slider",
        kernel_binding: "state.probeFrequencyHertz",
        bounds: { min: 20, max: 20000, step: 20 },
      },
    ],
  },
  predict: {
    prompt:
      "For a one-pole RC low-pass filter, what happens to the output at exactly the cutoff frequency?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The output becomes zero because frequencies above cutoff are removed instantly",
        "The output is about 0.707 of the input and the phase has already shifted",
        "The output is unchanged because cutoff only affects phase",
        "The output doubles because the capacitor stores extra charge",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "filter-bode-readout",
        module: "@paideia/sutd-sims/signal-filter-frequency-response",
        symbol: "SignalFilterFrequencyResponse",
        props_binding:
          "Show magnitude and phase traces for the selected RC filter and explain the cutoff-frequency substitution.",
      },
    ],
  },
  explain: {
    prompt:
      "Why is cutoff a gradual response marker rather than an on/off boundary, and why must the phase trace be read with the magnitude trace?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Filters remove all frequencies above cutoff instantly",
      "Phase shift is optional decoration",
    ],
  },
};

const defaults: FilterState = {
  mode: "low-pass",
  resistanceKiloOhms: 10,
  capacitanceMicroFarads: 0.01,
  probeFrequencyHertz: 1600,
};

const modeOptions = [
  { value: "low-pass" as const, label: "Low-pass: output across capacitor" },
  { value: "high-pass" as const, label: "High-pass: output across resistor" },
] as const;

const isFilterMode = (value: unknown): value is FilterMode =>
  value === "low-pass" || value === "high-pass";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<FilterState>): FilterState => ({
  mode: isFilterMode(state.mode) ? state.mode : defaults.mode,
  resistanceKiloOhms: clamp(
    state.resistanceKiloOhms ?? defaults.resistanceKiloOhms,
    1,
    47,
  ),
  capacitanceMicroFarads: clamp(
    state.capacitanceMicroFarads ?? defaults.capacitanceMicroFarads,
    0.01,
    0.47,
  ),
  probeFrequencyHertz: clamp(
    state.probeFrequencyHertz ?? defaults.probeFrequencyHertz,
    20,
    20000,
  ),
});

const fmt = (value: number, places = 2): string => {
  const rounded = Number(value.toFixed(places));
  return Object.is(rounded, -0) ? "0" : rounded.toFixed(places);
};

const fmtSigned = (value: number, places = 1): string =>
  value >= 0 ? `+${fmt(value, places)}` : fmt(value, places);

const logspace = (min: number, max: number, count: number): readonly number[] =>
  Object.freeze(
    Array.from({ length: count }, (_, index) => {
      const t = count <= 1 ? 0 : index / (count - 1);
      return min * (max / min) ** t;
    }),
  );

const filterTransfer = (
  mode: FilterMode,
  timeConstantSeconds: number,
): KernelResult<TransferFunction> =>
  mode === "low-pass"
    ? transferFunction([1], [timeConstantSeconds, 1])
    : transferFunction([timeConstantSeconds, 0], [timeConstantSeconds, 1]);

const responseAt = (
  system: TransferFunction,
  frequencyHertz: number,
): KernelResult<FrequencyResponsePoint> => {
  const response = bode(system, [2 * Math.PI * frequencyHertz]);
  if (!response.ok) return response;
  const point = response.value[0];
  return point === undefined
    ? {
        ok: false,
        error: {
          code: "precondition-violated",
          message: "Frequency response returned no samples",
        },
      }
    : ok(point);
};

const interpretationFor = (state: FilterState, cutoffHertz: number): string => {
  const ratio = state.probeFrequencyHertz / cutoffHertz;
  if (state.mode === "low-pass") {
    if (ratio < 0.5) return "the probe is in the pass band, but the phase is already moving";
    if (ratio < 2) return "the probe sits near the cutoff knee, so amplitude and phase both matter";
    return "the probe is in the attenuated band, but the output is reduced gradually, not deleted";
  }
  if (ratio < 0.5) return "the probe is in the attenuated low-frequency band";
  if (ratio < 2) return "the probe sits near the high-pass knee where phase and magnitude trade off";
  return "the probe is in the high-pass pass band, with only residual phase lead";
};

export const filterEvidence = (stateInput: FilterState): KernelResult<FilterEvidence> => {
  const state = currentState(stateInput);
  const resistanceOhms = state.resistanceKiloOhms * 1000;
  const capacitanceFarads = state.capacitanceMicroFarads * 1e-6;
  const timeConstantSeconds = resistanceOhms * capacitanceFarads;
  const cutoffRadPerSecond = 1 / timeConstantSeconds;
  const cutoffHertz = cutoffRadPerSecond / (2 * Math.PI);
  const system = filterTransfer(state.mode, timeConstantSeconds);
  if (!system.ok) return system;

  const frequenciesHertz = logspace(20, 20000, 120);
  const frequencyResponse = bode(
    system.value,
    frequenciesHertz.map((frequency) => 2 * Math.PI * frequency),
  );
  if (!frequencyResponse.ok) return frequencyResponse;
  const probe = responseAt(system.value, state.probeFrequencyHertz);
  if (!probe.ok) return probe;
  const cutoffPoint = responseAt(system.value, cutoffHertz);
  if (!cutoffPoint.ok) return cutoffPoint;
  const decadeAbove = responseAt(system.value, Math.min(20000, cutoffHertz * 10));
  if (!decadeAbove.ok) return decadeAbove;

  const circuit = solveSeriesAcCircuit({
    sourceVoltageRmsVolts: 1,
    frequencyHertz: state.probeFrequencyHertz,
    elements: [
      { kind: "resistor", resistanceOhms },
      { kind: "capacitor", capacitanceFarads },
    ],
  });
  if (!circuit.ok) return circuit;
  const capacitor = circuit.value.elementImpedances[1];

  return ok({
    state,
    resistanceOhms,
    capacitanceFarads,
    timeConstantSeconds,
    cutoffHertz,
    cutoffRadPerSecond,
    probe: probe.value,
    cutoffPoint: cutoffPoint.value,
    decadeAbove: decadeAbove.value,
    points: frequencyResponse.value,
    circuit: {
      seriesImpedanceOhms: circuit.value.impedanceMagnitudeOhms,
      currentMilliAmps: circuit.value.currentRmsAmps * 1000,
      capacitorReactanceOhms: Math.abs(capacitor?.imaginaryOhms ?? 0),
      powerFactor: circuit.value.powerFactor,
    },
    interpretation: interpretationFor(state, cutoffHertz),
  });
};

const chartData = (
  points: readonly FrequencyResponsePoint[],
  key: "magnitudeDb" | "phaseDeg",
  series: string,
) =>
  points.map((point) => ({
    x: point.frequencyRadPerSec / (2 * Math.PI),
    y: point[key],
    series,
  }));

const modeLabel = (mode: FilterMode): string =>
  mode === "low-pass" ? "low-pass output across C" : "high-pass output across R";

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<FilterState>();
  const current = currentState(state);
  const preview = filterEvidence(current);

  return (
    <section aria-label="Filter controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <ControlGroup legend="RC filter settings">
          <Selector
            label="Filter mode"
            onChange={(value) => set("mode", value)}
            options={modeOptions}
            value={current.mode}
          />
          <Slider
            label="Resistance"
            max={47}
            min={1}
            onChange={(value) => set("resistanceKiloOhms", value)}
            step={1}
            unit="kOhm"
            value={current.resistanceKiloOhms}
          />
          <Slider
            label="Capacitance"
            max={0.47}
            min={0.01}
            onChange={(value) => set("capacitanceMicroFarads", value)}
            step={0.01}
            unit="uF"
            value={current.capacitanceMicroFarads}
          />
          <Slider
            label="Probe frequency"
            max={20000}
            min={20}
            onChange={(value) => set("probeFrequencyHertz", value)}
            step={20}
            unit="Hz"
            value={current.probeFrequencyHertz}
          />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal frequency response
        </button>
      </div>
      <section aria-label="Filter model preview" className="sutd-formula-card">
        <p className="meta-line">Manipulate</p>
        <h2>Choose the circuit before reading the Bode response</h2>
        <p>
          {modeLabel(current.mode)}, R = {fmt(current.resistanceKiloOhms, 0)} kOhm, C ={" "}
          {fmt(current.capacitanceMicroFarads, 2)} uF, probe f ={" "}
          {fmt(current.probeFrequencyHertz, 0)} Hz.
        </p>
        <p>
          {preview.ok
            ? `The hidden cutoff is ${fmt(preview.value.cutoffHertz, 0)} Hz. Commit a prediction before using that readout.`
            : "The selected component values are outside the supported model."}
        </p>
      </section>
    </section>
  );
};

const FilterReadout = ({ evidence }: { readonly evidence: FilterEvidence }) => (
  <dl className="sutd-result-grid" aria-label="Filter response readout">
    <div>
      <dt>Cutoff frequency</dt>
      <dd>{fmt(evidence.cutoffHertz, 0)} Hz</dd>
    </div>
    <div>
      <dt>Cutoff magnitude</dt>
      <dd>{fmt(evidence.cutoffPoint.magnitude, 3)} times</dd>
    </div>
    <div>
      <dt>Probe magnitude</dt>
      <dd>{fmt(evidence.probe.magnitudeDb, 1)} dB</dd>
    </div>
    <div>
      <dt>Probe phase</dt>
      <dd>{fmtSigned(evidence.probe.phaseDeg, 1)} deg</dd>
    </div>
  </dl>
);

const FormulaPanel = ({ evidence }: { readonly evidence: FilterEvidence }) => {
  const { state } = evidence;
  const transferFormula =
    state.mode === "low-pass"
      ? String.raw`H_{LP}(s) = {1 \over 1 + sRC}`
      : String.raw`H_{HP}(s) = {sRC \over 1 + sRC}`;
  const cutoffPhase = state.mode === "low-pass" ? "-45.0" : "+45.0";

  return (
    <section className="sutd-formula-card" aria-label="Formula used">
      <p className="meta-line">Formula used</p>
      <h3>Cutoff is a response marker, not a cliff</h3>
      <pre className="formula-code" aria-label="Filter formula">
        <code>{String.raw`\color{#dc2626}{\tau} = \color{#2563eb}{R}\color{#059669}{C}

\color{#7c3aed}{f_c} = {1 \over 2\pi\color{#dc2626}{\tau}}

${transferFormula}

\color{#f97316}{|H(j2\pi f_c)|} = {1 \over \sqrt{2}} \approx 0.707

20\log_{10}(0.707) \approx -3.0\ dB`}</code>
      </pre>
      <dl className="formula-legend" aria-label="Formula legend">
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> R
          </dt>
          <dd>resistance in ohms</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> C
          </dt>
          <dd>capacitance in farads</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--red" /> tau
          </dt>
          <dd>RC time constant, seconds</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> f_c
          </dt>
          <dd>cutoff frequency, hertz</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> |H|
          </dt>
          <dd>output-to-input magnitude ratio</dd>
        </div>
      </dl>
      <pre className="formula-code" aria-label="Filter substitution">
        <code>{String.raw`R = ${fmt(evidence.resistanceOhms, 0)}\ \Omega
C = ${fmt(evidence.capacitanceFarads, 8)}\ F
\tau = (${fmt(evidence.resistanceOhms, 0)})( ${fmt(evidence.capacitanceFarads, 8)} )
\tau = ${fmt(evidence.timeConstantSeconds, 6)}\ s

f_c = {1 \over 2\pi(${fmt(evidence.timeConstantSeconds, 6)})}
f_c = ${fmt(evidence.cutoffHertz, 1)}\ Hz

At\ f_c:\ |H| = ${fmt(evidence.cutoffPoint.magnitude, 3)},\ phase = ${cutoffPhase}^\circ

At\ probe\ f = ${fmt(state.probeFrequencyHertz, 0)}\ Hz:
|H| = ${fmt(evidence.probe.magnitude, 3)} = ${fmt(evidence.probe.magnitudeDb, 1)}\ dB
phase = ${fmtSigned(evidence.probe.phaseDeg, 1)}^\circ`}</code>
      </pre>
      <p>
        Circuit check at the probe: the same series RC network has |Z| ={" "}
        {fmt(evidence.circuit.seriesImpedanceOhms, 0)} Ohm, |Xc| ={" "}
        {fmt(evidence.circuit.capacitorReactanceOhms, 0)} Ohm, and source current ={" "}
        {fmt(evidence.circuit.currentMilliAmps, 3)} mA for 1 V RMS.
      </p>
      <p className="formula-note">Result: {evidence.interpretation}.</p>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = filterEvidence(currentState(useSimState<Partial<FilterState>>()));

  if (!evidence.ok) {
    return (
      <section role="region" aria-label="Observation unlocked" className="sutd-formula-card">
        <p role="alert">{evidence.error.message}</p>
      </section>
    );
  }

  return (
    <section role="region" aria-label="Observation unlocked" className="sutd-sim-panel">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Frequency response evidence</h2>
        <p>
          The selected {modeLabel(evidence.value.state.mode)} has a cutoff at{" "}
          {fmt(evidence.value.cutoffHertz, 0)} Hz. At probe frequency{" "}
          {fmt(evidence.value.state.probeFrequencyHertz, 0)} Hz, magnitude is{" "}
          {fmt(evidence.value.probe.magnitude, 3)} times and phase is{" "}
          {fmtSigned(evidence.value.probe.phaseDeg, 1)} deg.
        </p>
        <FilterReadout evidence={evidence.value} />
        <section aria-label="Magnitude trace">
          <h3>Magnitude response</h3>
          <LineChart
            ariaLabel="Magnitude response chart, decibels against frequency in hertz"
            data={chartData(evidence.value.points, "magnitudeDb", "magnitude")}
            x={{ domain: { min: 20, max: 20000 }, scale: "log" }}
            y={{ domain: { min: -42, max: 4 } }}
          />
        </section>
        <section aria-label="Phase trace">
          <h3>Phase response</h3>
          <LineChart
            ariaLabel="Phase response chart, degrees against frequency in hertz"
            data={chartData(evidence.value.points, "phaseDeg", "phase")}
            x={{ domain: { min: 20, max: 20000 }, scale: "log" }}
            y={{ domain: { min: -100, max: 100 } }}
          />
        </section>
        <button type="button" onClick={() => stage.advance()}>
          Explain filter tradeoff
        </button>
      </div>
      <FormulaPanel evidence={evidence.value} />
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  const evidence = filterEvidence(currentState(useSimState<Partial<FilterState>>()));

  return (
    <section aria-label="Explain and transfer" className="sutd-sim-panel">
      <section aria-label="Explain the mechanism" className="sutd-formula-card">
        <p className="meta-line">Explain</p>
        <h2>Connect the knee to both traces</h2>
        <p>
          Cutoff marks the -3 dB point, not a deletion boundary. The phase trace changes over
          the same band because the resistor and capacitor divide voltage as complex phasors.
        </p>
        {evidence.ok ? (
          <p>
            For this run, one decade above cutoff gives{" "}
            {fmt(evidence.value.decadeAbove.magnitudeDb, 1)} dB, so the output still exists.
            The probe phase was {fmtSigned(evidence.value.probe.phaseDeg, 1)} deg, which
            changes time alignment even when the magnitude looks acceptable.
          </p>
        ) : null}
      </section>
      <section aria-label="Transfer challenge" className="sutd-formula-card">
        <p className="meta-line">Transfer</p>
        <h2>Choose an anti-aliasing filter</h2>
        <p>
          A sensor sampled at 8 kHz must preserve a 400 Hz control signal while reducing 4 kHz
          noise. Use the same cutoff, magnitude, and phase evidence to choose R and C.
        </p>
        <button type="button" onClick={() => stage.reset()}>
          Try another filter
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
      <h1>RC Filter Frequency Response Lab</h1>
      <p>
        Predict the cutoff behavior before revealing the Bode traces. Then adjust R, C, filter
        type, and probe frequency to compare pass-band, transition-band, and attenuated-band
        behavior.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Prepare filter lab
      </button>
    </section>
  );
};

const SignalFilterFrequencyResponse = () => (
  <SimRuntime
    packageId={signalFilterFrequencyResponsePackageId}
    spec={signalFilterFrequencyResponseSpec}
  >
    <StageSurface />
  </SimRuntime>
);

export default SignalFilterFrequencyResponse;
