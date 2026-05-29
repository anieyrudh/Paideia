import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import {
  matrix2,
  multiplyMatrixVector2,
  norm2,
  vector2,
  type Vector2 as LinearVector2,
} from "@paideia/linear-algebra";
import { PredictionGate } from "@paideia/prediction-gate";
import { degrees, newtons, ok, type Degrees, type KernelResult, type Newtons } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const resolvingVectorsPackageId = "resolving-vectors";
export const resolvingVectorsSimId = "component-resolution";

export const componentPredict: TPredictSpec = {
  prompt:
    "A 10 N force acts at 30 degrees above the horizontal. Before revealing the components, which horizontal component is closest?",
  commit_format: {
    kind: "multiple-choice",
    options: ["5.0 N", "8.7 N", "10.0 N", "11.5 N"],
    correct_index: 1,
  },
  rationale_required: true,
};

export interface ResolutionState {
  readonly magnitudeNewtons: Newtons;
  readonly angleDegrees: Degrees;
}

export interface ResolutionDiagramProps {
  readonly state: ResolutionState;
}

export type NewtonVector2 = readonly [xNewtons: Newtons, yNewtons: Newtons];

export interface ResolutionModel {
  readonly componentsNewtons: NewtonVector2;
  readonly magnitudeNewtons: Newtons;
  readonly angleDegrees: Degrees;
  readonly horizontalFraction: number;
  readonly verticalFraction: number;
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const roundTenths = (value: number): number => Math.round(value * 10) / 10;
const formatTenths = (value: number): string => roundTenths(value).toFixed(1);
const formatHundredths = (value: number): string => (Math.round(value * 100) / 100).toFixed(2);
const newtonVector2 = (vector: LinearVector2): NewtonVector2 => [
  newtons(vector[0]),
  newtons(vector[1]),
];

export const resolveVectorComponents = (
  magnitudeNewtons: Newtons,
  angleDegrees: Degrees,
): KernelResult<ResolutionModel> => {
  const base = vector2(magnitudeNewtons, 0);
  if (!base.ok) return base;

  const theta = toRadians(angleDegrees);
  const rotation = matrix2(
    Math.cos(theta),
    -Math.sin(theta),
    Math.sin(theta),
    Math.cos(theta),
  );
  if (!rotation.ok) return rotation;

  const components = multiplyMatrixVector2(rotation.value, base.value);
  if (!components.ok) return components;

  const magnitude = norm2(components.value);
  if (!magnitude.ok) return magnitude;

  return ok({
    componentsNewtons: newtonVector2(components.value),
    magnitudeNewtons: newtons(magnitude.value),
    angleDegrees,
    horizontalFraction: Math.cos(theta),
    verticalFraction: Math.sin(theta),
  });
};

const arrowHead = (
  tipX: number,
  tipY: number,
  angle: number,
  color: string,
  key: string,
) => {
  const size = 8;
  const left = angle + Math.PI * 0.82;
  const right = angle - Math.PI * 0.82;
  const points = [
    `${tipX},${tipY}`,
    `${tipX + size * Math.cos(left)},${tipY + size * Math.sin(left)}`,
    `${tipX + size * Math.cos(right)},${tipY + size * Math.sin(right)}`,
  ].join(" ");

  return <polygon fill={color} key={key} points={points} />;
};

const vectorLine = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  label: string,
) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);

  return (
    <g aria-label={label} role="img">
      <line
        stroke={color}
        strokeLinecap="round"
        strokeWidth="4"
        x1={x1}
        x2={x2}
        y1={y1}
        y2={y2}
      />
      {arrowHead(x2, y2, angle, color, `${label}-head`)}
    </g>
  );
};

export const ResolutionDiagram = ({ state }: ResolutionDiagramProps) => {
  const scale = 15;
  const origin = { x: 60, y: 165 };
  const model = resolveVectorComponents(
    state.magnitudeNewtons,
    state.angleDegrees,
  );
  if (!model.ok) {
    return <p role="alert">The current vector settings are outside the supported range.</p>;
  }

  const [componentX, componentY] = model.value.componentsNewtons;
  const tip = {
    x: origin.x + componentX * scale,
    y: origin.y - componentY * scale,
  };
  const xTip = { x: tip.x, y: origin.y };
  const angleArcEnd = {
    x: origin.x + 30 * Math.cos(toRadians(state.angleDegrees)),
    y: origin.y - 30 * Math.sin(toRadians(state.angleDegrees)),
  };

  return (
    <svg aria-label="Vector resolution diagram" role="img" viewBox="0 0 300 210">
      <defs>
        <linearGradient id="components-sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f8fbff" />
          <stop offset="100%" stopColor="#fff7ed" />
        </linearGradient>
      </defs>
      <rect fill="url(#components-sky)" height="210" rx="18" width="300" />
      <line stroke="#cbd5e1" strokeDasharray="3 7" strokeWidth="1.5" x1="30" x2="270" y1={origin.y} y2={origin.y} />
      <line stroke="#cbd5e1" strokeDasharray="3 7" strokeWidth="1.5" x1={origin.x} x2={origin.x} y1="35" y2="185" />
      <path
        d={`M90 ${origin.y} A30 30 0 0 0 ${angleArcEnd.x} ${angleArcEnd.y}`}
        fill="none"
        stroke="#f59e0b"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <line
        stroke="#94a3b8"
        strokeDasharray="4 4"
        strokeWidth="2"
        x1={tip.x}
        x2={tip.x}
        y1={tip.y}
        y2={origin.y}
      />
      <line
        stroke="#94a3b8"
        strokeDasharray="4 4"
        strokeWidth="2"
        x1={origin.x}
        x2={tip.x}
        y1={tip.y}
        y2={tip.y}
      />
      {vectorLine(origin.x, origin.y, tip.x, tip.y, "#b42318", "Original vector")}
      {vectorLine(origin.x, origin.y, xTip.x, xTip.y, "#1f5f8b", "Horizontal component")}
      {vectorLine(xTip.x, xTip.y, tip.x, tip.y, "#7657d8", "Vertical component")}
      <circle cx={origin.x} cy={origin.y} fill="#10201a" r="4" />
      <text fill="#101828" fontSize="12" x={tip.x + 6} y={tip.y + 4}>
        F
      </text>
      <text fill="#10201a" fontSize="11" fontWeight="800" x={origin.x + 35} y={origin.y - 9}>
        θ from horizontal
      </text>
      <text fill="#1f5f8b" fontSize="12" fontWeight="800" x={(origin.x + xTip.x) / 2 - 18} y={origin.y + 18}>
        adjacent Fx
      </text>
      <text fill="#7657d8" fontSize="12" fontWeight="800" x={xTip.x + 8} y={(tip.y + origin.y) / 2}>
        opposite Fy
      </text>
    </svg>
  );
};

const presets = [
  {
    label: "standard pull",
    state: { magnitudeNewtons: newtons(10), angleDegrees: degrees(30) },
  },
  {
    label: "mostly sideways",
    state: { magnitudeNewtons: newtons(12), angleDegrees: degrees(15) },
  },
  {
    label: "steep lift",
    state: { magnitudeNewtons: newtons(8), angleDegrees: degrees(70) },
  },
] as const;

export const ResolvingVectorsSim = () => {
  const [state, setState] = useState<ResolutionState>({
    magnitudeNewtons: newtons(10),
    angleDegrees: degrees(30),
  });

  const model = useMemo(
    () => resolveVectorComponents(state.magnitudeNewtons, state.angleDegrees),
    [state],
  );

  const setMagnitude = (magnitudeNewtons: number) =>
    setState((current) => ({ ...current, magnitudeNewtons: newtons(magnitudeNewtons) }));
  const setAngle = (angleDegrees: number) =>
    setState((current) => ({ ...current, angleDegrees: degrees(angleDegrees) }));

  return (
    <PredictionGate
      packageId={resolvingVectorsPackageId}
      predict={componentPredict}
      simId={resolvingVectorsSimId}
    >
      <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
        <div className="vector-controls vector-controls--product" aria-label="Resolution controls">
          <p className="lab-kicker">Split the force</p>
          <ControlGroup legend="Resolution controls">
            <Slider
              label="Vector magnitude"
              max={20}
              min={0}
              onChange={setMagnitude}
              step={0.5}
              unit="N"
              value={state.magnitudeNewtons}
            />
            <Slider
              label="Angle above horizontal"
              max={90}
              min={0}
              onChange={setAngle}
              step={5}
              unit="°"
              value={state.angleDegrees}
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
          <ResolutionDiagram state={state} />
          {model.ok ? (
            <dl aria-label="Component readout" className="result-readout result-readout--cards">
              <div>
                <dt>Horizontal component</dt>
                <dd>{formatTenths(model.value.componentsNewtons[0])} N</dd>
              </div>
              <div>
                <dt>Vertical component</dt>
                <dd>{formatTenths(model.value.componentsNewtons[1])} N</dd>
              </div>
              <div>
                <dt>Original magnitude</dt>
                <dd>{formatTenths(model.value.magnitudeNewtons)} N</dd>
              </div>
            </dl>
          ) : (
            <p role="alert">The components cannot be calculated for the current inputs.</p>
          )}
        </div>

        <section className="formula-panel formula-panel--product" aria-label="Formula used">
          <div>
            <p className="lab-kicker">Why the split works</p>
            <h3>Formula used</h3>
          </div>
          <pre className="formula-code" aria-label="Vector component formula">
            <code>
              <span className="formula-var formula-var--blue">Fx</span>
              {" = "}
              <span className="formula-var formula-var--orange">F</span>
              {" cos("}
              <span className="formula-var formula-var--green">θ</span>
              {")\n"}
              <span className="formula-var formula-var--blue">Fy</span>
              {" = "}
              <span className="formula-var formula-var--orange">F</span>
              {" sin("}
              <span className="formula-var formula-var--green">θ</span>
              {")"}
            </code>
          </pre>
          {model.ok ? (
            <>
              <p className="lab-kicker">Legend</p>
              <dl className="formula-legend" aria-label="Formula legend">
                <div>
                  <dt>
                    <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> Fx, Fy
                  </dt>
                  <dd>horizontal and vertical force components, in N</dd>
                </div>
                <div>
                  <dt>
                    <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> F
                  </dt>
                  <dd>original force magnitude, {formatTenths(state.magnitudeNewtons)} N</dd>
                </div>
                <div>
                  <dt>
                    <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> theta
                  </dt>
                  <dd>angle above the horizontal, {state.angleDegrees.toFixed(0)} degrees</dd>
                </div>
              </dl>
              <p>Units: the original force and both resolved components are measured in newtons (N).</p>
              <p>
                Substitution: Fx = ({formatTenths(state.magnitudeNewtons)} N)cos(
                {state.angleDegrees.toFixed(0)} degrees) ={" "}
                {formatTenths(model.value.componentsNewtons[0])} N
              </p>
              <p>
                Substitution: Fy = ({formatTenths(state.magnitudeNewtons)} N)sin(
                {state.angleDegrees.toFixed(0)} degrees) ={" "}
                {formatTenths(model.value.componentsNewtons[1])} N
              </p>
              <p>
                Result: Fx = {formatTenths(model.value.componentsNewtons[0])} N and Fy ={" "}
                {formatTenths(model.value.componentsNewtons[1])} N.
              </p>
              <p className="formula-note">
                cos θ = {formatHundredths(model.value.horizontalFraction)} and sin θ ={" "}
                {formatHundredths(model.value.verticalFraction)}. The two components replace
                the original vector; they are not extra forces.
              </p>
              <p className="formula-note">
                If the angle were measured from the vertical instead, which component would use
                cosine?
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

export default ResolvingVectorsSim;
