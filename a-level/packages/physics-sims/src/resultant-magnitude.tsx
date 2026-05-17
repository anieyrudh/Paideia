import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";

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

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const roundTenths = (value: number): number => Math.round(value * 10) / 10;
const formatTenths = (value: number): string => roundTenths(value).toFixed(1);

export const resultantComponents = (
  vectorA: number,
  vectorB: number,
  angleDegrees: number,
): readonly [number, number] => [
  vectorA + vectorB * Math.cos(toRadians(angleDegrees)),
  vectorB * Math.sin(toRadians(angleDegrees)),
];

export const resultantMagnitude = (
  vectorA: number,
  vectorB: number,
  angleDegrees: number,
): number => {
  const [x, y] = resultantComponents(vectorA, vectorB, angleDegrees);
  return Math.hypot(x, y);
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

export const ResultantVectorDiagram = ({ state }: ResultantVectorDiagramProps) => {
  const scale = 16;
  const origin = { x: 70, y: 160 };
  const aEnd = { x: origin.x + state.vectorA * scale, y: origin.y };
  const bEnd = {
    x: origin.x + state.vectorB * scale * Math.cos(toRadians(state.angleDegrees)),
    y: origin.y - state.vectorB * scale * Math.sin(toRadians(state.angleDegrees)),
  };
  const [resultX, resultY] = resultantComponents(
    state.vectorA,
    state.vectorB,
    state.angleDegrees,
  );
  const rEnd = { x: origin.x + resultX * scale, y: origin.y - resultY * scale };

  return (
    <svg aria-label="Vector resultant diagram" role="img" viewBox="0 0 300 210">
      <rect fill="#f8fafc" height="210" width="300" />
      <line stroke="#d0d5dd" strokeWidth="1" x1="30" x2="270" y1={origin.y} y2={origin.y} />
      <line stroke="#d0d5dd" strokeWidth="1" x1={origin.x} x2={origin.x} y1="30" y2="185" />
      {vectorLine(origin.x, origin.y, aEnd.x, aEnd.y, "#1f5f8b", "Vector A")}
      {vectorLine(origin.x, origin.y, bEnd.x, bEnd.y, "#7a5af8", "Vector B")}
      {vectorLine(origin.x, origin.y, rEnd.x, rEnd.y, "#b42318", "Resultant vector")}
      <text fill="#101828" fontSize="12" x={aEnd.x + 6} y={aEnd.y + 4}>
        A
      </text>
      <text fill="#101828" fontSize="12" x={bEnd.x + 6} y={bEnd.y - 6}>
        B
      </text>
      <text fill="#101828" fontSize="12" x={rEnd.x + 6} y={rEnd.y + 4}>
        R
      </text>
    </svg>
  );
};

const sliderId = (id: string): string => `resultant-${id}`;

export const ResultantMagnitudeSim = () => {
  const [state, setState] = useState<VectorState>({
    vectorA: 5,
    vectorB: 5,
    angleDegrees: 90,
  });

  const resultant = useMemo(
    () => resultantMagnitude(state.vectorA, state.vectorB, state.angleDegrees),
    [state],
  );
  const scalarSum = state.vectorA + state.vectorB;
  const cosine = Math.cos(toRadians(state.angleDegrees));

  const update = (key: keyof VectorState) => (raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    setState((current) => ({ ...current, [key]: value }));
  };

  return (
    <PredictionGate packageId={packageId} predict={perpendicularPredict} simId={simId}>
      <section aria-label="Resultant magnitude explorer" className="vector-lab">
        <div className="vector-controls" aria-label="Vector controls">
          <label htmlFor={sliderId("vector-a")}>
            <span>Vector A</span>
            <strong>{state.vectorA.toFixed(1)} m</strong>
          </label>
          <input
            id={sliderId("vector-a")}
            max="10"
            min="0"
            onChange={(event) => update("vectorA")(event.currentTarget.value)}
            step="0.5"
            type="range"
            value={state.vectorA}
          />

          <label htmlFor={sliderId("vector-b")}>
            <span>Vector B</span>
            <strong>{state.vectorB.toFixed(1)} m</strong>
          </label>
          <input
            id={sliderId("vector-b")}
            max="10"
            min="0"
            onChange={(event) => update("vectorB")(event.currentTarget.value)}
            step="0.5"
            type="range"
            value={state.vectorB}
          />

          <label htmlFor={sliderId("angle")}>
            <span>Angle between vectors</span>
            <strong>{state.angleDegrees.toFixed(0)} degrees</strong>
          </label>
          <input
            id={sliderId("angle")}
            max="180"
            min="0"
            onChange={(event) => update("angleDegrees")(event.currentTarget.value)}
            step="5"
            type="range"
            value={state.angleDegrees}
          />
        </div>

        <div className="vector-stage">
          <ResultantVectorDiagram state={state} />
          <dl aria-label="Observation unlocked" className="result-readout">
            <dt>Geometric resultant</dt>
            <dd>{formatTenths(resultant)} m</dd>
            <dt>Scalar sum</dt>
            <dd>{formatTenths(scalarSum)} m</dd>
          </dl>
        </div>

        <section className="formula-panel" aria-label="Formula used">
          <h3>Formula used</h3>
          <p className="formula">|R| = √(A² + B² + 2AB cos θ)</p>
          <p>
            √({formatTenths(state.vectorA)}² + {formatTenths(state.vectorB)}² + 2(
            {formatTenths(state.vectorA)})({formatTenths(state.vectorB)})cos(
            {state.angleDegrees.toFixed(0)}°)) = {formatTenths(resultant)} m
          </p>
          <p className="formula-note">
            cos θ = {cosine.toFixed(2)}. Direction changes the component sum, so equal
            lengths do not always add to the same resultant.
          </p>
        </section>
      </section>
    </PredictionGate>
  );
};

export default ResultantMagnitudeSim;
