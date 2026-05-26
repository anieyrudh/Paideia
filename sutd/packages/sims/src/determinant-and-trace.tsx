import type { TSimulationSpec } from "@paideia/content-schema";
import {
  determinant2,
  matrix2,
  trace2,
  type Matrix2,
} from "@paideia/linear-algebra";
import { type ConceptPackageId, err, ok, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type DeterminantState = {
  readonly a11: number;
  readonly a12: number;
  readonly a21: number;
  readonly a22: number;
};

type DiscriminantClass =
  | "real-distinct"
  | "real-repeated"
  | "complex-conjugate";

type StabilityClass =
  | "stable-node"
  | "unstable-node"
  | "saddle"
  | "stable-spiral"
  | "unstable-spiral"
  | "centre"
  | "degenerate";

type DeterminantEvidence = {
  readonly matrix: Matrix2;
  readonly det: number;
  readonly trace: number;
  readonly discriminant: number;
  readonly discriminantClass: DiscriminantClass;
  readonly stability: StabilityClass;
  readonly eigenvalueSum: number;
  readonly eigenvalueProduct: number;
  readonly orientationFlipped: boolean;
};

export const determinantAndTracePackageId =
  "sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/determinant-and-trace" as ConceptPackageId;

export const determinantAndTraceSpec: TSimulationSpec = {
  id: "determinant-and-trace",
  title: "Determinant and Trace Lab",
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
        bounds: { min: -4, max: 4, step: 0.5 },
      },
      {
        id: "a12",
        label: "Top-right entry b",
        kind: "slider",
        kernel_binding: "state.a12",
        bounds: { min: -4, max: 4, step: 0.5 },
      },
      {
        id: "a21",
        label: "Bottom-left entry c",
        kind: "slider",
        kernel_binding: "state.a21",
        bounds: { min: -4, max: 4, step: 0.5 },
      },
      {
        id: "a22",
        label: "Bottom-right entry d",
        kind: "slider",
        kernel_binding: "state.a22",
        bounds: { min: -4, max: 4, step: 0.5 },
      },
    ],
  },
  predict: {
    prompt:
      "Matrix A = [[3, 1], [0, 2]]. Before reveal, which statement best describes its determinant and trace?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "det A = 6 and tr A = 5, so area is scaled by 6 and the eigenvalues sum to 5",
        "det A = 5 and tr A = 6, so area is scaled by 5 and the eigenvalues sum to 6",
        "det A = 1 and tr A = 0, because the off-diagonal entries cancel",
        "det A = 0 and tr A = 5, because the lower-left zero collapses the matrix",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "determinant-and-trace-readout",
        module: "@paideia/sutd-sims/determinant-and-trace",
        symbol: "DeterminantAndTrace",
        props_binding:
          "Show transformed unit-square parallelogram, signed area, trace, determinant, eigenvalue sum/product, discriminant verdict, and stability classification.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain how the trace-determinant pair determines the eigenvalues without solving the characteristic polynomial for them explicitly.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Determinant is unsigned area",
      "Trace equals determinant",
    ],
  },
};

const defaults: DeterminantState = {
  a11: 3,
  a12: 1,
  a21: 0,
  a22: 2,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<DeterminantState>): DeterminantState => ({
  a11: clamp(state.a11 ?? defaults.a11, -4, 4),
  a12: clamp(state.a12 ?? defaults.a12, -4, 4),
  a21: clamp(state.a21 ?? defaults.a21, -4, 4),
  a22: clamp(state.a22 ?? defaults.a22, -4, 4),
});

const fmt = (value: number): string => {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

const classifyDiscriminant = (discriminant: number): DiscriminantClass => {
  if (discriminant > 1e-9) return "real-distinct";
  if (discriminant < -1e-9) return "complex-conjugate";
  return "real-repeated";
};

const classifyStability = (
  trace: number,
  det: number,
  discriminant: number,
): StabilityClass => {
  if (Math.abs(det) < 1e-9) return "degenerate";
  if (det < 0) return "saddle";
  if (Math.abs(trace) < 1e-9 && discriminant < 0) return "centre";
  if (trace < 0) return discriminant < 0 ? "stable-spiral" : "stable-node";
  return discriminant < 0 ? "unstable-spiral" : "unstable-node";
};

const stabilityLabel = (kind: StabilityClass): string => {
  switch (kind) {
    case "stable-node":
      return "stable node";
    case "unstable-node":
      return "unstable node";
    case "saddle":
      return "saddle";
    case "stable-spiral":
      return "stable spiral";
    case "unstable-spiral":
      return "unstable spiral";
    case "centre":
      return "centre";
    case "degenerate":
      return "degenerate (det = 0)";
  }
};

const discriminantLabel = (kind: DiscriminantClass): string => {
  switch (kind) {
    case "real-distinct":
      return "two distinct real eigenvalues";
    case "real-repeated":
      return "one repeated real eigenvalue";
    case "complex-conjugate":
      return "complex conjugate eigenvalues";
  }
};

export const determinantTraceEvidence = (
  state: DeterminantState,
): KernelResult<DeterminantEvidence> => {
  const matrix = matrix2(state.a11, state.a12, state.a21, state.a22);
  if (!matrix.ok) return matrix;
  const det = determinant2(matrix.value);
  if (!det.ok) return det;
  const trace = trace2(matrix.value);
  if (!trace.ok) return trace;
  const discriminant = trace.value * trace.value - 4 * det.value;
  if (!Number.isFinite(discriminant)) {
    return err("out-of-domain", "Discriminant is not a finite number.");
  }
  const discriminantClass = classifyDiscriminant(discriminant);
  const stability = classifyStability(trace.value, det.value, discriminant);

  return ok({
    matrix: matrix.value,
    det: det.value,
    trace: trace.value,
    discriminant,
    discriminantClass,
    stability,
    eigenvalueSum: trace.value,
    eigenvalueProduct: det.value,
    orientationFlipped: det.value < 0,
  });
};

type ParallelogramPoints = {
  readonly origin: readonly [number, number];
  readonly col1: readonly [number, number];
  readonly col2: readonly [number, number];
  readonly tip: readonly [number, number];
};

const SVG_VIEW = 320;
const SVG_HALF = SVG_VIEW / 2;
const SVG_UNIT = 32;

const toSvg = (x: number, y: number): readonly [number, number] => [
  SVG_HALF + x * SVG_UNIT,
  SVG_HALF - y * SVG_UNIT,
];

const parallelogramPoints = (matrix: Matrix2): ParallelogramPoints => {
  const [[a, b], [c, d]] = matrix;
  return {
    origin: toSvg(0, 0),
    col1: toSvg(a, c),
    col2: toSvg(b, d),
    tip: toSvg(a + b, c + d),
  };
};

const ParallelogramPlot = ({ state }: { readonly state: DeterminantState }) => {
  const matrix = matrix2(state.a11, state.a12, state.a21, state.a22);
  if (!matrix.ok) return null;
  const points = parallelogramPoints(matrix.value);
  const unitOrigin = toSvg(0, 0);
  const unitRight = toSvg(1, 0);
  const unitUp = toSvg(0, 1);
  const unitTip = toSvg(1, 1);
  const det = determinant2(matrix.value);
  const signedArea = det.ok ? det.value : 0;
  const fill = signedArea < 0 ? "#fed7aa" : "#bfdbfe";
  const stroke = signedArea < 0 ? "#ea580c" : "#2563eb";

  return (
    <svg
      aria-label="Unit square mapped by the matrix"
      role="img"
      style={{ maxWidth: "100%", height: "auto" }}
      viewBox={`0 0 ${SVG_VIEW} ${SVG_VIEW}`}
    >
      <title>Unit square mapped by the matrix</title>
      <desc>
        Dashed unit square spanned by the standard basis is mapped to a coloured parallelogram. Fill
        colour switches when the determinant flips sign.
      </desc>
      <g stroke="#e2e8f0" strokeWidth={1}>
        {Array.from({ length: 11 }, (_, index) => {
          const x = SVG_HALF + (index - 5) * SVG_UNIT;
          return <line key={`vx${index}`} x1={x} x2={x} y1={0} y2={SVG_VIEW} />;
        })}
        {Array.from({ length: 11 }, (_, index) => {
          const y = SVG_HALF + (index - 5) * SVG_UNIT;
          return <line key={`hy${index}`} x1={0} x2={SVG_VIEW} y1={y} y2={y} />;
        })}
      </g>
      <g stroke="#94a3b8" strokeWidth={1.5}>
        <line x1={0} x2={SVG_VIEW} y1={SVG_HALF} y2={SVG_HALF} />
        <line x1={SVG_HALF} x2={SVG_HALF} y1={0} y2={SVG_VIEW} />
      </g>
      <polygon
        fill="none"
        points={`${unitOrigin[0]},${unitOrigin[1]} ${unitRight[0]},${unitRight[1]} ${unitTip[0]},${unitTip[1]} ${unitUp[0]},${unitUp[1]}`}
        stroke="#64748b"
        strokeDasharray="6 5"
        strokeWidth={2}
      />
      <polygon
        fill={fill}
        fillOpacity={0.55}
        points={`${points.origin[0]},${points.origin[1]} ${points.col1[0]},${points.col1[1]} ${points.tip[0]},${points.tip[1]} ${points.col2[0]},${points.col2[1]}`}
        stroke={stroke}
        strokeWidth={3}
      />
      <line
        stroke="#2563eb"
        strokeWidth={3}
        x1={points.origin[0]}
        x2={points.col1[0]}
        y1={points.origin[1]}
        y2={points.col1[1]}
      />
      <line
        stroke="#059669"
        strokeWidth={3}
        x1={points.origin[0]}
        x2={points.col2[0]}
        y1={points.origin[1]}
        y2={points.col2[1]}
      />
      <circle cx={points.origin[0]} cy={points.origin[1]} fill="#0f172a" r={4} />
    </svg>
  );
};

const MatrixPreview = ({ state }: { readonly state: DeterminantState }) => (
  <section aria-label="Matrix preview" className="sutd-formula-card">
    <p className="meta-line">Manipulate</p>
    <h2>Watch the unit square move</h2>
    <ParallelogramPlot state={state} />
    <p>
      Dashed square is the unit cell; coloured parallelogram is its image under A. The reveal will
      report the signed area, trace, eigenvalue summary, and stability.
    </p>
  </section>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<DeterminantState>();
  const current = currentState(state);

  return (
    <section aria-label="Determinant and trace controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <ControlGroup legend="Transformation matrix">
          <Slider
            label="Top-left entry a"
            max={4}
            min={-4}
            onChange={(value) => set("a11", value)}
            step={0.5}
            value={current.a11}
          />
          <Slider
            label="Top-right entry b"
            max={4}
            min={-4}
            onChange={(value) => set("a12", value)}
            step={0.5}
            value={current.a12}
          />
          <Slider
            label="Bottom-left entry c"
            max={4}
            min={-4}
            onChange={(value) => set("a21", value)}
            step={0.5}
            value={current.a21}
          />
          <Slider
            label="Bottom-right entry d"
            max={4}
            min={-4}
            onChange={(value) => set("a22", value)}
            step={0.5}
            value={current.a22}
          />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal determinant and trace evidence
        </button>
      </div>
      <MatrixPreview state={current} />
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<DeterminantState>>());
  const evidence = determinantTraceEvidence(state);

  if (!evidence.ok) {
    return (
      <section role="region" aria-label="Observation unlocked" className="sutd-formula-card">
        <p role="alert">{evidence.error.message}</p>
      </section>
    );
  }

  const {
    det,
    discriminant,
    discriminantClass,
    eigenvalueProduct,
    eigenvalueSum,
    matrix: [[a, b], [c, d]],
    orientationFlipped,
    stability,
    trace,
  } = evidence.value;
  const orientationText = orientationFlipped
    ? "orientation is flipped (mirror)"
    : "orientation is preserved";

  return (
    <section role="region" aria-label="Observation unlocked" className="sutd-sim-panel">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Determinant and trace evidence</h2>
        <ParallelogramPlot state={state} />
        <dl className="sutd-result-grid" aria-label="Determinant and trace readout">
          <div>
            <dt>Determinant</dt>
            <dd>det A = {fmt(det)}; {orientationText}</dd>
          </div>
          <div>
            <dt>Trace</dt>
            <dd>tr A = {fmt(trace)}</dd>
          </div>
          <div>
            <dt>Eigenvalue sum</dt>
            <dd>lambda_1 + lambda_2 = {fmt(eigenvalueSum)}</dd>
          </div>
          <div>
            <dt>Eigenvalue product</dt>
            <dd>lambda_1 lambda_2 = {fmt(eigenvalueProduct)}</dd>
          </div>
          <div>
            <dt>Discriminant T^2 - 4D</dt>
            <dd>{fmt(discriminant)}; {discriminantLabel(discriminantClass)}</dd>
          </div>
          <div>
            <dt>Stability of origin</dt>
            <dd>{stabilityLabel(stability)}</dd>
          </div>
        </dl>
        <button type="button" onClick={() => stage.advance()}>
          Explain pattern
        </button>
      </div>
      <section className="sutd-formula-card" aria-label="Formula used">
        <p className="meta-line">Formula used</p>
        <h3>Read trace and determinant directly</h3>
        <pre className="formula-code" aria-label="LaTeX formula source">
          <code>{String.raw`\color{#2563eb}{\det A} = ad - bc

\color{#059669}{\operatorname{tr} A} = a + d

\color{#d97706}{\lambda_1 + \lambda_2} = \operatorname{tr} A
\qquad
\color{#dc2626}{\lambda_1 \lambda_2} = \det A`}</code>
        </pre>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> det A
            </dt>
            <dd>signed area scale factor, dimensionless</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> tr A
            </dt>
            <dd>sum of diagonal entries, dimensionless</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> lambda_1 + lambda_2
            </dt>
            <dd>sum of the two eigenvalues, dimensionless</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--red" /> lambda_1 lambda_2
            </dt>
            <dd>product of the two eigenvalues, dimensionless</dd>
          </div>
        </dl>
        <p>
          Substitution: a = {fmt(a)}, b = {fmt(b)}, c = {fmt(c)}, d = {fmt(d)}.
        </p>
        <p>
          det A = ({fmt(a)})({fmt(d)}) - ({fmt(b)})({fmt(c)}) = {fmt(det)}.
        </p>
        <p>
          tr A = {fmt(a)} + {fmt(d)} = {fmt(trace)}.
        </p>
        <p>
          Discriminant T^2 - 4D = {fmt(trace)}^2 - 4 x {fmt(det)} = {fmt(discriminant)}, so the
          eigenvalues are {discriminantLabel(discriminantClass)}.
        </p>
        <p className="formula-note">
          The eigenvalue sum and product follow directly from the characteristic polynomial
          lambda^2 - T lambda + D = 0, so trace and determinant fix both eigenvalues up to sign.
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
      <h2>Classify a 2D system from T and D</h2>
      <p>
        On the trace-determinant plane, the sign of D, the sign of T, and the sign of T^2 - 4D
        partition the plane into stable nodes, unstable nodes, saddles, spirals, centres, and the
        degenerate boundary. Explain why this single classification works without computing the
        eigenvectors.
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
      <p className="meta-line">Predict first</p>
      <h1>Determinant and Trace Lab</h1>
      <p>
        Predict the determinant and trace of the displayed matrix before the reveal. Then drag the
        matrix entries to test signed area, eigenvalue sum, and stability.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up determinant and trace check
      </button>
    </section>
  );
};

const DeterminantAndTraceSim = () => (
  <SimRuntime packageId={determinantAndTracePackageId} spec={determinantAndTraceSpec}>
    <StageSurface />
  </SimRuntime>
);

export default DeterminantAndTraceSim;
export { DeterminantAndTraceSim as DeterminantAndTrace };
