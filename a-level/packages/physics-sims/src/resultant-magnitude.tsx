import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import {
  add2,
  matrix2,
  multiplyMatrixVector2,
  norm2,
  vector2,
  type Vector2 as LinearVector2,
} from "@paideia/linear-algebra";
import { PredictionGate } from "@paideia/prediction-gate";
import { degrees, metres, ok, type Degrees, type KernelResult, type Metres } from "@paideia/shared";
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
  readonly vectorAMetres: Metres;
  readonly vectorBMetres: Metres;
  readonly angleDegrees: Degrees;
}

export interface ResultantVectorDiagramProps {
  readonly state: VectorState;
}

export type MetreVector2 = readonly [xMetres: Metres, yMetres: Metres];

export interface ResultantVectorModel {
  readonly vectorAComponentsMetres: MetreVector2;
  readonly vectorBComponentsMetres: MetreVector2;
  readonly resultantComponentsMetres: MetreVector2;
  readonly magnitudeMetres: Metres;
  readonly scalarSumMetres: Metres;
  readonly cosine: number;
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const roundTenths = (value: number): number => Math.round(value * 10) / 10;
const formatTenths = (value: number): string => roundTenths(value).toFixed(1);
const formatHundredths = (value: number): string => (Math.round(value * 100) / 100).toFixed(2);
const metreVector2 = (vector: LinearVector2): MetreVector2 => [
  metres(vector[0]),
  metres(vector[1]),
];

const vectorBComponentsMetres = (
  vectorBMetres: Metres,
  angleDegrees: Degrees,
): KernelResult<LinearVector2> => {
  const base = vector2(vectorBMetres, 0);
  if (!base.ok) return base;
  const theta = toRadians(angleDegrees);
  const rotation = matrix2(
    Math.cos(theta),
    -Math.sin(theta),
    Math.sin(theta),
    Math.cos(theta),
  );
  if (!rotation.ok) return rotation;
  return multiplyMatrixVector2(rotation.value, base.value);
};

const resultantVectorModel = (
  vectorAMetres: Metres,
  vectorBMetres: Metres,
  angleDegrees: Degrees,
): KernelResult<ResultantVectorModel> => {
  const first = vector2(vectorAMetres, 0);
  if (!first.ok) return first;
  const second = vectorBComponentsMetres(vectorBMetres, angleDegrees);
  if (!second.ok) return second;
  const resultant = add2(first.value, second.value);
  if (!resultant.ok) return resultant;
  const magnitude = norm2(resultant.value);
  if (!magnitude.ok) return magnitude;

  return ok({
    vectorAComponentsMetres: metreVector2(first.value),
    vectorBComponentsMetres: metreVector2(second.value),
    resultantComponentsMetres: metreVector2(resultant.value),
    magnitudeMetres: metres(magnitude.value),
    scalarSumMetres: metres(vectorAMetres + vectorBMetres),
    cosine: Math.cos(toRadians(angleDegrees)),
  });
};

export const resultantComponents = (
  vectorAMetres: Metres,
  vectorBMetres: Metres,
  angleDegrees: Degrees,
): KernelResult<MetreVector2> => {
  const model = resultantVectorModel(vectorAMetres, vectorBMetres, angleDegrees);
  return model.ok ? ok(model.value.resultantComponentsMetres) : model;
};

export const resultantMagnitude = (
  vectorAMetres: Metres,
  vectorBMetres: Metres,
  angleDegrees: Degrees,
): KernelResult<Metres> => {
  const model = resultantVectorModel(vectorAMetres, vectorBMetres, angleDegrees);
  return model.ok ? ok(model.value.magnitudeMetres) : model;
};

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
  const model = resultantVectorModel(state.vectorAMetres, state.vectorBMetres, state.angleDegrees);
  if (!model.ok) {
    return <p role="alert">The current vector settings are outside the supported range.</p>;
  }

  const aEnd = {
    x: origin.x + model.value.vectorAComponentsMetres[0] * scale,
    y: origin.y - model.value.vectorAComponentsMetres[1] * scale,
  };
  const bEnd = {
    x: origin.x + model.value.vectorBComponentsMetres[0] * scale,
    y: origin.y - model.value.vectorBComponentsMetres[1] * scale,
  };
  const rEnd = {
    x: origin.x + model.value.resultantComponentsMetres[0] * scale,
    y: origin.y - model.value.resultantComponentsMetres[1] * scale,
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
  {
    label: "right-angle route",
    state: { vectorAMetres: metres(5), vectorBMetres: metres(5), angleDegrees: degrees(90) },
  },
  {
    label: "same direction",
    state: { vectorAMetres: metres(5), vectorBMetres: metres(5), angleDegrees: degrees(0) },
  },
  {
    label: "return path",
    state: { vectorAMetres: metres(5), vectorBMetres: metres(5), angleDegrees: degrees(180) },
  },
] as const;

export const ResultantMagnitudeSim = () => {
  const [state, setState] = useState<VectorState>({
    vectorAMetres: metres(5),
    vectorBMetres: metres(5),
    angleDegrees: degrees(90),
  });

  const model = useMemo(
    () => resultantVectorModel(state.vectorAMetres, state.vectorBMetres, state.angleDegrees),
    [state],
  );

  const setVectorA = (vectorAMetres: number) =>
    setState((current) => ({ ...current, vectorAMetres: metres(vectorAMetres) }));
  const setVectorB = (vectorBMetres: number) =>
    setState((current) => ({ ...current, vectorBMetres: metres(vectorBMetres) }));
  const setAngle = (angleDegrees: number) =>
    setState((current) => ({ ...current, angleDegrees: degrees(angleDegrees) }));

  return (
    <PredictionGate packageId={packageId} predict={perpendicularPredict} simId={simId}>
      <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
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
              value={state.vectorAMetres}
            />
            <Slider
              label="Vector B magnitude"
              max={10}
              min={0}
              onChange={setVectorB}
              step={0.5}
              unit="m"
              value={state.vectorBMetres}
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
          {model.ok ? (
            <dl aria-label="Resultant readout" className="result-readout result-readout--cards">
              <div>
                <dt>Geometric resultant</dt>
                <dd>{formatTenths(model.value.magnitudeMetres)} m</dd>
              </div>
              <div>
                <dt>Scalar sum trap</dt>
                <dd>{formatTenths(model.value.scalarSumMetres)} m</dd>
              </div>
              <div>
                <dt>Direction gap</dt>
                <dd>{formatTenths(model.value.scalarSumMetres - model.value.magnitudeMetres)} m</dd>
              </div>
            </dl>
          ) : (
            <p role="alert">The resultant cannot be calculated for the current inputs.</p>
          )}
        </div>

        <section className="formula-panel formula-panel--product" aria-label="Formula used">
          <div>
            <p className="lab-kicker">Why the number changes</p>
            <h3>Formula used</h3>
          </div>
          <pre className="formula-code" aria-label="Resultant magnitude formula">
            <code>
              <span className="formula-var formula-var--blue">|R|</span>
              {" = √("}
              <span className="formula-var formula-var--blue">A^2</span>
              {" + "}
              <span className="formula-var formula-var--orange">B^2</span>
              {" + 2"}
              <span className="formula-var formula-var--blue">A</span>
              <span className="formula-var formula-var--orange">B</span>
              {" cos("}
              <span className="formula-var formula-var--green">θ</span>
              {"))"}
            </code>
          </pre>
          {model.ok ? (
            <>
              <p className="lab-kicker">Legend</p>
              <dl className="formula-legend" aria-label="Formula legend">
                <div>
                  <dt>
                    <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> A
                  </dt>
                  <dd>first displacement, {formatTenths(state.vectorAMetres)} m</dd>
                </div>
                <div>
                  <dt>
                    <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> B
                  </dt>
                  <dd>second displacement, {formatTenths(state.vectorBMetres)} m</dd>
                </div>
                <div>
                  <dt>
                    <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> theta
                  </dt>
                  <dd>angle between the arrows, {state.angleDegrees.toFixed(0)} degrees</dd>
                </div>
              </dl>
              <p>Units: each displacement and the resultant magnitude are measured in metres (m).</p>
              <p>
                Substitution: |R| = √(({formatTenths(state.vectorAMetres)} m)^2 + (
                {formatTenths(state.vectorBMetres)} m)^2 + 2({formatTenths(state.vectorAMetres)} m)(
                {formatTenths(state.vectorBMetres)} m)cos({state.angleDegrees.toFixed(0)} degrees)) ={" "}
                {formatTenths(model.value.magnitudeMetres)} m.
              </p>
              <p>Result: the resultant displacement is {formatTenths(model.value.magnitudeMetres)} m.</p>
              <p className="formula-note">
                cos θ = {formatHundredths(model.value.cosine)}. When direction opens up, the
                component sum no longer equals the magnitude-only sum.
              </p>
              <p className="formula-note">
                Why does changing only the angle change the result when the two lengths stay fixed?
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

export default ResultantMagnitudeSim;
