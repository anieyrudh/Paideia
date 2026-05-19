import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { TSimulationSpec } from "@paideia/content-schema";
import type { ConceptPackageId } from "@paideia/shared";

type LPState = { x: number; y: number };

export const linearProgrammingPackageId =
  "sutd/esd/linear-programming-feasible-region" as ConceptPackageId;

export const linearProgrammingFeasibleRegionSpec: TSimulationSpec = {
  id: "linear-programming-feasible-region",
  title: "Linear Programming Feasible Region Explorer",
  interaction_type: "decision-matrix",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate"],
  manipulate: {
    controls: [
      {
        id: "x-control",
        label: "x units",
        kind: "slider",
        kernel_binding: "state.x",
        bounds: { min: 0, max: 10, step: 1 },
      },
      {
        id: "y-control",
        label: "y units",
        kind: "slider",
        kernel_binding: "state.y",
        bounds: { min: 0, max: 10, step: 1 },
      },
    ],
  },
  predict: {
    prompt:
      "Which point is most likely to maximize Z = 3x + 2y while satisfying all constraints?",
    commit_format: {
      kind: "multiple-choice",
      options: ["(4, 4)", "(6, 2)", "(2, 5)"],
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "constraint-check",
        module: "local",
        symbol: "text-evaluation",
        props_binding: "Display substituted constraints and objective value for current state.",
      },
    ],
  },
  explain: {
    prompt:
      "Which constraints are binding at your chosen point, and how does that guide a corner-point search?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Highest x or y value always gives the best objective value",
      "Any point satisfying one constraint is feasible",
    ],
  },
};

const clamp = (value: number): number => Math.min(10, Math.max(0, value));

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<LPState>();
  const x = clamp(state.x ?? 2);
  const y = clamp(state.y ?? 2);

  return (
    <section>
      <label htmlFor="x-control">x units</label>
      <input
        id="x-control"
        type="range"
        min={0}
        max={10}
        step={1}
        value={x}
        onChange={(event) => set("x", Number(event.currentTarget.value))}
      />
      <label htmlFor="y-control">y units</label>
      <input
        id="y-control"
        type="range"
        min={0}
        max={10}
        step={1}
        value={y}
        onChange={(event) => set("y", Number(event.currentTarget.value))}
      />
      <button type="button" onClick={() => stage.advance()}>
        Observe this point
      </button>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = useSimState<Partial<LPState>>();
  const x = clamp(state.x ?? 2);
  const y = clamp(state.y ?? 2);
  const c1 = x + y;
  const c2 = 2 * x + y;
  const c3 = x + 3 * y;
  const z = 3 * x + 2 * y;
  const feasible = c1 <= 10 && c2 <= 14 && c3 <= 18;

  return (
    <section>
      <p>
        x + y = {x} + {y} = {c1} {"<= 10"} {c1 <= 10 ? "pass" : "fail"}
      </p>
      <p>
        2x + y = 2({x}) + {y} = {c2} {"<= 14"} {c2 <= 14 ? "pass" : "fail"}
      </p>
      <p>
        x + 3y = {x} + 3({y}) = {c3} {"<= 18"} {c3 <= 18 ? "pass" : "fail"}
      </p>
      <p>
        Z = 3x + 2y = 3({x}) + 2({y}) = {z} value-units. Interpretation:{" "}
        {feasible ? "feasible point" : "infeasible point"}.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Explain
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section>
      <p>Explain which constraints are binding and why corner points matter.</p>
      <p>
        Transfer problem: maximize Z = 4x + 3y under x + y {"<= 12"}, x + 2y{" "}
        {"<= 14"}, x,y {">= 0"}. Use substitution and interpret.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another point
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
    <section>
      <p>Commit a prediction to unlock reveal, then manipulate a point.</p>
      <button type="button" onClick={() => stage.advance()}>
        Start manipulating
      </button>
    </section>
  );
};

export default function LinearProgrammingFeasibleRegion() {
  return (
    <SimRuntime spec={linearProgrammingFeasibleRegionSpec} packageId={linearProgrammingPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
