import type { TSimulationSpec } from "@paideia/content-schema";
import { optimizationTolerance } from "@paideia/optimization";
import { type ConceptPackageId, err, ok, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";
import type { CSSProperties } from "react";

type LagrangeState = {
  readonly angleDegrees: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly linearX: number;
  readonly linearY: number;
  readonly curvature: number;
};

type LagrangeEvidence = {
  readonly state: LagrangeState;
  readonly point: readonly [number, number];
  readonly objectiveValue: number;
  readonly constraintValue: number;
  readonly objectiveGradient: readonly [number, number];
  readonly constraintGradient: readonly [number, number];
  readonly lambda: number;
  readonly residual: number;
  readonly tangentDerivative: number;
  readonly sensitivity: "x-resource" | "y-resource" | "balanced";
};

export const lagrangeMultipliersPackageId =
  "sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/optimisation-with-lagrange-multipliers" as ConceptPackageId;

export const lagrangeMultipliersSpec: TSimulationSpec = {
  id: "optimisation-with-lagrange-multipliers",
  title: "Lagrange Multipliers Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/optimization",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "angle-degrees",
        label: "Constraint point angle",
        kind: "slider",
        kernel_binding: "state.angleDegrees",
        bounds: { min: 0, max: 360, step: 5 },
      },
      {
        id: "radius-x",
        label: "x resource radius",
        kind: "slider",
        kernel_binding: "state.radiusX",
        bounds: { min: 1, max: 4, step: 0.1 },
      },
      {
        id: "radius-y",
        label: "y resource radius",
        kind: "slider",
        kernel_binding: "state.radiusY",
        bounds: { min: 1, max: 4, step: 0.1 },
      },
      {
        id: "linear-x",
        label: "x benefit",
        kind: "slider",
        kernel_binding: "state.linearX",
        bounds: { min: 0.5, max: 6, step: 0.1 },
      },
      {
        id: "linear-y",
        label: "y benefit",
        kind: "slider",
        kernel_binding: "state.linearY",
        bounds: { min: 0.5, max: 6, step: 0.1 },
      },
    ],
  },
  predict: {
    prompt:
      "At a constrained optimum, what relationship should hold between the objective gradient and the constraint gradient?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "They are parallel, so the objective has no first-order gain along the constraint",
        "They are perpendicular, so the objective crosses the constraint",
        "The objective gradient must be zero everywhere on the constraint",
        "The multiplier is the optimum value of the objective",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "lagrange-multipliers-renderer",
        module: "@paideia/sutd-sims/optimisation-with-lagrange-multipliers",
        symbol: "OptimisationWithLagrangeMultipliers",
        props_binding:
          "Show constraint ellipse, selected feasible point, objective and constraint gradients, lambda estimate, tangent derivative residual, formula legend, substitutions, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why parallel gradients mean every feasible first-order move has zero objective gain at the optimum.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "The multiplier is the answer rather than a sensitivity",
      "The gradients should be perpendicular at an optimum",
    ],
  },
};

const defaults: LagrangeState = {
  angleDegrees: 40,
  radiusX: 3,
  radiusY: 2,
  linearX: 4,
  linearY: 3,
  curvature: 0.45,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<LagrangeState>): LagrangeState => ({
  angleDegrees: clamp(state.angleDegrees ?? defaults.angleDegrees, 0, 360),
  radiusX: clamp(state.radiusX ?? defaults.radiusX, 1, 4),
  radiusY: clamp(state.radiusY ?? defaults.radiusY, 1, 4),
  linearX: clamp(state.linearX ?? defaults.linearX, 0.5, 6),
  linearY: clamp(state.linearY ?? defaults.linearY, 0.5, 6),
  curvature: clamp(state.curvature ?? defaults.curvature, 0.1, 1.2),
});

const dot = (left: readonly [number, number], right: readonly [number, number]): number =>
  left[0] * right[0] + left[1] * right[1];

const norm = (vector: readonly [number, number]): number => Math.hypot(vector[0], vector[1]);

const objective = (state: LagrangeState, x: number, y: number): number =>
  state.linearX * x +
  state.linearY * y -
  0.5 * state.curvature * (x * x + y * y);

export const lagrangeEvidence = (
  partial: Partial<LagrangeState>,
): KernelResult<LagrangeEvidence> => {
  const state = currentState(partial);
  const theta = (state.angleDegrees * Math.PI) / 180;
  const point = [state.radiusX * Math.cos(theta), state.radiusY * Math.sin(theta)] as const;
  const objectiveGradient = [
    state.linearX - state.curvature * point[0],
    state.linearY - state.curvature * point[1],
  ] as const;
  const constraintGradient = [
    (2 * point[0]) / (state.radiusX * state.radiusX),
    (2 * point[1]) / (state.radiusY * state.radiusY),
  ] as const;
  const constraintNormSquared = dot(constraintGradient, constraintGradient);
  if (constraintNormSquared <= optimizationTolerance.tight) {
    return err("numerical-instability", "constraint gradient is too small for lambda estimate");
  }
  const lambda = dot(objectiveGradient, constraintGradient) / constraintNormSquared;
  const residualVector = [
    objectiveGradient[0] - lambda * constraintGradient[0],
    objectiveGradient[1] - lambda * constraintGradient[1],
  ] as const;
  const residual = norm(residualVector);
  const tangent = [-constraintGradient[1], constraintGradient[0]] as const;
  const tangentNorm = norm(tangent);
  const unitTangent = [tangent[0] / tangentNorm, tangent[1] / tangentNorm] as const;
  const tangentDerivative = dot(objectiveGradient, unitTangent);
  const constraintValue =
    (point[0] * point[0]) / (state.radiusX * state.radiusX) +
    (point[1] * point[1]) / (state.radiusY * state.radiusY);
  const sensitivity =
    Math.abs(constraintGradient[0]) > Math.abs(constraintGradient[1]) + 0.1
      ? "x-resource"
      : Math.abs(constraintGradient[1]) > Math.abs(constraintGradient[0]) + 0.1
        ? "y-resource"
        : "balanced";
  return ok({
    state,
    point,
    objectiveValue: objective(state, point[0], point[1]),
    constraintValue,
    objectiveGradient,
    constraintGradient,
    lambda,
    residual,
    tangentDerivative,
    sensitivity,
  });
};

const fmt = (value: number, digits = 2): string => {
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

const panelStyle = {
  border: "1px solid #d6dde8",
  borderRadius: "8px",
  padding: "1rem",
  background: "#fff",
} satisfies CSSProperties;

const surfaceStyle = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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

const toSvg = (state: LagrangeState, x: number, y: number): readonly [number, number] => [
  180 + (x / state.radiusX) * 110,
  180 - (y / state.radiusY) * 110,
];

const ConstraintPlot = ({ evidence }: { readonly evidence: LagrangeEvidence }) => {
  const { state, point, objectiveGradient, constraintGradient } = evidence;
  const [px, py] = toSvg(state, point[0], point[1]);
  const scale = 36 / Math.max(1, norm(objectiveGradient), norm(constraintGradient));
  const objTip = [px + objectiveGradient[0] * scale, py - objectiveGradient[1] * scale] as const;
  const conTip = [px + constraintGradient[0] * scale * 2.4, py - constraintGradient[1] * scale * 2.4] as const;
  return (
    <svg aria-label="Constraint ellipse with gradient vectors" role="img" viewBox="0 0 360 360">
      <rect fill="#f8fafc" height="360" width="360" />
      <ellipse cx="180" cy="180" fill="#ecfeff" rx="110" ry="110" stroke="#0891b2" strokeWidth="4" />
      {[-1, 0, 1].map((tick) => (
        <g key={tick} stroke="#d9e2ef" strokeWidth="1">
          <line x1={70} x2={290} y1={180 + tick * 55} y2={180 + tick * 55} />
          <line x1={180 + tick * 55} x2={180 + tick * 55} y1={70} y2={290} />
        </g>
      ))}
      <circle cx={px} cy={py} fill="#111827" r="6" />
      <line stroke="#7c3aed" strokeWidth="4" x1={px} x2={objTip[0]} y1={py} y2={objTip[1]} />
      <line stroke="#0f766e" strokeDasharray="6 5" strokeWidth="4" x1={px} x2={conTip[0]} y1={py} y2={conTip[1]} />
      <text fill="#7c3aed" fontSize="14" x={objTip[0] + 5} y={objTip[1]}>objective gradient</text>
      <text fill="#0f766e" fontSize="14" x={conTip[0] + 5} y={conTip[1]}>constraint gradient</text>
    </svg>
  );
};

const FormulaPanel = ({ evidence }: { readonly evidence: LagrangeEvidence }) => (
  <section aria-label="Formula panel" role="region" style={panelStyle}>
    <h3>Formula panel</h3>
    <p>
      <strong>Condition:</strong>{" "}
      <code>{String.raw`\nabla f(x,y)=\lambda\nabla g(x,y)`}</code>, with{" "}
      <code>{String.raw`g(x,y)=x^2/a^2+y^2/b^2=1`}</code>.
    </p>
    <p>
      <strong>Legend:</strong> <span style={{ color: "#7c3aed" }}>purple</span> is the objective
      gradient and <span style={{ color: "#0f766e" }}>green</span> is the constraint gradient.
    </p>
    <p>
      <strong>Substitution:</strong> at ({fmt(evidence.point[0])}, {fmt(evidence.point[1])}),{" "}
      <code>{String.raw`\nabla f=\langle `}{fmt(evidence.objectiveGradient[0])}, {fmt(evidence.objectiveGradient[1])}
      {String.raw`\rangle`}</code> benefit units per design unit and{" "}
      <code>{String.raw`\nabla g=\langle `}{fmt(evidence.constraintGradient[0])}, {fmt(evidence.constraintGradient[1])}
      {String.raw`\rangle`}</code> resource units per design unit.
    </p>
    <p>
      <strong>Result:</strong> <code>{String.raw`\lambda`}</code> = {fmt(evidence.lambda)} benefit
      units per resource unit, residual = {fmt(evidence.residual)}, and tangent derivative ={" "}
      {fmt(evidence.tangentDerivative)} benefit units per feasible step.
    </p>
    <p>
      <strong>Interpretation:</strong> a constrained optimum needs near-zero tangent derivative;
      the multiplier is a sensitivity, not the objective value.
    </p>
  </section>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<LagrangeState>();
  const current = currentState(state);
  return (
    <section aria-label="Constraint controls" role="region" style={surfaceStyle}>
      <div style={panelStyle}>
        <h2>Set a feasible design before reveal</h2>
        <p>
          Move the point around the resource ellipse and tune objective benefits. The reveal tests
          whether the selected point behaves like a constrained optimum.
        </p>
        <ControlGroup legend="Constrained design">
          <Slider label="Constraint point angle" max={360} min={0} onChange={(value) => set("angleDegrees", value)} step={5} unit="degrees" value={current.angleDegrees} />
          <Slider label="x resource radius" max={4} min={1} onChange={(value) => set("radiusX", value)} step={0.1} value={current.radiusX} />
          <Slider label="y resource radius" max={4} min={1} onChange={(value) => set("radiusY", value)} step={0.1} value={current.radiusY} />
          <Slider label="x benefit" max={6} min={0.5} onChange={(value) => set("linearX", value)} step={0.1} value={current.linearX} />
          <Slider label="y benefit" max={6} min={0.5} onChange={(value) => set("linearY", value)} step={0.1} value={current.linearY} />
          <Slider label="diminishing returns" max={1.2} min={0.1} onChange={(value) => set("curvature", value)} step={0.05} value={current.curvature} />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal multiplier evidence
        </button>
      </div>
      <div style={panelStyle}>
        <h3>Prediction focus</h3>
        <p>
          If moving along the constraint can still improve the objective, the gradients cannot be
          parallel yet. The multiplier measures objective sensitivity to relaxing the resource.
        </p>
      </div>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = lagrangeEvidence(useSimState<Partial<LagrangeState>>());
  if (!evidence.ok) return <p role="alert">The selected constrained design cannot be evaluated.</p>;
  const value = evidence.value;
  return (
    <section aria-label="Observation unlocked" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Multiplier evidence</h2>
      <div style={metricGridStyle}>
        <Metric label="Objective value" value={`${fmt(value.objectiveValue)} benefit units`} />
        <Metric label="Constraint value" value={fmt(value.constraintValue)} />
        <Metric label="Lambda estimate" value={fmt(value.lambda)} />
        <Metric label="Tangent derivative" value={fmt(value.tangentDerivative)} />
      </div>
      <section aria-label="Constraint visual model" style={panelStyle}>
        <h3>Constraint ellipse and gradients</h3>
        <ConstraintPlot evidence={value} />
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
        State whether the selected design is close to a constrained optimum by using the residual
        and tangent derivative. Then explain what the sign and size of lambda mean.
      </p>
      <p>
        Transfer challenge: optimize a packaging design under a fixed material budget by matching
        objective and constraint gradients.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another design
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
        <h2>Predict the constrained-optimum condition</h2>
        <p>
          Decide what must happen to the objective gradient when the only allowed moves stay on a
          constraint curve.
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Set constrained design
        </button>
      </div>
    </section>
  );
};

export default function OptimisationWithLagrangeMultipliers() {
  return (
    <SimRuntime spec={lagrangeMultipliersSpec} packageId={lagrangeMultipliersPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
