import type { TSimulationSpec } from "@paideia/content-schema";
import {
  determinant2,
  dot2,
  matrix2,
  norm2,
  trace2,
  vector2,
  type Matrix2,
} from "@paideia/linear-algebra";
import { type ConceptPackageId, err, ok, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type LinearTransformationState = {
  readonly a11: number;
  readonly a12: number;
  readonly a21: number;
  readonly a22: number;
};

type Classification =
  | "identity"
  | "rotation"
  | "reflection"
  | "uniform-scaling"
  | "anisotropic-scaling"
  | "horizontal-shear"
  | "vertical-shear"
  | "singular"
  | "composite";

type LinearTransformationEvidence = {
  readonly matrix: Matrix2;
  readonly trace: number;
  readonly det: number;
  readonly col1Length: number;
  readonly col2Length: number;
  readonly columnDot: number;
  readonly rotationAngleDegrees: number | null;
  readonly classification: Classification;
};

export const linearTransformationsPackageId =
  "sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/linear-transformations" as ConceptPackageId;

export const linearTransformationsSpec: TSimulationSpec = {
  id: "linear-transformations",
  title: "Linear Transformation Classifier",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/linear-algebra",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "a11",
        label: "Top-left entry a",
        kind: "slider",
        kernel_binding: "state.a11",
        bounds: { min: -3, max: 3, step: 0.5 },
      },
      {
        id: "a12",
        label: "Top-right entry b",
        kind: "slider",
        kernel_binding: "state.a12",
        bounds: { min: -3, max: 3, step: 0.5 },
      },
      {
        id: "a21",
        label: "Bottom-left entry c",
        kind: "slider",
        kernel_binding: "state.a21",
        bounds: { min: -3, max: 3, step: 0.5 },
      },
      {
        id: "a22",
        label: "Bottom-right entry d",
        kind: "slider",
        kernel_binding: "state.a22",
        bounds: { min: -3, max: 3, step: 0.5 },
      },
    ],
  },
  predict: {
    prompt:
      "Matrix A = [[0, -1], [1, 0]]. Before reveal, which classification best describes this linear transformation?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Pure rotation by 90 degrees counter-clockwise; area preserved, orientation preserved",
        "Reflection across the x-axis; orientation flipped",
        "Horizontal shear; area preserved, orientation preserved",
        "Anisotropic scaling; both basis vectors stretched differently",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "linear-transformations-readout",
        module: "@paideia/sutd-sims/linear-transformations",
        symbol: "LinearTransformations",
        props_binding:
          "Show standard basis vectors and their images, classification verdict, area scale, orientation, and rotation angle when applicable.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why specifying T(e_1) and T(e_2) is sufficient to describe T on every vector in the plane.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Linear transformations always preserve length",
      "Rotation matrices have nonzero diagonal entries only",
    ],
  },
};

const defaults: LinearTransformationState = {
  a11: 0,
  a12: -1,
  a21: 1,
  a22: 0,
};

const TOLERANCE = 1e-6;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (
  state: Partial<LinearTransformationState>,
): LinearTransformationState => ({
  a11: clamp(state.a11 ?? defaults.a11, -3, 3),
  a12: clamp(state.a12 ?? defaults.a12, -3, 3),
  a21: clamp(state.a21 ?? defaults.a21, -3, 3),
  a22: clamp(state.a22 ?? defaults.a22, -3, 3),
});

const fmt = (value: number): string => {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

const classify = (
  state: LinearTransformationState,
  det: number,
  col1Length: number,
  col2Length: number,
  columnDot: number,
): Classification => {
  const { a11, a12, a21, a22 } = state;
  if (Math.abs(det) < TOLERANCE) return "singular";
  const isIdentity =
    Math.abs(a11 - 1) < TOLERANCE &&
    Math.abs(a12) < TOLERANCE &&
    Math.abs(a21) < TOLERANCE &&
    Math.abs(a22 - 1) < TOLERANCE;
  if (isIdentity) return "identity";
  const perpendicular = Math.abs(columnDot) < TOLERANCE;
  const equalLength = Math.abs(col1Length - col2Length) < TOLERANCE;
  const isUnitLength = Math.abs(col1Length - 1) < TOLERANCE && Math.abs(col2Length - 1) < TOLERANCE;
  if (perpendicular && isUnitLength) {
    return det > 0 ? "rotation" : "reflection";
  }
  if (perpendicular && equalLength) {
    return "uniform-scaling";
  }
  if (
    Math.abs(a12) < TOLERANCE &&
    Math.abs(a21) < TOLERANCE
  ) {
    return "anisotropic-scaling";
  }
  if (
    Math.abs(a11 - 1) < TOLERANCE &&
    Math.abs(a22 - 1) < TOLERANCE &&
    Math.abs(a21) < TOLERANCE
  ) {
    return "horizontal-shear";
  }
  if (
    Math.abs(a11 - 1) < TOLERANCE &&
    Math.abs(a22 - 1) < TOLERANCE &&
    Math.abs(a12) < TOLERANCE
  ) {
    return "vertical-shear";
  }
  return "composite";
};

const classificationLabel = (kind: Classification): string => {
  switch (kind) {
    case "identity":
      return "Identity (no change)";
    case "rotation":
      return "Rotation (rigid, orientation preserved)";
    case "reflection":
      return "Reflection (rigid, orientation flipped)";
    case "uniform-scaling":
      return "Uniform scaling";
    case "anisotropic-scaling":
      return "Anisotropic scaling";
    case "horizontal-shear":
      return "Horizontal shear";
    case "vertical-shear":
      return "Vertical shear";
    case "singular":
      return "Singular (collapse to lower dimension)";
    case "composite":
      return "Composite (rotation + scaling + shear)";
  }
};

const orientationLabel = (det: number): string => {
  if (det > TOLERANCE) return "orientation preserved";
  if (det < -TOLERANCE) return "orientation flipped";
  return "orientation undefined";
};

export const linearTransformationEvidence = (
  state: LinearTransformationState,
): KernelResult<LinearTransformationEvidence> => {
  const matrix = matrix2(state.a11, state.a12, state.a21, state.a22);
  if (!matrix.ok) return matrix;
  const det = determinant2(matrix.value);
  if (!det.ok) return det;
  const trace = trace2(matrix.value);
  if (!trace.ok) return trace;
  const col1 = vector2(state.a11, state.a21);
  if (!col1.ok) return col1;
  const col2 = vector2(state.a12, state.a22);
  if (!col2.ok) return col2;
  const col1Length = norm2(col1.value);
  if (!col1Length.ok) return col1Length;
  const col2Length = norm2(col2.value);
  if (!col2Length.ok) return col2Length;
  const columnDot = dot2(col1.value, col2.value);
  if (!columnDot.ok) return columnDot;
  const rotationAngle =
    Math.abs(col1Length.value - 1) < TOLERANCE &&
    Math.abs(col2Length.value - 1) < TOLERANCE &&
    Math.abs(columnDot.value) < TOLERANCE &&
    det.value > 0
      ? (Math.atan2(state.a21, state.a11) * 180) / Math.PI
      : null;
  const classification = classify(
    state,
    det.value,
    col1Length.value,
    col2Length.value,
    columnDot.value,
  );
  return ok({
    matrix: matrix.value,
    trace: trace.value,
    det: det.value,
    col1Length: col1Length.value,
    col2Length: col2Length.value,
    columnDot: columnDot.value,
    rotationAngleDegrees: rotationAngle,
    classification,
  });
};

const SVG_VIEW = 320;
const SVG_HALF = SVG_VIEW / 2;
const SVG_UNIT = 48;

const toSvg = (x: number, y: number): readonly [number, number] => [
  SVG_HALF + x * SVG_UNIT,
  SVG_HALF - y * SVG_UNIT,
];

const BasisPlot = ({ state }: { readonly state: LinearTransformationState }) => {
  const origin = toSvg(0, 0);
  const e1 = toSvg(1, 0);
  const e2 = toSvg(0, 1);
  const Te1 = toSvg(state.a11, state.a21);
  const Te2 = toSvg(state.a12, state.a22);

  return (
    <svg
      aria-label="Standard basis and its images"
      role="img"
      style={{ maxWidth: "100%", height: "auto" }}
      viewBox={`0 0 ${SVG_VIEW} ${SVG_VIEW}`}
    >
      <title>Standard basis and its images</title>
      <desc>
        Dashed grey arrows are the standard basis e_1 and e_2; blue arrow is T(e_1); green arrow is
        T(e_2). The vectors update as the matrix entries change.
      </desc>
      <g stroke="#e2e8f0" strokeWidth={1}>
        {Array.from({ length: 7 }, (_, index) => {
          const x = SVG_HALF + (index - 3) * SVG_UNIT;
          return <line key={`vx${index}`} x1={x} x2={x} y1={0} y2={SVG_VIEW} />;
        })}
        {Array.from({ length: 7 }, (_, index) => {
          const y = SVG_HALF + (index - 3) * SVG_UNIT;
          return <line key={`hy${index}`} x1={0} x2={SVG_VIEW} y1={y} y2={y} />;
        })}
      </g>
      <g stroke="#94a3b8" strokeWidth={1.5}>
        <line x1={0} x2={SVG_VIEW} y1={SVG_HALF} y2={SVG_HALF} />
        <line x1={SVG_HALF} x2={SVG_HALF} y1={0} y2={SVG_VIEW} />
      </g>
      <line
        stroke="#94a3b8"
        strokeDasharray="5 4"
        strokeWidth={3}
        x1={origin[0]}
        x2={e1[0]}
        y1={origin[1]}
        y2={e1[1]}
      />
      <line
        stroke="#94a3b8"
        strokeDasharray="5 4"
        strokeWidth={3}
        x1={origin[0]}
        x2={e2[0]}
        y1={origin[1]}
        y2={e2[1]}
      />
      <line
        stroke="#2563eb"
        strokeWidth={4}
        x1={origin[0]}
        x2={Te1[0]}
        y1={origin[1]}
        y2={Te1[1]}
      />
      <line
        stroke="#059669"
        strokeWidth={4}
        x1={origin[0]}
        x2={Te2[0]}
        y1={origin[1]}
        y2={Te2[1]}
      />
      <circle cx={origin[0]} cy={origin[1]} fill="#0f172a" r={4} />
    </svg>
  );
};

const MatrixPreview = ({ state }: { readonly state: LinearTransformationState }) => (
  <section aria-label="Basis preview" className="sutd-formula-card">
    <p className="meta-line">Manipulate</p>
    <h2>Watch the basis move</h2>
    <BasisPlot state={state} />
    <p>
      Blue is T(e_1), green is T(e_2). Dashed arrows are the original basis vectors. The reveal
      reads area scale, orientation, and the canonical class.
    </p>
  </section>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<LinearTransformationState>();
  const current = currentState(state);

  return (
    <section aria-label="Classifier controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <ControlGroup legend="Transformation matrix">
          <Slider
            label="Top-left entry a"
            max={3}
            min={-3}
            onChange={(value) => set("a11", value)}
            step={0.5}
            value={current.a11}
          />
          <Slider
            label="Top-right entry b"
            max={3}
            min={-3}
            onChange={(value) => set("a12", value)}
            step={0.5}
            value={current.a12}
          />
          <Slider
            label="Bottom-left entry c"
            max={3}
            min={-3}
            onChange={(value) => set("a21", value)}
            step={0.5}
            value={current.a21}
          />
          <Slider
            label="Bottom-right entry d"
            max={3}
            min={-3}
            onChange={(value) => set("a22", value)}
            step={0.5}
            value={current.a22}
          />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal classifier evidence
        </button>
      </div>
      <MatrixPreview state={current} />
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<LinearTransformationState>>());
  const evidence = linearTransformationEvidence(state);

  if (!evidence.ok) {
    return (
      <section role="region" aria-label="Observation unlocked" className="sutd-formula-card">
        <p role="alert">{evidence.error.message}</p>
      </section>
    );
  }

  const {
    classification,
    col1Length,
    col2Length,
    columnDot,
    det,
    matrix: [[a, b], [c, d]],
    rotationAngleDegrees,
    trace,
  } = evidence.value;

  return (
    <section role="region" aria-label="Observation unlocked" className="sutd-sim-panel">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Classifier evidence</h2>
        <BasisPlot state={state} />
        <dl className="sutd-result-grid" aria-label="Classifier readout">
          <div>
            <dt>Classification</dt>
            <dd>{classificationLabel(classification)}</dd>
          </div>
          <div>
            <dt>T(e_1)</dt>
            <dd>({fmt(a)}, {fmt(c)}); length {fmt(col1Length)}</dd>
          </div>
          <div>
            <dt>T(e_2)</dt>
            <dd>({fmt(b)}, {fmt(d)}); length {fmt(col2Length)}</dd>
          </div>
          <div>
            <dt>Perpendicularity</dt>
            <dd>T(e_1) . T(e_2) = {fmt(columnDot)}</dd>
          </div>
          <div>
            <dt>Determinant</dt>
            <dd>{fmt(det)}; {orientationLabel(det)}</dd>
          </div>
          <div>
            <dt>Trace</dt>
            <dd>{fmt(trace)}</dd>
          </div>
          {rotationAngleDegrees !== null && (
            <div>
              <dt>Rotation angle</dt>
              <dd>{fmt(rotationAngleDegrees)} degrees</dd>
            </div>
          )}
        </dl>
        <button type="button" onClick={() => stage.advance()}>
          Explain pattern
        </button>
      </div>
      <section className="sutd-formula-card" aria-label="Formula used">
        <p className="meta-line">Formula used</p>
        <h3>Columns are basis images</h3>
        <pre className="formula-code" aria-label="LaTeX formula source">
          <code>{String.raw`A = \big[\,\color{#2563eb}{T(\mathbf{e}_1)}
\mid \color{#059669}{T(\mathbf{e}_2)}\,\big]
=
\begin{bmatrix}a & b\\c & d\end{bmatrix}

\color{#d97706}{\det A} = ad - bc,\quad
\color{#7c3aed}{\operatorname{tr} A} = a + d`}</code>
        </pre>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> T(e_1)
            </dt>
            <dd>basis image; first column of A</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> T(e_2)
            </dt>
            <dd>basis image; second column of A</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> det A
            </dt>
            <dd>signed area scale factor</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> tr A
            </dt>
            <dd>sum of diagonal entries</dd>
          </div>
        </dl>
        <p>
          Substitution: T(e_1) = ({fmt(a)}, {fmt(c)}); T(e_2) = ({fmt(b)}, {fmt(d)}).
        </p>
        <p>
          Lengths: |T(e_1)| = {fmt(col1Length)}; |T(e_2)| = {fmt(col2Length)}. Dot product: {fmt(columnDot)}.
        </p>
        <p>
          det A = {fmt(a)} x {fmt(d)} - {fmt(b)} x {fmt(c)} = {fmt(det)}.
        </p>
        <p>
          Verdict: {classificationLabel(classification)}.
        </p>
        <p className="formula-note">
          Reading where the basis lands diagnoses every linear transformation of the plane.
        </p>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" className="sutd-formula-card">
      <p className="meta-line">Transfer</p>
      <h2>Decompose a graphics transform</h2>
      <p>
        A graphics pipeline composes scaling, rotation, and shear in a fixed order. Explain how
        reading the basis images of the composite recovers each step.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another matrix
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
      <p className="meta-line">Prediction checkpoint</p>
      <h1>Linear Transformation Classifier</h1>
      <p>
        Predict the canonical class of the displayed matrix before the reveal. Then drag entries to
        see how rotations, scalings, shears, and reflections differ in their basis images.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up classifier check
      </button>
    </section>
  );
};

const LinearTransformationsSim = () => (
  <SimRuntime packageId={linearTransformationsPackageId} spec={linearTransformationsSpec}>
    <StageSurface />
  </SimRuntime>
);

export default LinearTransformationsSim;
export { LinearTransformationsSim as LinearTransformations };
