import { useMemo, useState } from "react";
import type { TSimulationSpec } from "@paideia/content-schema";
import { projectileAt, type Vector2 } from "@paideia/mechanics";
import { ParametricPlot } from "@paideia/plotting";
import { PredictionGate } from "@paideia/prediction-gate";
import { ok, seconds, type KernelResult, type Seconds } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const projectileMotionPackageId = "projectile-motion";
export const projectileMotionSimId = "trajectory-parameter-lab";

export const projectileMotionPredict: TSimulationSpec["predict"] = {
  prompt:
    "A ball is launched horizontally from a bench. Before revealing the path, what happens to its horizontal velocity while it falls?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "It stays constant if air resistance is ignored.",
      "It decreases because gravity pulls downward.",
      "It increases because the ball is speeding up overall.",
      "It becomes zero at the highest point.",
    ],
    correct_index: 0,
  },
  rationale_required: true,
};

export const projectileMotionSpec: TSimulationSpec = {
  id: projectileMotionSimId,
  title: "Trajectory Parameter Lab",
  interaction_type: "function-plot-with-draggable",
  kernel_deps: [
    "core/content-schema",
    "core/mechanics",
    "core/plotting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: projectileMotionPredict,
  manipulate: {
    controls: [
      {
        id: "launch-speed",
        label: "Launch speed",
        kind: "slider",
        kernel_binding: "state.launchSpeedMetresPerSecond",
        bounds: { min: 4, max: 30, step: 0.5 },
      },
      {
        id: "launch-angle",
        label: "Launch angle",
        kind: "slider",
        kernel_binding: "state.launchAngleDegrees",
        bounds: { min: 0, max: 70, step: 1 },
      },
      {
        id: "launch-height",
        label: "Launch height",
        kind: "slider",
        kernel_binding: "state.launchHeightMetres",
        bounds: { min: 0, max: 20, step: 0.5 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: projectileMotionSimId,
        module: "@paideia/a-level-physics-sims/projectile-motion",
        symbol: "ProjectileMotionSim",
        props_binding:
          "Show the sampled projectile arc, independent horizontal and vertical motion, range, flight time, peak height, and formula substitution.",
      },
    ],
  },
  explain: {
    prompt:
      "Which part of the projectile motion comes from the initial velocity, and which part comes from gravity?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Horizontal and vertical motion affect each other directly.",
      "The projectile needs a force in the direction of travel after launch.",
      "The launch angle changes gravitational acceleration.",
    ],
  },
};

export interface ProjectileMotionState {
  readonly launchSpeedMetresPerSecond: number;
  readonly launchAngleDegrees: number;
  readonly launchHeightMetres: number;
  readonly gravityMetresPerSecondSquared: number;
}

export interface ProjectileTracePoint {
  readonly timeSeconds: Seconds;
  readonly positionMetres: Vector2;
  readonly velocityMetresPerSecond: Vector2;
}

export interface ProjectileMotionModel {
  readonly initialVelocityMetresPerSecond: Vector2;
  readonly accelerationMetresPerSecondSquared: Vector2;
  readonly flightTimeSeconds: Seconds;
  readonly rangeMetres: number;
  readonly peakHeightMetres: number;
  readonly landingSpeedMetresPerSecond: number;
  readonly trace: readonly ProjectileTracePoint[];
}

const defaultState: ProjectileMotionState = {
  launchSpeedMetresPerSecond: 18,
  launchAngleDegrees: 35,
  launchHeightMetres: 2,
  gravityMetresPerSecondSquared: 9.81,
};

const presets: readonly {
  readonly label: string;
  readonly state: ProjectileMotionState;
}[] = [
  { label: "angled launch", state: defaultState },
  {
    label: "horizontal bench",
    state: {
      launchSpeedMetresPerSecond: 14,
      launchAngleDegrees: 0,
      launchHeightMetres: 6,
      gravityMetresPerSecondSquared: 9.81,
    },
  },
  {
    label: "high arc",
    state: {
      launchSpeedMetresPerSecond: 20,
      launchAngleDegrees: 55,
      launchHeightMetres: 1,
      gravityMetresPerSecondSquared: 9.81,
    },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const degreesToRadians = (value: number): number => (value * Math.PI) / 180;

const currentState = (state: Partial<ProjectileMotionState>): ProjectileMotionState => ({
  launchSpeedMetresPerSecond: clamp(
    state.launchSpeedMetresPerSecond ?? defaultState.launchSpeedMetresPerSecond,
    4,
    30,
  ),
  launchAngleDegrees: clamp(state.launchAngleDegrees ?? defaultState.launchAngleDegrees, 0, 70),
  launchHeightMetres: clamp(state.launchHeightMetres ?? defaultState.launchHeightMetres, 0, 20),
  gravityMetresPerSecondSquared: 9.81,
});

const componentsFromState = (state: ProjectileMotionState): {
  readonly initialVelocityMetresPerSecond: Vector2;
  readonly accelerationMetresPerSecondSquared: Vector2;
} => {
  const angleRadians = degreesToRadians(state.launchAngleDegrees);
  return {
    initialVelocityMetresPerSecond: {
      x: state.launchSpeedMetresPerSecond * Math.cos(angleRadians),
      y: state.launchSpeedMetresPerSecond * Math.sin(angleRadians),
    },
    accelerationMetresPerSecondSquared: {
      x: 0,
      y: -state.gravityMetresPerSecondSquared,
    },
  };
};

const flightTime = (state: ProjectileMotionState): KernelResult<Seconds> => {
  const { initialVelocityMetresPerSecond } = componentsFromState(state);
  const vy = initialVelocityMetresPerSecond.y;
  const g = state.gravityMetresPerSecondSquared;
  const discriminant = vy * vy + 2 * g * state.launchHeightMetres;
  if (!Number.isFinite(discriminant) || discriminant < 0 || g <= 0) {
    return {
      ok: false,
      error: {
        code: "out-of-domain",
        message: "Projectile settings do not produce a valid landing time.",
      },
    };
  }
  return ok(seconds((vy + Math.sqrt(discriminant)) / g));
};

export const projectileMotionModel = (
  rawState: Partial<ProjectileMotionState>,
): KernelResult<ProjectileMotionModel> => {
  const state = currentState(rawState);
  const time = flightTime(state);
  if (!time.ok) return time;
  const { initialVelocityMetresPerSecond, accelerationMetresPerSecondSquared } =
    componentsFromState(state);

  const projectileInput = {
    initialPositionMetres: { x: 0, y: state.launchHeightMetres },
    initialVelocityMetresPerSecond,
    accelerationMetresPerSecondSquared,
  };

  const sampleCount = 36;
  const trace: ProjectileTracePoint[] = [];
  let peakHeightMetres = state.launchHeightMetres;
  for (let index = 0; index <= sampleCount; index += 1) {
    const sampleTime = seconds((time.value * index) / sampleCount);
    const sample = projectileAt(projectileInput, sampleTime);
    if (!sample.ok) return sample;
    peakHeightMetres = Math.max(peakHeightMetres, sample.value.positionMetres.y);
    trace.push({
      timeSeconds: sampleTime,
      positionMetres: {
        x: Math.max(0, sample.value.positionMetres.x),
        y: Math.max(0, sample.value.positionMetres.y),
      },
      velocityMetresPerSecond: sample.value.velocityMetresPerSecond,
    });
  }

  const landing = projectileAt(projectileInput, time.value);
  if (!landing.ok) return landing;
  const landingVelocity = landing.value.velocityMetresPerSecond;

  return ok({
    initialVelocityMetresPerSecond,
    accelerationMetresPerSecondSquared,
    flightTimeSeconds: time.value,
    rangeMetres: landing.value.positionMetres.x,
    peakHeightMetres,
    landingSpeedMetresPerSecond: Math.hypot(landingVelocity.x, landingVelocity.y),
    trace,
  });
};

const trajectoryPath = (trace: readonly ProjectileTracePoint[]): string => {
  const width = 520;
  const height = 260;
  const maxX = Math.max(1, ...trace.map((point) => point.positionMetres.x));
  const maxY = Math.max(1, ...trace.map((point) => point.positionMetres.y));
  return trace
    .map((point, index) => {
      const x = 40 + (point.positionMetres.x / maxX) * (width - 86);
      const y = height - 38 - (point.positionMetres.y / maxY) * (height - 78);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
};

export const ProjectileDiagram = ({ model }: { readonly model: ProjectileMotionModel }) => {
  const width = 520;
  const height = 260;
  const path = trajectoryPath(model.trace);
  const launch = model.trace[0];
  const landing = model.trace.at(-1);

  return (
    <svg aria-label="Projectile trajectory diagram" role="img" viewBox={`0 0 ${width} ${height}`}>
      <rect fill="#f8fbff" height={height} rx="16" width={width} />
      <line stroke="#cbd5e1" strokeDasharray="4 7" strokeWidth="1.5" x1="40" x2="488" y1="222" y2="222" />
      <line stroke="#cbd5e1" strokeDasharray="4 7" strokeWidth="1.5" x1="40" x2="40" y1="32" y2="222" />
      <text fill="#334155" fontSize="12" fontWeight="800" x="42" y="26">
        vertical position against horizontal range
      </text>
      <path d={path} fill="none" stroke="#2563eb" strokeLinecap="round" strokeWidth="4" />
      {launch ? <circle cx="40" cy="196" fill="#d97706" r="7" /> : null}
      {landing ? <circle cx="474" cy="222" fill="#059669" r="7" /> : null}
      <line
        markerEnd="url(#arrow-head)"
        stroke="#d97706"
        strokeLinecap="round"
        strokeWidth="3"
        x1="52"
        x2={52 + model.initialVelocityMetresPerSecond.x * 2.2}
        y1="196"
        y2={196 - model.initialVelocityMetresPerSecond.y * 2.2}
      />
      <defs>
        <marker id="arrow-head" markerHeight="8" markerWidth="8" orient="auto" refX="6" refY="3">
          <path d="M0,0 L0,6 L6,3 z" fill="#d97706" />
        </marker>
      </defs>
      <text fill="#334155" fontSize="12" fontWeight="700" x="338" y="246">
        range = {formatNumber(model.rangeMetres, 1)} m
      </text>
      <text fill="#334155" fontSize="12" fontWeight="700" x="58" y="182">
        launch velocity
      </text>
    </svg>
  );
};

export const ProjectileMotionSim = () => {
  const [state, setState] = useState<ProjectileMotionState>(defaultState);
  const model = useMemo(() => projectileMotionModel(state), [state]);
  const curve = useMemo(() => {
    const { initialVelocityMetresPerSecond, accelerationMetresPerSecondSquared } =
      componentsFromState(state);
    return (time: number): readonly [number, number] => {
      const sample = projectileAt(
        {
          initialPositionMetres: { x: 0, y: state.launchHeightMetres },
          initialVelocityMetresPerSecond,
          accelerationMetresPerSecondSquared,
        },
        seconds(time),
      );
      if (!sample.ok) return [Number.NaN, Number.NaN];
      return [
        Math.max(0, sample.value.positionMetres.x),
        Math.max(0, sample.value.positionMetres.y),
      ];
    };
  }, [state]);

  const setLaunchSpeed = (value: number) =>
    setState((current) => currentState({ ...current, launchSpeedMetresPerSecond: value }));
  const setLaunchAngle = (value: number) =>
    setState((current) => currentState({ ...current, launchAngleDegrees: value }));
  const setLaunchHeight = (value: number) =>
    setState((current) => currentState({ ...current, launchHeightMetres: value }));

  return (
    <PredictionGate
      packageId={projectileMotionPackageId}
      predict={projectileMotionPredict}
      simId={projectileMotionSimId}
    >
      <section aria-label="Observation unlocked" className="kinematics-lab vector-lab vector-lab--product">
        <div className="vector-controls vector-controls--product" aria-label="Projectile controls">
          <p className="lab-kicker">Tune the launch</p>
          <ControlGroup legend="Launch controls">
            <Slider
              label="Launch speed"
              max={30}
              min={4}
              onChange={setLaunchSpeed}
              step={0.5}
              unit="m s^-1"
              value={state.launchSpeedMetresPerSecond}
            />
            <Slider
              label="Launch angle"
              max={70}
              min={0}
              onChange={setLaunchAngle}
              step={1}
              unit="degrees"
              value={state.launchAngleDegrees}
            />
            <Slider
              label="Launch height"
              max={20}
              min={0}
              onChange={setLaunchHeight}
              step={0.5}
              unit="m"
              value={state.launchHeightMetres}
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

        <div className="vector-stage vector-stage--product">
          {model.ok ? (
            <>
              <ProjectileDiagram model={model.value} />
              <div aria-label="Projectile curve plot" className="plot-inset">
                <ParametricPlot
                  curve={curve}
                  samples={80}
                  t={{ min: 0, max: model.value.flightTimeSeconds }}
                />
              </div>
              <dl aria-label="Trajectory readout" className="result-readout result-readout--cards">
                <div>
                  <dt>Range</dt>
                  <dd>{formatNumber(model.value.rangeMetres)} m</dd>
                </div>
                <div>
                  <dt>Time of flight</dt>
                  <dd>{formatNumber(model.value.flightTimeSeconds)} s</dd>
                </div>
                <div>
                  <dt>Peak height</dt>
                  <dd>{formatNumber(model.value.peakHeightMetres)} m</dd>
                </div>
              </dl>
            </>
          ) : (
            <p role="alert">The current launch settings are outside the supported range.</p>
          )}
        </div>

        <section className="formula-panel formula-panel--product" aria-label="Formula used">
          <div>
            <p className="lab-kicker">Why the arc curves</p>
            <h3>Formula used</h3>
          </div>
          <pre className="formula-code" aria-label="Projectile formula">
            <code>
              <span className="formula-var formula-var--orange">v_x</span>
              {" = "}
              <span className="formula-var formula-var--blue">u</span>
              {" cos("}
              <span className="formula-var formula-var--green">theta</span>
              {")\n"}
              <span className="formula-var formula-var--blue">y</span>
              {" = "}
              <span className="formula-var formula-var--purple">h</span>
              {" + "}
              <span className="formula-var formula-var--orange">v_y</span>
              <span className="formula-var formula-var--green">t</span>
              {" - 1/2 "}
              <span className="formula-var formula-var--blue">g</span>
              <span className="formula-var formula-var--green">t^2</span>
            </code>
          </pre>
          {model.ok ? (
            <>
              <p className="lab-kicker">Legend</p>
              <dl className="formula-legend" aria-label="Formula legend">
                <div>
                  <dt>
                    <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> u, g, y
                  </dt>
                  <dd>launch speed in m s^-1, gravitational acceleration in m s^-2, height in m</dd>
                </div>
                <div>
                  <dt>
                    <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> v_x, v_y
                  </dt>
                  <dd>horizontal and vertical velocity components in m s^-1</dd>
                </div>
                <div>
                  <dt>
                    <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> theta, t
                  </dt>
                  <dd>launch angle and elapsed time</dd>
                </div>
              </dl>
              <p>Units: distances are in metres (m), time is in seconds (s), and velocity is in m s^-1.</p>
              <p>
                Substitution: v_x = {formatNumber(state.launchSpeedMetresPerSecond, 1)} m s^-1
                cos({formatNumber(state.launchAngleDegrees, 0)} degrees) ={" "}
                {formatNumber(model.value.initialVelocityMetresPerSecond.x)} m s^-1.
              </p>
              <p>
                At landing, y = 0 = {formatNumber(state.launchHeightMetres, 1)} m + (
                {formatNumber(model.value.initialVelocityMetresPerSecond.y)} m s^-1)t - 1/2(
                {formatNumber(state.gravityMetresPerSecondSquared)} m s^-2)t^2, so t ={" "}
                {formatNumber(model.value.flightTimeSeconds)} s.
              </p>
              <p>
                Result: horizontal range = ({formatNumber(model.value.initialVelocityMetresPerSecond.x)} m s^-1)(
                {formatNumber(model.value.flightTimeSeconds)} s) ={" "}
                {formatNumber(model.value.rangeMetres)} m.
              </p>
              <p className="formula-note">
                Gravity changes the vertical velocity only. The horizontal component stays constant in
                this model, so range is horizontal speed multiplied by flight time.
              </p>
            </>
          ) : (
            <p role="alert">The formula cannot be evaluated for the current inputs.</p>
          )}
        </section>
      </section>
    </PredictionGate>
  );
};

export default ProjectileMotionSim;
