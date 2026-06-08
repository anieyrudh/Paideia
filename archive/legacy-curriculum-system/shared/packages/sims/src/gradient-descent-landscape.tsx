import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import {
  gradientDescent,
  type GradientDescentTrace,
  type GradientSample,
  type Point2,
} from "@paideia/optimization";
import { PlotFrame } from "@paideia/plotting";
import { PredictionGate } from "@paideia/prediction-gate";
import type { Function3D, KernelResult, Rect } from "@paideia/shared";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";

export const gradientDescentPackageId = "gradient-descent-landscape";
export const gradientDescentSimId = "loss-surface-stepper";

type LandscapeId = "bowl" | "ravine" | "saddle";

export interface GradientDescentState {
  readonly landscape: LandscapeId;
  readonly startX: number;
  readonly startY: number;
  readonly learningRate: number;
  readonly maxSteps: number;
}

export interface GradientDescentModel {
  readonly trace: GradientDescentTrace;
  readonly finalSample: GradientSample;
  readonly stepCount: number;
  readonly interpretation: string;
}

interface LandscapeSpec {
  readonly id: LandscapeId;
  readonly label: string;
  readonly shortLabel: string;
  readonly loss: Function3D;
  readonly target: Point2;
  readonly note: string;
}

const domain: Rect = {
  x: { min: -4, max: 4 },
  y: { min: -4, max: 4 },
};

const landscapes: Record<LandscapeId, LandscapeSpec> = {
  bowl: {
    id: "bowl",
    label: "Smooth bowl",
    shortLabel: "bowl",
    loss: (x, y) => (x - 1) ** 2 + 0.8 * (y + 1) ** 2 + 0.2,
    target: [1, -1],
    note: "Convex bowl: the local downhill direction leads to the same minimum from nearby starts.",
  },
  ravine: {
    id: "ravine",
    label: "Narrow ravine",
    shortLabel: "ravine",
    loss: (x, y) => 0.2 * (x + 0.5) ** 2 + 3 * (y - 0.8) ** 2 + 0.3,
    target: [-0.5, 0.8],
    note: "Ravine: the y-slope is steep, so a large learning rate can overshoot across the valley.",
  },
  saddle: {
    id: "saddle",
    label: "Saddle ridge",
    shortLabel: "saddle",
    loss: (x, y) => x ** 2 - y ** 2 + 0.2 * (x + y) ** 2 + 2,
    target: [0, 0],
    note: "Saddle: the local slope can point away from one direction while another direction still descends.",
  },
};

const landscapeOptions = Object.values(landscapes).map((landscape) => ({
  value: landscape.id,
  label: landscape.label,
}));

export const gradientDescentPredict: TPredictSpec = {
  prompt:
    "On a narrow loss ravine, what is most likely to happen when the learning rate is made much larger?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "The path can overshoot and zig-zag across the valley",
      "The path must converge in fewer steps",
      "The gradient becomes exactly zero everywhere",
      "The starting point stops affecting the trace",
    ],
    correct_index: 0,
  },
  rationale_required: true,
};

export const defaultGradientDescentState: GradientDescentState = {
  landscape: "ravine",
  startX: -3,
  startY: -2.4,
  learningRate: 0.22,
  maxSteps: 24,
};

const allSamples = (trace: GradientDescentTrace): readonly GradientSample[] => [
  trace.initial,
  ...trace.steps,
];

const finalSample = (trace: GradientDescentTrace): GradientSample => {
  const samples = allSamples(trace);
  return samples[samples.length - 1] ?? trace.initial;
};

const roundHundredths = (value: number): number => Math.round(value * 100) / 100;
const formatNumber = (value: number): string => roundHundredths(value).toFixed(2);

const gradientMagnitude = (sample: GradientSample): number =>
  Math.hypot(sample.gradient[0], sample.gradient[1]);

const interpretTrace = (trace: GradientDescentTrace): string => {
  if (trace.converged) return "converged: the gradient is small enough to count as flat here";
  if (trace.reason === "out-of-domain") return "unstable: the next step left the visible parameter window";
  return "not yet converged: more steps or a better learning rate are needed";
};

export const buildGradientDescentModel = (
  state: GradientDescentState,
): KernelResult<GradientDescentModel> => {
  const landscape = landscapes[state.landscape];
  const trace = gradientDescent(landscape.loss, [state.startX, state.startY], {
    learningRate: state.learningRate,
    maxSteps: state.maxSteps,
    tolerance: 0.02,
    domain,
  });
  if (!trace.ok) return trace;

  return {
    ok: true,
    value: {
      trace: trace.value,
      finalSample: finalSample(trace.value),
      stepCount: trace.value.steps.length,
      interpretation: interpretTrace(trace.value),
    },
  };
};

const svgPoint = ([x, y]: Point2): readonly [number, number] => {
  const width = 640;
  const height = 420;
  const margin = 36;
  const px = margin + ((x - domain.x.min) / (domain.x.max - domain.x.min)) * (width - margin * 2);
  const py =
    height - margin - ((y - domain.y.min) / (domain.y.max - domain.y.min)) * (height - margin * 2);
  return [px, py];
};

const heatColor = (value: number, min: number, max: number): string => {
  const ratio = Math.max(0, Math.min(1, (value - min) / Math.max(max - min, 1e-9)));
  const light = Math.round(92 - ratio * 36);
  return `hsl(196 62% ${light}%)`;
};

const lossSamples = (landscape: LandscapeSpec) => {
  const values: { readonly point: Point2; readonly value: number }[] = [];
  const count = 13;
  for (let ix = 0; ix < count; ix += 1) {
    for (let iy = 0; iy < count; iy += 1) {
      const x = domain.x.min + ((domain.x.max - domain.x.min) * ix) / (count - 1);
      const y = domain.y.min + ((domain.y.max - domain.y.min) * iy) / (count - 1);
      values.push({ point: [x, y], value: landscape.loss(x, y) });
    }
  }
  return values;
};

const LandscapePlot = ({
  model,
  landscape,
}: {
  readonly model: GradientDescentModel;
  readonly landscape: LandscapeSpec;
}) => {
  const heat = lossSamples(landscape);
  const min = Math.min(...heat.map((sample) => sample.value));
  const max = Math.max(...heat.map((sample) => sample.value));
  const samples = allSamples(model.trace);
  const tracePath = samples
    .map((sample) => svgPoint(sample.point))
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  const [targetX, targetY] = svgPoint(landscape.target);

  return (
    <figure aria-label="Loss surface and descent trace" className="vector-stage vector-stage--product">
      <PlotFrame domain={domain} grid="cartesian" aspect="auto">
        <g aria-hidden="true">
          {heat.map((sample) => {
            const [x, y] = svgPoint(sample.point);
            return (
              <rect
                fill={heatColor(sample.value, min, max)}
                height="30"
                key={`${sample.point[0]}-${sample.point[1]}`}
                opacity="0.78"
                rx="3"
                width="44"
                x={x - 22}
                y={y - 15}
              />
            );
          })}
        </g>
        <path
          d={tracePath}
          fill="none"
          stroke="#7c3aed"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        {samples.map((sample, index) => {
          const [x, y] = svgPoint(sample.point);
          return (
            <circle
              aria-hidden="true"
              cx={x}
              cy={y}
              fill={index === 0 ? "#d97706" : "#7c3aed"}
              key={`${index}-${x}-${y}`}
              r={index === 0 ? 7 : 5}
              stroke="#ffffff"
              strokeWidth="2"
            />
          );
        })}
        <circle cx={targetX} cy={targetY} fill="#059669" r="6" stroke="#ffffff" strokeWidth="2" />
      </PlotFrame>
      <figcaption>
        Purple points are the kernel trace. Amber is the start. Green marks the known reference
        minimum or saddle point for this teaching surface.
      </figcaption>
    </figure>
  );
};

const FormulaPanel = ({
  model,
  state,
}: {
  readonly model: GradientDescentModel;
  readonly state: GradientDescentState;
}) => {
  const first = model.trace.initial;
  const next = model.trace.steps[0] ?? first;
  return (
    <section aria-label="Formula used" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Update rule</p>
      <h3>Formula used</h3>
      <pre aria-label="Gradient descent update formula" className="formula-code">
        <code>
          <span className="formula-var formula-var--purple">theta<sub>k+1</sub></span>
          {" = "}
          <span className="formula-var formula-var--orange">theta<sub>k</sub></span>
          {" - "}
          <span className="formula-var formula-var--blue">eta</span>
          {" "}
          <span className="formula-var formula-var--green">
            nabla L(theta<sub>k</sub>)
          </span>
        </code>
      </pre>
      <dl aria-label="Formula legend" className="formula-legend">
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> theta
            <sub>k+1</sub>
          </dt>
          <dd>next parameter point, in parameter units</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> theta
            <sub>k</sub>
          </dt>
          <dd>current parameter point, in parameter units</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> eta
          </dt>
          <dd>learning rate, in parameter units per loss-gradient unit</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> nabla L
          </dt>
          <dd>local loss gradient, in loss units per parameter unit</dd>
        </div>
      </dl>
      <p>
        Substitute first step: ({formatNumber(first.point[0])}, {formatNumber(first.point[1])}) -{" "}
        {formatNumber(state.learningRate)}({formatNumber(first.gradient[0])},{" "}
        {formatNumber(first.gradient[1])}) = ({formatNumber(next.point[0])},{" "}
        {formatNumber(next.point[1])}) parameter units.
      </p>
      <p>
        Result after {model.stepCount} step{model.stepCount === 1 ? "" : "s"}: loss ={" "}
        {formatNumber(model.finalSample.value)} loss units and |gradient| ={" "}
        {formatNumber(gradientMagnitude(model.finalSample))} loss units per parameter unit.
      </p>
      <p className="formula-note">
        The rule applies because gradient descent moves opposite the local direction of steepest
        increase; the learning rate decides how far that opposite step goes.
      </p>
    </section>
  );
};

export const GradientDescentLandscapeSim = () => {
  const [state, setState] = useState<GradientDescentState>(defaultGradientDescentState);
  const model = useMemo(() => buildGradientDescentModel(state), [state]);
  const landscape = landscapes[state.landscape];

  return (
    <PredictionGate
      packageId={gradientDescentPackageId}
      predict={gradientDescentPredict}
      simId={gradientDescentSimId}
    >
      <section aria-label="Gradient descent landscape explorer" className="vector-lab vector-lab--product">
        <div className="vector-controls vector-controls--product" aria-label="Descent controls">
          <p className="lab-kicker">Manipulate the trace</p>
          <ControlGroup legend="Landscape and starting point">
            <Selector
              label="Loss landscape"
              onChange={(value) => setState((current) => ({ ...current, landscape: value }))}
              options={landscapeOptions}
              value={state.landscape}
            />
            <Slider
              label="Start x"
              max={4}
              min={-4}
              onChange={(value) => setState((current) => ({ ...current, startX: value }))}
              step={0.2}
              unit="parameter units"
              value={state.startX}
            />
            <Slider
              label="Start y"
              max={4}
              min={-4}
              onChange={(value) => setState((current) => ({ ...current, startY: value }))}
              step={0.2}
              unit="parameter units"
              value={state.startY}
            />
          </ControlGroup>
          <ControlGroup legend="Step controls">
            <Slider
              label="Learning rate"
              max={0.75}
              min={0.05}
              onChange={(value) => setState((current) => ({ ...current, learningRate: value }))}
              step={0.01}
              value={state.learningRate}
            />
            <Slider
              label="Maximum steps"
              max={40}
              min={4}
              onChange={(value) =>
                setState((current) => ({ ...current, maxSteps: Math.round(value) }))
              }
              step={1}
              unit="steps"
              value={state.maxSteps}
            />
          </ControlGroup>
          <div className="preset-strip" aria-label="Scenario presets">
            <button onClick={() => setState(defaultGradientDescentState)} type="button">
              ravine baseline
            </button>
            <button
              onClick={() =>
                setState({
                  landscape: "ravine",
                  startX: -3,
                  startY: -2.4,
                  learningRate: 0.55,
                  maxSteps: 16,
                })
              }
              type="button"
            >
              overshoot
            </button>
            <button
              onClick={() =>
                setState({
                  landscape: "bowl",
                  startX: 3.2,
                  startY: 2.4,
                  learningRate: 0.18,
                  maxSteps: 28,
                })
              }
              type="button"
            >
              steady bowl
            </button>
          </div>
        </div>

        {model.ok ? (
          <>
            <LandscapePlot landscape={landscape} model={model.value} />
            <dl aria-label="Observation unlocked" className="result-readout result-readout--cards">
              <div>
                <dt>Final point</dt>
                <dd>
                  ({formatNumber(model.value.finalSample.point[0])},{" "}
                  {formatNumber(model.value.finalSample.point[1])}) parameter units
                </dd>
              </div>
              <div>
                <dt>Final loss</dt>
                <dd>{formatNumber(model.value.finalSample.value)} loss units</dd>
              </div>
              <div>
                <dt>Trace state</dt>
                <dd>{model.value.interpretation}</dd>
              </div>
            </dl>
            <p className="formula-note">{landscape.note}</p>
            <FormulaPanel model={model.value} state={state} />
          </>
        ) : (
          <p role="alert">The current descent setup cannot be evaluated: {model.error.message}</p>
        )}
      </section>
    </PredictionGate>
  );
};

export default GradientDescentLandscapeSim;
