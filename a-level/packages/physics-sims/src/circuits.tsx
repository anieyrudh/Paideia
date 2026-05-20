import { useMemo } from "react";
import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  combineParallel,
  combineSeries,
  elementId,
  nodeId,
  ohmsLaw,
  solveDcCircuit,
  voltageDivider,
  type CircuitElementId,
} from "@paideia/circuits";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  err,
  ok,
  type ConceptPackageId,
  type KernelResult,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const circuitsPackageId = "circuits" as ConceptPackageId;
export const circuitsSimId = "series-parallel-circuit-lab";
export type CircuitsPredictionEvent = PredictionEvent;

export interface CircuitState {
  readonly supplyVoltageVolts: number;
  readonly seriesResistanceOhms: number;
  readonly branchAResistanceOhms: number;
  readonly branchBResistanceOhms: number;
}

export interface CircuitVoltageTracePoint {
  readonly component: "R1" | "parallel branch";
  readonly voltageVolts: number;
}

export interface CircuitModel {
  readonly parallelEquivalentOhms: number;
  readonly totalResistanceOhms: number;
  readonly totalCurrentAmps: number;
  readonly seriesVoltageVolts: number;
  readonly parallelVoltageVolts: number;
  readonly branchACurrentAmps: number;
  readonly branchBCurrentAmps: number;
  readonly sourcePowerWatts: number;
  readonly loadPowerWatts: number;
  readonly voltageTrace: readonly CircuitVoltageTracePoint[];
}

export const circuitsSpec: TSimulationSpec = {
  id: circuitsSimId,
  title: "Series-Parallel Circuit Lab",
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
      "A resistor is added in parallel with an existing branch while the supply voltage stays fixed. Before revealing the lab, what happens to the total current drawn from the supply?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The total current decreases because there are more components.",
        "The total current increases because the equivalent resistance of the parallel branch decreases.",
        "The total current stays the same because the battery voltage is fixed.",
        "The total current becomes zero because current is split between branches.",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "supply-voltage",
        label: "Supply voltage",
        kind: "slider",
        kernel_binding: "state.supplyVoltageVolts",
        bounds: { min: 3, max: 12, step: 0.5 },
      },
      {
        id: "series-resistance",
        label: "Series resistor",
        kind: "slider",
        kernel_binding: "state.seriesResistanceOhms",
        bounds: { min: 5, max: 60, step: 1 },
      },
      {
        id: "branch-a-resistance",
        label: "Upper branch resistor",
        kind: "slider",
        kernel_binding: "state.branchAResistanceOhms",
        bounds: { min: 10, max: 100, step: 1 },
      },
      {
        id: "branch-b-resistance",
        label: "Lower branch resistor",
        kind: "slider",
        kernel_binding: "state.branchBResistanceOhms",
        bounds: { min: 10, max: 100, step: 1 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: circuitsSimId,
        module: "@paideia/a-level-physics-sims/circuits",
        symbol: "CircuitsSim",
        props_binding:
          "Show the series-parallel circuit, equivalent resistance, current split, voltage division, formula substitution, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Why does adding a parallel path reduce equivalent resistance even though it adds another resistor?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Current is used up by components.",
      "A fixed-voltage battery fixes current.",
      "Adding any resistor always increases total resistance.",
    ],
  },
};

const defaultState: CircuitState = {
  supplyVoltageVolts: 9,
  seriesResistanceOhms: 20,
  branchAResistanceOhms: 40,
  branchBResistanceOhms: 60,
};

const presets: readonly {
  readonly label: string;
  readonly state: CircuitState;
}[] = [
  { label: "balanced split", state: defaultState },
  {
    label: "near-equal branches",
    state: {
      supplyVoltageVolts: 9,
      seriesResistanceOhms: 15,
      branchAResistanceOhms: 30,
      branchBResistanceOhms: 30,
    },
  },
  {
    label: "dominant upper branch",
    state: {
      supplyVoltageVolts: 12,
      seriesResistanceOhms: 25,
      branchAResistanceOhms: 18,
      branchBResistanceOhms: 90,
    },
  },
  {
    label: "large series resistor",
    state: {
      supplyVoltageVolts: 6,
      seriesResistanceOhms: 55,
      branchAResistanceOhms: 40,
      branchBResistanceOhms: 80,
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<CircuitState>): CircuitState => ({
  supplyVoltageVolts: clamp(state.supplyVoltageVolts ?? defaultState.supplyVoltageVolts, 3, 12),
  seriesResistanceOhms: clamp(
    state.seriesResistanceOhms ?? defaultState.seriesResistanceOhms,
    5,
    60,
  ),
  branchAResistanceOhms: clamp(
    state.branchAResistanceOhms ?? defaultState.branchAResistanceOhms,
    10,
    100,
  ),
  branchBResistanceOhms: clamp(
    state.branchBResistanceOhms ?? defaultState.branchBResistanceOhms,
    10,
    100,
  ),
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatCurrent = (value: number): string => `${formatNumber(value, 3)} A`;
const formatPower = (value: number): string => `${formatNumber(value, 2)} W`;
const formatResistance = (value: number): string => `${formatNumber(value, 2)} ohm`;
const formatVoltage = (value: number): string => `${formatNumber(value, 2)} V`;

const requiredId = <T,>(result: KernelResult<T>, label: string): KernelResult<T> =>
  result.ok ? result : err(result.error.code, `${label}: ${result.error.message}`);

const currentFor = (
  currents: readonly { readonly element: CircuitElementId; readonly currentAmps: number }[],
  id: CircuitElementId,
): KernelResult<number> => {
  const match = currents.find((entry) => entry.element === id);
  return match === undefined
    ? err("numerical-instability", `Missing current for ${id}`)
    : ok(match.currentAmps);
};

export const circuitsModel = (state: CircuitState): KernelResult<CircuitModel> => {
  const parallelEquivalent = combineParallel([
    state.branchAResistanceOhms,
    state.branchBResistanceOhms,
  ]);
  if (!parallelEquivalent.ok) return parallelEquivalent;

  const totalResistance = combineSeries([
    state.seriesResistanceOhms,
    parallelEquivalent.value,
  ]);
  if (!totalResistance.ok) return totalResistance;

  const total = ohmsLaw({
    voltageVolts: state.supplyVoltageVolts,
    resistanceOhms: totalResistance.value,
  });
  if (!total.ok) return total;

  const drops = voltageDivider(state.supplyVoltageVolts, [
    state.seriesResistanceOhms,
    parallelEquivalent.value,
  ]);
  if (!drops.ok) return drops;

  const seriesVoltage = drops.value[0];
  const parallelVoltage = drops.value[1];
  if (seriesVoltage === undefined || parallelVoltage === undefined) {
    return err("numerical-instability", "Voltage divider did not return both drops.");
  }

  const ground = requiredId(nodeId("ground"), "ground node");
  const supply = requiredId(nodeId("supply"), "supply node");
  const junction = requiredId(nodeId("junction"), "junction node");
  const source = requiredId(elementId("source"), "source element");
  const r1 = requiredId(elementId("r1"), "series resistor");
  const r2 = requiredId(elementId("r2"), "upper branch resistor");
  const r3 = requiredId(elementId("r3"), "lower branch resistor");
  if (!ground.ok) return ground;
  if (!supply.ok) return supply;
  if (!junction.ok) return junction;
  if (!source.ok) return source;
  if (!r1.ok) return r1;
  if (!r2.ok) return r2;
  if (!r3.ok) return r3;

  const solved = solveDcCircuit({
    referenceNode: ground.value,
    elements: [
      {
        kind: "voltage-source",
        id: source.value,
        positive: supply.value,
        negative: ground.value,
        voltageVolts: state.supplyVoltageVolts,
      },
      {
        kind: "resistor",
        id: r1.value,
        from: supply.value,
        to: junction.value,
        resistanceOhms: state.seriesResistanceOhms,
      },
      {
        kind: "resistor",
        id: r2.value,
        from: junction.value,
        to: ground.value,
        resistanceOhms: state.branchAResistanceOhms,
      },
      {
        kind: "resistor",
        id: r3.value,
        from: junction.value,
        to: ground.value,
        resistanceOhms: state.branchBResistanceOhms,
      },
    ],
  });
  if (!solved.ok) return solved;

  const branchA = currentFor(solved.value.elementCurrents, r2.value);
  const branchB = currentFor(solved.value.elementCurrents, r3.value);
  if (!branchA.ok) return branchA;
  if (!branchB.ok) return branchB;

  return ok({
    parallelEquivalentOhms: parallelEquivalent.value,
    totalResistanceOhms: totalResistance.value,
    totalCurrentAmps: total.value.currentAmps,
    seriesVoltageVolts: seriesVoltage,
    parallelVoltageVolts: parallelVoltage,
    branchACurrentAmps: branchA.value,
    branchBCurrentAmps: branchB.value,
    sourcePowerWatts: -total.value.powerWatts,
    loadPowerWatts: total.value.powerWatts,
    voltageTrace: [
      { component: "R1", voltageVolts: seriesVoltage },
      { component: "parallel branch", voltageVolts: parallelVoltage },
    ],
  });
};

export const CircuitsDiagram = ({
  state,
  model,
  reveal,
}: {
  readonly state: CircuitState;
  readonly model?: CircuitModel;
  readonly reveal: boolean;
}) => {
  const chartData = (model?.voltageTrace ?? []).map((point, index) => ({
    x: index + 1,
    y: point.voltageVolts,
    series: point.component,
  }));

  return (
    <div className="energy-stage" aria-label="Series-parallel circuit visual">
      <svg aria-label="Circuit diagram" role="img" viewBox="0 0 380 240">
        <rect fill="#f8fbff" height="240" rx="18" width="380" />
        <line stroke="#344054" strokeLinecap="round" strokeWidth="5" x1="76" x2="76" y1="62" y2="178" />
        <line stroke="#344054" strokeLinecap="round" strokeWidth="5" x1="76" x2="152" y1="62" y2="62" />
        <line stroke="#344054" strokeLinecap="round" strokeWidth="5" x1="220" x2="304" y1="62" y2="62" />
        <line stroke="#344054" strokeLinecap="round" strokeWidth="5" x1="304" x2="304" y1="62" y2="178" />
        <line stroke="#344054" strokeLinecap="round" strokeWidth="5" x1="76" x2="304" y1="178" y2="178" />
        <rect fill="#7c3aed" height="26" rx="4" width="68" x="152" y="49" />
        <rect fill="#059669" height="26" rx="4" width="74" x="188" y="102" />
        <rect fill="#d97706" height="26" rx="4" width="74" x="188" y="151" />
        <line stroke="#344054" strokeLinecap="round" strokeWidth="5" x1="220" x2="220" y1="75" y2="102" />
        <line stroke="#344054" strokeLinecap="round" strokeWidth="5" x1="262" x2="262" y1="128" y2="151" />
        <line stroke="#344054" strokeLinecap="round" strokeWidth="5" x1="262" x2="304" y1="115" y2="115" />
        <line stroke="#344054" strokeLinecap="round" strokeWidth="5" x1="262" x2="304" y1="164" y2="164" />
        <circle cx="76" cy="120" fill="#2563eb" r="22" />
        <text fill="#ffffff" fontSize="14" fontWeight="800" textAnchor="middle" x="76" y="125">
          V
        </text>
        <text fill="#10201a" fontSize="13" fontWeight="800" x="144" y="38">
          R1 {formatResistance(state.seriesResistanceOhms)}
        </text>
        <text fill="#10201a" fontSize="13" fontWeight="800" x="188" y="95">
          R2 {formatResistance(state.branchAResistanceOhms)}
        </text>
        <text fill="#10201a" fontSize="13" fontWeight="800" x="188" y="146">
          R3 {formatResistance(state.branchBResistanceOhms)}
        </text>
        <text fill="#10201a" fontSize="13" fontWeight="800" x="42" y="210">
          supply {formatVoltage(state.supplyVoltageVolts)}
        </text>
        {reveal && model !== undefined ? (
          <>
            <text fill="#10201a" fontSize="13" fontWeight="800" x="110" y="210">
              total current {formatCurrent(model.totalCurrentAmps)}
            </text>
            <text fill="#10201a" fontSize="12" fontWeight="700" x="276" y="108">
              {formatCurrent(model.branchACurrentAmps)}
            </text>
            <text fill="#10201a" fontSize="12" fontWeight="700" x="276" y="157">
              {formatCurrent(model.branchBCurrentAmps)}
            </text>
          </>
        ) : null}
      </svg>
      {reveal && model !== undefined ? (
        <LineChart
          data={chartData}
          x={{ domain: { min: 1, max: 2 } }}
          y={{ domain: { min: 0, max: state.supplyVoltageVolts } }}
        />
      ) : null}
    </div>
  );
};

const setScenario = (
  set: (key: keyof CircuitState, value: CircuitState[keyof CircuitState]) => void,
  state: CircuitState,
) => {
  set("supplyVoltageVolts", state.supplyVoltageVolts);
  set("seriesResistanceOhms", state.seriesResistanceOhms);
  set("branchAResistanceOhms", state.branchAResistanceOhms);
  set("branchBResistanceOhms", state.branchBResistanceOhms);
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<CircuitState>();
  const current = useMemo(() => currentState(state), [state]);

  return (
    <section aria-label="Circuit controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product" aria-label="Circuit controls">
        <p className="lab-kicker">Tune the circuit</p>
        <ControlGroup legend="Supply and resistor controls">
          <Slider label="Supply voltage" max={12} min={3} onChange={(value) => set("supplyVoltageVolts", value)} step={0.5} unit="V" value={current.supplyVoltageVolts} />
          <Slider label="Series resistor" max={60} min={5} onChange={(value) => set("seriesResistanceOhms", value)} step={1} unit="ohm" value={current.seriesResistanceOhms} />
          <Slider label="Upper branch resistor" max={100} min={10} onChange={(value) => set("branchAResistanceOhms", value)} step={1} unit="ohm" value={current.branchAResistanceOhms} />
          <Slider label="Lower branch resistor" max={100} min={10} onChange={(value) => set("branchBResistanceOhms", value)} step={1} unit="ohm" value={current.branchBResistanceOhms} />
        </ControlGroup>
        <div className="preset-strip" aria-label="Circuit presets">
          {presets.map((preset) => (
            <button key={preset.label} onClick={() => setScenario(set, preset.state)} type="button">
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Reveal circuit result
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Track the equivalent path</h3>
        <p>
          Set the supply and resistors, then predict how the parallel branch changes the resistance
          seen by the supply before any current or power readout is shown.
        </p>
        <CircuitsDiagram state={current} reveal={false} />
      </section>
    </section>
  );
};

const Legend = () => (
  <table aria-label="Formula legend" className="formula-legend">
    <thead>
      <tr>
        <th>Color</th>
        <th>Symbol</th>
        <th>Meaning</th>
        <th>Unit</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> Blue</td>
        <td>V</td>
        <td>supply potential difference</td>
        <td>volt, V</td>
      </tr>
      <tr>
        <td><span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> Purple</td>
        <td>R_s</td>
        <td>series resistance</td>
        <td>ohm</td>
      </tr>
      <tr>
        <td><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> Green</td>
        <td>R_p</td>
        <td>parallel equivalent resistance</td>
        <td>ohm</td>
      </tr>
      <tr>
        <td><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> Green</td>
        <td>R_2, R_3</td>
        <td>the two resistors in the parallel branch</td>
        <td>ohm</td>
      </tr>
      <tr>
        <td><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> Amber</td>
        <td>I</td>
        <td>total current from the supply</td>
        <td>ampere, A</td>
      </tr>
    </tbody>
  </table>
);

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<CircuitState>>());
  const model = circuitsModel(state);

  if (!model.ok) {
    return <p role="alert">The current circuit settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <CircuitsDiagram model={model.value} state={state} reveal />
        <dl aria-label="Circuit readout" className="result-readout result-readout--cards">
          <div><dt>Parallel equivalent</dt><dd>{formatResistance(model.value.parallelEquivalentOhms)}</dd></div>
          <div><dt>Total resistance</dt><dd>{formatResistance(model.value.totalResistanceOhms)}</dd></div>
          <div><dt>Total current</dt><dd>{formatCurrent(model.value.totalCurrentAmps)}</dd></div>
          <div><dt>Power delivered</dt><dd>{formatPower(model.value.loadPowerWatts)}</dd></div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Reduce the parallel branch first</h3>
        <pre className="formula-code" aria-label="Circuit relationship formula">
          <code>
            <span className="formula-var formula-var--green">R_p</span> = (1 /{" "}
            <span className="formula-var formula-var--green">R_2</span> + 1 /{" "}
            <span className="formula-var formula-var--green">R_3</span>)^-1{"\n"}
            <span className="formula-var formula-var--orange">I</span> ={" "}
            <span className="formula-var formula-var--blue">V</span> / (
            <span className="formula-var formula-var--purple">R_s</span> +{" "}
            <span className="formula-var formula-var--green">R_p</span>)
          </code>
        </pre>
        <Legend />
        <p>
          Substitution: R_p = (1 / {formatResistance(state.branchAResistanceOhms)} + 1 /{" "}
          {formatResistance(state.branchBResistanceOhms)})^-1 ={" "}
          {formatResistance(model.value.parallelEquivalentOhms)}.
        </p>
        <p>
          Then I = {formatVoltage(state.supplyVoltageVolts)} / (
          {formatResistance(state.seriesResistanceOhms)} +{" "}
          {formatResistance(model.value.parallelEquivalentOhms)}) ={" "}
          {formatCurrent(model.value.totalCurrentAmps)}.
        </p>
        <p>
          Voltage across R1 is {formatVoltage(model.value.seriesVoltageVolts)} and the parallel
          branch has {formatVoltage(model.value.parallelVoltageVolts)}, so branch currents are{" "}
          {formatCurrent(model.value.branchACurrentAmps)} and{" "}
          {formatCurrent(model.value.branchBCurrentAmps)}.
        </p>
        <p className="formula-note">
          This formula applies because the two branch resistors share the same voltage, so their
          conductances add before the series resistance is added.
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Explain the current split
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
      <h3>Choose the path that sets the current</h3>
      <p>
        Try the dominant upper branch preset. Which branch gets the larger current, and why does
        the total current depend on equivalent resistance rather than on the number of components?
      </p>
      <p className="formula-note">
        Use the shared branch voltage with I = V / R for each branch, then add branch currents to
        recover the supply current.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another circuit
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
      <h3>What changes the supply current?</h3>
      <p>
        Commit a prediction before the equivalent resistance, current split, and power readouts
        appear.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Build circuit
      </button>
    </section>
  );
};

export const CircuitsSim = () => (
  <SimRuntime packageId={circuitsPackageId} spec={circuitsSpec}>
    <StageSurface />
  </SimRuntime>
);

export default CircuitsSim;
