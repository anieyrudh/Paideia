import type { TSimulationSpec } from "@paideia/content-schema";
import {
  gaussianElimination2,
  type Matrix2,
  type Vector2,
} from "@paideia/linear-algebra";
import { type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type GaussianState = {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
};

export const gaussianEliminationAndLinearSystemsPackageId =
  "sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/gaussian-elimination-and-linear-systems" as ConceptPackageId;

export const gaussianEliminationAndLinearSystemsSpec: TSimulationSpec = {
  id: "gaussian-elimination-and-linear-systems",
  title: "Gaussian Elimination and Linear Systems",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/linear-algebra",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      { id: "a-coeff", label: "Row 1 x coefficient", kind: "slider", kernel_binding: "state.a", bounds: { min: -4, max: 4, step: 0.5 } },
      { id: "b-coeff", label: "Row 1 y coefficient", kind: "slider", kernel_binding: "state.b", bounds: { min: -4, max: 4, step: 0.5 } },
      { id: "c-coeff", label: "Row 2 x coefficient", kind: "slider", kernel_binding: "state.c", bounds: { min: -4, max: 4, step: 0.5 } },
      { id: "d-coeff", label: "Row 2 y coefficient", kind: "slider", kernel_binding: "state.d", bounds: { min: -4, max: 4, step: 0.5 } },
      { id: "e-rhs", label: "Row 1 right side", kind: "slider", kernel_binding: "state.e", bounds: { min: -8, max: 8, step: 0.5 } },
      { id: "f-rhs", label: "Row 2 right side", kind: "slider", kernel_binding: "state.f", bounds: { min: -8, max: 8, step: 0.5 } },
    ],
  },
  predict: {
    prompt:
      "For the system 2x + y = 5 and x - y = 1, what does Gaussian elimination produce?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "A unique solution at x = 2, y = 1",
        "No solution because the lines are parallel",
        "Infinitely many solutions because the equations are identical",
        "A unique solution at x = 1, y = 2",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "gaussian-elimination-readout",
        module: "@paideia/sutd-sims/gaussian-elimination-and-linear-systems",
        symbol: "GaussianEliminationAndLinearSystems",
        props_binding:
          "Show the augmented matrix, row operation, echelon form, determinant, and solution classification.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain how a pivot exposes whether a 2 by 2 linear system has one solution, no solution, or infinitely many solutions.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Elimination changes the solution set",
      "Zero determinant always means no solution",
    ],
  },
};

const defaults: GaussianState = { a: 2, b: 1, c: 1, d: -1, e: 5, f: 1 };

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<GaussianState>): GaussianState => ({
  a: clamp(state.a ?? defaults.a, -4, 4),
  b: clamp(state.b ?? defaults.b, -4, 4),
  c: clamp(state.c ?? defaults.c, -4, 4),
  d: clamp(state.d ?? defaults.d, -4, 4),
  e: clamp(state.e ?? defaults.e, -8, 8),
  f: clamp(state.f ?? defaults.f, -8, 8),
});

const fmt = (value: number): string => {
  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

export const gaussianEvidence = (state: GaussianState) => {
  const matrix: Matrix2 = [[state.a, state.b], [state.c, state.d]];
  const rhs: Vector2 = [state.e, state.f];
  return gaussianElimination2(matrix, rhs);
};

const MatrixBlock = ({ result }: { readonly result: NonNullable<ReturnType<typeof gaussianEvidence> extends KernelResult<infer T> ? T : never> }) => (
  <div className="sutd-result-card">
    <h2>Row-reduction evidence</h2>
    <svg aria-label="Row-operation and solution-point visual" role="img" viewBox="0 0 320 150" width="100%">
      <title>Augmented matrix rows, pivot highlight, and solution point</title>
      <rect x="24" y="20" width="118" height="82" fill="#ecf2ef" rx="8" stroke="#8aa097" />
      <rect x="34" y="30" width="28" height="24" fill="#d97706" rx="4" />
      <text x="42" y="47" fontSize="12" fill="#17251f">
        {fmt(result.augmentedStart[0][0])}
      </text>
      <text x="74" y="47" fontSize="12" fill="#17251f">
        {fmt(result.augmentedStart[0][1])}
      </text>
      <text x="112" y="47" fontSize="12" fill="#17251f">
        {fmt(result.augmentedStart[0][2])}
      </text>
      <text x="42" y="82" fontSize="12" fill="#17251f">
        {fmt(result.augmentedStart[1][0])}
      </text>
      <text x="74" y="82" fontSize="12" fill="#17251f">
        {fmt(result.augmentedStart[1][1])}
      </text>
      <text x="112" y="82" fontSize="12" fill="#17251f">
        {fmt(result.augmentedStart[1][2])}
      </text>
      <path d="M154 62 H196" stroke="#23352d" strokeWidth="3" markerEnd="url(#gaussian-arrow)" />
      <defs>
        <marker id="gaussian-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="3">
          <path d="M0,0 L8,3 L0,6 Z" fill="#23352d" />
        </marker>
      </defs>
      <rect x="208" y="20" width="82" height="82" fill="#dff4e8" rx="8" stroke="#208a68" />
      <circle cx={result.solution ? 248 + result.solution[0] * 8 : 248} cy={result.solution ? 72 - result.solution[1] * 8 : 72} fill="#208a68" r="6" />
      <text x="206" y="128" fontSize="12" fill="#23352d">
        solution point
      </text>
    </svg>
    <p>Legend: orange = first pivot, arrow = row operation, green dot = solution point.</p>
    <pre aria-label="Augmented matrix">{`[ ${fmt(result.augmentedStart[0][0])}  ${fmt(result.augmentedStart[0][1])} | ${fmt(result.augmentedStart[0][2])} ]\n[ ${fmt(result.augmentedStart[1][0])}  ${fmt(result.augmentedStart[1][1])} | ${fmt(result.augmentedStart[1][2])} ]`}</pre>
    <pre aria-label="Echelon matrix">{`[ ${fmt(result.rowEchelon[0][0])}  ${fmt(result.rowEchelon[0][1])} | ${fmt(result.rowEchelon[0][2])} ]\n[ ${fmt(result.rowEchelon[1][0])}  ${fmt(result.rowEchelon[1][1])} | ${fmt(result.rowEchelon[1][2])} ]`}</pre>
    <dl className="sutd-result-grid" aria-label="Linear system readout">
      <div>
        <dt>Determinant</dt>
        <dd>{fmt(result.determinant)}</dd>
      </div>
      <div>
        <dt>Classification</dt>
        <dd>{result.classification}</dd>
      </div>
      <div>
        <dt>Solution</dt>
        <dd>{result.solution ? `x = ${fmt(result.solution[0])}, y = ${fmt(result.solution[1])}` : "no single solution"}</dd>
      </div>
    </dl>
  </div>
);

const Observation = ({ result }: { readonly result: NonNullable<ReturnType<typeof gaussianEvidence> extends KernelResult<infer T> ? T : never> }) => (
  <section role="region" aria-label="Observation unlocked" className="sutd-sim-panel">
    <MatrixBlock result={result} />
    <section className="sutd-formula-card" aria-label="Formula panel">
      <h3>Formula used</h3>
      <pre aria-label="LaTeX formula source">
        <code>{String.raw`\left[\begin{array}{cc|c}a&b&e\\c&d&f\end{array}\right]
\quad R_2\leftarrow R_2-\frac{c}{a}R_1`}</code>
      </pre>
      <dl aria-label="Formula legend">
        <dt>Legend</dt>
        <dd>pivot and determinant cues identify the row-reduction status.</dd>
        <dt>pivot</dt>
        <dd>nonzero entry used to clear a column</dd>
        <dt>det A</dt>
        <dd>zero determinant flags dependent or parallel rows</dd>
      </dl>
      <p>Substitution: determinant = {fmt(result.determinant)}; classification = {result.classification}.</p>
      <p>Units: equation coefficients are unitless in this algebra model.</p>
      <p>Result: {result.solution ? `x = ${fmt(result.solution[0])}, y = ${fmt(result.solution[1])}` : result.classification}.</p>
      <p>Interpretation: {result.steps[result.steps.length - 1]}</p>
    </section>
  </section>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state: rawState, set } = useManipulate<GaussianState>();
  const state = currentState(rawState);
  const result = gaussianEvidence(state);
  return (
    <section aria-label="Gaussian controls" className="sutd-sim-panel">
      <ControlGroup legend="Manipulate the system">
        <Slider label="Row 1 x coefficient" min={-4} max={4} step={0.5} value={state.a} onChange={(a) => set("a", a)} />
        <Slider label="Row 1 y coefficient" min={-4} max={4} step={0.5} value={state.b} onChange={(b) => set("b", b)} />
        <Slider label="Row 2 x coefficient" min={-4} max={4} step={0.5} value={state.c} onChange={(c) => set("c", c)} />
        <Slider label="Row 2 y coefficient" min={-4} max={4} step={0.5} value={state.d} onChange={(d) => set("d", d)} />
        <Slider label="Row 1 right side" min={-8} max={8} step={0.5} value={state.e} onChange={(e) => set("e", e)} />
        <Slider label="Row 2 right side" min={-8} max={8} step={0.5} value={state.f} onChange={(f) => set("f", f)} />
      </ControlGroup>
      {result.ok ? <MatrixBlock result={result.value} /> : <p role="alert">{result.error.message}</p>}
      <button type="button" onClick={() => stage.advance()}>
        Reveal row-reduction evidence
      </button>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const result = gaussianEvidence(currentState(useSimState<Partial<GaussianState>>()));
  if (!result.ok) return <p role="alert">{result.error.message}</p>;
  return (
    <>
      <Observation result={result.value} />
      <button type="button" onClick={() => stage.advance()}>
        Explain pivots
      </button>
    </>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" className="sutd-formula-card">
      <h2>Transfer to constraint solving</h2>
      <p>Use pivots to decide whether two constraints intersect once, never intersect, or describe the same line.</p>
      <button type="button" onClick={() => stage.reset()}>
        Try another system
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
      <h1>Gaussian Elimination and Linear Systems</h1>
      <p>Predict the row-reduction outcome before comparing with pivots, echelon form, and solution classification.</p>
      <button type="button" onClick={() => stage.advance()}>
        Set up row-reduction check
      </button>
    </section>
  );
};

export const GaussianEliminationAndLinearSystems = () => (
  <SimRuntime packageId={gaussianEliminationAndLinearSystemsPackageId} spec={gaussianEliminationAndLinearSystemsSpec}>
    <StageSurface />
  </SimRuntime>
);

export default GaussianEliminationAndLinearSystems;
