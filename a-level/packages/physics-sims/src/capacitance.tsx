import { useMemo } from "react";
import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  coulombs,
  volts,
  type Coulombs,
  type Volts,
} from "@paideia/electromagnetism";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  err,
  joules,
  ok,
  type Brand,
  type ConceptPackageId,
  type Joules,
  type KernelResult,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const capacitancePackageId = "capacitance" as ConceptPackageId;
export const capacitanceSimId = "capacitor-charge-energy-lab";
export type CapacitancePredictionEvent = PredictionEvent;

type Microfarads = Brand<number, "Microfarads">;
type Kilohms = Brand<number, "Kilohms">;
type Milliseconds = Brand<number, "Milliseconds">;
type Farads = Brand<number, "Farads">;

export interface CapacitanceState {
  readonly capacitanceMicrofarads: Microfarads;
  readonly supplyVoltageVolts: Volts;
  readonly dischargeResistanceKilohms: Kilohms;
  readonly sampleTimeMilliseconds: Milliseconds;
}

export interface DischargeTracePoint {
  readonly x: number;
  readonly y: number;
  readonly series: "voltage" | "charge";
}

export interface CapacitanceModel {
  readonly capacitanceFarads: Farads;
  readonly capacitanceMicrofarads: Microfarads;
  readonly supplyVoltageVolts: Volts;
  readonly dischargeResistanceOhms: number;
  readonly dischargeResistanceKilohms: Kilohms;
  readonly sampleTimeSeconds: number;
  readonly sampleTimeMilliseconds: Milliseconds;
  readonly storedChargeCoulombs: Coulombs;
  readonly storedChargeMicrocoulombs: number;
  readonly storedEnergyJoules: Joules;
  readonly storedEnergyMillijoules: number;
  readonly timeConstantSeconds: number;
  readonly initialCurrentAmps: number;
  readonly voltageAtSampleVolts: Volts;
  readonly chargeAtSampleCoulombs: Coulombs;
  readonly chargeAtSampleMicrocoulombs: number;
  readonly energyAtSampleJoules: Joules;
  readonly dischargeFractionRemaining: number;
  readonly trace: readonly DischargeTracePoint[];
  readonly interpretation: string;
}

export const capacitanceSpec: TSimulationSpec = {
  id: capacitanceSimId,
  title: "Capacitor Charge and Energy Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/electromagnetism",
    "core/charting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A capacitor is connected to a fixed 6.0 V supply. Before comparing with the lab, what happens if the capacitance is doubled while the voltage is kept the same?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Both stored charge and stored energy double because Q = CV and E = 1/2 CV^2 at fixed V.",
        "Stored charge doubles, but stored energy stays the same because energy depends only on voltage.",
        "Stored charge stays the same because capacitance is only a container size.",
        "Stored charge and energy both halve because the same voltage is spread over more capacitance.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "capacitance",
        label: "Capacitance",
        kind: "slider",
        kernel_binding: "state.capacitanceMicrofarads",
        bounds: { min: 100, max: 1000, step: 50 },
      },
      {
        id: "supply-voltage",
        label: "Supply voltage",
        kind: "slider",
        kernel_binding: "state.supplyVoltageVolts",
        bounds: { min: 2, max: 12, step: 0.5 },
      },
      {
        id: "discharge-resistance",
        label: "Discharge resistance",
        kind: "slider",
        kernel_binding: "state.dischargeResistanceKilohms",
        bounds: { min: 1, max: 20, step: 0.5 },
      },
      {
        id: "sample-time",
        label: "Sample time",
        kind: "slider",
        kernel_binding: "state.sampleTimeMilliseconds",
        bounds: { min: 0, max: 5000, step: 100 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: capacitanceSimId,
        module: "@paideia/a-level-physics-sims/capacitance",
        symbol: "CapacitanceSim",
        props_binding:
          "Show capacitor plates, stored charge, stored energy, time constant, discharge curve, formula substitution, units, legend, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Why does capacitance tell you how much charge is separated per volt, rather than how much charge the capacitor creates?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Capacitance depends on stored charge alone.",
      "Capacitors create charge rather than separate charge.",
      "The discharge curve is linear because current is used up steadily.",
    ],
  },
};

const defaultState: CapacitanceState = {
  capacitanceMicrofarads: 470 as Microfarads,
  dischargeResistanceKilohms: 5 as Kilohms,
  sampleTimeMilliseconds: 1500 as Milliseconds,
  supplyVoltageVolts: volts(6),
};

const presets: readonly {
  readonly label: string;
  readonly state: CapacitanceState;
}[] = [
  { label: "standard store", state: defaultState },
  {
    label: "larger capacitor",
    state: {
      capacitanceMicrofarads: 940 as Microfarads,
      dischargeResistanceKilohms: 5 as Kilohms,
      sampleTimeMilliseconds: 1500 as Milliseconds,
      supplyVoltageVolts: volts(6),
    },
  },
  {
    label: "higher voltage",
    state: {
      capacitanceMicrofarads: 470 as Microfarads,
      dischargeResistanceKilohms: 5 as Kilohms,
      sampleTimeMilliseconds: 1500 as Milliseconds,
      supplyVoltageVolts: volts(10),
    },
  },
  {
    label: "slow discharge",
    state: {
      capacitanceMicrofarads: 680 as Microfarads,
      dischargeResistanceKilohms: 15 as Kilohms,
      sampleTimeMilliseconds: 3000 as Milliseconds,
      supplyVoltageVolts: volts(8),
    },
  },
];

const finitePositive = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value) && value > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite and positive; got ${value}`);

const finiteNonNegative = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value) && value >= 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite and non-negative; got ${value}`);

const finiteDerived = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite after computation; got ${value}`);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<CapacitanceState>): CapacitanceState => ({
  capacitanceMicrofarads: clamp(
    state.capacitanceMicrofarads ?? defaultState.capacitanceMicrofarads,
    100,
    1000,
  ) as Microfarads,
  dischargeResistanceKilohms: clamp(
    state.dischargeResistanceKilohms ?? defaultState.dischargeResistanceKilohms,
    1,
    20,
  ) as Kilohms,
  sampleTimeMilliseconds: clamp(
    state.sampleTimeMilliseconds ?? defaultState.sampleTimeMilliseconds,
    0,
    5000,
  ) as Milliseconds,
  supplyVoltageVolts: volts(clamp(state.supplyVoltageVolts ?? defaultState.supplyVoltageVolts, 2, 12)),
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatMicrofarads = (value: number): string => `${formatNumber(value, 0)} microF`;
const formatVoltage = (value: number): string => `${formatNumber(value, 2)} V`;
const formatKilohms = (value: number): string => `${formatNumber(value, 1)} kOhm`;
const formatSeconds = (value: number): string => `${formatNumber(value, 2)} s`;
const formatMilliseconds = (value: number): string => `${formatNumber(value, 0)} ms`;
const formatMicrocoulombs = (value: number): string => `${formatNumber(value, 1)} microC`;
const formatMillijoules = (value: number): string => `${formatNumber(value, 2)} mJ`;
const formatCurrent = (value: number): string => `${formatNumber(value * 1000, 2)} mA`;
const formatPercent = (value: number): string => `${formatNumber(value * 100, 1)}%`;

const formatScientific = (value: number, unit: string): string => {
  if (value === 0) return `0 ${unit}`;
  const [mantissa, exponent] = value.toExponential(2).split("e");
  return `${mantissa} x 10^${Number(exponent)} ${unit}`;
};

const makeTrace = (
  initialVoltage: number,
  initialChargeMicrocoulombs: number,
  timeConstantSeconds: number,
): readonly DischargeTracePoint[] => {
  const points: DischargeTracePoint[] = [];
  const maxTime = Math.max(5 * timeConstantSeconds, 0.5);
  for (let index = 0; index <= 36; index += 1) {
    const seconds = (maxTime * index) / 36;
    const fraction = Math.exp(-seconds / timeConstantSeconds);
    points.push({ series: "voltage", x: seconds, y: initialVoltage * fraction });
    points.push({ series: "charge", x: seconds, y: initialChargeMicrocoulombs * fraction });
  }
  return points;
};

export const capacitanceModel = (
  state: CapacitanceState,
): KernelResult<CapacitanceModel> => {
  const capacitance = finitePositive(state.capacitanceMicrofarads, "capacitanceMicrofarads");
  if (!capacitance.ok) return capacitance;
  const voltage = finitePositive(state.supplyVoltageVolts, "supplyVoltageVolts");
  if (!voltage.ok) return voltage;
  const resistance = finitePositive(state.dischargeResistanceKilohms, "dischargeResistanceKilohms");
  if (!resistance.ok) return resistance;
  const sampleTime = finiteNonNegative(state.sampleTimeMilliseconds, "sampleTimeMilliseconds");
  if (!sampleTime.ok) return sampleTime;

  const capacitanceFarads = (state.capacitanceMicrofarads * 1e-6) as Farads;
  const resistanceOhms = state.dischargeResistanceKilohms * 1000;
  const sampleTimeSeconds = state.sampleTimeMilliseconds / 1000;
  const storedCharge = capacitanceFarads * state.supplyVoltageVolts;
  const storedEnergy = 0.5 * capacitanceFarads * state.supplyVoltageVolts ** 2;
  const timeConstant = resistanceOhms * capacitanceFarads;
  const initialCurrent = state.supplyVoltageVolts / resistanceOhms;
  const fractionRemaining = Math.exp(-sampleTimeSeconds / timeConstant);
  const voltageAtSample = state.supplyVoltageVolts * fractionRemaining;
  const chargeAtSample = storedCharge * fractionRemaining;
  const energyAtSample = 0.5 * capacitanceFarads * voltageAtSample ** 2;

  for (const [value, label] of [
    [storedCharge, "storedChargeCoulombs"],
    [storedEnergy, "storedEnergyJoules"],
    [timeConstant, "timeConstantSeconds"],
    [initialCurrent, "initialCurrentAmps"],
    [fractionRemaining, "dischargeFractionRemaining"],
    [voltageAtSample, "voltageAtSampleVolts"],
    [chargeAtSample, "chargeAtSampleCoulombs"],
    [energyAtSample, "energyAtSampleJoules"],
  ] as const) {
    const checked = finiteDerived(value, label);
    if (!checked.ok) return checked;
  }

  return ok({
    capacitanceFarads,
    capacitanceMicrofarads: state.capacitanceMicrofarads,
    chargeAtSampleCoulombs: coulombs(chargeAtSample),
    chargeAtSampleMicrocoulombs: chargeAtSample * 1e6,
    dischargeFractionRemaining: fractionRemaining,
    dischargeResistanceKilohms: state.dischargeResistanceKilohms,
    dischargeResistanceOhms: resistanceOhms,
    energyAtSampleJoules: joules(energyAtSample),
    initialCurrentAmps: initialCurrent,
    interpretation:
      fractionRemaining > 0.5
        ? "Most of the separated charge remains because the selected time is less than one time constant."
        : "Less than half the separated charge remains; the curve is exponential, so equal time intervals remove equal fractions rather than equal amounts.",
    sampleTimeMilliseconds: state.sampleTimeMilliseconds,
    sampleTimeSeconds,
    storedChargeCoulombs: coulombs(storedCharge),
    storedChargeMicrocoulombs: storedCharge * 1e6,
    storedEnergyJoules: joules(storedEnergy),
    storedEnergyMillijoules: storedEnergy * 1000,
    supplyVoltageVolts: state.supplyVoltageVolts,
    timeConstantSeconds: timeConstant,
    trace: makeTrace(state.supplyVoltageVolts, storedCharge * 1e6, timeConstant),
    voltageAtSampleVolts: volts(voltageAtSample),
  });
};

const setScenario = (
  set: (key: keyof CapacitanceState, value: CapacitanceState[keyof CapacitanceState]) => void,
  state: CapacitanceState,
) => {
  set("capacitanceMicrofarads", state.capacitanceMicrofarads);
  set("dischargeResistanceKilohms", state.dischargeResistanceKilohms);
  set("sampleTimeMilliseconds", state.sampleTimeMilliseconds);
  set("supplyVoltageVolts", state.supplyVoltageVolts);
};

export const CapacitorDiagram = ({
  state,
  model,
  reveal,
}: {
  readonly state: CapacitanceState;
  readonly model?: CapacitanceModel;
  readonly reveal: boolean;
}) => {
  const chargeRows = reveal && model !== undefined
    ? Math.max(2, Math.min(8, Math.round(model.storedChargeMicrocoulombs / 350)))
    : 3;
  const dynamicDescription = reveal && model !== undefined
    ? `Capacitor ${formatMicrofarads(state.capacitanceMicrofarads)} at ${formatVoltage(state.supplyVoltageVolts)} stores ${formatMicrocoulombs(model.storedChargeMicrocoulombs)} and ${formatMillijoules(model.storedEnergyMillijoules)}.`
    : `Capacitor ${formatMicrofarads(state.capacitanceMicrofarads)} connected to ${formatVoltage(state.supplyVoltageVolts)} with ${formatKilohms(state.dischargeResistanceKilohms)} discharge resistance.`;

  return (
    <div className="energy-stage" aria-label="Capacitor visual">
      <svg aria-label="Parallel plate capacitor diagram" role="img" viewBox="0 0 380 260">
        <title>Parallel plate capacitor</title>
        <desc>{dynamicDescription}</desc>
        <rect fill="#f8fbff" height="260" rx="18" width="380" />
        <line stroke="#475569" strokeWidth="8" x1="150" x2="150" y1="62" y2="198" />
        <line stroke="#475569" strokeWidth="8" x1="230" x2="230" y1="62" y2="198" />
        <path d="M150 130 H94 V214 H286 V130 H230" fill="none" stroke="#64748b" strokeWidth="4" />
        <rect fill="#fff7ed" height="46" rx="12" stroke="#c2410c" strokeWidth="3" width="96" x="142" y="190" />
        <text fill="#9a3412" fontSize="13" fontWeight="800" textAnchor="middle" x="190" y="218">
          {formatVoltage(state.supplyVoltageVolts)}
        </text>
        {Array.from({ length: chargeRows }, (_, index) => {
          const y = 76 + index * (108 / Math.max(1, chargeRows - 1));
          return (
            <g aria-hidden="true" key={y}>
              <text fill="#dc2626" fontSize="18" fontWeight="900" textAnchor="middle" x="126" y={y + 6}>+</text>
              <text fill="#2563eb" fontSize="20" fontWeight="900" textAnchor="middle" x="254" y={y + 7}>-</text>
            </g>
          );
        })}
        <text fill="#10201a" fontSize="13" fontWeight="800" textAnchor="middle" x="190" y="42">
          {formatMicrofarads(state.capacitanceMicrofarads)}
        </text>
        <text fill="#10201a" fontSize="12" fontWeight="700" textAnchor="middle" x="190" y="58">
          separated charge on opposite plates
        </text>
        {reveal && model !== undefined ? (
          <>
            <path d="M286 214 C322 190 322 152 286 130" fill="none" markerEnd="url(#discharge-arrow)" stroke="#059669" strokeLinecap="round" strokeWidth="5" />
            <defs>
              <marker id="discharge-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
                <path d="M0,0 L8,4 L0,8 Z" fill="#059669" />
              </marker>
            </defs>
            <text fill="#065f46" fontSize="13" fontWeight="800" x="298" y="174">
              tau = {formatSeconds(model.timeConstantSeconds)}
            </text>
          </>
        ) : null}
      </svg>
    </div>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<CapacitanceState>();
  const current = useMemo(() => currentState(state), [state]);

  return (
    <section aria-label="Capacitance controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product">
        <p className="lab-kicker">Tune the capacitor</p>
        <ControlGroup legend="Charge, voltage, and discharge controls">
          <Slider label="Capacitance" max={1000} min={100} onChange={(value) => set("capacitanceMicrofarads", value as Microfarads)} step={50} unit="microF" value={current.capacitanceMicrofarads} />
          <Slider label="Supply voltage" max={12} min={2} onChange={(value) => set("supplyVoltageVolts", volts(value))} step={0.5} unit="V" value={current.supplyVoltageVolts} />
          <Slider label="Discharge resistance" max={20} min={1} onChange={(value) => set("dischargeResistanceKilohms", value as Kilohms)} step={0.5} unit="kOhm" value={current.dischargeResistanceKilohms} />
          <Slider label="Sample time" max={5000} min={0} onChange={(value) => set("sampleTimeMilliseconds", value as Milliseconds)} step={100} unit="ms" value={current.sampleTimeMilliseconds} />
        </ControlGroup>
        <div aria-label="Capacitance presets" className="preset-strip">
          {presets.map((preset) => (
            <button key={preset.label} onClick={() => setScenario(set, preset.state)} type="button">
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Reveal capacitor result
        </button>
      </div>
      <section aria-label="Before reveal cue" className="formula-panel formula-panel--product">
        <p className="lab-kicker">Before reveal</p>
        <h3>Predict charge before calculation</h3>
        <p>
          Set the capacitance, supply voltage, resistance, and sample time. The reveal will connect
          charge storage, energy storage, and exponential discharge.
        </p>
        <CapacitorDiagram reveal={false} state={current} />
      </section>
    </section>
  );
};

const Legend = () => (
  <dl aria-label="Formula legend" className="formula-legend">
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--red" /> C</dt>
      <dd>capacitance, in F; slider shows microF.</dd>
    </div>
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> V</dt>
      <dd>potential difference across the plates, in V.</dd>
    </div>
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> Q</dt>
      <dd>magnitude of separated charge on either plate, in C.</dd>
    </div>
    <div>
      <dt><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> U and tau</dt>
      <dd>stored energy in J and discharge time constant in s.</dd>
    </div>
  </dl>
);

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<CapacitanceState>>());
  const model = capacitanceModel(state);

  if (!model.ok) {
    return <p role="alert">The current capacitor settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <CapacitorDiagram model={model.value} reveal state={state} />
        <dl aria-label="Capacitance readout" className="result-readout result-readout--cards">
          <div><dt>Stored charge</dt><dd>{formatMicrocoulombs(model.value.storedChargeMicrocoulombs)}</dd></div>
          <div><dt>Stored energy</dt><dd>{formatMillijoules(model.value.storedEnergyMillijoules)}</dd></div>
          <div><dt>Time constant</dt><dd>{formatSeconds(model.value.timeConstantSeconds)}</dd></div>
          <div><dt>Initial discharge current</dt><dd>{formatCurrent(model.value.initialCurrentAmps)}</dd></div>
        </dl>
        <figure aria-label="Discharge curve" className="plot-panel">
          <LineChart
            ariaLabel="Capacitor discharge curve"
            data={model.value.trace}
            x={{ domain: { min: 0, max: Math.max(0.5, 5 * model.value.timeConstantSeconds) }, label: "Time / s" }}
            y={{ domain: { min: 0, max: Math.max(model.value.supplyVoltageVolts, model.value.storedChargeMicrocoulombs) }, label: "Voltage or charge" }}
          />
          <figcaption className="formula-note">
            Blue-green and red traces share the same exponential fraction: voltage in V and charge
            in microC both follow e^(-t/tau).
          </figcaption>
        </figure>
      </div>
      <section aria-label="Formula used" className="formula-panel formula-panel--product">
        <p className="lab-kicker">Formula used</p>
        <h3>Charge, energy, then discharge</h3>
        <pre aria-label="Capacitance formula" className="formula-code">
          <code>
            <span className="formula-var formula-var--green">Q</span> ={" "}
            <span className="formula-var formula-var--red">C</span>
            <span className="formula-var formula-var--blue">V</span>{"\n"}
            <span className="formula-var formula-var--orange">U</span> = 1/2{" "}
            <span className="formula-var formula-var--red">C</span>
            <span className="formula-var formula-var--blue">V</span>^2{"\n"}
            <span className="formula-var formula-var--orange">tau</span> = R
            <span className="formula-var formula-var--red">C</span>,{" "}
            <span className="formula-var formula-var--blue">V(t)</span> = V0 e^(-t/tau)
          </code>
        </pre>
        <Legend />
        <p>
          Substitution: Q = ({formatScientific(model.value.capacitanceFarads, "F")})(
          {formatVoltage(model.value.supplyVoltageVolts)}) ={" "}
          {formatScientific(model.value.storedChargeCoulombs, "C")} ={" "}
          {formatMicrocoulombs(model.value.storedChargeMicrocoulombs)}.
        </p>
        <p>
          Energy: U = 1/2({formatScientific(model.value.capacitanceFarads, "F")})(
          {formatVoltage(model.value.supplyVoltageVolts)})^2 ={" "}
          {formatScientific(model.value.storedEnergyJoules, "J")} ={" "}
          {formatMillijoules(model.value.storedEnergyMillijoules)}.
        </p>
        <p>
          Discharge: tau = ({formatNumber(model.value.dischargeResistanceOhms, 0)} Ohm)(
          {formatScientific(model.value.capacitanceFarads, "F")}) ={" "}
          {formatSeconds(model.value.timeConstantSeconds)}; at t ={" "}
          {formatMilliseconds(model.value.sampleTimeMilliseconds)}, V(t) ={" "}
          {formatVoltage(model.value.voltageAtSampleVolts)} and Q(t) ={" "}
          {formatMicrocoulombs(model.value.chargeAtSampleMicrocoulombs)}.
        </p>
        <p className="formula-note">
          Interpretation: {formatPercent(model.value.dischargeFractionRemaining)} of the initial
          charge remains. {model.value.interpretation}
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Explain stored charge
        </button>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Explain and transfer prompt" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Explain</p>
      <h3>What does the capacitor actually store?</h3>
      <p>
        A capacitor does not create net charge. It separates equal and opposite charge, and the
        energy is stored in the electric field between its plates.
      </p>
      <p className="formula-note">
        Transfer check: if the voltage is fixed, doubling C doubles Q and doubles U. If C is fixed,
        doubling V doubles Q but quadruples U.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another capacitor
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
      <p className="lab-kicker">Prediction checkpoint</p>
      <h3>Fixed voltage, changing capacitance</h3>
      <p>
        Commit a prediction before the charge, energy, time constant, and discharge curve appear.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set capacitor values
      </button>
    </section>
  );
};

export const CapacitanceSim = () => (
  <SimRuntime packageId={capacitancePackageId} spec={capacitanceSpec}>
    <StageSurface />
  </SimRuntime>
);

export default CapacitanceSim;
