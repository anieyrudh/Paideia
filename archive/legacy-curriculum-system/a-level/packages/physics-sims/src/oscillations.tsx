import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import { springOscillator } from "@paideia/mechanics";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  kilograms,
  metres,
  newtonsPerMetre,
  radians,
  seconds,
  type ConceptPackageId,
  type Hertz,
  type Joules,
  type KernelResult,
  type Kilograms,
  type Metres,
  type MetresPerSecond,
  type MetresPerSecondSquared,
  type NewtonsPerMetre,
  type Radians,
  type RadiansPerSecond,
  type Seconds,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const oscillationsPackageId = "oscillations" as ConceptPackageId;
export const oscillationsSimId = "simple-harmonic-motion-lab";
export type OscillationsPredictionEvent = PredictionEvent;

export interface OscillationsState {
  readonly massKilograms: Kilograms;
  readonly springConstantNewtonsPerMetre: NewtonsPerMetre;
  readonly amplitudeMetres: Metres;
  readonly phaseRadians: Radians;
  readonly timeSeconds: Seconds;
}

export interface OscillationTracePoint {
  readonly timeSeconds: Seconds;
  readonly displacementMetres: Metres;
  readonly velocityMetresPerSecond: MetresPerSecond;
  readonly accelerationMetresPerSecondSquared: MetresPerSecondSquared;
  readonly kineticEnergyJoules: Joules;
  readonly potentialEnergyJoules: Joules;
}

export interface OscillationsModel {
  readonly angularFrequencyRadiansPerSecond: RadiansPerSecond;
  readonly periodSeconds: Seconds;
  readonly frequencyHertz: Hertz;
  readonly displacementMetres: Metres;
  readonly velocityMetresPerSecond: MetresPerSecond;
  readonly accelerationMetresPerSecondSquared: MetresPerSecondSquared;
  readonly totalEnergyJoules: Joules;
  readonly kineticEnergyJoules: Joules;
  readonly potentialEnergyJoules: Joules;
  readonly phaseName: "turning point" | "towards equilibrium" | "equilibrium crossing";
  readonly trace: readonly OscillationTracePoint[];
}

export const oscillationsSpec: TSimulationSpec = {
  id: oscillationsSimId,
  title: "Simple Harmonic Motion Lab",
  interaction_type: "animation-playback",
  kernel_deps: [
    "core/sim-runtime",
    "core/content-schema",
    "core/mechanics",
    "core/charting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A spring oscillator has the same mass and spring constant, but the amplitude is doubled. Before comparing with the lab, what happens to the period?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The period doubles",
        "The period stays the same",
        "The period halves",
        "The period becomes zero at equilibrium",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "mass",
        label: "Mass",
        kind: "slider",
        kernel_binding: "state.massKilograms",
        bounds: { min: 0.5, max: 5, step: 0.1 },
      },
      {
        id: "spring-constant",
        label: "Spring stiffness",
        kind: "slider",
        kernel_binding: "state.springConstantNewtonsPerMetre",
        bounds: { min: 4, max: 80, step: 1 },
      },
      {
        id: "amplitude",
        label: "Amplitude",
        kind: "slider",
        kernel_binding: "state.amplitudeMetres",
        bounds: { min: 0.1, max: 2, step: 0.05 },
      },
      {
        id: "phase",
        label: "Starting phase",
        kind: "slider",
        kernel_binding: "state.phaseRadians",
        bounds: { min: 0, max: 6.28, step: 0.1 },
      },
      {
        id: "time",
        label: "Time marker",
        kind: "slider",
        kernel_binding: "state.timeSeconds",
        bounds: { min: 0, max: 8, step: 0.05 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "simple-harmonic-motion-lab",
        module: "@paideia/a-level-physics-sims/oscillations",
        symbol: "OscillationsSim",
        props_binding:
          "Show mass-spring displacement, velocity and acceleration signs, energy exchange, formula substitution, and period-frequency readouts.",
      },
    ],
  },
  explain: {
    prompt:
      "Which quantity controls the period, which evidence shows the restoring acceleration, and what changes when amplitude is larger?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Amplitude changes the period for every oscillator.",
      "Acceleration is greatest at equilibrium.",
      "Zero displacement means zero speed and zero energy.",
    ],
  },
};

const defaultState: OscillationsState = {
  massKilograms: kilograms(2),
  springConstantNewtonsPerMetre: newtonsPerMetre(32),
  amplitudeMetres: metres(0.8),
  phaseRadians: radians(0),
  timeSeconds: seconds(0),
};

const presets: readonly {
  readonly label: string;
  readonly state: OscillationsState;
}[] = [
  { label: "released from the right", state: defaultState },
  {
    label: "crossing equilibrium",
    state: {
      ...defaultState,
      phaseRadians: radians(Math.PI / 2),
      timeSeconds: seconds(0),
    },
  },
  {
    label: "stiffer spring",
    state: {
      ...defaultState,
      springConstantNewtonsPerMetre: newtonsPerMetre(64),
    },
  },
  {
    label: "same period, larger amplitude",
    state: {
      ...defaultState,
      amplitudeMetres: metres(1.6),
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<OscillationsState>): OscillationsState => ({
  massKilograms: kilograms(clamp(state.massKilograms ?? defaultState.massKilograms, 0.5, 5)),
  springConstantNewtonsPerMetre: newtonsPerMetre(clamp(
    state.springConstantNewtonsPerMetre ?? defaultState.springConstantNewtonsPerMetre,
    4,
    80,
  )),
  amplitudeMetres: metres(clamp(state.amplitudeMetres ?? defaultState.amplitudeMetres, 0.1, 2)),
  phaseRadians: radians(clamp(state.phaseRadians ?? defaultState.phaseRadians, 0, Math.PI * 2)),
  timeSeconds: seconds(clamp(state.timeSeconds ?? defaultState.timeSeconds, 0, 8)),
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatSigned = (value: number, places = 2): string =>
  value >= 0 ? `+${formatNumber(value, places)}` : formatNumber(value, places);

const phaseName = (
  displacementMetres: number,
  velocityMetresPerSecond: number,
  amplitudeMetres: number,
): OscillationsModel["phaseName"] => {
  if (Math.abs(displacementMetres) <= Math.max(0.02, amplitudeMetres * 0.08)) {
    return "equilibrium crossing";
  }
  if (Math.abs(velocityMetresPerSecond) <= 0.08) {
    return "turning point";
  }
  return "towards equilibrium";
};

export const oscillationsModel = (state: OscillationsState): KernelResult<OscillationsModel> => {
  const model = springOscillator(
    {
      massKilograms: state.massKilograms,
      springConstantNewtonsPerMetre: state.springConstantNewtonsPerMetre,
      amplitudeMetres: state.amplitudeMetres,
      phaseRadians: state.phaseRadians,
    },
    state.timeSeconds,
  );
  if (!model.ok) return model;

  return {
    ok: true,
    value: {
      ...model.value,
      phaseName: phaseName(
        model.value.displacementMetres,
        model.value.velocityMetresPerSecond,
        state.amplitudeMetres,
      ),
    },
  };
};

export const OscillationDiagram = ({
  state,
  model,
}: {
  readonly state: OscillationsState;
  readonly model: OscillationsModel;
}) => {
  const cartX = 180 + model.displacementMetres * 70;
  const springEnd = Math.max(76, Math.min(286, cartX - 36));
  const potentialPercent = Math.min(100, Math.max(0, (model.potentialEnergyJoules / model.totalEnergyJoules) * 100));
  const kineticPercent = Math.min(100, Math.max(0, (model.kineticEnergyJoules / model.totalEnergyJoules) * 100));
  const chartData = model.trace.flatMap((point) => [
    { x: point.timeSeconds, y: point.displacementMetres, series: "displacement" },
    { x: point.timeSeconds, y: point.accelerationMetresPerSecondSquared, series: "acceleration" },
    { x: point.timeSeconds, y: point.velocityMetresPerSecond, series: "velocity" },
  ]);
  const traceYLimit = model.trace.reduce(
    (max, point) =>
      Math.max(
        max,
        Math.abs(point.displacementMetres),
        Math.abs(point.velocityMetresPerSecond),
        Math.abs(point.accelerationMetresPerSecondSquared),
      ),
    0,
  );
  const yLimit = Math.max(
    1,
    state.amplitudeMetres * 1.2,
    traceYLimit * 1.2,
  );

  return (
    <div className="energy-stage" aria-label="Oscillation visual">
      <svg aria-label="Mass on spring displacement" role="img" viewBox="0 0 360 190">
        <defs>
          <marker id="oscillation-vector" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 Z" fill="#1f5f8b" />
          </marker>
        </defs>
        <rect fill="#f8fbff" height="190" rx="18" width="360" />
        <line stroke="#cbd5e1" strokeDasharray="5 5" strokeWidth="2" x1="180" x2="180" y1="24" y2="148" />
        <text fill="#10201a" fontSize="12" fontWeight="800" x="142" y="22">
          equilibrium
        </text>
        <path
          d={`M54 96 C70 72, 86 120, 102 96 S134 72, 150 96 S182 120, 198 96 S230 72, ${springEnd} 96`}
          fill="none"
          stroke="#2563eb"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <rect fill="#f0b429" height="46" rx="9" width="72" x={cartX - 36} y="73" />
        <line stroke="#64748b" strokeWidth="4" x1="46" x2="314" y1="132" y2="132" />
        <circle cx={cartX - 18} cy="135" fill="#10201a" r="6" />
        <circle cx={cartX + 18} cy="135" fill="#10201a" r="6" />
        <line
          markerEnd="url(#oscillation-vector)"
          stroke="#027a48"
          strokeLinecap="round"
          strokeWidth="5"
          x1={cartX}
          x2={cartX + Math.max(-54, Math.min(54, model.velocityMetresPerSecond * 16))}
          y1="62"
          y2="62"
        />
        <line
          markerEnd="url(#oscillation-vector)"
          stroke="#b42318"
          strokeLinecap="round"
          strokeWidth="5"
          x1={cartX}
          x2={cartX + Math.max(-54, Math.min(54, model.accelerationMetresPerSecondSquared * 5))}
          y1="48"
          y2="48"
        />
        <text fill="#10201a" fontSize="12" fontWeight="800" x="34" y="164">
          x = {formatSigned(model.displacementMetres)} m
        </text>
        <text fill="#027a48" fontSize="12" fontWeight="800" x="164" y="164">
          v = {formatSigned(model.velocityMetresPerSecond)} m s^-1
        </text>
        <text fill="#b42318" fontSize="12" fontWeight="800" x="34" y="181">
          a = {formatSigned(model.accelerationMetresPerSecondSquared)} m s^-2
        </text>
      </svg>
      <div className="energy-bars" aria-label="Energy exchange bars">
        <span>Energy exchange</span>
        <div className="energy-bar">
          <i style={{ width: `${kineticPercent}%` }} />
        </div>
        <span>Kinetic {formatNumber(model.kineticEnergyJoules)} J</span>
        <div className="energy-bar">
          <i style={{ width: `${potentialPercent}%`, background: "#f97316" }} />
        </div>
        <span>Elastic potential {formatNumber(model.potentialEnergyJoules)} J</span>
      </div>
      <LineChart
        data={chartData}
        x={{ domain: { min: 0, max: Math.min(8, model.periodSeconds * 2) } }}
        y={{ domain: { min: -yLimit, max: yLimit } }}
      />
    </div>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<OscillationsState>();
  const current = currentState(state);

  return (
    <section aria-label="Oscillation controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product" aria-label="Simple harmonic motion controls">
        <p className="lab-kicker">Tune the oscillator</p>
        <ControlGroup legend="Oscillation controls">
          <Slider
            label="Mass"
            max={5}
            min={0.5}
            onChange={(value) => set("massKilograms", kilograms(value))}
            step={0.1}
            unit="kg"
            value={current.massKilograms}
          />
          <Slider
            label="Spring stiffness"
            max={80}
            min={4}
            onChange={(value) => set("springConstantNewtonsPerMetre", newtonsPerMetre(value))}
            step={1}
            unit="N m^-1"
            value={current.springConstantNewtonsPerMetre}
          />
          <Slider
            label="Amplitude"
            max={2}
            min={0.1}
            onChange={(value) => set("amplitudeMetres", metres(value))}
            step={0.05}
            unit="m"
            value={current.amplitudeMetres}
          />
          <Slider
            label="Starting phase"
            max={Math.PI * 2}
            min={0}
            onChange={(value) => set("phaseRadians", radians(value))}
            step={0.1}
            unit="rad"
            value={current.phaseRadians}
          />
          <Slider
            label="Time marker"
            max={8}
            min={0}
            onChange={(value) => set("timeSeconds", seconds(value))}
            step={0.05}
            unit="s"
            value={current.timeSeconds}
          />
        </ControlGroup>
        <div className="preset-strip" aria-label="Scenario presets">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                set("massKilograms", preset.state.massKilograms);
                set("springConstantNewtonsPerMetre", preset.state.springConstantNewtonsPerMetre);
                set("amplitudeMetres", preset.state.amplitudeMetres);
                set("phaseRadians", preset.state.phaseRadians);
                set("timeSeconds", preset.state.timeSeconds);
              }}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Open prediction checkpoint
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Look for what controls timing</h3>
        <p>
          Change amplitude, mass, and spring stiffness before committing. In ideal simple
          harmonic motion, the restoring acceleration depends on displacement and points back
          toward equilibrium.
        </p>
        <p>
          Predict whether amplitude belongs with the timing controls or with the size and
          energy of the motion. The numerical period stays hidden until you commit.
        </p>
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<OscillationsState>>());
  const model = oscillationsModel(state);

  if (!model.ok) {
    return <p role="alert">The oscillator settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <OscillationDiagram model={model.value} state={state} />
        <dl aria-label="Oscillation readout" className="result-readout result-readout--cards">
          <div>
            <dt>Period</dt>
            <dd>{formatNumber(model.value.periodSeconds)} s</dd>
          </div>
          <div>
            <dt>Frequency</dt>
            <dd>{formatNumber(model.value.frequencyHertz)} Hz</dd>
          </div>
          <div>
            <dt>Current state</dt>
            <dd>{model.value.phaseName}</dd>
          </div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Restoring acceleration sets the rhythm</h3>
        <pre className="formula-code" aria-label="Simple harmonic motion formula">
          <code>
            <span className="formula-var formula-var--red">a</span> = -ω²
            <span className="formula-var formula-var--blue">x</span>{"\n"}
            <span className="formula-var formula-var--purple">ω</span> = sqrt(
            <span className="formula-var formula-var--orange">k</span> /{" "}
            <span className="formula-var formula-var--purple">m</span>){"\n"}
            <span className="formula-var formula-var--purple">T</span> = 2π /{" "}
            <span className="formula-var formula-var--purple">ω</span>{"\n"}
            <span className="formula-var formula-var--purple">f</span> = 1 /{" "}
            <span className="formula-var formula-var--purple">T</span>{"\n"}
            <span className="formula-var formula-var--blue">x</span>(t) ={" "}
            <span className="formula-var formula-var--blue">A</span> cos(
            <span className="formula-var formula-var--purple">ω</span>t + φ){"\n"}
            E = 1/2 <span className="formula-var formula-var--orange">k</span>
            <span className="formula-var formula-var--blue">A</span>² = KE + PE
          </code>
        </pre>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt><span className="legend-swatch legend-swatch--blue" /> x, A</dt>
            <dd>
              displacement {formatSigned(model.value.displacementMetres)} m and amplitude{" "}
              {formatNumber(state.amplitudeMetres)} m
            </dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--orange" /> k</dt>
            <dd>spring stiffness, {formatNumber(state.springConstantNewtonsPerMetre)} N m^-1</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--purple" /> m, ω, T, f</dt>
            <dd>
              mass {formatNumber(state.massKilograms)} kg, angular frequency{" "}
              {formatNumber(model.value.angularFrequencyRadiansPerSecond)} rad s^-1, period{" "}
              {formatNumber(model.value.periodSeconds)} s, frequency{" "}
              {formatNumber(model.value.frequencyHertz)} Hz
            </dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--red" /> a</dt>
            <dd>acceleration, {formatSigned(model.value.accelerationMetresPerSecondSquared)} m s^-2</dd>
          </div>
        </dl>
        <p>
          Substitution: ω = sqrt({formatNumber(state.springConstantNewtonsPerMetre)} /{" "}
          {formatNumber(state.massKilograms)}) ={" "}
          {formatNumber(model.value.angularFrequencyRadiansPerSecond)} rad s^-1, so T = 2π /{" "}
          {formatNumber(model.value.angularFrequencyRadiansPerSecond)} ={" "}
          {formatNumber(model.value.periodSeconds)} s.
        </p>
        <p>
          At t = {formatNumber(state.timeSeconds)} s, x ={" "}
          {formatSigned(model.value.displacementMetres)} m, so a = -ω²x ={" "}
          {formatSigned(model.value.accelerationMetresPerSecondSquared)} m s^-2.
        </p>
        <p>
          Energy: total = {formatNumber(model.value.totalEnergyJoules)} J, split into KE ={" "}
          {formatNumber(model.value.kineticEnergyJoules)} J and PE ={" "}
          {formatNumber(model.value.potentialEnergyJoules)} J.
        </p>
        <p className="formula-note">
          In this ideal model, amplitude changes the size of the motion and stored energy, while
          mass and spring stiffness set the period. Acceleration is zero at equilibrium and largest
          at the turning points.
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Explain the oscillator
        </button>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Explain prompt" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Explain</p>
      <h3>Separate timing from size</h3>
      <p>
        Which readout shows what sets the period, which readout shows the restoring direction,
        and which readout changes when the amplitude is larger?
      </p>
      <p className="formula-note">
        A complete explanation mentions the negative sign in a = -ω²x and the energy exchange
        between kinetic and elastic potential stores.
      </p>
      <h3>A car suspension after a bump</h3>
      <p>
        A car body oscillates after a bump. Decide whether a bigger bump, a heavier car, or a
        stiffer suspension changes the time for one oscillation in the ideal spring model.
      </p>
      <p className="formula-note">
        Use T = 2π sqrt(m / k) and explain why amplitude affects energy but not the ideal period.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another oscillator
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
      <h3>Which settings decide the period?</h3>
      <p>
        Commit a prediction before the displacement, acceleration, and energy traces appear.
        The reveal will connect restoring acceleration, period, frequency, and energy exchange.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up oscillator
      </button>
    </section>
  );
};

export const OscillationsSim = () => (
  <SimRuntime spec={oscillationsSpec} packageId={oscillationsPackageId}>
    <StageSurface />
  </SimRuntime>
);

export default OscillationsSim;
