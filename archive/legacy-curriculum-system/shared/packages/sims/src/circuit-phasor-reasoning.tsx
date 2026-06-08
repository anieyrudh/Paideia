import { useMemo, useState } from "react";
import { LineChart } from "@paideia/charting";
import {
  solveSeriesAcCircuit,
  type SeriesAcCircuitSolution,
} from "@paideia/circuits";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";
import { err, ok, type KernelResult } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const circuitPhasorPackageId = "circuit-phasor-reasoning";
export const circuitPhasorSimId = "circuit-phasor-lab";

export const circuitPhasorPredict: TPredictSpec = {
  prompt:
    "A resistor and inductor are connected in series to a sinusoidal supply. Before comparing with the lab, what happens to the current phase compared with the voltage?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "Current leads the voltage because every AC circuit is capacitive.",
      "Current lags the voltage because the inductor adds positive reactance.",
      "Current is exactly in phase because resistance is present.",
      "Current becomes zero because the inductor blocks all AC.",
    ],
    correct_index: 1,
  },
  rationale_required: true,
};

export interface CircuitPhasorState {
  readonly sourceVoltageRmsVolts: number;
  readonly frequencyHertz: number;
  readonly resistanceOhms: number;
  readonly inductanceMilliHenrys: number;
  readonly capacitanceMicroFarads: number;
}

export interface CircuitPhasorModel {
  readonly solution: SeriesAcCircuitSolution;
  readonly inductiveReactanceOhms: number;
  readonly capacitiveReactanceOhms: number;
  readonly netReactanceOhms: number;
  readonly regime: "inductive" | "capacitive" | "resistive";
}

const defaultState: CircuitPhasorState = {
  sourceVoltageRmsVolts: 12,
  frequencyHertz: 50,
  resistanceOhms: 40,
  inductanceMilliHenrys: 180,
  capacitanceMicroFarads: 120,
};

const presets = [
  {
    label: "inductive",
    state: {
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 50,
      resistanceOhms: 40,
      inductanceMilliHenrys: 220,
      capacitanceMicroFarads: 220,
    },
  },
  {
    label: "near resonance",
    state: {
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 50,
      resistanceOhms: 40,
      inductanceMilliHenrys: 180,
      capacitanceMicroFarads: 56,
    },
  },
  {
    label: "capacitive",
    state: {
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 50,
      resistanceOhms: 40,
      inductanceMilliHenrys: 60,
      capacitanceMicroFarads: 120,
    },
  },
] as const;

const degrees = (radians: number): number => (radians * 180) / Math.PI;
const roundTenths = (value: number): number => Math.round(value * 10) / 10;
const formatTenths = (value: number): string => roundTenths(value).toFixed(1);
const formatHundredths = (value: number): string => (Math.round(value * 100) / 100).toFixed(2);

export const circuitPhasorModel = (
  state: CircuitPhasorState,
): KernelResult<CircuitPhasorModel> => {
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
    return err("numerical-instability", "Series AC model is missing element impedance terms");
  }

  const netReactanceOhms = solution.value.impedance.imaginaryOhms;
  const regime =
    Math.abs(netReactanceOhms) < 0.5
      ? "resistive"
      : netReactanceOhms > 0
        ? "inductive"
        : "capacitive";

  return ok({
    solution: solution.value,
    inductiveReactanceOhms: inductor.imaginaryOhms,
    capacitiveReactanceOhms: Math.abs(capacitor.imaginaryOhms),
    netReactanceOhms,
    regime,
  });
};

const waveformData = (
  model: CircuitPhasorModel,
): readonly { readonly x: number; readonly y: number; readonly series: string }[] => {
  const points: { x: number; y: number; series: string }[] = [];
  for (let index = 0; index <= 96; index += 1) {
    const phase = (index / 96) * 2 * Math.PI;
    points.push({
      x: degrees(phase),
      y: Math.sin(phase),
      series: "voltage",
    });
    points.push({
      x: degrees(phase),
      y: Math.sin(phase + model.solution.currentPhaseRadians),
      series: "current",
    });
  }
  return points;
};

const polarPoint = (magnitude: number, phaseRadians: number, scale: number) => ({
  x: 160 + magnitude * Math.cos(phaseRadians) * scale,
  y: 140 - magnitude * Math.sin(phaseRadians) * scale,
});

export const CircuitPhasorDiagram = ({ model }: { readonly model: CircuitPhasorModel }) => {
  const maxMagnitude = Math.max(
    1,
    model.solution.impedanceMagnitudeOhms,
    Math.abs(model.netReactanceOhms),
    model.solution.impedance.realOhms,
  );
  const scale = 92 / maxMagnitude;
  const resistance = polarPoint(model.solution.impedance.realOhms, 0, scale);
  const reactance = {
    x: resistance.x,
    y: resistance.y - model.netReactanceOhms * scale,
  };
  const current = polarPoint(70, model.solution.currentPhaseRadians, 1);

  return (
    <svg aria-label="Impedance and current phasor diagram" role="img" viewBox="0 0 320 280">
      <rect fill="#f8fbff" height="280" rx="18" width="320" />
      <line stroke="#98a2b3" strokeWidth="1.5" x1="40" x2="280" y1="140" y2="140" />
      <line stroke="#98a2b3" strokeWidth="1.5" x1="160" x2="160" y1="36" y2="244" />
      <line stroke="#1f5f8b" strokeWidth="5" x1="160" x2={resistance.x} y1="140" y2="140" />
      <line
        stroke="#b54708"
        strokeDasharray="7 5"
        strokeWidth="5"
        x1={resistance.x}
        x2={reactance.x}
        y1="140"
        y2={reactance.y}
      />
      <line stroke="#6941c6" strokeWidth="5" x1="160" x2={reactance.x} y1="140" y2={reactance.y} />
      <circle cx={reactance.x} cy={reactance.y} fill="#6941c6" r="5" />
      <line stroke="#027a48" strokeLinecap="round" strokeWidth="4" x1="160" x2={current.x} y1="230" y2={current.y + 90} />
      <circle cx={current.x} cy={current.y + 90} fill="#027a48" r="5" />
      <text fill="#10201a" fontSize="12" fontWeight="800" x="44" y="32">
        Z = R + jX
      </text>
      <text fill="#1f5f8b" fontSize="12" fontWeight="800" x="188" y="132">
        R
      </text>
      <text fill="#b54708" fontSize="12" fontWeight="800" x={resistance.x + 8} y={(140 + reactance.y) / 2}>
        X
      </text>
      <text fill="#027a48" fontSize="12" fontWeight="800" x="176" y="258">
        current phase
      </text>
    </svg>
  );
};

export const CircuitPhasorReasoningSim = () => {
  const [state, setState] = useState<CircuitPhasorState>(defaultState);
  const model = useMemo(() => circuitPhasorModel(state), [state]);

  return (
    <PredictionGate
      packageId={circuitPhasorPackageId}
      predict={circuitPhasorPredict}
      simId={circuitPhasorSimId}
    >
      <section aria-label="Circuit phasor reasoning explorer" className="vector-lab vector-lab--product">
        <div className="vector-controls vector-controls--product" aria-label="Circuit controls">
          <p className="lab-kicker">Build the series RLC phasor</p>
          <ControlGroup legend="Circuit settings">
            <Slider
              label="Supply voltage"
              max={24}
              min={2}
              onChange={(value) => setState((current) => ({ ...current, sourceVoltageRmsVolts: value }))}
              step={1}
              unit="V rms"
              value={state.sourceVoltageRmsVolts}
            />
            <Slider
              label="Frequency"
              max={200}
              min={10}
              onChange={(value) => setState((current) => ({ ...current, frequencyHertz: value }))}
              step={5}
              unit="Hz"
              value={state.frequencyHertz}
            />
            <Slider
              label="Resistance"
              max={120}
              min={5}
              onChange={(value) => setState((current) => ({ ...current, resistanceOhms: value }))}
              step={5}
              unit="ohm"
              value={state.resistanceOhms}
            />
            <Slider
              label="Inductance"
              max={500}
              min={10}
              onChange={(value) => setState((current) => ({ ...current, inductanceMilliHenrys: value }))}
              step={10}
              unit="mH"
              value={state.inductanceMilliHenrys}
            />
            <Slider
              label="Capacitance"
              max={500}
              min={10}
              onChange={(value) => setState((current) => ({ ...current, capacitanceMicroFarads: value }))}
              step={10}
              unit="microF"
              value={state.capacitanceMicroFarads}
            />
          </ControlGroup>
          <div className="preset-strip" aria-label="Scenario presets">
            {presets.map((preset) => (
              <button key={preset.label} onClick={() => setState(preset.state)} type="button">
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {model.ok ? (
          <section aria-label="Observation unlocked" role="region">
            <div className="vector-stage vector-stage--product">
              <CircuitPhasorDiagram model={model.value} />
              <dl aria-label="Circuit phasor readout" className="result-readout result-readout--cards">
                <div>
                  <dt>Impedance magnitude</dt>
                  <dd>{formatTenths(model.value.solution.impedanceMagnitudeOhms)} ohm</dd>
                </div>
                <div>
                  <dt>Current</dt>
                  <dd>{formatHundredths(model.value.solution.currentRmsAmps)} A rms</dd>
                </div>
                <div>
                  <dt>Current phase</dt>
                  <dd>{formatTenths(degrees(model.value.solution.currentPhaseRadians))} degrees</dd>
                </div>
                <div>
                  <dt>Character</dt>
                  <dd>{model.value.regime}</dd>
                </div>
              </dl>
            </div>

            <section aria-label="Voltage and current waveform chart" className="formula-panel formula-panel--product">
              <p className="lab-kicker">Waveform check</p>
              <LineChart
                ariaLabel="Voltage and current waveform comparison"
                data={waveformData(model.value)}
                x={{ label: "phase angle", domain: { min: 0, max: 360 } }}
                y={{ label: "normalised amplitude", domain: { min: -1.1, max: 1.1 } }}
              />
              <p>
                Voltage is the reference trace; the current trace is shifted by{" "}
                {formatTenths(degrees(model.value.solution.currentPhaseRadians))} degrees.
              </p>
            </section>

            <section className="formula-panel formula-panel--product" aria-label="Formula used">
              <p className="lab-kicker">Why phase follows impedance</p>
              <h3>Formula used</h3>
              <pre aria-label="LaTeX formula" className="formula-code">
                <code>{`\\color{#6941c6}{Z}=\\color{#1f5f8b}{R}+j\\color{#b54708}{(X_L-X_C)}
\\color{#b54708}{X_L}=2\\pi\\color{#475467}{f}\\color{#7a271a}{L}
\\color{#b54708}{X_C}=\\frac{1}{2\\pi\\color{#475467}{f}\\color{#027a48}{C}}
\\color{#027a48}{I_{rms}}=\\frac{\\color{#344054}{V_{rms}}}{|\\color{#6941c6}{Z}|}`}</code>
              </pre>
              <p className="lab-kicker">Legend</p>
              <dl aria-label="Formula legend" className="formula-legend">
                <div>
                  <dt><span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> Z</dt>
                  <dd>series impedance vector, in ohms</dd>
                </div>
                <div>
                  <dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> R</dt>
                  <dd>resistance, in ohms</dd>
                </div>
                <div>
                  <dt><span aria-hidden="true" className="legend-swatch legend-swatch--amber" /> X</dt>
                  <dd>reactance, in ohms</dd>
                </div>
                <div>
                  <dt><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> I</dt>
                  <dd>rms current, in amperes</dd>
                </div>
              </dl>
              <p>Units: impedance and reactance use ohms; current uses amperes; phase uses degrees.</p>
              <p>
                Substitution: reactance gives X_L = {formatTenths(model.value.inductiveReactanceOhms)} ohm
                and X_C = {formatTenths(model.value.capacitiveReactanceOhms)} ohm, so X ={" "}
                {formatTenths(model.value.netReactanceOhms)} ohm.
              </p>
              <p>
                Substitution: impedance gives |Z| = sqrt(({formatTenths(state.resistanceOhms)} ohm)^2 + (
                {formatTenths(model.value.netReactanceOhms)} ohm)^2) ={" "}
                {formatTenths(model.value.solution.impedanceMagnitudeOhms)} ohm.
              </p>
              <p>
                Result: I_rms = {formatTenths(state.sourceVoltageRmsVolts)} V /{" "}
                {formatTenths(model.value.solution.impedanceMagnitudeOhms)} ohm ={" "}
                {formatHundredths(model.value.solution.currentRmsAmps)} A, with current phase{" "}
                {formatTenths(degrees(model.value.solution.currentPhaseRadians))} degrees.
              </p>
              <p className="formula-note">
                This formula applies because a series AC circuit carries one current through every
                element, so the voltage phasors add through the impedance vector.
              </p>
            </section>
          </section>
        ) : (
          <p role="alert">The selected circuit cannot be evaluated.</p>
        )}
      </section>
    </PredictionGate>
  );
};

export default CircuitPhasorReasoningSim;
