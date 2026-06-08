import type { CSSProperties } from "react";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  checkEigenvector2,
  eigenvectors2,
  matrix2,
  multiplyMatrixVector2,
  vector2,
  type Eigenpair2,
  type Matrix2,
  type Vector2,
} from "@paideia/linear-algebra";
import { VectorFieldPlot } from "@paideia/plotting";
import { type ConceptPackageId, ok, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type EigenvectorState = {
  readonly a11: number;
  readonly a12: number;
  readonly a21: number;
  readonly a22: number;
  readonly x: number;
  readonly y: number;
};

type InvariantCheck = {
  readonly lambda: number;
  readonly residual: number;
  readonly isEigenvector: boolean;
};

type EigenvectorEvidence = {
  readonly matrix: Matrix2;
  readonly vector: Vector2;
  readonly transformed: Vector2;
  readonly check: InvariantCheck;
  readonly eigenpairs: readonly Eigenpair2[] | null;
};

type PlotStyle = CSSProperties & {
  readonly "--plot-stroke": string;
  readonly "--plot-muted-stroke": string;
  readonly "--plot-accent-stroke": string;
};

const surfaceStyle: CSSProperties = {
  background: "#f8fafc",
  color: "#0f172a",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  minHeight: "100vh",
  padding: "24px",
};

const panelStyle: CSSProperties = {
  alignItems: "start",
  display: "grid",
  gap: "20px",
  gridTemplateColumns: "minmax(260px, 0.9fr) minmax(320px, 1.1fr)",
  maxWidth: "1120px",
};

const controlsStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  boxShadow: "0 12px 30px rgb(15 23 42 / 8%)",
  display: "grid",
  gap: "16px",
  padding: "18px",
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  boxShadow: "0 12px 30px rgb(15 23 42 / 8%)",
  color: "#0f172a",
  padding: "18px",
};

const resultGridStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const resultItemStyle: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "12px",
};

const formulaCodeStyle: CSSProperties = {
  background: "#0f172a",
  borderRadius: "8px",
  color: "#f8fafc",
  overflowX: "auto",
  padding: "14px",
  whiteSpace: "pre-wrap",
};

const buttonStyle: CSSProperties = {
  background: "#0f766e",
  border: "0",
  borderRadius: "8px",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 700,
  padding: "10px 14px",
};

export const eigenvectorTransformationsPackageId =
  "shared/math/eigenvector-transformations" as ConceptPackageId;

export const eigenvectorTransformationsSpec: TSimulationSpec = {
  id: "eigenvector-transformations",
  title: "Eigenvector Direction Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/content-schema",
    "core/sim-runtime",
    "core/linear-algebra",
    "core/plotting",
    "core/prediction-gate",
    "core/ui-sim",
    "core/shared",
  ],
  manipulate: {
    controls: [
      {
        id: "vector-x",
        label: "Vector x component",
        kind: "slider",
        kernel_binding: "state.x",
        bounds: { min: -3, max: 3, step: 1 },
      },
      {
        id: "vector-y",
        label: "Vector y component",
        kind: "slider",
        kernel_binding: "state.y",
        bounds: { min: -3, max: 3, step: 1 },
      },
      {
        id: "a11",
        label: "Horizontal stretch",
        kind: "slider",
        kernel_binding: "state.a11",
        bounds: { min: -4, max: 4, step: 0.5 },
      },
      {
        id: "a12",
        label: "Upper-right shear",
        kind: "slider",
        kernel_binding: "state.a12",
        bounds: { min: -4, max: 4, step: 0.5 },
      },
      {
        id: "a21",
        label: "Lower-left shear",
        kind: "slider",
        kernel_binding: "state.a21",
        bounds: { min: -4, max: 4, step: 0.5 },
      },
      {
        id: "a22",
        label: "Vertical stretch",
        kind: "slider",
        kernel_binding: "state.a22",
        bounds: { min: -4, max: 4, step: 0.5 },
      },
    ],
  },
  predict: {
    prompt:
      "Matrix A = [[3, 1], [0, 2]] acts on vector v = (1, 0). Before reveal, which statement best describes Av?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Av = (1, 0), so the vector is unchanged",
        "Av = (3, 0), so the vector stays on its line and triples",
        "Av = (0, 3), so the vector rotates onto the y-axis",
        "Av = (3, 2), so every component is scaled differently",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "eigenvector-readout",
        module: "@paideia/shared-sims/eigenvector-transformations",
        symbol: "EigenvectorTransformations",
        props_binding:
          "Show Av, lambda v comparison, invariant-direction verdict, and eigenpair reference directions.",
      },
    ],
  },
  explain: {
    prompt:
      "What evidence shows that the direction survived the transformation rather than merely producing an output?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Every vector is an eigenvector",
      "Eigenvalues are rotation angles",
    ],
  },
};

const defaults: EigenvectorState = {
  a11: 3,
  a12: 1,
  a21: 0,
  a22: 2,
  x: 1,
  y: 0,
};

const plotStyle: PlotStyle = {
  "--plot-stroke": "#2563eb",
  "--plot-muted-stroke": "#cbd5e1",
  "--plot-accent-stroke": "#f97316",
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<EigenvectorState>): EigenvectorState => ({
  a11: clamp(state.a11 ?? defaults.a11, -4, 4),
  a12: clamp(state.a12 ?? defaults.a12, -4, 4),
  a21: clamp(state.a21 ?? defaults.a21, -4, 4),
  a22: clamp(state.a22 ?? defaults.a22, -4, 4),
  x: clamp(state.x ?? defaults.x, -3, 3),
  y: clamp(state.y ?? defaults.y, -3, 3),
});

const fmt = (value: number): string => {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

const coordinate = (value: number): string => `${fmt(value)} cu`;

export const eigenvectorEvidence = (
  state: EigenvectorState,
): KernelResult<EigenvectorEvidence> => {
  const matrix = matrix2(state.a11, state.a12, state.a21, state.a22);
  if (!matrix.ok) return matrix;
  const vector = vector2(state.x, state.y);
  if (!vector.ok) return vector;
  const check = checkEigenvector2(matrix.value, vector.value);
  if (!check.ok) return check;
  const eigenpairs = eigenvectors2(matrix.value);

  return ok({
    matrix: matrix.value,
    vector: vector.value,
    transformed: check.value.transformed,
    check: {
      lambda: check.value.lambda,
      residual: check.value.residual,
      isEigenvector: check.value.isEigenvector,
    },
    eigenpairs: eigenpairs.ok ? eigenpairs.value : null,
  });
};

const transformField = (state: EigenvectorState) => {
  const matrix = matrix2(state.a11, state.a12, state.a21, state.a22);
  if (!matrix.ok) return () => [0, 0] satisfies [number, number];

  return (x: number, y: number): [number, number] => {
    const vector = vector2(x, y);
    if (!vector.ok) return [0, 0];
    const transformed = multiplyMatrixVector2(matrix.value, vector.value);
    return transformed.ok ? [transformed.value[0], transformed.value[1]] : [0, 0];
  };
};

const MatrixPreview = ({ state }: { readonly state: EigenvectorState }) => (
  <section
    aria-label="Transformation preview"
    className="sutd-formula-card"
    style={{ ...cardStyle, ...plotStyle }}
  >
    <p className="meta-line">Manipulate</p>
    <h2>Watch the direction field</h2>
    <VectorFieldPlot
      density={9}
      field={transformField(state)}
      normalize
      region={{ x: { min: -3, max: 3 }, y: { min: -3, max: 3 } }}
    />
    <p>
      Candidate vector v = ({coordinate(state.x)}, {coordinate(state.y)}). The reveal checks
      whether the output stays on this same line.
    </p>
  </section>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<EigenvectorState>();
  const current = currentState(state);

  return (
    <section aria-label="Eigenvector controls" className="sutd-sim-panel" style={panelStyle}>
      <div className="sutd-sim-controls" style={controlsStyle}>
        <ControlGroup legend="Candidate vector">
          <Slider
            label="Vector x component"
            max={3}
            min={-3}
            onChange={(value) => set("x", value)}
            step={1}
            unit="cu"
            value={current.x}
          />
          <Slider
            label="Vector y component"
            max={3}
            min={-3}
            onChange={(value) => set("y", value)}
            step={1}
            unit="cu"
            value={current.y}
          />
        </ControlGroup>
        <ControlGroup legend="Transformation matrix">
          <Slider
            label="Horizontal stretch"
            max={4}
            min={-4}
            onChange={(value) => set("a11", value)}
            step={0.5}
            value={current.a11}
          />
          <Slider
            label="Upper-right shear"
            max={4}
            min={-4}
            onChange={(value) => set("a12", value)}
            step={0.5}
            value={current.a12}
          />
          <Slider
            label="Lower-left shear"
            max={4}
            min={-4}
            onChange={(value) => set("a21", value)}
            step={0.5}
            value={current.a21}
          />
          <Slider
            label="Vertical stretch"
            max={4}
            min={-4}
            onChange={(value) => set("a22", value)}
            step={0.5}
            value={current.a22}
          />
        </ControlGroup>
        <button style={buttonStyle} type="button" onClick={() => stage.advance()}>
          Reveal invariant-direction result
        </button>
      </div>
      <MatrixPreview state={current} />
    </section>
  );
};

const EigenpairList = ({ pairs }: { readonly pairs: readonly Eigenpair2[] | null }) => {
  if (pairs === null) {
    return (
      <p>
        This matrix does not expose two stable real eigendirections in the current two-dimensional
        view.
      </p>
    );
  }

  return (
    <dl className="sutd-result-grid" aria-label="Reference eigendirections" style={resultGridStyle}>
      {pairs.map((pair, index) => (
        <div key={`${index}:${pair.value}`} style={resultItemStyle}>
          <dt>Reference direction {index + 1}</dt>
          <dd>
            lambda {fmt(pair.value)}; v approx ({fmt(pair.vector[0])}, {fmt(pair.vector[1])})
          </dd>
        </div>
      ))}
    </dl>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<EigenvectorState>>());
  const evidence = eigenvectorEvidence(state);

  if (!evidence.ok) {
    return (
      <section role="region" aria-label="Observation unlocked" className="sutd-formula-card">
        <p role="alert">{evidence.error.message}</p>
      </section>
    );
  }

  const {
    check,
    eigenpairs,
    matrix: [[a11, a12], [a21, a22]],
    transformed: [xPrime, yPrime],
    vector: [x, y],
  } = evidence.value;
  const verdict = check.isEigenvector ? "is an eigenvector" : "is not an eigenvector";

  return (
    <section
      role="region"
      aria-label="Observation unlocked"
      className="sutd-sim-panel"
      style={panelStyle}
    >
      <div className="sutd-result-card" style={cardStyle}>
        <p className="meta-line">Observe</p>
        <h2>Invariant-direction evidence</h2>
        <dl className="sutd-result-grid" aria-label="Eigenvector readout" style={resultGridStyle}>
          <div style={resultItemStyle}>
            <dt>Matrix-vector output</dt>
            <dd>
              Av = ({coordinate(xPrime)}, {coordinate(yPrime)})
            </dd>
          </div>
          <div style={resultItemStyle}>
            <dt>Best scale factor</dt>
            <dd>lambda = {fmt(check.lambda)} times</dd>
          </div>
          <div style={resultItemStyle}>
            <dt>Direction verdict</dt>
            <dd>
              v {verdict}
            </dd>
          </div>
        </dl>
        <EigenpairList pairs={eigenpairs} />
        <button style={buttonStyle} type="button" onClick={() => stage.advance()}>
          Explain pattern
        </button>
      </div>
      <section className="sutd-formula-card" aria-label="Formula used" style={cardStyle}>
        <p className="meta-line">Formula used</p>
        <h3>Check for one shared scale factor</h3>
        <pre className="formula-code" aria-label="Formula" style={formulaCodeStyle}>
          <code>
            <span className="formula-var formula-var--blue">A</span>
            <span className="formula-var formula-var--green">v</span> ={" "}
            <span className="formula-var formula-var--orange">lambda</span>
            <span className="formula-var formula-var--green">v</span>
            {"\n\n"}
            <span className="formula-var formula-var--orange">lambda</span> = ((Av) dot v) /
            (v dot v)
            {"\n\n"}
            <span className="formula-var formula-var--red">r</span> = |Av - lambda v|
          </code>
        </pre>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> A
            </dt>
            <dd>transformation matrix, dimensionless entries</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> v
            </dt>
            <dd>candidate direction, coordinate unit cu</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> lambda
            </dt>
            <dd>scale factor along the direction, times</dd>
          </div>
          <div>
            <dt>
              <span aria-hidden="true" className="legend-swatch legend-swatch--red" /> r
            </dt>
            <dd>residual distance after subtracting lambda v, in coordinate units</dd>
          </div>
        </dl>
        <p>
          Substitution: [[{fmt(a11)}, {fmt(a12)}], [{fmt(a21)}, {fmt(a22)}]] x ({coordinate(x)},{" "}
          {coordinate(y)}) = ({coordinate(xPrime)}, {coordinate(yPrime)}).
        </p>
        <p>
          Projection scale: lambda = ((Av) dot v) / (v dot v) = {fmt(check.lambda)} times.
        </p>
        <p>
          Result: residual r = |Av - lambda v| = {coordinate(check.residual)}, so v {verdict}.
        </p>
        <p className="formula-note">
          This formula applies because an eigenvector is exactly a non-zero direction whose
          transformed output is a scalar multiple of itself.
        </p>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" className="sutd-formula-card" style={cardStyle}>
      <p className="meta-line">Transfer</p>
      <h2>Use the preserved direction</h2>
      <p>
        In a modal model, a direction that stays on its own line can be analysed as one scalar
        stretch. Explain which part of the evidence proves the direction was preserved.
      </p>
      <button style={buttonStyle} type="button" onClick={() => stage.reset()}>
        Test another direction
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
    <section aria-label="Prediction setup" className="sutd-formula-card" style={cardStyle}>
      <p className="meta-line">Prediction checkpoint</p>
      <h1>Eigenvector Direction Lab</h1>
      <p>
        Predict whether the chosen vector keeps its direction before the transformation result is
        revealed. Then adjust the vector and matrix to test the invariant-direction rule.
      </p>
      <button style={buttonStyle} type="button" onClick={() => stage.advance()}>
        Set up eigenvector check
      </button>
    </section>
  );
};

const EigenvectorTransformationsSim = () => (
  <div style={surfaceStyle}>
    <SimRuntime
      packageId={eigenvectorTransformationsPackageId}
      spec={eigenvectorTransformationsSpec}
    >
      <StageSurface />
    </SimRuntime>
  </div>
);

export default EigenvectorTransformationsSim;
