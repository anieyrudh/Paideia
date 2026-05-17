import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { netForce, type Vector2 } from "@paideia/mechanics";
import { PredictionGate } from "@paideia/prediction-gate";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const packageId = "scalars-and-vectors";
export const simId = "resultant-magnitude";

export const perpendicularPredict: TPredictSpec = {
  prompt:
    "Two displacement arrows each have length 5 m. One points east and one points north. Before seeing any construction, what resultant magnitude do you expect?",
  commit_format: {
    kind: "multiple-choice",
    options: ["0 m", "5 m", "7.1 m", "10 m"],
    correct_index: 2,
  },
  rationale_required: true,
};

export interface VectorState {
  readonly vectorA: number;
  readonly vectorB: number;
  readonly angleDegrees: number;
}

export interface ResultantVectorDiagramProps {
  readonly state: VectorState;
}

export interface ResultantVectorModel {
  readonly vectorA: Vector2;
  readonly vectorB: Vector2;
  readonly resultant: Vector2;
  readonly magnitude: number;
  readonly scalarSum: number;
  readonly cosine: number;
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const roundTenths = (value: number): number => Math.round(value * 10) / 10;
const formatTenths = (value: number): string => roundTenths(value).toFixed(1);
const formatHundredths = (value: number): string => (Math.round(value * 100) / 100).toFixed(2);

export const vectorBComponents = (vectorB: number, angleDegrees: number): Vector2 => ({
  x: vectorB * Math.cos(toRadians(angleDegrees)),
  y: vectorB * Math.sin(toRadians(angleDegrees)),
});

export const resultantVectorModel = (
  vectorA: number,
  vectorB: number,
  angleDegrees: number,
): ResultantVectorModel => {
  const first: Vector2 = { x: vectorA, y: 0 };
  const second = vectorBComponents(vectorB, angleDegrees);
  const sum = netForce([first, second]);
  const resultant = sum.ok ? sum.value : { x: 0, y: 0 };

  return {
    vectorA: first,
    vectorB: second,
    resultant,
    magnitude: Math.hypot(resultant.x, resultant.y),
    scalarSum: vectorA + vectorB,
    cosine: Math.cos(toRadians(angleDegrees)),
  };
};

export const resultantComponents = (
  vectorA: number,
  vectorB: number,
  angleDegrees: number,
): readonly [number, number] => {
  const model = resultantVectorModel(vectorA, vectorB, angleDegrees);
  return [model.resultant.x, model.resultant.y];
};

export const resultantMagnitude = (
  vectorA: number,
  vectorB: number,
  angleDegrees: number,
): number => resultantVectorModel(vectorA, vectorB, angleDegrees).magnitude;

const arrowHead = (
  tipX: number,
  tipY: number,
  angle: number,
  color: string,
  key: string,
) => {
  const size = 9;
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
  width = 4,
) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);

  return (
    <g aria-label={label} role="img">
      <line
        stroke={color}
        strokeLinecap="round"
        strokeWidth={width}
        x1={x1}
        x2={x2}
        y1={y1}
        y2={y2}
      />
      {arrowHead(x2, y2, angle, color, `${label}-head`)}
    </g>
  );
};

export const ResultantVectorDiagram = ({ state }: ResultantVectorDiagramProps) => {
  const scale = 16;
  const origin = { x: 72, y: 168 };
  const model = resultantVectorModel(state.vectorA, state.vectorB, state.angleDegrees);
  const aEnd = { x: origin.x + model.vectorA.x * scale, y: origin.y - model.vectorA.y * scale };
  const bEnd = { x: origin.x + model.vectorB.x * scale, y: origin.y - model.vectorB.y * scale };
  const rEnd = {
    x: origin.x + model.resultant.x * scale,
    y: origin.y - model.resultant.y * scale,
  };
  const angleArcEnd = {
    x: origin.x + 28 * Math.cos(toRadians(state.angleDegrees)),
    y: origin.y - 28 * Math.sin(toRadians(state.angleDegrees)),
  };

  return (
    <svg aria-label="Vector resultant diagram" role="img" viewBox="0 0 330 230">
      <defs>
        <linearGradient id="vector-sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f8fbff" />
          <stop offset="100%" stopColor="#ecfdf3" />
        </linearGradient>
      </defs>
      <rect fill="url(#vector-sky)" height="230" rx="18" width="330" />
      <path d="M32 168 H300 M72 34 V198" stroke="#cbd5e1" strokeDasharray="3 7" strokeWidth="1.5" />
      <path
        d={`M100 ${origin.y} A28 28 0 0 0 ${angleArcEnd.x} ${angleArcEnd.y}`}
        fill="none"
        stroke="#f59e0b"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <line
        stroke="#94a3b8"
        strokeDasharray="5 5"
        strokeWidth="2"
        x1={aEnd.x}
        x2={rEnd.x}
        y1={aEnd.y}
        y2={rEnd.y}
      />
      <line
        stroke="#94a3b8"
        strokeDasharray="5 5"
        strokeWidth="2"
        x1={bEnd.x}
        x2={rEnd.x}
        y1={bEnd.y}
        y2={rEnd.y}
      />
      {vectorLine(origin.x, origin.y, aEnd.x, aEnd.y, "#1f5f8b", "Vector A")}
      {vectorLine(origin.x, origin.y, bEnd.x, bEnd.y, "#7657d8", "Vector B")}
      {vectorLine(origin.x, origin.y, rEnd.x, rEnd.y, "#b42318", "Resultant vector", 5)}
      <circle cx={origin.x} cy={origin.y} fill="#10201a" r="4" />
      <text fill="#10201a" fontSize="12" fontWeight="800" x={aEnd.x + 7} y={aEnd.y + 4}>
        A
      </text>
      <text fill="#10201a" fontSize="12" fontWeight="800" x={bEnd.x + 7} y={bEnd.y - 7}>
        B
      </text>
      <text fill="#7f1d1d" fontSize="12" fontWeight="900" x={rEnd.x + 8} y={rEnd.y + 4}>
        R
      </text>
      <text fill="#92400e" fontSize="11" fontWeight="800" x={origin.x + 33} y={origin.y - 10}>
        θ
      </text>
    </svg>
  );
};

const presets = [
  { label: "right-angle route", state: { vectorA: 5, vectorB: 5, angleDegrees: 90 } },
  { label: "same direction", state: { vectorA: 5, vectorB: 5, angleDegrees: 0 } },
  { label: "return path", state: { vectorA: 5, vectorB: 5, angleDegrees: 180 } },
] as const;

export const ResultantMagnitudeSim = () => {
  const [state, setState] = useState<VectorState>({
    vectorA: 5,
    vectorB: 5,
    angleDegrees: 90,
  });

  const model = useMemo(
    () => resultantVectorModel(state.vectorA, state.vectorB, state.angleDegrees),
    [state],
  );

  const setVectorA = (vectorA: number) => setState((current) => ({ ...current, vectorA }));
  const setVectorB = (vectorB: number) => setState((current) => ({ ...current, vectorB }));
  const setAngle = (angleDegrees: number) => setState((current) => ({ ...current, angleDegrees }));

  return (
    <PredictionGate packageId={packageId} predict={perpendicularPredict} simId={simId}>
      <section aria-label="Resultant magnitude explorer" className="vector-lab vector-lab--product">
        <div className="vector-controls vector-controls--product" aria-label="Vector controls">
          <p className="lab-kicker">Shape the route</p>
          <ControlGroup legend="Vector controls">
            <Slider
              label="Vector A magnitude"
              max={10}
              min={0}
              onChange={setVectorA}
              step={0.5}
              unit="m"
              value={state.vectorA}
            />
            <Slider
              label="Vector B magnitude"
              max={10}
              min={0}
              onChange={setVectorB}
              step={0.5}
              unit="m"
              value={state.vectorB}
            />
            <Slider
              label="Angle between vectors"
              max={180}
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
          <ResultantVectorDiagram state={state} />
          <dl aria-label="Observation unlocked" className="result-readout result-readout--cards">
            <div>
              <dt>Geometric resultant</dt>
              <dd>{formatTenths(model.magnitude)} m</dd>
            </div>
            <div>
              <dt>Scalar sum trap</dt>
              <dd>{formatTenths(model.scalarSum)} m</dd>
            </div>
            <div>
              <dt>Direction gap</dt>
              <dd>{formatTenths(model.scalarSum - model.magnitude)} m</dd>
            </div>
          </dl>
        </div>

        <section className="formula-panel formula-panel--product" aria-label="Formula used">
          <div>
            <p className="lab-kicker">Why the number changes</p>
            <h3>Formula used</h3>
          </div>
          <p className="formula">|R| = √(A² + B² + 2AB cos θ)</p>
          <p>
            √({formatTenths(state.vectorA)}² + {formatTenths(state.vectorB)}² + 2(
            {formatTenths(state.vectorA)})({formatTenths(state.vectorB)})cos(
            {state.angleDegrees.toFixed(0)}°)) = {formatTenths(model.magnitude)} m
          </p>
          <p className="formula-note">
            cos θ = {formatHundredths(model.cosine)}. When direction opens up, the component sum
            from the mechanics kernel no longer equals the magnitude-only sum.
          </p>
        </section>
      </section>
    </PredictionGate>
  );
};

export default ResultantMagnitudeSim;
