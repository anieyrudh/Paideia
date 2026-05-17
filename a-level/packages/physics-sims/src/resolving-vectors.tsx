import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";

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
  readonly magnitude: number;
  readonly angleDegrees: number;
}

export interface ResolutionDiagramProps {
  readonly state: ResolutionState;
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const roundTenths = (value: number): number => Math.round(value * 10) / 10;
const formatTenths = (value: number): string => roundTenths(value).toFixed(1);

export const resolveVectorComponents = (
  magnitude: number,
  angleDegrees: number,
): readonly [number, number] => [
  magnitude * Math.cos(toRadians(angleDegrees)),
  magnitude * Math.sin(toRadians(angleDegrees)),
];

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
  const [componentX, componentY] = resolveVectorComponents(
    state.magnitude,
    state.angleDegrees,
  );
  const tip = {
    x: origin.x + componentX * scale,
    y: origin.y - componentY * scale,
  };
  const xTip = { x: tip.x, y: origin.y };

  return (
    <svg aria-label="Vector resolution diagram" role="img" viewBox="0 0 300 210">
      <rect fill="#f8fafc" height="210" width="300" />
      <line stroke="#d0d5dd" strokeWidth="1" x1="30" x2="270" y1={origin.y} y2={origin.y} />
      <line stroke="#d0d5dd" strokeWidth="1" x1={origin.x} x2={origin.x} y1="35" y2="185" />
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
      <text fill="#101828" fontSize="12" x={tip.x + 6} y={tip.y + 4}>
        R
      </text>
      <text fill="#101828" fontSize="12" x={(origin.x + xTip.x) / 2 - 6} y={origin.y + 18}>
        x
      </text>
      <text fill="#101828" fontSize="12" x={xTip.x + 8} y={(tip.y + origin.y) / 2}>
        y
      </text>
    </svg>
  );
};

const sliderId = (id: string): string => `resolving-${id}`;

export const ResolvingVectorsSim = () => {
  const [state, setState] = useState<ResolutionState>({
    magnitude: 10,
    angleDegrees: 30,
  });

  const [componentX, componentY] = useMemo(
    () => resolveVectorComponents(state.magnitude, state.angleDegrees),
    [state],
  );

  const update = (key: keyof ResolutionState) => (raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    setState((current) => ({ ...current, [key]: value }));
  };

  return (
    <PredictionGate
      packageId={resolvingVectorsPackageId}
      predict={componentPredict}
      simId={resolvingVectorsSimId}
    >
      <section aria-label="Resolving vectors explorer" className="vector-lab">
        <div className="vector-controls" aria-label="Resolution controls">
          <label htmlFor={sliderId("magnitude")}>
            <span>Vector magnitude</span>
            <strong>{state.magnitude.toFixed(1)} N</strong>
          </label>
          <input
            id={sliderId("magnitude")}
            max="20"
            min="0"
            onChange={(event) => update("magnitude")(event.currentTarget.value)}
            step="0.5"
            type="range"
            value={state.magnitude}
          />

          <label htmlFor={sliderId("angle")}>
            <span>Angle above horizontal</span>
            <strong>{state.angleDegrees.toFixed(0)} degrees</strong>
          </label>
          <input
            id={sliderId("angle")}
            max="90"
            min="0"
            onChange={(event) => update("angleDegrees")(event.currentTarget.value)}
            step="5"
            type="range"
            value={state.angleDegrees}
          />
        </div>

        <div className="vector-stage">
          <ResolutionDiagram state={state} />
          <dl aria-label="Observation unlocked" className="result-readout">
            <dt>Horizontal component</dt>
            <dd>{formatTenths(componentX)} N</dd>
            <dt>Vertical component</dt>
            <dd>{formatTenths(componentY)} N</dd>
          </dl>
        </div>

        <section className="formula-panel" aria-label="Formula used">
          <h3>Formula used</h3>
          <p className="formula">x = R cos theta, y = R sin theta</p>
          <p>
            x = {formatTenths(state.magnitude)}cos({state.angleDegrees.toFixed(0)} degrees)
            = {formatTenths(componentX)} N
          </p>
          <p>
            y = {formatTenths(state.magnitude)}sin({state.angleDegrees.toFixed(0)} degrees)
            = {formatTenths(componentY)} N
          </p>
          <p className="formula-note">
            Components are perpendicular parts of the same vector. They replace the vector
            only when direction is preserved by the chosen axes.
          </p>
        </section>
      </section>
    </PredictionGate>
  );
};

export default ResolvingVectorsSim;
