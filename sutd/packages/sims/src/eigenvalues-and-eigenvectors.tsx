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

type EigenvaluesState = {
  readonly a11: number;
  readonly a12: number;
  readonly a21: number;
  readonly a22: number;
};

type EigenvalueKind = "real-distinct" | "real-repeated" | "complex-conjugate";

type RealEigenpair = {
  readonly value: number;
  readonly direction: readonly [number, number];
};

type ComplexEigenvalue = {
  readonly real: number;
  readonly imaginary: number;
};

type EigenvalueEvidence = {
  readonly matrix: Matrix2;
  readonly trace: number;
  readonly det: number;
  readonly discriminant: number;
  readonly kind: EigenvalueKind;
  readonly realPairs: readonly RealEigenpair[];
  readonly complexPair: readonly [ComplexEigenvalue, ComplexEigenvalue] | null;
};

export const eigenvaluesAndEigenvectorsPackageId =
  "sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/eigenvalues-and-eigenvectors" as ConceptPackageId;

export const eigenvaluesAndEigenvectorsSpec: TSimulationSpec = {
  id: "eigenvalues-and-eigenvectors",
  title: "Eigenvalue and Eigenvector Lab",
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
      "Matrix A = [[3, 1], [0, 2]]. Before reveal, what are its eigenvalues?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "lambda = 3 and lambda = 2 (the diagonal entries, because A is upper-triangular)",
        "lambda = 5 and lambda = 6 (read tr and det as eigenvalues)",
        "lambda = 1 + i and lambda = 1 - i (complex conjugates)",
        "Only one eigenvalue exists for a 2x2 matrix",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "eigenvalues-and-eigenvectors-readout",
        module: "@paideia/sutd-sims/eigenvalues-and-eigenvectors",
        symbol: "EigenvaluesAndEigenvectors",
        props_binding:
          "Show characteristic polynomial parabola, eigenvalues plotted on the lambda axis, eigenspace lines in the 2D plane, and complex-case interpretation when applicable.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain how T^2 - 4D decides whether the matrix has two real invariant lines, one repeated direction, or a complex rotation-plus-scaling behaviour.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Eigenvalues are always the diagonal entries",
      "Complex eigenvalues mean no real behaviour",
    ],
  },
};

const defaults: EigenvaluesState = {
  a11: 3,
  a12: 1,
  a21: 0,
  a22: 2,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<EigenvaluesState>): EigenvaluesState => ({
  a11: clamp(state.a11 ?? defaults.a11, -4, 4),
  a12: clamp(state.a12 ?? defaults.a12, -4, 4),
  a21: clamp(state.a21 ?? defaults.a21, -4, 4),
  a22: clamp(state.a22 ?? defaults.a22, -4, 4),
});

const fmt = (value: number): string => {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

const TOLERANCE = 1e-9;

const eigenspaceDirection = (
  matrix: Matrix2,
  lambda: number,
): readonly [number, number] => {
  const [[a, b], [c, d]] = matrix;
  const m11 = a - lambda;
  const m12 = b;
  const m21 = c;
  const m22 = d - lambda;
  if (Math.abs(m12) > TOLERANCE || Math.abs(m11) > TOLERANCE) {
    const direction: readonly [number, number] = [m12, -m11];
    if (Math.abs(direction[0]) > TOLERANCE || Math.abs(direction[1]) > TOLERANCE) {
      return direction;
    }
  }
  if (Math.abs(m22) > TOLERANCE || Math.abs(m21) > TOLERANCE) {
    return [m22, -m21];
  }
  return [1, 0];
};

export const eigenvalueEvidence = (
  state: EigenvaluesState,
): KernelResult<EigenvalueEvidence> => {
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

  if (discriminant > TOLERANCE) {
    const root = Math.sqrt(discriminant);
    const l1 = (trace.value + root) / 2;
    const l2 = (trace.value - root) / 2;
    return ok({
      matrix: matrix.value,
      trace: trace.value,
      det: det.value,
      discriminant,
      kind: "real-distinct",
      realPairs: [
        { value: l1, direction: eigenspaceDirection(matrix.value, l1) },
        { value: l2, direction: eigenspaceDirection(matrix.value, l2) },
      ],
      complexPair: null,
    });
  }
  if (discriminant < -TOLERANCE) {
    const imaginary = Math.sqrt(-discriminant) / 2;
    const real = trace.value / 2;
    return ok({
      matrix: matrix.value,
      trace: trace.value,
      det: det.value,
      discriminant,
      kind: "complex-conjugate",
      realPairs: [],
      complexPair: [
        { real, imaginary },
        { real, imaginary: -imaginary },
      ],
    });
  }
  const repeated = trace.value / 2;
  return ok({
    matrix: matrix.value,
    trace: trace.value,
    det: det.value,
    discriminant,
    kind: "real-repeated",
    realPairs: [{ value: repeated, direction: eigenspaceDirection(matrix.value, repeated) }],
    complexPair: null,
  });
};

const SVG_VIEW = 320;
const SVG_HALF = SVG_VIEW / 2;
const SVG_UNIT = 32;

const toSvg = (x: number, y: number): readonly [number, number] => [
  SVG_HALF + x * SVG_UNIT,
  SVG_HALF - y * SVG_UNIT,
];

const normalize = (direction: readonly [number, number]): readonly [number, number] => {
  const norm = Math.hypot(direction[0], direction[1]);
  if (norm < TOLERANCE) return [1, 0];
  return [direction[0] / norm, direction[1] / norm];
};

const EigenspacePlot = ({ evidence }: { readonly evidence: EigenvalueEvidence }) => {
  const origin = toSvg(0, 0);
  return (
    <svg
      aria-label="Eigenspace lines"
      role="img"
      style={{ maxWidth: "100%", height: "auto" }}
      viewBox={`0 0 ${SVG_VIEW} ${SVG_VIEW}`}
    >
      <title>Eigenspace lines</title>
      <desc>
        2D plane showing eigenvector lines through the origin. Each real eigenvalue contributes one
        coloured line; complex eigenvalues are reported numerically with no real invariant line.
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
      {evidence.realPairs.map((pair, index) => {
        const direction = normalize(pair.direction);
        const length = 5;
        const start = toSvg(-direction[0] * length, -direction[1] * length);
        const end = toSvg(direction[0] * length, direction[1] * length);
        const stroke = index === 0 ? "#2563eb" : "#059669";
        return (
          <line
            key={`eig${index}`}
            stroke={stroke}
            strokeWidth={4}
            x1={start[0]}
            x2={end[0]}
            y1={start[1]}
            y2={end[1]}
          />
        );
      })}
      <circle cx={origin[0]} cy={origin[1]} fill="#0f172a" r={4} />
    </svg>
  );
};

const MatrixPreview = ({ state }: { readonly state: EigenvaluesState }) => {
  const evidence = eigenvalueEvidence(state);
  return (
    <section aria-label="Eigenspace preview" className="sutd-formula-card">
      <p className="meta-line">Manipulate</p>
      <h2>Watch the eigenspace lines</h2>
      {evidence.ok ? (
        <EigenspacePlot evidence={evidence.value} />
      ) : (
        <p role="alert">{evidence.error.message}</p>
      )}
      <p>
        Each real eigenvalue contributes one invariant line through the origin. Drag the matrix
        entries to make the lines move, merge, or vanish.
      </p>
    </section>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<EigenvaluesState>();
  const current = currentState(state);

  return (
    <section aria-label="Eigenvalue controls" className="sutd-sim-panel">
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
          Reveal eigenvalue evidence
        </button>
      </div>
      <MatrixPreview state={current} />
    </section>
  );
};

const kindDescription = (kind: EigenvalueKind): string => {
  switch (kind) {
    case "real-distinct":
      return "two distinct real eigenvalues; two invariant lines";
    case "real-repeated":
      return "one repeated real eigenvalue; one invariant line";
    case "complex-conjugate":
      return "complex conjugate eigenvalues; no real invariant line";
  }
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<EigenvaluesState>>());
  const evidence = eigenvalueEvidence(state);

  if (!evidence.ok) {
    return (
      <section role="region" aria-label="Observation unlocked" className="sutd-formula-card">
        <p role="alert">{evidence.error.message}</p>
      </section>
    );
  }

  const {
    complexPair,
    det,
    discriminant,
    kind,
    matrix: [[a, b], [c, d]],
    realPairs,
    trace,
  } = evidence.value;
  const l1 = realPairs[0];
  const l2 = realPairs[1];

  return (
    <section role="region" aria-label="Observation unlocked" className="sutd-sim-panel">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Eigenvalue evidence</h2>
        <EigenspacePlot evidence={evidence.value} />
        <dl className="sutd-result-grid" aria-label="Eigenvalue readout">
          <div>
            <dt>Trace</dt>
            <dd>T = {fmt(trace)}</dd>
          </div>
          <div>
            <dt>Determinant</dt>
            <dd>D = {fmt(det)}</dd>
          </div>
          <div>
            <dt>Discriminant</dt>
            <dd>T^2 - 4D = {fmt(discriminant)}</dd>
          </div>
          <div>
            <dt>Classification</dt>
            <dd>{kindDescription(kind)}</dd>
          </div>
          {l1 && (
            <div>
              <dt>Eigenvalue 1</dt>
              <dd>
                lambda_1 = {fmt(l1.value)} along ({fmt(l1.direction[0])}, {fmt(l1.direction[1])})
              </dd>
            </div>
          )}
          {l2 && (
            <div>
              <dt>Eigenvalue 2</dt>
              <dd>
                lambda_2 = {fmt(l2.value)} along ({fmt(l2.direction[0])}, {fmt(l2.direction[1])})
              </dd>
            </div>
          )}
          {complexPair && (
            <div>
              <dt>Complex eigenvalues</dt>
              <dd>
                lambda = {fmt(complexPair[0].real)} +/- {fmt(Math.abs(complexPair[0].imaginary))} i
              </dd>
            </div>
          )}
        </dl>
        <button type="button" onClick={() => stage.advance()}>
          Explain pattern
        </button>
      </div>
      <section className="sutd-formula-card" aria-label="Formula used">
        <p className="meta-line">Formula used</p>
        <h3>Read eigenpairs from T and D</h3>
        <pre className="formula-code" aria-label="LaTeX formula source">
          <code>{String.raw`\color{#2563eb}{\lambda^2}
- \color{#059669}{T}\lambda
+ \color{#d97706}{D} = 0

\color{#7c3aed}{\Delta} = T^2 - 4D

\lambda_{1,2} = \tfrac{T \pm \sqrt{\Delta}}{2}

(A - \lambda I)\mathbf{v} = 0`}</code>
        </pre>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> lambda
            </dt>
            <dd>eigenvalue (scale factor), dimensionless</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> T
            </dt>
            <dd>trace = lambda_1 + lambda_2</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> D
            </dt>
            <dd>determinant = lambda_1 lambda_2</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> Delta
            </dt>
            <dd>discriminant; sign decides eigenvalue type</dd>
          </div>
        </dl>
        <p>
          Substitution: a = {fmt(a)}, b = {fmt(b)}, c = {fmt(c)}, d = {fmt(d)}.
        </p>
        <p>
          T = {fmt(trace)}; D = {fmt(det)}; Delta = T^2 - 4D = {fmt(discriminant)}.
        </p>
        {kind !== "complex-conjugate" && l1 ? (
          <p>
            lambda_1 = ({fmt(trace)} + sqrt({fmt(discriminant)})) / 2 = {fmt(l1.value)}; eigenvector
            direction ({fmt(l1.direction[0])}, {fmt(l1.direction[1])}) from (A - lambda_1 I) v = 0.
          </p>
        ) : (
          <p>
            Complex case: lambda = T/2 +/- i sqrt(-Delta)/2 = {complexPair ? fmt(complexPair[0].real) : ""} +/- {complexPair ? fmt(Math.abs(complexPair[0].imaginary)) : ""} i; no real invariant line in 2D.
          </p>
        )}
        <p className="formula-note">
          The characteristic polynomial encodes both eigenvalues; the kernel of A - lambda I encodes
          each eigenspace. Together they give a complete eigenpair list for any 2x2 real matrix.
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
      <h2>Diagonalise a 2D system</h2>
      <p>
        A coupled spring stiffness matrix has eigenvectors that decouple the system into one
        oscillator per eigen-axis. Explain which step of the eigenpair procedure guarantees the
        decoupling is possible.
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
      <h1>Eigenvalue and Eigenvector Lab</h1>
      <p>
        Predict the eigenvalues of the displayed matrix before the reveal. Then drag entries to see
        eigenspace lines, the discriminant verdict, and the complex case.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up eigenvalue check
      </button>
    </section>
  );
};

const EigenvaluesAndEigenvectorsSim = () => (
  <SimRuntime
    packageId={eigenvaluesAndEigenvectorsPackageId}
    spec={eigenvaluesAndEigenvectorsSpec}
  >
    <StageSurface />
  </SimRuntime>
);

export default EigenvaluesAndEigenvectorsSim;
export { EigenvaluesAndEigenvectorsSim as EigenvaluesAndEigenvectors };
