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
    <section aria-label="Manipulation controls" role="region">
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
  const px = 36 + x * 16;
  const py = 164 - y * 16;

  return (
    <section aria-label="Observation unlocked" role="region">
      <figure>
        <svg aria-label="Feasible region plot" role="img" viewBox="0 0 220 190" width="100%">
          <title>Linear programming feasible region with current point and objective direction</title>
          <polygon
            fill="#dff4e8"
            points="36,164 36,68 68,52 116,68 164,164"
            stroke="#256f5d"
            strokeWidth="2"
          />
          <line x1="36" x2="196" y1="164" y2="164" stroke="#23352d" strokeWidth="2" />
          <line x1="36" x2="36" y1="20" y2="164" stroke="#23352d" strokeWidth="2" />
          <line x1="36" x2="196" y1="4" y2="164" stroke="#8aa097" strokeDasharray="5 4" />
          <line x1="36" x2="148" y1="52" y2="164" stroke="#d97706" strokeDasharray="5 4" />
          <line x1="36" x2="132" y1="68" y2="164" stroke="#2d6cdf" strokeDasharray="5 4" />
          <line x1="62" x2="100" y1="146" y2="120" stroke="#b42318" strokeWidth="3" />
          <circle cx={px} cy={py} fill={feasible ? "#208a68" : "#b42318"} r="6" />
          <text fill="#23352d" fontSize="11" x="108" y="118">
            objective rises
          </text>
        </svg>
        <figcaption>
          Legend: green area = feasible region, coloured dashed lines = constraints, dot =
          selected point, red arrow = objective direction.
        </figcaption>
      </figure>
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
      <p>Formula used: Z = 3x + 2y and each constraint must be less than or equal to its limit.</p>
      <p>Substitution: current point ({x}, {y}) gives Z = {z}.</p>
      <p>Units: value-units from the objective.</p>
      <p>Result: {feasible ? "inside" : "outside"} the feasible region.</p>
      <p>Legend: green region = feasible, dashed lines = constraints, dot = selected point.</p>
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
