import type { TSimulationSpec } from "@paideia/content-schema";
import {
  directionalDerivative2D,
  point2,
  quadraticSurfaceAt2D,
  quadraticSurfaceCoefficients2D,
  type Gradient2D,
  type QuadraticSurfaceFamily2D,
} from "@paideia/vector-calculus";
import { type ConceptPackageId, ok, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";
import type { CSSProperties } from "react";

type SurfaceKind = QuadraticSurfaceFamily2D;

type GradientState = {
  readonly surfaceKind: SurfaceKind;
  readonly x: number;
  readonly y: number;
  readonly directionDegrees: number;
  readonly xCurvature: number;
  readonly yCurvature: number;
  readonly coupling: number;
};

type GradientEvidence = {
  readonly state: GradientState;
  readonly gradient: Gradient2D;
  readonly z0: number;
  readonly directionalDerivative: number;
  readonly unitDirection: readonly [number, number];
  readonly tangentPlaneAtStep: number;
  readonly contourClassification: "uphill" | "downhill" | "level";
};

export const partialDerivativesAndGradientPackageId =
  "sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/partial-derivatives-and-gradient" as ConceptPackageId;

export const partialDerivativesAndGradientSpec: TSimulationSpec = {
  id: "partial-derivatives-and-gradient",
  title: "Partial Derivatives and Gradient Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/vector-calculus",
    "core/plotting",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "surface-kind",
        label: "Surface",
        kind: "selector",
        kernel_binding: "state.surfaceKind",
      },
      {
        id: "point-x",
        label: "Point x",
        kind: "slider",
        kernel_binding: "state.x",
        bounds: { min: -2, max: 2, step: 0.1 },
      },
      {
        id: "point-y",
        label: "Point y",
        kind: "slider",
        kernel_binding: "state.y",
        bounds: { min: -2, max: 2, step: 0.1 },
      },
      {
        id: "direction-degrees",
        label: "Test direction angle",
        kind: "slider",
        kernel_binding: "state.directionDegrees",
        bounds: { min: 0, max: 360, step: 5 },
      },
      {
        id: "x-curvature",
        label: "x curvature",
        kind: "slider",
        kernel_binding: "state.xCurvature",
        bounds: { min: -2.5, max: 2.5, step: 0.1 },
      },
      {
        id: "y-curvature",
        label: "y curvature",
        kind: "slider",
        kernel_binding: "state.yCurvature",
        bounds: { min: -2.5, max: 2.5, step: 0.1 },
      },
      {
        id: "xy-coupling",
        label: "xy coupling",
        kind: "slider",
        kernel_binding: "state.coupling",
        bounds: { min: -1.5, max: 1.5, step: 0.05 },
      },
    ],
  },
  predict: {
    prompt:
      "On a contour plot, which direction does the gradient vector point at the selected point?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Perpendicular to the contour, toward fastest increase",
        "Along the contour, because the contour is the visible line",
        "Always toward the positive x-axis",
        "Always toward the origin",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "partial-derivatives-gradient-renderer",
        module: "@paideia/sutd-sims/partial-derivatives-and-gradient",
        symbol: "PartialDerivativesAndGradient",
        props_binding:
          "Show a contour map with selected point, partial derivative readouts, gradient vector, directional derivative projection, tangent-plane formula, symbol legend, substitutions, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why the gradient is perpendicular to the level curve and how its components are the two partial derivatives.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "The gradient points along a contour",
      "Partial derivatives describe total change in every direction",
    ],
  },
};

const defaults: GradientState = {
  surfaceKind: "bowl",
  x: 1,
  y: 0.6,
  directionDegrees: 30,
  xCurvature: 1.2,
  yCurvature: 0.8,
  coupling: 0.35,
};

const surfaceOptions: readonly { readonly label: string; readonly value: SurfaceKind }[] = [
  { label: "Bowl", value: "bowl" },
  { label: "Saddle", value: "saddle" },
  { label: "Tilted valley", value: "tilted-valley" },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<GradientState>): GradientState => ({
  surfaceKind: state.surfaceKind ?? defaults.surfaceKind,
  x: clamp(state.x ?? defaults.x, -2, 2),
  y: clamp(state.y ?? defaults.y, -2, 2),
  directionDegrees: clamp(state.directionDegrees ?? defaults.directionDegrees, 0, 360),
  xCurvature: clamp(state.xCurvature ?? defaults.xCurvature, -2.5, 2.5),
  yCurvature: clamp(state.yCurvature ?? defaults.yCurvature, -2.5, 2.5),
  coupling: clamp(state.coupling ?? defaults.coupling, -1.5, 1.5),
});

export const gradientSurfaceEvidence = (
  partial: Partial<GradientState>,
): KernelResult<GradientEvidence> => {
  const state = currentState(partial);
  const point = point2(state.x, state.y);
  if (!point.ok) return point;
  const coefficients = quadraticSurfaceCoefficients2D({
    family: state.surfaceKind,
    xCurvature: state.xCurvature,
    xyCoupling: state.coupling,
    yCurvature: state.yCurvature,
  });
  if (!coefficients.ok) return coefficients;
  const surface = quadraticSurfaceAt2D({
    coefficients: coefficients.value,
    point: point.value,
  });
  if (!surface.ok) return surface;
  const radians = (state.directionDegrees * Math.PI) / 180;
  const derivative = directionalDerivative2D({
    direction: [Math.cos(radians), Math.sin(radians)],
    gradient: surface.value.gradient,
  });
  if (!derivative.ok) return derivative;
  const step = 0.4;
  const tangentPlaneAtStep =
    surface.value.value + step * derivative.value.value;
  const contourClassification =
    Math.abs(derivative.value.value) < 0.05
      ? "level"
      : derivative.value.value > 0
        ? "uphill"
        : "downhill";
  return ok({
    state,
    gradient: surface.value.gradient,
    z0: surface.value.value,
    directionalDerivative: derivative.value.value,
    unitDirection: derivative.value.unitDirection,
    tangentPlaneAtStep,
    contourClassification,
  });
};

const fmt = (value: number, digits = 2): string => {
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

const surfaceStyle = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
} satisfies CSSProperties;

const panelStyle = {
  border: "1px solid #d6dde8",
  borderRadius: "8px",
  padding: "1rem",
  background: "#fff",
} satisfies CSSProperties;

const metricGridStyle = {
  display: "grid",
  gap: "0.75rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
} satisfies CSSProperties;

const Metric = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div style={{ ...panelStyle, padding: "0.75rem" }}>
    <div style={{ color: "#526173", fontSize: "0.85rem" }}>{label}</div>
    <strong>{value}</strong>
  </div>
);

const toSvg = (x: number, y: number): readonly [number, number] => [
  180 + x * 55,
  180 - y * 55,
];

const GradientContourPlot = ({ evidence }: { readonly evidence: GradientEvidence }) => {
  const [px, py] = toSvg(evidence.state.x, evidence.state.y);
  const scale = 34 / Math.max(1, evidence.gradient.magnitude);
  const [gx, gy] = evidence.gradient.value;
  const [dx, dy] = evidence.unitDirection;
  const gradientTip = [px + gx * scale, py - gy * scale] as const;
  const directionTip = [px + dx * 58, py - dy * 58] as const;
  const contours = [-1.5, -0.75, 0, 0.75, 1.5];
  return (
    <svg aria-label="Contour map with gradient vector" role="img" viewBox="0 0 360 360">
      <rect fill="#f8fafc" height="360" width="360" />
      {[-2, -1, 0, 1, 2].map((tick) => {
        const [x1, y1] = toSvg(-2.5, tick);
        const [x2, y2] = toSvg(2.5, tick);
        const [x3, y3] = toSvg(tick, -2.5);
        const [x4, y4] = toSvg(tick, 2.5);
        return (
          <g key={tick} stroke="#d9e2ef" strokeWidth="1">
            <line x1={x1} x2={x2} y1={y1} y2={y2} />
            <line x1={x3} x2={x4} y1={y3} y2={y4} />
          </g>
        );
      })}
      {contours.map((level, index) => {
        const radius = 42 + index * 28;
        const skew = evidence.state.surfaceKind === "saddle" ? 0.55 : 1;
        return (
          <ellipse
            cx="180"
            cy="180"
            fill="none"
            key={level}
            rx={radius}
            ry={radius * skew}
            stroke={level < 0 ? "#60a5fa" : "#f59e0b"}
            strokeDasharray={evidence.state.surfaceKind === "saddle" ? "8 6" : undefined}
            strokeWidth="2"
            transform={`rotate(${evidence.state.coupling * 18} 180 180)`}
          />
        );
      })}
      <line stroke="#0f766e" strokeWidth="4" x1={px} x2={gradientTip[0]} y1={py} y2={gradientTip[1]} />
      <polygon
        fill="#0f766e"
        points={`${gradientTip[0]},${gradientTip[1]} ${gradientTip[0] - 7},${gradientTip[1] + 10} ${gradientTip[0] + 7},${gradientTip[1] + 10}`}
      />
      <line
        stroke="#7c3aed"
        strokeDasharray="6 5"
        strokeWidth="3"
        x1={px}
        x2={directionTip[0]}
        y1={py}
        y2={directionTip[1]}
      />
      <circle cx={px} cy={py} fill="#111827" r="6" />
      <text fill="#0f766e" fontSize="14" x={gradientTip[0] + 6} y={gradientTip[1] - 6}>
        gradient
      </text>
      <text fill="#7c3aed" fontSize="14" x={directionTip[0] + 6} y={directionTip[1]}>
        direction u
      </text>
    </svg>
  );
};

const FormulaPanel = ({ evidence }: { readonly evidence: GradientEvidence }) => {
  const [gx, gy] = evidence.gradient.value;
  const [ux, uy] = evidence.unitDirection;
  return (
    <section aria-label="Formula panel" role="region" style={panelStyle}>
      <h3>Formula panel</h3>
      <p>
        <strong>Gradient:</strong>{" "}
        <code>{String.raw`\nabla f(x,y)=\langle f_x(x,y), f_y(x,y)\rangle`}</code>
      </p>
      <p>
        <strong>Legend:</strong> <span style={{ color: "#0f766e" }}>green vector</span> is the
        gradient, <span style={{ color: "#7c3aed" }}>purple vector</span> is the test direction,
        and contour lines hold constant height.
      </p>
      <p>
        <strong>Substitution:</strong> at ({fmt(evidence.state.x)}, {fmt(evidence.state.y)}),
        <code>{String.raw` f_x=`}{fmt(gx)}</code> height units per x-unit and{" "}
        <code>{String.raw`f_y=`}{fmt(gy)}</code> height units per y-unit, so{" "}
        <code>{String.raw`\nabla f=\langle `}{fmt(gx)}, {fmt(gy)}
        {String.raw`\rangle`}</code>.
      </p>
      <p>
        <strong>Directional derivative:</strong>{" "}
        <code>{String.raw`D_{\mathbf u}f=\nabla f\cdot\mathbf u`}</code> =
        ({fmt(gx)})({fmt(ux)}) + ({fmt(gy)})({fmt(uy)}) =
        {fmt(evidence.directionalDerivative)} height units per step.
      </p>
      <p>
        <strong>Tangent plane:</strong>{" "}
        <code>{String.raw`z\approx f(x_0,y_0)+f_x\Delta x+f_y\Delta y`}</code>.
        For a 0.4-unit move in the test direction, the tangent estimate is{" "}
        {fmt(evidence.tangentPlaneAtStep)} height units.
      </p>
      <p>
        <strong>Interpretation:</strong> the gradient crosses contours rather than following them;
        this test direction is {evidence.contourClassification}.
      </p>
    </section>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<GradientState>();
  const current = currentState(state);
  return (
    <section aria-label="Surface controls" role="region" style={surfaceStyle}>
      <div style={panelStyle}>
        <h2>Set the point before reveal</h2>
        <p>
          Move the point and test direction on the surface. The gradient evidence stays hidden
          until you commit the prediction.
        </p>
        <ControlGroup legend="Surface and point">
          <Selector
            label="Surface"
            onChange={(value) => set("surfaceKind", value)}
            options={surfaceOptions}
            value={current.surfaceKind}
          />
          <Slider label="Point x" max={2} min={-2} onChange={(value) => set("x", value)} step={0.1} value={current.x} />
          <Slider label="Point y" max={2} min={-2} onChange={(value) => set("y", value)} step={0.1} value={current.y} />
          <Slider
            label="Test direction angle"
            max={360}
            min={0}
            onChange={(value) => set("directionDegrees", value)}
            step={5}
            unit="degrees"
            value={current.directionDegrees}
          />
          <Slider
            label="x curvature"
            max={2.5}
            min={-2.5}
            onChange={(value) => set("xCurvature", value)}
            step={0.1}
            value={current.xCurvature}
          />
          <Slider
            label="y curvature"
            max={2.5}
            min={-2.5}
            onChange={(value) => set("yCurvature", value)}
            step={0.1}
            value={current.yCurvature}
          />
          <Slider
            label="xy coupling"
            max={1.5}
            min={-1.5}
            onChange={(value) => set("coupling", value)}
            step={0.05}
            value={current.coupling}
          />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal gradient evidence
        </button>
      </div>
      <div style={panelStyle}>
        <h3>Prediction focus</h3>
        <p>
          If the point lies on a contour, the gradient should cross that contour toward higher
          values. A direction tangent to the contour should have a directional derivative near
          zero.
        </p>
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = gradientSurfaceEvidence(useSimState<Partial<GradientState>>());
  if (!evidence.ok) {
    return <p role="alert">The selected surface cannot be evaluated at this point.</p>;
  }
  const value = evidence.value;
  const [gx, gy] = value.gradient.value;
  return (
    <section aria-label="Observation unlocked" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Gradient evidence</h2>
      <div style={metricGridStyle}>
        <Metric label="Partial derivative f_x" value={`${fmt(gx)} height/x-unit`} />
        <Metric label="Partial derivative f_y" value={`${fmt(gy)} height/y-unit`} />
        <Metric label="Gradient magnitude" value={fmt(value.gradient.magnitude)} />
        <Metric label="Direction verdict" value={value.contourClassification} />
      </div>
      <section aria-label="Contour visual model" style={panelStyle}>
        <h3>Contour map and vectors</h3>
        <GradientContourPlot evidence={value} />
      </section>
      <FormulaPanel evidence={value} />
      <button type="button" onClick={() => stage.advance()}>
        Explain and transfer
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Explain before transfer</h2>
      <p>
        Explain why moving along a contour gives no first-order height change, while moving in the
        gradient direction gives the greatest first-order increase.
      </p>
      <p>
        Transfer challenge: for a temperature surface on a plate, use the gradient to decide where
        heat rises fastest from a measured point.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another surface
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
    <section aria-label="Prediction setup" role="region" style={surfaceStyle}>
      <div style={panelStyle}>
        <h2>Predict the gradient direction</h2>
        <p>
          Use the contour idea first: the gradient should cross contours toward faster increase,
          not slide along one contour.
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Set point and direction
        </button>
      </div>
    </section>
  );
};

export default function PartialDerivativesAndGradient() {
  return (
    <SimRuntime spec={partialDerivativesAndGradientSpec} packageId={partialDerivativesAndGradientPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
