import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import { uniformCircularMotion } from "@paideia/mechanics";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  kilograms,
  degrees,
  metres,
  metresPerSecond,
  newtons,
  ok,
  type ConceptPackageId,
  type Degrees,
  type KernelResult,
  type Kilograms,
  type Metres,
  type MetresPerSecond,
  type MetresPerSecondSquared,
  type Newtons,
  type RadiansPerSecond,
  type Seconds,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const circularMotionPackageId = "circular-motion" as ConceptPackageId;
export const circularMotionSimId = "centripetal-force-vector-lab";
export type CircularMotionPredictionEvent = PredictionEvent;

export interface CircularMotionState {
  readonly massKilograms: Kilograms;
  readonly speedMetresPerSecond: MetresPerSecond;
  readonly radiusMetres: Metres;
  readonly angleDegrees: Degrees;
}

export interface CircularMotionTracePoint {
  readonly speedMetresPerSecond: MetresPerSecond;
  readonly forceNewtons: Newtons;
}

export interface CircularMotionModel {
  readonly centripetalAccelerationMetresPerSecondSquared: MetresPerSecondSquared;
  readonly centripetalForceNewtons: Newtons;
  readonly angularSpeedRadiansPerSecond: RadiansPerSecond;
  readonly periodSeconds: Seconds;
  readonly trace: readonly CircularMotionTracePoint[];
}

export const circularMotionSpec: TSimulationSpec = {
  id: circularMotionSimId,
  title: "Centripetal Force Vector Lab",
  interaction_type: "diagram-builder",
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
      "A rider moves at constant speed around a circular track. Before revealing the vectors, which direction is the acceleration at any instant?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Toward the centre of the circle.",
        "Forward along the tangent because the rider is moving.",
        "Outward away from the centre.",
        "Zero because the speed is constant.",
      ],
      correct_index: 0,
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
        bounds: { min: 0.2, max: 3, step: 0.1 },
      },
      {
        id: "speed",
        label: "Speed",
        kind: "slider",
        kernel_binding: "state.speedMetresPerSecond",
        bounds: { min: 1, max: 12, step: 0.1 },
      },
      {
        id: "radius",
        label: "Radius",
        kind: "slider",
        kernel_binding: "state.radiusMetres",
        bounds: { min: 1, max: 10, step: 0.1 },
      },
      {
        id: "position",
        label: "Position on circle",
        kind: "slider",
        kernel_binding: "state.angleDegrees",
        bounds: { min: 0, max: 360, step: 5 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: circularMotionSimId,
        module: "@paideia/a-level-physics-sims/circular-motion",
        symbol: "CircularMotionSim",
        props_binding:
          "Show radial acceleration, resultant force toward the centre, formula substitution, units, and speed-force comparison.",
      },
    ],
  },
  explain: {
    prompt:
      "Why can speed stay constant while velocity and acceleration keep changing direction?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Centripetal force is an extra new force.",
      "Constant speed means zero acceleration.",
      "The force points outward because the rider feels pushed outward.",
    ],
  },
};

const defaultState: CircularMotionState = {
  massKilograms: kilograms(1.2),
  speedMetresPerSecond: metresPerSecond(6),
  radiusMetres: metres(4),
  angleDegrees: degrees(45),
};

const presets: readonly {
  readonly label: string;
  readonly state: CircularMotionState;
}[] = [
  { label: "gentle curve", state: defaultState },
  {
    label: "fast bend",
    state: {
      massKilograms: kilograms(1.2),
      speedMetresPerSecond: metresPerSecond(10),
      radiusMetres: metres(4),
      angleDegrees: degrees(45),
    },
  },
  {
    label: "tight corner",
    state: {
      massKilograms: kilograms(1.2),
      speedMetresPerSecond: metresPerSecond(6),
      radiusMetres: metres(2),
      angleDegrees: degrees(120),
    },
  },
  {
    label: "heavier rider",
    state: {
      massKilograms: kilograms(2.4),
      speedMetresPerSecond: metresPerSecond(6),
      radiusMetres: metres(4),
      angleDegrees: degrees(300),
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<CircularMotionState>): CircularMotionState => ({
  massKilograms: kilograms(clamp(state.massKilograms ?? defaultState.massKilograms, 0.2, 3)),
  speedMetresPerSecond: metresPerSecond(
    clamp(state.speedMetresPerSecond ?? defaultState.speedMetresPerSecond, 1, 12),
  ),
  radiusMetres: metres(clamp(state.radiusMetres ?? defaultState.radiusMetres, 1, 10)),
  angleDegrees: degrees(clamp(state.angleDegrees ?? defaultState.angleDegrees, 0, 360)),
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);

const forceCurve = (state: CircularMotionState): readonly CircularMotionTracePoint[] => {
  const speeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return speeds.map((speed) => {
    const result = uniformCircularMotion({
      massKilograms: state.massKilograms,
      speedMetresPerSecond: metresPerSecond(speed),
      radiusMetres: state.radiusMetres,
    });
    return {
      speedMetresPerSecond: metresPerSecond(speed),
      forceNewtons: result.ok ? result.value.centripetalForceNewtons : newtons(0),
    };
  });
};

export const circularMotionModel = (
  state: CircularMotionState,
): KernelResult<CircularMotionModel> => {
  const motion = uniformCircularMotion({
    massKilograms: state.massKilograms,
    speedMetresPerSecond: state.speedMetresPerSecond,
    radiusMetres: state.radiusMetres,
  });
  if (!motion.ok) return motion;

  return ok({
    centripetalAccelerationMetresPerSecondSquared:
      motion.value.centripetalAccelerationMetresPerSecondSquared,
    centripetalForceNewtons: motion.value.centripetalForceNewtons,
    angularSpeedRadiansPerSecond: motion.value.angularSpeedRadiansPerSecond,
    periodSeconds: motion.value.periodSeconds,
    trace: forceCurve(state),
  });
};

const arrowLine = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: string,
  label: string,
) => (
  <g aria-label={label} role="group">
    <line
      markerEnd="url(#circular-motion-arrow)"
      stroke={stroke}
      strokeLinecap="round"
      strokeWidth="6"
      x1={x1}
      x2={x2}
      y1={y1}
      y2={y2}
    />
  </g>
);

export const CircularMotionDiagram = ({
  state,
  model,
}: {
  readonly state: CircularMotionState;
  readonly model: CircularMotionModel;
}) => {
  const angleRadians = (state.angleDegrees * Math.PI) / 180;
  const centreX = 164;
  const centreY = 136;
  const trackRadius = 82;
  const riderX = centreX + trackRadius * Math.cos(angleRadians);
  const riderY = centreY - trackRadius * Math.sin(angleRadians);
  const radialX = centreX - riderX;
  const radialY = centreY - riderY;
  const tangentX = -radialY;
  const tangentY = radialX;
  const radialLength = Math.hypot(radialX, radialY);
  const tangentLength = Math.hypot(tangentX, tangentY);
  const radialScale = Math.min(70, 18 + model.centripetalAccelerationMetresPerSecondSquared * 2.2);
  const tangentScale = Math.min(70, 16 + state.speedMetresPerSecond * 4);
  const radialEndX = riderX + (radialX / radialLength) * radialScale;
  const radialEndY = riderY + (radialY / radialLength) * radialScale;
  const tangentEndX = riderX + (tangentX / tangentLength) * tangentScale;
  const tangentEndY = riderY + (tangentY / tangentLength) * tangentScale;
  const maxForce = Math.max(1, ...model.trace.map((point) => point.forceNewtons));
  const chartData = model.trace.map((point) => ({
    x: point.speedMetresPerSecond,
    y: point.forceNewtons,
    series: "centre-seeking resultant force",
  }));

  return (
    <div className="energy-stage" aria-label="Circular motion visual">
      <svg aria-label="Circular motion vector diagram" role="img" viewBox="0 0 360 270">
        <defs>
          <marker id="circular-motion-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 Z" fill="#1f5f8b" />
          </marker>
        </defs>
        <rect fill="#f8fbff" height="270" rx="18" width="360" />
        <circle cx={centreX} cy={centreY} fill="#e8f4ff" r={trackRadius + 15} />
        <circle cx={centreX} cy={centreY} fill="none" r={trackRadius} stroke="#78909c" strokeWidth="4" />
        <circle cx={centreX} cy={centreY} fill="#10201a" r="5" />
        <line stroke="#94a3b8" strokeDasharray="5 5" strokeWidth="2" x1={centreX} x2={riderX} y1={centreY} y2={riderY} />
        <circle cx={riderX} cy={riderY} fill="#f0b429" r="16" stroke="#8a5d00" strokeWidth="3" />
        {arrowLine(riderX, riderY, tangentEndX, tangentEndY, "#1f5f8b", "Velocity tangent vector")}
        {arrowLine(riderX, riderY, radialEndX, radialEndY, "#c2410c", "Acceleration and resultant force vector")}
        <text fill="#1f5f8b" fontSize="13" fontWeight="800" x={tangentEndX + 6} y={tangentEndY}>
          velocity
        </text>
        <text fill="#c2410c" fontSize="13" fontWeight="800" x={radialEndX + 6} y={radialEndY}>
          force and acceleration
        </text>
        <text fill="#10201a" fontSize="12" fontWeight="800" x={centreX - 18} y={centreY + 24}>
          centre
        </text>
      </svg>
      <LineChart
        data={chartData}
        x={{ domain: { min: 1, max: 12 } }}
        y={{ domain: { min: 0, max: maxForce } }}
      />
    </div>
  );
};

const setScenario = (
  set: (key: keyof CircularMotionState, value: CircularMotionState[keyof CircularMotionState]) => void,
  state: CircularMotionState,
) => {
  set("massKilograms", state.massKilograms);
  set("speedMetresPerSecond", state.speedMetresPerSecond);
  set("radiusMetres", state.radiusMetres);
  set("angleDegrees", state.angleDegrees);
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<CircularMotionState>();
  const current = currentState(state);

  return (
    <section aria-label="Circular motion controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product" aria-label="Motion controls">
        <p className="lab-kicker">Tune the circular path</p>
        <ControlGroup legend="Mass, speed, radius, and position controls">
          <Slider
            label="Mass"
            max={3}
            min={0.2}
            onChange={(value) => set("massKilograms", kilograms(value))}
            step={0.1}
            unit="kg"
            value={current.massKilograms}
          />
          <Slider
            label="Speed"
            max={12}
            min={1}
            onChange={(value) => set("speedMetresPerSecond", metresPerSecond(value))}
            step={0.1}
            unit="m s^-1"
            value={current.speedMetresPerSecond}
          />
          <Slider
            label="Radius"
            max={10}
            min={1}
            onChange={(value) => set("radiusMetres", metres(value))}
            step={0.1}
            unit="m"
            value={current.radiusMetres}
          />
          <Slider
            label="Position on circle"
            max={360}
            min={0}
            onChange={(value) => set("angleDegrees", degrees(value))}
            step={5}
            unit="deg"
            value={current.angleDegrees}
          />
        </ControlGroup>
        <div className="preset-strip" aria-label="Scenario presets">
          {presets.map((preset) => (
            <button key={preset.label} onClick={() => setScenario(set, preset.state)} type="button">
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Reveal force vectors
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Speed is constant, velocity is not</h3>
        <p>
          The velocity arrow stays tangent to the circle. Predict the direction of the acceleration
          and resultant force before the inward vector is shown.
        </p>
        <p>
          Adjust the settings, then commit your prediction before the radial calculation and inward
          vector are revealed.
        </p>
      </section>
    </section>
  );
};

const LegendSwatch = ({ color, label }: { readonly color: string; readonly label: string }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", marginRight: "0.8rem" }}>
    <span aria-hidden="true" style={{ background: color, borderRadius: "999px", display: "inline-block", height: "0.75rem", width: "0.75rem" }} />
    {label}
  </span>
);

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<CircularMotionState>>());
  const model = circularMotionModel(state);

  if (!model.ok) {
    return <p role="alert">The current circular path settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <CircularMotionDiagram model={model.value} state={state} />
        <dl aria-label="Circular motion readout" className="result-readout result-readout--cards">
          <div>
            <dt>Radial acceleration</dt>
            <dd>{formatNumber(model.value.centripetalAccelerationMetresPerSecondSquared)} m s^-2</dd>
          </div>
          <div>
            <dt>Centre-seeking resultant force</dt>
            <dd>{formatNumber(model.value.centripetalForceNewtons)} N</dd>
          </div>
          <div>
            <dt>Time for one lap</dt>
            <dd>{formatNumber(model.value.periodSeconds)} s</dd>
          </div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Resultant force points to the centre</h3>
        <p className="formula">a_c = v^2 / r, then F_c = m a_c = m v^2 / r</p>
        <p aria-label="Formula legend">
          <LegendSwatch color="#1f5f8b" label="v: speed along the tangent" />
          <LegendSwatch color="#78909c" label="r: radius to the centre" />
          <LegendSwatch color="#c2410c" label="a_c and F_c: inward direction" />
        </p>
        <p>
          Substitution: a_c = ({formatNumber(state.speedMetresPerSecond)} m s^-1)^2 /{" "}
          {formatNumber(state.radiusMetres)} m ={" "}
          {formatNumber(model.value.centripetalAccelerationMetresPerSecondSquared)} m s^-2.
        </p>
        <p>
          F_c = ({formatNumber(state.massKilograms)} kg)({formatNumber(model.value.centripetalAccelerationMetresPerSecondSquared)} m s^-2)
          = {formatNumber(model.value.centripetalForceNewtons)} N.
        </p>
        <p>
          Angular speed omega = v / r = {formatNumber(model.value.angularSpeedRadiansPerSecond)}
          {" "}rad s^-1, giving one lap every {formatNumber(model.value.periodSeconds)} s.
        </p>
        <p className="formula-note">
          Interpretation: constant speed only means the size of the velocity is fixed. The velocity
          direction changes continuously, so the acceleration and resultant force point inward.
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Explain the direction
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
      <h3>Why is there acceleration?</h3>
      <p>
        Speed is constant around the circle, so what is changing about the velocity vector? Which
        direction must the acceleration point if it changes only the direction of velocity?
      </p>
      <p>
        Transfer question: for a satellite crossing the top of its orbit, which real force supplies
        the inward resultant, and what would need to change if the orbital speed increased?
      </p>
      <p className="formula-note">
        Explain without adding a new force label: name the real interaction, then check whether its
        direction matches the centre-seeking resultant.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another circular path
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
      <h3>Where does acceleration point?</h3>
      <p>
        Commit a prediction before the inward acceleration and force vectors appear. The reveal keeps
        speed separate from velocity direction.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up circular path
      </button>
    </section>
  );
};

export const CircularMotionSim = () => (
  <SimRuntime spec={circularMotionSpec} packageId={circularMotionPackageId}>
    <StageSurface />
  </SimRuntime>
);

export default CircularMotionSim;
