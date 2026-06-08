import { useMemo } from "react";
import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import { linearRegression } from "@paideia/numerical-math";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  approxEqual,
  err,
  joules,
  kelvins,
  kilograms,
  ok,
  type Brand,
  type ConceptPackageId,
  type Joules,
  type Kelvins,
  type KernelResult,
  type Kilograms,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const thermalPhysicsPackageId = "thermal-physics" as ConceptPackageId;
export const thermalPhysicsSimId = "gas-law-energy-transfer-lab";
export type ThermalPhysicsPredictionEvent = PredictionEvent;

export type Celsius = Brand<number, "Celsius">;
export type Kilopascals = Brand<number, "Kilopascals">;
export type Litres = Brand<number, "Litres">;
export type Moles = Brand<number, "Moles">;
export type JoulesPerKilogramKelvin = Brand<number, "JoulesPerKilogramKelvin">;

export const celsius = (n: number): Celsius => n as Celsius;
export const kilopascals = (n: number): Kilopascals => n as Kilopascals;
export const litres = (n: number): Litres => n as Litres;
export const moles = (n: number): Moles => n as Moles;
export const joulesPerKilogramKelvin = (n: number): JoulesPerKilogramKelvin =>
  n as JoulesPerKilogramKelvin;

export interface ThermalPhysicsState {
  readonly volumeLitres: Litres;
  readonly gasTemperatureCelsius: Celsius;
  readonly amountMoles: Moles;
  readonly heatingMassKilograms: Kilograms;
  readonly initialTemperatureCelsius: Celsius;
  readonly finalTemperatureCelsius: Celsius;
  readonly specificHeatCapacityJoulesPerKilogramKelvin: JoulesPerKilogramKelvin;
}

export interface GasLawTracePoint {
  readonly inverseVolumePerLitre: number;
  readonly pressureKilopascals: Kilopascals;
}

export interface ThermalPhysicsModel {
  readonly gasTemperatureKelvins: Kelvins;
  readonly pressureKilopascals: Kilopascals;
  readonly celsiusSubstitutionPressureKilopascals: Kilopascals;
  readonly celsiusTrapPercent: number;
  readonly thermalEnergyTransferJoules: Joules;
  readonly temperatureChangeKelvins: Kelvins;
  readonly pressureTrendSlope: number;
  readonly pressureTrendR2: number;
  readonly trace: readonly GasLawTracePoint[];
  readonly heatingDirection: "heating" | "cooling" | "steady";
}

export const thermalPhysicsSpec: TSimulationSpec = {
  id: thermalPhysicsSimId,
  title: "Gas Law and Energy Transfer Lab",
  interaction_type: "animation-playback",
  kernel_deps: [
    "core/sim-runtime",
    "core/content-schema",
    "core/numerical-math",
    "core/charting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A 0.040 mol gas sample occupies 1.0 L at 27 deg C. Before comparing with the lab, which pressure is closest when the ideal-gas law is used correctly?",
    commit_format: {
      kind: "multiple-choice",
      options: ["9.0 kPa", "100 kPa", "270 kPa", "830 kPa"],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "volume",
        label: "Gas volume",
        kind: "slider",
        kernel_binding: "state.volumeLitres",
        bounds: { min: 0.5, max: 5, step: 0.1 },
      },
      {
        id: "gas-temperature",
        label: "Gas temperature",
        kind: "slider",
        kernel_binding: "state.gasTemperatureCelsius",
        bounds: { min: -20, max: 120, step: 1 },
      },
      {
        id: "amount",
        label: "Amount of gas",
        kind: "slider",
        kernel_binding: "state.amountMoles",
        bounds: { min: 0.01, max: 0.12, step: 0.005 },
      },
      {
        id: "heated-mass",
        label: "Mass heated",
        kind: "slider",
        kernel_binding: "state.heatingMassKilograms",
        bounds: { min: 0.05, max: 1.2, step: 0.05 },
      },
      {
        id: "initial-temperature",
        label: "Initial temperature",
        kind: "slider",
        kernel_binding: "state.initialTemperatureCelsius",
        bounds: { min: 0, max: 80, step: 1 },
      },
      {
        id: "final-temperature",
        label: "Final temperature",
        kind: "slider",
        kernel_binding: "state.finalTemperatureCelsius",
        bounds: { min: 0, max: 100, step: 1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "gas-law-energy-transfer-lab",
        module: "@paideia/a-level-physics-sims/thermal-physics",
        symbol: "ThermalPhysicsSim",
        props_binding:
          "Show Kelvin conversion, ideal-gas pressure, Celsius-substitution trap, heat-transfer calculation, formula substitution, and pressure against inverse-volume trend.",
      },
    ],
  },
  explain: {
    prompt:
      "Why must gas-law temperature be in kelvin, and why can two samples at the same temperature require different energy transfers?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Temperature is the same as thermal energy.",
      "Celsius can be substituted directly into gas laws.",
      "Increasing volume always increases gas pressure.",
    ],
  },
};

const gasConstantKpaLitresPerMoleKelvin = 8.314462618;

const defaultState: ThermalPhysicsState = {
  volumeLitres: litres(1),
  gasTemperatureCelsius: celsius(27),
  amountMoles: moles(0.04),
  heatingMassKilograms: kilograms(0.25),
  initialTemperatureCelsius: celsius(20),
  finalTemperatureCelsius: celsius(60),
  specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(4180),
};

const presets: readonly {
  readonly label: string;
  readonly state: ThermalPhysicsState;
}[] = [
  { label: "room gas sample", state: defaultState },
  {
    label: "compressed syringe",
    state: {
      ...defaultState,
      volumeLitres: litres(0.65),
      gasTemperatureCelsius: celsius(27),
    },
  },
  {
    label: "warmed sealed sample",
    state: {
      ...defaultState,
      volumeLitres: litres(1.2),
      gasTemperatureCelsius: celsius(80),
    },
  },
  {
    label: "small hot sample",
    state: {
      ...defaultState,
      volumeLitres: litres(0.9),
      gasTemperatureCelsius: celsius(100),
      amountMoles: moles(0.025),
      heatingMassKilograms: kilograms(0.1),
      initialTemperatureCelsius: celsius(25),
      finalTemperatureCelsius: celsius(90),
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<ThermalPhysicsState>): ThermalPhysicsState => ({
  volumeLitres: litres(clamp(state.volumeLitres ?? defaultState.volumeLitres, 0.5, 5)),
  gasTemperatureCelsius: celsius(clamp(
    state.gasTemperatureCelsius ?? defaultState.gasTemperatureCelsius,
    -20,
    120,
  )),
  amountMoles: moles(clamp(state.amountMoles ?? defaultState.amountMoles, 0.01, 0.12)),
  heatingMassKilograms: kilograms(clamp(
    state.heatingMassKilograms ?? defaultState.heatingMassKilograms,
    0.05,
    1.2,
  )),
  initialTemperatureCelsius: celsius(clamp(
    state.initialTemperatureCelsius ?? defaultState.initialTemperatureCelsius,
    0,
    80,
  )),
  finalTemperatureCelsius: celsius(clamp(
    state.finalTemperatureCelsius ?? defaultState.finalTemperatureCelsius,
    0,
    100,
  )),
  specificHeatCapacityJoulesPerKilogramKelvin:
    state.specificHeatCapacityJoulesPerKilogramKelvin ??
    defaultState.specificHeatCapacityJoulesPerKilogramKelvin,
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatSigned = (value: number, places = 2): string =>
  value >= 0 ? `+${formatNumber(value, places)}` : formatNumber(value, places);

const kelvinFromCelsius = (temperatureCelsius: Celsius): Kelvins =>
  kelvins(temperatureCelsius + 273.15);

const idealGasPressure = (
  amountMoles: Moles,
  temperatureKelvins: number,
  volumeLitres: Litres,
): KernelResult<Kilopascals> => {
  if (amountMoles <= 0) return err("precondition-violated", "Amount of gas must be positive.");
  if (temperatureKelvins <= 0) {
    return err("precondition-violated", "Thermodynamic temperature must be positive.");
  }
  if (volumeLitres <= 0) return err("precondition-violated", "Volume must be positive.");
  return ok(kilopascals((amountMoles * gasConstantKpaLitresPerMoleKelvin * temperatureKelvins) / volumeLitres));
};

const heatingDirection = (energyTransferJoules: number): ThermalPhysicsModel["heatingDirection"] => {
  if (Math.abs(energyTransferJoules) < 1e-9) return "steady";
  return energyTransferJoules > 0 ? "heating" : "cooling";
};

export const thermalPhysicsModel = (
  state: ThermalPhysicsState,
): KernelResult<ThermalPhysicsModel> => {
  const temperatureKelvins = kelvinFromCelsius(state.gasTemperatureCelsius);
  const pressure = idealGasPressure(state.amountMoles, temperatureKelvins, state.volumeLitres);
  if (!pressure.ok) return pressure;

  const celsiusTrapPressure = idealGasPressure(
    state.amountMoles,
    state.gasTemperatureCelsius,
    state.volumeLitres,
  );
  const safeCelsiusTrapPressure = celsiusTrapPressure.ok
    ? celsiusTrapPressure.value
    : kilopascals(0);
  const celsiusTrapPercent =
    approxEqual(pressure.value, 0, 1e-9)
      ? 0
      : ((pressure.value - safeCelsiusTrapPressure) / pressure.value) * 100;

  const temperatureChange = kelvins(
    state.finalTemperatureCelsius - state.initialTemperatureCelsius,
  );
  const energyTransfer = joules(
    state.heatingMassKilograms *
      state.specificHeatCapacityJoulesPerKilogramKelvin *
      temperatureChange,
  );

  const trace: GasLawTracePoint[] = [];
  const regressionPoints: readonly [number, number][] = Array.from({ length: 16 }, (_, index) => {
    const volume = litres(0.5 + index * 0.3);
    const pointPressure = idealGasPressure(state.amountMoles, temperatureKelvins, volume);
    if (!pointPressure.ok) return [0, 0] as const;
    const inverseVolume = 1 / volume;
    trace.push({
      inverseVolumePerLitre: inverseVolume,
      pressureKilopascals: pointPressure.value,
    });
    return [inverseVolume, pointPressure.value] as const;
  });

  const regression = linearRegression(regressionPoints);
  if (!regression.ok) return regression;

  return ok({
    gasTemperatureKelvins: temperatureKelvins,
    pressureKilopascals: pressure.value,
    celsiusSubstitutionPressureKilopascals: safeCelsiusTrapPressure,
    celsiusTrapPercent,
    thermalEnergyTransferJoules: energyTransfer,
    temperatureChangeKelvins: temperatureChange,
    pressureTrendSlope: regression.value.m,
    pressureTrendR2: regression.value.r2,
    trace,
    heatingDirection: heatingDirection(energyTransfer),
  });
};

export const ThermalPistonDiagram = ({
  state,
  model,
}: {
  readonly state: ThermalPhysicsState;
  readonly model: ThermalPhysicsModel;
}) => {
  const pistonX = 78 + (state.volumeLitres - 0.5) * 42;
  const moleculeCount = Math.max(7, Math.round(state.amountMoles * 150));
  const heatLevel = clamp(
    (state.finalTemperatureCelsius - state.initialTemperatureCelsius + 80) / 180,
    0.1,
    1,
  );
  const chartData = model.trace.map((point) => ({
    x: point.inverseVolumePerLitre,
    y: point.pressureKilopascals,
    series: "pressure",
  }));

  return (
    <div className="energy-stage" aria-label="Thermal physics visual">
      <svg aria-label="Gas sample in a syringe" role="img" viewBox="0 0 360 188">
        <defs>
          <marker id="thermal-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 Z" fill="#1f5f8b" />
          </marker>
        </defs>
        <rect fill="#f8fbff" height="188" rx="18" width="360" />
        <rect fill="#e0f2fe" height="76" rx="12" stroke="#2563eb" strokeWidth="3" width="230" x="52" y="44" />
        <rect fill="#f8fafc" height="86" rx="8" stroke="#0f172a" strokeWidth="4" width="20" x={pistonX} y="39" />
        <line
          markerEnd="url(#thermal-arrow)"
          stroke="#1f5f8b"
          strokeLinecap="round"
          strokeWidth="5"
          x1={pistonX + 28}
          x2={Math.min(316, pistonX + 74)}
          y1="82"
          y2="82"
        />
        {Array.from({ length: moleculeCount }, (_, index) => {
          const x = 70 + ((index * 31) % Math.max(32, pistonX - 74));
          const y = 58 + ((index * 23) % 48);
          return <circle key={index} cx={x} cy={y} fill="#f97316" opacity="0.78" r="4" />;
        })}
        <rect fill="#fee2e2" height={58 * heatLevel} rx="8" width="28" x="296" y={122 - 58 * heatLevel} />
        <rect fill="none" height="72" rx="10" stroke="#991b1b" strokeWidth="3" width="36" x="292" y="50" />
        <line stroke="#991b1b" strokeLinecap="round" strokeWidth="4" x1="310" x2="310" y1="38" y2="50" />
        <text fill="#10201a" fontSize="12" fontWeight="800" x="58" y="148">
          V = {formatNumber(state.volumeLitres, 1)} L
        </text>
        <text fill="#10201a" fontSize="12" fontWeight="800" x="174" y="148">
          T = {formatNumber(model.gasTemperatureKelvins, 2)} K
        </text>
        <text fill="#10201a" fontSize="12" fontWeight="800" x="58" y="168">
          p = {formatNumber(model.pressureKilopascals, 1)} kPa
        </text>
        <text fill="#10201a" fontSize="12" fontWeight="800" x="174" y="168">
          Q = {formatSigned(model.thermalEnergyTransferJoules, 0)} J
        </text>
      </svg>
      <LineChart
        data={chartData}
        x={{ domain: { min: 0.2, max: 2.1 } }}
        y={{ domain: { min: 0, max: Math.max(120, model.trace[0]?.pressureKilopascals ?? 120) } }}
      />
    </div>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<ThermalPhysicsState>();
  const current = currentState(state);
  const model = useMemo(() => thermalPhysicsModel(current), [current]);

  return (
    <section aria-label="Thermal controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product" aria-label="Gas and heating controls">
        <p className="lab-kicker">Tune the gas sample</p>
        <ControlGroup legend="Gas law and heating controls">
          <Slider
            label="Gas volume"
            max={5}
            min={0.5}
            onChange={(value) => set("volumeLitres", litres(value))}
            step={0.1}
            unit="L"
            value={current.volumeLitres}
          />
          <Slider
            label="Gas temperature"
            max={120}
            min={-20}
            onChange={(value) => set("gasTemperatureCelsius", celsius(value))}
            step={1}
            unit="deg C"
            value={current.gasTemperatureCelsius}
          />
          <Slider
            label="Amount of gas"
            max={0.12}
            min={0.01}
            onChange={(value) => set("amountMoles", moles(value))}
            step={0.005}
            unit="mol"
            value={current.amountMoles}
          />
          <Slider
            label="Mass heated"
            max={1.2}
            min={0.05}
            onChange={(value) => set("heatingMassKilograms", kilograms(value))}
            step={0.05}
            unit="kg"
            value={current.heatingMassKilograms}
          />
          <Slider
            label="Initial temperature"
            max={80}
            min={0}
            onChange={(value) => set("initialTemperatureCelsius", celsius(value))}
            step={1}
            unit="deg C"
            value={current.initialTemperatureCelsius}
          />
          <Slider
            label="Final temperature"
            max={100}
            min={0}
            onChange={(value) => set("finalTemperatureCelsius", celsius(value))}
            step={1}
            unit="deg C"
            value={current.finalTemperatureCelsius}
          />
        </ControlGroup>
        <div className="preset-strip" aria-label="Scenario presets">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                set("volumeLitres", preset.state.volumeLitres);
                set("gasTemperatureCelsius", preset.state.gasTemperatureCelsius);
                set("amountMoles", preset.state.amountMoles);
                set("heatingMassKilograms", preset.state.heatingMassKilograms);
                set("initialTemperatureCelsius", preset.state.initialTemperatureCelsius);
                set("finalTemperatureCelsius", preset.state.finalTemperatureCelsius);
                set(
                  "specificHeatCapacityJoulesPerKilogramKelvin",
                  preset.state.specificHeatCapacityJoulesPerKilogramKelvin,
                );
              }}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Reveal thermal behaviour
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Convert before calculating</h3>
        <p>
          Gas-law temperature is thermodynamic temperature. Change the volume and temperature, then
          predict how pressure should respond before the readout appears.
        </p>
        {model.ok ? (
          <p>
            Your settings are valid. The reveal will compare the kelvin calculation with the
            common Celsius substitution trap.
          </p>
        ) : (
          <p role="alert">The current thermal settings need finite positive values.</p>
        )}
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<ThermalPhysicsState>>());
  const model = thermalPhysicsModel(state);

  if (!model.ok) {
    return <p role="alert">The current thermal settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <ThermalPistonDiagram model={model.value} state={state} />
        <dl aria-label="Thermal readout" className="result-readout result-readout--cards">
          <div>
            <dt>Gas pressure</dt>
            <dd>{formatNumber(model.value.pressureKilopascals, 1)} kPa</dd>
          </div>
          <div>
            <dt>Thermodynamic temperature</dt>
            <dd>{formatNumber(model.value.gasTemperatureKelvins, 2)} K</dd>
          </div>
          <div>
            <dt>Energy transfer</dt>
            <dd>{formatSigned(model.value.thermalEnergyTransferJoules, 0)} J</dd>
          </div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Kelvin fixes the gas law</h3>
        <pre className="formula-code" aria-label="Thermal physics formulas">
          <code>
            <span className="formula-var formula-var--green">T_K</span> ={" "}
            <span className="formula-var formula-var--orange">T_C</span> + 273.15{"\n"}
            <span className="formula-var formula-var--blue">p</span> ={" "}
            <span className="formula-var formula-var--purple">n</span> R{" "}
            <span className="formula-var formula-var--green">T_K</span> /{" "}
            <span className="formula-var formula-var--orange">V</span>{"\n"}
            <span className="formula-var formula-var--blue">Q</span> = m c Delta T
          </code>
        </pre>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt><span className="legend-swatch legend-swatch--green" /> T_K</dt>
            <dd>kelvin temperature, {formatNumber(model.value.gasTemperatureKelvins, 2)} K</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--orange" /> T_C, V</dt>
            <dd>
              Celsius reading {formatNumber(state.gasTemperatureCelsius, 1)} deg C and volume{" "}
              {formatNumber(state.volumeLitres, 1)} L
            </dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--purple" /> n, R</dt>
            <dd>
              amount {formatNumber(state.amountMoles, 3)} mol and gas constant 8.314 kPa L mol^-1 K^-1
            </dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--blue" /> p, Q</dt>
            <dd>pressure and thermal energy transfer read from the current settings</dd>
          </div>
        </dl>
        <p>
          T_K = {formatNumber(state.gasTemperatureCelsius, 1)} + 273.15 ={" "}
          {formatNumber(model.value.gasTemperatureKelvins, 2)} K.
        </p>
        <p>
          p = ({formatNumber(state.amountMoles, 3)} mol)(8.314 kPa L mol^-1 K^-1)(
          {formatNumber(model.value.gasTemperatureKelvins, 2)} K) /{" "}
          {formatNumber(state.volumeLitres, 1)} L ={" "}
          {formatNumber(model.value.pressureKilopascals, 1)} kPa.
        </p>
        <p>
          If {formatNumber(state.gasTemperatureCelsius, 1)} deg C is used directly, the pressure
          would be {formatNumber(model.value.celsiusSubstitutionPressureKilopascals, 1)} kPa, about{" "}
          {formatNumber(model.value.celsiusTrapPercent, 0)}% too low.
        </p>
        <p>
          Q = ({formatNumber(state.heatingMassKilograms, 2)} kg)(
          {formatNumber(state.specificHeatCapacityJoulesPerKilogramKelvin, 0)} J kg^-1 K^-1)(
          {formatSigned(model.value.temperatureChangeKelvins, 0)} K) ={" "}
          {formatSigned(model.value.thermalEnergyTransferJoules, 0)} J.
        </p>
        <p>
          The pressure-against-1/V trend has gradient {formatNumber(model.value.pressureTrendSlope, 1)}
          {" "}kPa L and R2 = {formatNumber(model.value.pressureTrendR2, 3)}, so pressure falls when
          volume rises at fixed amount and temperature.
        </p>
        <p className="formula-note">
          Same temperature does not mean same thermal energy: the energy transfer also depends on
          mass, material heat capacity, and temperature change.
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Explain the thermal link
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
      <h3>Weather balloon comparison</h3>
      <p>
        A weather balloon rises into colder air while the gas amount stays nearly fixed. Decide
        which variable must change to keep the pressure close to the outside air, and explain why
        Celsius cannot be substituted into the gas law.
      </p>
      <p className="formula-note">
        Use pV = nRT_K for the gas state and Q = mc Delta T only for the energy transfer into or
        out of a material sample.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another thermal case
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
      <h3>What temperature belongs in pV = nRT?</h3>
      <p>
        Commit a prediction before the pressure, chart, and heat-transfer readouts appear. The
        reveal will connect kelvin conversion, gas pressure, volume, and energy transfer.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up thermal lab
      </button>
    </section>
  );
};

export const ThermalPhysicsSim = () => (
  <SimRuntime spec={thermalPhysicsSpec} packageId={thermalPhysicsPackageId}>
    <StageSurface />
  </SimRuntime>
);

export default ThermalPhysicsSim;
