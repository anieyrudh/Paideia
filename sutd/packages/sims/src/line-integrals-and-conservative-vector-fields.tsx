import type { TSimulationSpec } from "@paideia/content-schema";
import { type ConceptPackageId, ok, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";
import {
  lineIntegral2D,
  sampleVectorField2D,
  type Point2,
  type Vector2,
} from "@paideia/vector-calculus";

type FieldKind = "conservative" | "rotational";
type CurveKind = "direct" | "elbow";

type LineIntegralState = {
  readonly fieldKind: FieldKind;
  readonly curveKind: CurveKind;
  readonly endX: number;
  readonly endY: number;
  readonly bend: number;
  readonly steps: number;
};

type LineIntegralEvidence = {
  readonly work: number;
  readonly potentialChange: number;
  readonly pathGap: number;
  readonly start: Point2;
  readonly end: Point2;
  readonly samples: readonly Point2[];
  readonly vectors: readonly { readonly point: Point2; readonly vector: Vector2 }[];
  readonly fieldLabel: string;
  readonly curveLabel: string;
  readonly conservative: boolean;
};

export const lineIntegralsAndConservativeVectorFieldsPackageId =
  "sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/line-integrals-and-conservative-vector-fields" as ConceptPackageId;

export const lineIntegralsAndConservativeVectorFieldsSpec: TSimulationSpec = {
  id: "line-integrals-and-conservative-vector-fields",
  title: "Line Integrals and Conservative Vector Fields",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/vector-calculus",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "field-kind",
        label: "Vector field",
        kind: "selector",
        kernel_binding: "state.fieldKind",
      },
      {
        id: "curve-kind",
        label: "Path shape",
        kind: "selector",
        kernel_binding: "state.curveKind",
      },
      {
        id: "end-x",
        label: "Endpoint x",
        kind: "slider",
        kernel_binding: "state.endX",
        bounds: { min: -2, max: 2, step: 0.25 },
      },
      {
        id: "end-y",
        label: "Endpoint y",
        kind: "slider",
        kernel_binding: "state.endY",
        bounds: { min: -2, max: 2, step: 0.25 },
      },
    ],
  },
  predict: {
    prompt:
      "For F = grad(0.5x^2 + y) from (0,0) to (2,1), what happens if the path changes from direct to an elbow?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The work stays the same because the field is conservative",
        "The work doubles because the elbow is longer",
        "The work becomes zero because the start point is the origin",
        "The work depends only on the number of sample steps",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "line-integrals-readout",
        module: "@paideia/sutd-sims/line-integrals-and-conservative-vector-fields",
        symbol: "LineIntegralsAndConservativeVectorFields",
        props_binding:
          "Show the vector field, chosen path, work integral, potential comparison, and path-dependence verdict after prediction.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why a conservative field makes line-integral work path independent, and why circulation fields break that shortcut.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Longer path always means larger line integral",
      "Every vector field has a potential function",
    ],
  },
};

const defaults: LineIntegralState = {
  fieldKind: "conservative",
  curveKind: "direct",
  endX: 2,
  endY: 1,
  bend: 1,
  steps: 96,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const fmt = (value: number): string => {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

const currentState = (state: Partial<LineIntegralState>): LineIntegralState => ({
  fieldKind: state.fieldKind === "rotational" ? "rotational" : "conservative",
  curveKind: state.curveKind === "elbow" ? "elbow" : "direct",
  endX: clamp(state.endX ?? defaults.endX, -2, 2),
  endY: clamp(state.endY ?? defaults.endY, -2, 2),
  bend: clamp(state.bend ?? defaults.bend, -2, 2),
  steps: Math.round(clamp(state.steps ?? defaults.steps, 24, 160)),
});

const vectorField = (kind: FieldKind) =>
  kind === "conservative"
    ? (x: number, _y: number): Vector2 => [x, 1]
    : (x: number, y: number): Vector2 => [-y, x];

const potential = (kind: FieldKind, [x, y]: Point2): number =>
  kind === "conservative" ? 0.5 * x * x + y : Number.NaN;

const curvePoint = (state: LineIntegralState, t: number): Point2 => {
  const end: Point2 = [state.endX, state.endY];
  if (state.curveKind === "direct") {
    return [end[0] * t, end[1] * t];
  }
  if (t <= 0.5) {
    return [end[0] * (t / 0.5), state.bend * (t / 0.5)];
  }
  const u = (t - 0.5) / 0.5;
  return [end[0], state.bend + (end[1] - state.bend) * u];
};

const pathSample = (state: LineIntegralState): readonly Point2[] =>
  Array.from({ length: 25 }, (_, index) => curvePoint(state, index / 24));

export const lineIntegralEvidence = (
  state: LineIntegralState,
): KernelResult<LineIntegralEvidence> => {
  const start: Point2 = [0, 0];
  const end: Point2 = [state.endX, state.endY];
  const integral = lineIntegral2D(
    vectorField(state.fieldKind),
    (t) => curvePoint(state, t),
    { min: 0, max: 1 },
    { steps: state.steps },
  );
  if (!integral.ok) return integral;
  const potentialChange =
    state.fieldKind === "conservative"
      ? potential(state.fieldKind, end) - potential(state.fieldKind, start)
      : Number.NaN;
  const pathGap =
    state.fieldKind === "conservative" ? integral.value.value - potentialChange : Number.NaN;
  const vectors = sampleVectorField2D(
    vectorField(state.fieldKind),
    { x: { min: -2, max: 2 }, y: { min: -2, max: 2 } },
    { nx: 5, ny: 5 },
  );
  if (!vectors.ok) return vectors;
  return ok({
    work: integral.value.value,
    potentialChange,
    pathGap,
    start,
    end,
    samples: pathSample(state),
    vectors: vectors.value.map((sample) => ({ point: sample.point, vector: sample.vector })),
    fieldLabel:
      state.fieldKind === "conservative"
        ? "Conservative field F = <x, 1>"
        : "Rotational field F = <-y, x>",
    curveLabel: state.curveKind === "direct" ? "Direct straight path" : "Two-leg elbow path",
    conservative: state.fieldKind === "conservative",
  });
};

const project = ([x, y]: Point2): { readonly x: number; readonly y: number } => ({
  x: 50 + ((x + 2) / 4) * 260,
  y: 290 - ((y + 2) / 4) * 260,
});

const PathDiagram = ({ evidence }: { readonly evidence: LineIntegralEvidence }) => {
  const points = evidence.samples.map(project);
  const path = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <svg viewBox="0 0 360 340" role="img" aria-label="Field and selected path diagram">
      <rect x="30" y="20" width="300" height="300" fill="#f8fafc" stroke="#94a3b8" />
      <line x1="50" y1="160" x2="310" y2="160" stroke="#cbd5e1" />
      <line x1="180" y1="30" x2="180" y2="290" stroke="#cbd5e1" />
      {evidence.vectors.map((sample) => {
        const p = project(sample.point);
        const scale = 11 / Math.max(1, Math.hypot(sample.vector[0], sample.vector[1]));
        const dx = sample.vector[0] * scale;
        const dy = -sample.vector[1] * scale;
        return (
          <g key={`${sample.point[0]}-${sample.point[1]}`}>
            <line x1={p.x} y1={p.y} x2={p.x + dx} y2={p.y + dy} stroke="#475569" strokeWidth="1.5" />
            <circle cx={p.x + dx} cy={p.y + dy} r="2" fill="#475569" />
          </g>
        );
      })}
      <polyline points={path} fill="none" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
      <circle cx={project(evidence.start).x} cy={project(evidence.start).y} r="5" fill="#0f766e" />
      <circle cx={project(evidence.end).x} cy={project(evidence.end).y} r="5" fill="#7c2d12" />
      <text x="52" y="326" fontSize="12" fill="#334155">
        start (0,0); endpoint ({fmt(evidence.end[0])},{fmt(evidence.end[1])})
      </text>
    </svg>
  );
};

const FormulaReadout = ({ evidence }: { readonly evidence: LineIntegralEvidence }) => (
  <section aria-label="Formula panel">
    <h4>Formula</h4>
    <p aria-label="LaTeX formula source">{"W=\\int_C \\mathbf{F}\\cdot d\\mathbf{r}"}</p>
    <dl aria-label="Formula legend">
      <dt>F</dt>
      <dd>vector field sampled along the path</dd>
      <dt>C</dt>
      <dd>parameterised path from start to endpoint</dd>
      <dt>d r</dt>
      <dd>small displacement tangent to the path</dd>
    </dl>
    <p>
      Substitution: {evidence.curveLabel}; {evidence.fieldLabel}; W = {fmt(evidence.work)}
      {evidence.conservative ? `, Delta phi = ${fmt(evidence.potentialChange)}` : ", no single potential function"}
    </p>
    <p>Units: work units.</p>
    <p>
      {evidence.conservative
        ? "Interpretation: matching potential change is the path-independence certificate."
        : "Interpretation: the integral records route-dependent turning around the origin."}
    </p>
  </section>
);

const Observation = ({ evidence }: { readonly evidence: LineIntegralEvidence }) => (
  <section role="region" aria-label="Observation unlocked" className="paideia-sim__panel">
    <h3>Line-integral evidence</h3>
    <div className="paideia-sim__grid">
      <PathDiagram evidence={evidence} />
      <div>
        <p>
          {evidence.fieldLabel}; {evidence.curveLabel}
        </p>
        <dl>
          <dt>Work integral</dt>
          <dd>{fmt(evidence.work)} work units</dd>
          <dt>Potential change</dt>
          <dd>{evidence.conservative ? `${fmt(evidence.potentialChange)} potential units` : "no global potential"}</dd>
          <dt>Path test</dt>
          <dd>
            {evidence.conservative
              ? `work - potential change = ${fmt(evidence.pathGap)}`
              : "work depends on the route because the field circulates"}
          </dd>
        </dl>
        <FormulaReadout evidence={evidence} />
      </div>
    </div>
  </section>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state: rawState, set } = useManipulate<LineIntegralState>();
  const state = currentState(rawState);
  return (
    <section aria-label="Path controls" className="sutd-sim-panel">
      <ControlGroup legend="Manipulate the field and path">
        <Selector
          label="Vector field"
          value={state.fieldKind}
          onChange={(fieldKind) => set("fieldKind", fieldKind)}
          options={[
            { value: "conservative", label: "Conservative gradient field" },
            { value: "rotational", label: "Rotational circulation field" },
          ] satisfies readonly { readonly value: FieldKind; readonly label: string }[]}
        />
        <Selector
          label="Path shape"
          value={state.curveKind}
          onChange={(curveKind) => set("curveKind", curveKind)}
          options={[
            { value: "direct", label: "Direct straight path" },
            { value: "elbow", label: "Two-leg elbow path" },
          ] satisfies readonly { readonly value: CurveKind; readonly label: string }[]}
        />
        <Slider label="Endpoint x" min={-2} max={2} step={0.25} value={state.endX} onChange={(endX) => set("endX", endX)} />
        <Slider label="Endpoint y" min={-2} max={2} step={0.25} value={state.endY} onChange={(endY) => set("endY", endY)} />
        <Slider label="Elbow height" min={-2} max={2} step={0.25} value={state.bend} onChange={(bend) => set("bend", bend)} />
      </ControlGroup>
      <PathPreview state={state} />
      <button type="button" onClick={() => stage.advance()}>
        Reveal line-integral evidence
      </button>
    </section>
  );
};

const PathPreview = ({ state }: { readonly state: LineIntegralState }) => {
  const evidence = lineIntegralEvidence(state);
  if (!evidence.ok) return <p role="alert">{evidence.error.message}</p>;
  return (
    <section className="sutd-formula-card" aria-label="Path preview">
      <h2>Path and field preview</h2>
      <PathDiagram evidence={evidence.value} />
      <p>Prediction stays hidden until the evidence reveal is committed.</p>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<LineIntegralState>>());
  const evidence = lineIntegralEvidence(state);
  if (!evidence.ok) {
    return <p role="alert">{evidence.error.message}</p>;
  }
  return (
    <>
      <Observation evidence={evidence.value} />
      <button type="button" onClick={() => stage.advance()}>
        Explain endpoint shortcut
      </button>
    </>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" className="sutd-formula-card">
      <h2>Transfer the conservative-field test</h2>
      <p>
        Before using endpoint potential change in a robot work-budget problem, identify whether the
        field is a gradient field. If not, keep the route integral.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another route
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
    <section aria-label="Prediction setup" className="sutd-formula-card">
      <h1>Line Integrals and Conservative Vector Fields</h1>
      <p>Predict when path shape matters before checking the work integral.</p>
      <button type="button" onClick={() => stage.advance()}>
        Set up path-independence check
      </button>
    </section>
  );
};

export const LineIntegralsAndConservativeVectorFields = () => (
  <SimRuntime packageId={lineIntegralsAndConservativeVectorFieldsPackageId} spec={lineIntegralsAndConservativeVectorFieldsSpec}>
    <StageSurface />
  </SimRuntime>
);

export default LineIntegralsAndConservativeVectorFields;
