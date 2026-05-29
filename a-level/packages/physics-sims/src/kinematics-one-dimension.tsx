import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { kinematics1D } from "@paideia/mechanics";
import { PredictionGate } from "@paideia/prediction-gate";
import {
  metres,
  ok,
  seconds,
  type Brand,
  type KernelResult,
  type Metres,
  type Seconds,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const kinematicsPackageId = "kinematics-in-one-dimension";
export const kinematicsSimId = "motion-equations-lab";

export const kinematicsPredict: TPredictSpec = {
  prompt:
    "A trolley starts from rest and accelerates at 2.0 m s^-2 for 3.0 s. Before revealing the trace, which displacement is closest?",
  commit_format: {
    kind: "multiple-choice",
    options: ["3.0 m", "6.0 m", "9.0 m", "18.0 m"],
    correct_index: 2,
  },
  rationale_required: true,
};

export type MetresPerSecond = Brand<number, "MetresPerSecond">;
export type MetresPerSecondSquared = Brand<number, "MetresPerSecondSquared">;

export const metresPerSecond = (value: number): MetresPerSecond => value as MetresPerSecond;
export const metresPerSecondSquared = (value: number): MetresPerSecondSquared =>
  value as MetresPerSecondSquared;

export interface KinematicsState {
  readonly initialPositionMetres: Metres;
  readonly initialVelocityMetresPerSecond: MetresPerSecond;
  readonly accelerationMetresPerSecondSquared: MetresPerSecondSquared;
  readonly elapsedSeconds: Seconds;
}

export interface KinematicsModel {
  readonly positionMetres: Metres;
  readonly displacementMetres: Metres;
  readonly velocityMetresPerSecond: MetresPerSecond;
  readonly accelerationMetresPerSecondSquared: MetresPerSecondSquared;
  readonly elapsedSeconds: Seconds;
  readonly samplePoints: readonly MotionPoint[];
  readonly velocityAreaMetres: Metres;
}

export interface MotionPoint {
  readonly timeSeconds: Seconds;
  readonly displacementMetres: Metres;
  readonly velocityMetresPerSecond: MetresPerSecond;
}

export interface MotionTimelineProps {
  readonly state: KinematicsState;
  readonly model: KinematicsModel;
}

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};
const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatSigned = (value: number, places = 2): string =>
  value >= 0 ? `+${formatNumber(value, places)}` : formatNumber(value, places);
const velocityTerm = (value: number): string => `${formatNumber(value, 1)} m s^-1`;
const accelerationTerm = (value: number): string => `${formatNumber(value, 1)} m s^-2`;
const timeTerm = (value: number): string => `${formatNumber(value, 1)} s`;

export const kinematicsModel = (state: KinematicsState): KernelResult<KinematicsModel> => {
  const finalState = kinematics1D(state);
  if (!finalState.ok) return finalState;

  const sampleCount = 24;
  const points: MotionPoint[] = [];
  for (let index = 0; index <= sampleCount; index += 1) {
    const sampleTime = seconds((state.elapsedSeconds * index) / sampleCount);
    const sample = kinematics1D({ ...state, elapsedSeconds: sampleTime });
    if (!sample.ok) return sample;
    points.push({
      timeSeconds: sampleTime,
      displacementMetres: sample.value.displacementMetres,
      velocityMetresPerSecond: metresPerSecond(sample.value.velocityMetresPerSecond),
    });
  }

  return ok({
    positionMetres: finalState.value.positionMetres,
    displacementMetres: finalState.value.displacementMetres,
    velocityMetresPerSecond: metresPerSecond(finalState.value.velocityMetresPerSecond),
    accelerationMetresPerSecondSquared: metresPerSecondSquared(
      finalState.value.accelerationMetresPerSecondSquared,
    ),
    elapsedSeconds: finalState.value.elapsedSeconds,
    samplePoints: points,
    velocityAreaMetres: finalState.value.displacementMetres,
  });
};

const defaultState: KinematicsState = {
  initialPositionMetres: metres(0),
  initialVelocityMetresPerSecond: metresPerSecond(0),
  accelerationMetresPerSecondSquared: metresPerSecondSquared(2),
  elapsedSeconds: seconds(3),
};

const presets = [
  {
    label: "trolley from rest",
    state: defaultState,
  },
  {
    label: "already moving",
    state: {
      initialPositionMetres: metres(0),
      initialVelocityMetresPerSecond: metresPerSecond(4),
      accelerationMetresPerSecondSquared: metresPerSecondSquared(1),
      elapsedSeconds: seconds(4),
    },
  },
  {
    label: "slowing down",
    state: {
      initialPositionMetres: metres(0),
      initialVelocityMetresPerSecond: metresPerSecond(8),
      accelerationMetresPerSecondSquared: metresPerSecondSquared(-1.5),
      elapsedSeconds: seconds(5),
    },
  },
] as const;

const pathFromPoints = (points: readonly MotionPoint[], width: number, height: number): string => {
  const displacements = points.map((point) => point.displacementMetres);
  const minDisplacement = Math.min(0, ...displacements);
  const maxDisplacement = Math.max(1, ...displacements);
  const span = maxDisplacement - minDisplacement || 1;
  const lastTime = points.at(-1)?.timeSeconds ?? seconds(1);
  return points
    .map((point, index) => {
      const x = 36 + (point.timeSeconds / Math.max(1, lastTime)) * (width - 72);
      const y = height - 34 - ((point.displacementMetres - minDisplacement) / span) * (height - 76);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
};

export const MotionTimeline = ({ state, model }: MotionTimelineProps) => {
  const width = 520;
  const height = 250;
  const tracePath = pathFromPoints(model.samplePoints, width, height);
  const progress = model.samplePoints.at(-1)?.displacementMetres ?? 0;
  const trackMin = Math.min(0, ...model.samplePoints.map((point) => point.displacementMetres));
  const trackMax = Math.max(1, ...model.samplePoints.map((point) => point.displacementMetres));
  const carX = 54 + ((progress - trackMin) / (trackMax - trackMin || 1)) * 392;
  const velocityScale = 11;
  const velocityHeight = Math.min(74, Math.abs(model.velocityMetresPerSecond) * velocityScale);
  const velocityY = model.velocityMetresPerSecond >= 0 ? 188 - velocityHeight : 188;

  return (
    <svg aria-label="Motion trace" role="img" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="motion-ground" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f8fbff" />
          <stop offset="100%" stopColor="#edf7ee" />
        </linearGradient>
      </defs>
      <rect fill="url(#motion-ground)" height={height} rx="16" width={width} />
      <line stroke="#cbd5e1" strokeDasharray="4 7" strokeWidth="1.5" x1="36" x2="486" y1="188" y2="188" />
      <line stroke="#cbd5e1" strokeDasharray="4 7" strokeWidth="1.5" x1="36" x2="36" y1="34" y2="208" />
      <text fill="#52635a" fontSize="12" fontWeight="800" x="40" y="30">
        displacement against time
      </text>
      <path d={tracePath} fill="none" stroke="#1f5f8b" strokeLinecap="round" strokeWidth="4" />
      <circle cx={carX} cy="188" fill="#10201a" r="8" />
      <rect fill="#f0b429" height="18" rx="5" width="42" x={carX - 21} y="168" />
      <circle cx={carX - 13} cy="190" fill="#10201a" r="4" />
      <circle cx={carX + 13} cy="190" fill="#10201a" r="4" />
      <rect
        fill={model.velocityMetresPerSecond >= 0 ? "#1f5f8b" : "#b42318"}
        height={velocityHeight}
        rx="4"
        width="28"
        x="460"
        y={velocityY}
      />
      <line stroke="#10201a" strokeWidth="2" x1="454" x2="494" y1="188" y2="188" />
      <text fill="#10201a" fontSize="12" fontWeight="800" x="420" y="224">
        velocity now
      </text>
      <text fill="#10201a" fontSize="12" fontWeight="800" x={carX - 36} y="156">
        t = {formatNumber(state.elapsedSeconds, 1)} s
      </text>
    </svg>
  );
};

export const KinematicsOneDimensionSim = () => {
  const [state, setState] = useState<KinematicsState>(defaultState);
  const model = useMemo(() => kinematicsModel(state), [state]);
  const setInitialVelocity = (value: number) =>
    setState((current) => ({ ...current, initialVelocityMetresPerSecond: metresPerSecond(value) }));
  const setAcceleration = (value: number) =>
    setState((current) => ({
      ...current,
      accelerationMetresPerSecondSquared: metresPerSecondSquared(value),
    }));
  const setElapsed = (value: number) =>
    setState((current) => ({ ...current, elapsedSeconds: seconds(value) }));

  return (
    <PredictionGate packageId={kinematicsPackageId} predict={kinematicsPredict} simId={kinematicsSimId}>
      <section aria-label="Observation unlocked" className="kinematics-lab vector-lab vector-lab--product">
        <div className="vector-controls vector-controls--product" aria-label="Motion controls">
          <p className="lab-kicker">Tune the motion</p>
          <ControlGroup legend="Motion controls">
            <Slider
              label="Initial velocity"
              max={12}
              min={-5}
              onChange={setInitialVelocity}
              step={0.5}
              unit="m s^-1"
              value={state.initialVelocityMetresPerSecond}
            />
            <Slider
              label="Acceleration"
              max={6}
              min={-4}
              onChange={setAcceleration}
              step={0.5}
              unit="m s^-2"
              value={state.accelerationMetresPerSecondSquared}
            />
            <Slider
              label="Elapsed time"
              max={8}
              min={0}
              onChange={setElapsed}
              step={0.5}
              unit="s"
              value={state.elapsedSeconds}
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
              <MotionTimeline model={model.value} state={state} />
              <dl aria-label="Motion readout" className="result-readout result-readout--cards">
                <div>
                  <dt>Displacement</dt>
                  <dd>{formatNumber(model.value.displacementMetres)} m</dd>
                </div>
                <div>
                  <dt>Final velocity</dt>
                  <dd>{formatSigned(model.value.velocityMetresPerSecond)} m s^-1</dd>
                </div>
                <div>
                  <dt>Acceleration</dt>
                  <dd>{formatSigned(model.value.accelerationMetresPerSecondSquared)} m s^-2</dd>
                </div>
              </dl>
            </>
          ) : (
            <p role="alert">The current motion settings are outside the supported range.</p>
          )}
        </div>

        <section className="formula-panel formula-panel--product" aria-label="Formula used">
          <div>
            <p className="lab-kicker">Why the trace bends</p>
            <h3>Formula used</h3>
          </div>
          <pre className="formula-code" aria-label="Constant acceleration formula">
            <code>
              <span className="formula-var formula-var--blue">s</span>
              {" = "}
              <span className="formula-var formula-var--orange">u</span>
              <span className="formula-var formula-var--green">t</span>
              {" + 1/2 "}
              <span className="formula-var formula-var--blue">a</span>
              <span className="formula-var formula-var--green">t^2</span>
              {"\n"}
              <span className="formula-var formula-var--blue">v</span>
              {" = "}
              <span className="formula-var formula-var--orange">u</span>
              {" + "}
              <span className="formula-var formula-var--blue">a</span>
              <span className="formula-var formula-var--green">t</span>
            </code>
          </pre>
          {model.ok ? (
            <>
              <p className="lab-kicker">Legend</p>
              <dl className="formula-legend" aria-label="Formula legend">
                <div>
                  <dt>
                    <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> s, v, a
                  </dt>
                  <dd>displacement in m, final velocity in m s^-1, acceleration in m s^-2</dd>
                </div>
                <div>
                  <dt>
                    <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> u
                  </dt>
                  <dd>initial velocity, {velocityTerm(state.initialVelocityMetresPerSecond)}</dd>
                </div>
                <div>
                  <dt>
                    <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> t
                  </dt>
                  <dd>elapsed time, {timeTerm(state.elapsedSeconds)}</dd>
                </div>
              </dl>
              <p>Units: displacement is in metres (m), velocity is in m s^-1, and acceleration is in m s^-2.</p>
              <p>
                Substitution: s = ({velocityTerm(state.initialVelocityMetresPerSecond)})(
                {timeTerm(state.elapsedSeconds)}) + 1/2(
                {accelerationTerm(state.accelerationMetresPerSecondSquared)})(
                {timeTerm(state.elapsedSeconds)})^2 ={" "}
                {formatNumber(model.value.displacementMetres)} m.
              </p>
              <p>
                Substitution: v = {velocityTerm(state.initialVelocityMetresPerSecond)} + (
                {accelerationTerm(state.accelerationMetresPerSecondSquared)})(
                {timeTerm(state.elapsedSeconds)}) ={" "}
                {formatSigned(model.value.velocityMetresPerSecond)} m s^-1.
              </p>
              <p>
                Result: displacement = {formatNumber(model.value.displacementMetres)} m and final velocity ={" "}
                {formatSigned(model.value.velocityMetresPerSecond)} m s^-1.
              </p>
              <p className="formula-note">
                The displacement also equals the area under the velocity-time graph: initial
                rectangle plus acceleration triangle = {formatNumber(model.value.velocityAreaMetres)} m.
              </p>
              <p className="formula-note">
                Try the slowing-down preset. Which sign tells you the direction of motion, and
                which sign tells you how the velocity is changing?
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

export default KinematicsOneDimensionSim;
