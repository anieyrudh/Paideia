import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  determinant2,
  matrix2,
  multiplyMatrixVector2,
  vector2,
  type Matrix2,
  type Vector2,
} from "@paideia/linear-algebra";
import { type ConceptPackageId, type KernelResult } from "@paideia/shared";

type TransformState = {
  a11: number;
  a12: number;
  a21: number;
  a22: number;
  x: number;
  y: number;
};

type TransformEvidence = {
  matrix: Matrix2;
  vector: Vector2;
  transformed: Vector2;
  determinant: number;
};

export const vectorTransformationsPackageId =
  "sutd/freshmore/vector-transformations" as ConceptPackageId;

export const vectorTransformationsSpec: TSimulationSpec = {
  id: "vector-transformations",
  title: "Vector Transformations Explorer",
  interaction_type: "diagram-builder",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate", "core/linear-algebra"],
  manipulate: {
    controls: [
      {
        id: "input-x",
        label: "Input x component",
        kind: "slider",
        kernel_binding: "state.x",
        bounds: { min: -3, max: 3, step: 1 },
      },
      {
        id: "input-y",
        label: "Input y component",
        kind: "slider",
        kernel_binding: "state.y",
        bounds: { min: -3, max: 3, step: 1 },
      },
      {
        id: "a11",
        label: "Basis e1 x output",
        kind: "slider",
        kernel_binding: "state.a11",
        bounds: { min: -3, max: 3, step: 1 },
      },
      {
        id: "a12",
        label: "Basis e2 x output",
        kind: "slider",
        kernel_binding: "state.a12",
        bounds: { min: -3, max: 3, step: 1 },
      },
    ],
  },
  predict: {
    prompt:
      "Matrix A sends e1 to (2, 0) and e2 to (1, 1). Before reveal, what is the x-coordinate of A(1, 1)?",
    commit_format: {
      kind: "multiple-choice",
      options: ["x = 1", "x = 2", "x = 3", "x = 4"],
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "matrix-vector-readout",
        module: "local",
        symbol: "basis-movement",
        props_binding:
          "Show how the columns move the basis vectors, then combine those moves for the selected input vector.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain the result using basis movement: one copy of where e1 lands plus one copy of where e2 lands.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Matrix rows are the moved basis vectors.",
      "The entries act independently instead of combining as columns.",
    ],
  },
};

const defaultState: TransformState = {
  a11: 2,
  a12: 1,
  a21: 0,
  a22: 1,
  x: 1,
  y: 1,
};

const clamp = (value: number, min = -3, max = 3): number => Math.min(max, Math.max(min, value));

const currentState = (state: Partial<TransformState>): TransformState => ({
  a11: clamp(state.a11 ?? defaultState.a11),
  a12: clamp(state.a12 ?? defaultState.a12),
  a21: clamp(state.a21 ?? defaultState.a21),
  a22: clamp(state.a22 ?? defaultState.a22),
  x: clamp(state.x ?? defaultState.x),
  y: clamp(state.y ?? defaultState.y),
});

const format = (value: number): string => Number(value.toFixed(2)).toString();

const transformEvidence = (state: TransformState): KernelResult<TransformEvidence> => {
  const matrix = matrix2(state.a11, state.a12, state.a21, state.a22);
  if (!matrix.ok) return matrix;
  const input = vector2(state.x, state.y);
  if (!input.ok) return input;
  const transformed = multiplyMatrixVector2(matrix.value, input.value);
  if (!transformed.ok) return transformed;
  const determinant = determinant2(matrix.value);
  if (!determinant.ok) return determinant;

  return {
    ok: true,
    value: {
      matrix: matrix.value,
      vector: input.value,
      transformed: transformed.value,
      determinant: determinant.value,
    },
  };
};

const RangeControl = ({
  id,
  label,
  value,
  onChange,
}: {
  id: keyof TransformState;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <label>
    <span>{label}: {value}</span>
    <input
      aria-label={label}
      max={3}
      min={-3}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
      step={1}
      type="range"
      value={value}
    />
    <output aria-label={`${label} value`}>{value}</output>
  </label>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<TransformState>();
  const current = currentState(state);

  return (
    <section aria-label="Transformation controls" role="region">
      <p>
        Move the two basis arrows and the input vector. The matrix columns are the landing
        positions of e1 and e2.
      </p>
      <RangeControl
        id="x"
        label="Input x component"
        onChange={(value) => set("x", value)}
        value={current.x}
      />
      <RangeControl
        id="y"
        label="Input y component"
        onChange={(value) => set("y", value)}
        value={current.y}
      />
      <RangeControl
        id="a11"
        label="Basis e1 x output"
        onChange={(value) => set("a11", value)}
        value={current.a11}
      />
      <RangeControl
        id="a21"
        label="Basis e1 y output"
        onChange={(value) => set("a21", value)}
        value={current.a21}
      />
      <RangeControl
        id="a12"
        label="Basis e2 x output"
        onChange={(value) => set("a12", value)}
        value={current.a12}
      />
      <RangeControl
        id="a22"
        label="Basis e2 y output"
        onChange={(value) => set("a22", value)}
        value={current.a22}
      />
      <button type="button" onClick={() => stage.advance()}>
        Reveal transformed vector
      </button>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<TransformState>>());
  const evidence = transformEvidence(state);

  if (!evidence.ok) {
    return <p role="alert">This transformation could not be evaluated.</p>;
  }

  const {
    matrix: [[a11, a12], [a21, a22]],
    transformed: [xPrime, yPrime],
    vector: [x, y],
    determinant,
  } = evidence.value;
  const e1LinePreserved = a21 === 0;
  const orientation = determinant < 0 ? "flips orientation" : "keeps orientation";

  return (
    <section aria-label="Observation unlocked" role="region">
      <h2>Transformed vector evidence</h2>
      <p>
        Basis movement: e1 lands at ({a11}, {a21}) and e2 lands at ({a12}, {a22}).
      </p>
      <p>
        T({x}, {y}) = ({format(xPrime)}, {format(yPrime)}).
      </p>
      <p>
        Formula used: x' = ({a11})({x}) + ({a12})({y}) = {format(xPrime)}; y' = ({a21})(
        {x}) + ({a22})({y}) = {format(yPrime)}.
      </p>
      <p>
        Area scale = det(A) = ({a11})({a22}) - ({a12})({a21}) = {format(determinant)}, so the
        transformation {orientation}.
      </p>
      <p>
        Invariant-direction check: e1 stays on the same line only when its y-output is 0.
        Current result: {e1LinePreserved ? "e1 stays on its line" : "e1 tilts off its line"}.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Explain pattern
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" role="region">
      <p>
        A camera remaps coordinates with A = [[0, -1], [1, 0]]. Transform (3, 1) by tracking
        where e1 and e2 land, then explain why every vector rotates by a quarter-turn.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another transformation
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
    <section aria-label="Prediction setup" role="region">
      <p>
        Predict the transformed x-coordinate first. Then move the basis arrows to see why the
        answer follows from the matrix columns.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up transformation
      </button>
    </section>
  );
};

export default function VectorTransformations() {
  return (
    <SimRuntime spec={vectorTransformationsSpec} packageId={vectorTransformationsPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
