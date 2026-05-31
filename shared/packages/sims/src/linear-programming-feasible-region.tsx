import { useMemo, useState } from "react";
import type { TPredictSpec, TSimulationSpec } from "@paideia/content-schema";
import {
  linearFeasibleRegion,
  optimizeLinearObjective,
  type FeasibleRegion,
  type LinearConstraint,
  type LinearProgramSolution,
  type Point2,
} from "@paideia/optimization";
import { PlotFrame } from "@paideia/plotting";
import { PredictionGate } from "@paideia/prediction-gate";
import { ok, type ConceptPackageId, type KernelResult, type Rect } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const lpFeasibleRegionPackageId =
  "shared/math/linear-programming-feasible-region" as ConceptPackageId;
export const lpFeasibleRegionSimId = "lp-feasible-region";

export interface LinearProgrammingState {
  readonly assemblyLimit: number;
  readonly laborLimit: number;
  readonly materialLimit: number;
  readonly profitX: number;
  readonly profitY: number;
  readonly testX: number;
  readonly testY: number;
}

interface ConstraintRow {
  readonly shortLabel: string;
  readonly label: string;
  readonly left: string;
  readonly value: number;
  readonly limit: number;
  readonly unit: string;
  readonly passed: boolean;
  readonly colorClass: string;
}

export interface LinearProgrammingModel {
  readonly region: FeasibleRegion;
  readonly solution: LinearProgramSolution;
  readonly rows: readonly ConstraintRow[];
  readonly testPoint: Point2;
  readonly testObjective: number;
  readonly testFeasible: boolean;
  readonly interpretation: string;
}

const domain: Rect = {
  x: { min: 0, max: 10 },
  y: { min: 0, max: 10 },
};

export const linearProgrammingPredict: TPredictSpec = {
  prompt:
    "Before comparing with the feasible region, which statement is most reliable for maximizing Z = 3x + 2y?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "Check every feasible corner, because a linear objective reaches its best value at a boundary vertex",
      "Choose the visual centre of the shaded region, because it balances the constraints",
      "Choose the point with the largest x-value, because x has a positive coefficient",
      "Choose any point on one satisfied constraint, because one inequality is enough",
    ],
    correct_index: 0,
  },
  rationale_required: true,
};

export const linearProgrammingFeasibleRegionSpec: TSimulationSpec = {
  id: lpFeasibleRegionSimId,
  title: "LP Feasible Region Visualiser",
  interaction_type: "decision-matrix",
  kernel_deps: [
    "core/sim-runtime",
    "core/optimization",
    "core/plotting",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "assembly-limit",
        label: "Assembly capacity",
        kind: "slider",
        kernel_binding: "constraints.assembly.c",
        bounds: { min: 8, max: 14, step: 1 },
      },
      {
        id: "labor-limit",
        label: "Labour capacity",
        kind: "slider",
        kernel_binding: "constraints.labor.c",
        bounds: { min: 10, max: 18, step: 1 },
      },
      {
        id: "material-limit",
        label: "Material capacity",
        kind: "slider",
        kernel_binding: "constraints.material.c",
        bounds: { min: 12, max: 24, step: 1 },
      },
      {
        id: "profit-x",
        label: "Profit from x",
        kind: "slider",
        kernel_binding: "objective.cx",
        bounds: { min: 1, max: 6, step: 0.5 },
      },
      {
        id: "profit-y",
        label: "Profit from y",
        kind: "slider",
        kernel_binding: "objective.cy",
        bounds: { min: 1, max: 6, step: 0.5 },
      },
    ],
  },
  predict: linearProgrammingPredict,
  observe: {
    renderers: [
      {
        id: "feasible-polygon",
        module: "@paideia/shared-sims/linear-programming-feasible-region",
        symbol: "LinearProgrammingFeasibleRegionSim",
        props_binding: "Use core/optimization vertices and objective solution as the plotted region and optimum readout.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain which constraints are binding at the optimum and why checking only a single favourite point is weaker than sweeping the objective line across all feasible corners.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "The optimum must sit at the visual centre",
      "Infeasible means no equation exists",
      "Satisfying one inequality proves feasibility",
    ],
  },
};

export const defaultLinearProgrammingState: LinearProgrammingState = {
  assemblyLimit: 10,
  laborLimit: 14,
  materialLimit: 12,
  profitX: 3,
  profitY: 2,
  testX: 4,
  testY: 4,
};

const format = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2);
};

const constraintsFor = (state: LinearProgrammingState): readonly LinearConstraint[] => [
  { a: 1, b: 1, relation: "<=", c: state.assemblyLimit },
  { a: 2, b: 1, relation: "<=", c: state.laborLimit },
  { a: 1, b: 3, relation: "<=", c: state.materialLimit },
];

const rowsFor = (state: LinearProgrammingState): readonly ConstraintRow[] => {
  const x = state.testX;
  const y = state.testY;
  const assembly = x + y;
  const labor = 2 * x + y;
  const material = x + 3 * y;
  return [
    {
      shortLabel: "assembly",
      label: "Assembly capacity",
      left: "x + y",
      value: assembly,
      limit: state.assemblyLimit,
      unit: "batch-hours",
      passed: assembly <= state.assemblyLimit,
      colorClass: "legend-swatch--blue",
    },
    {
      shortLabel: "labour",
      label: "Labour capacity",
      left: "2x + y",
      value: labor,
      limit: state.laborLimit,
      unit: "labour-hours",
      passed: labor <= state.laborLimit,
      colorClass: "legend-swatch--purple",
    },
    {
      shortLabel: "material",
      label: "Material capacity",
      left: "x + 3y",
      value: material,
      limit: state.materialLimit,
      unit: "material-units",
      passed: material <= state.materialLimit,
      colorClass: "legend-swatch--green",
    },
  ];
};

export const buildLinearProgrammingModel = (
  state: LinearProgrammingState,
): KernelResult<LinearProgrammingModel> => {
  const region = linearFeasibleRegion(constraintsFor(state), domain);
  if (!region.ok) return region;

  const solution = optimizeLinearObjective(region.value, {
    cx: state.profitX,
    cy: state.profitY,
    direction: "max",
  });
  if (!solution.ok) return solution;

  const rows = rowsFor(state);
  const testFeasible = rows.every((row) => row.passed);
  const testObjective = state.profitX * state.testX + state.profitY * state.testY;
  const activeLabels = solution.value.activeConstraints
    .map((index) => rows[index]?.shortLabel)
    .filter((label): label is string => label !== undefined);

  return ok({
    region: region.value,
    solution: solution.value,
    rows,
    testPoint: [state.testX, state.testY],
    testObjective,
    testFeasible,
    interpretation:
      activeLabels.length > 0
        ? `optimum at a corner where ${activeLabels.join(" and ")} bind`
        : "optimum lies on the viewport boundary; check the clipping domain before claiming a global result",
  });
};

const toSvgPoint = ([x, y]: Point2): readonly [number, number] => {
  const width = 640;
  const height = 420;
  const margin = 36;
  return [
    margin + ((x - domain.x.min) / (domain.x.max - domain.x.min)) * (width - margin * 2),
    height - margin - ((y - domain.y.min) / (domain.y.max - domain.y.min)) * (height - margin * 2),
  ];
};

const inside = ([x, y]: Point2): boolean =>
  x >= domain.x.min - 1e-7 &&
  x <= domain.x.max + 1e-7 &&
  y >= domain.y.min - 1e-7 &&
  y <= domain.y.max + 1e-7;

const uniquePoints = (points: readonly Point2[]): readonly Point2[] => {
  const unique: Point2[] = [];
  for (const point of points) {
    if (!unique.some(([x, y]) => Math.abs(x - point[0]) < 1e-7 && Math.abs(y - point[1]) < 1e-7)) {
      unique.push(point);
    }
  }
  return unique;
};

const objectiveSegment = (
  value: number,
  profitX: number,
  profitY: number,
): readonly [Point2, Point2] | null => {
  const candidates: Point2[] = [];
  for (const x of [domain.x.min, domain.x.max]) {
    if (Math.abs(profitY) > 1e-7) candidates.push([x, (value - profitX * x) / profitY]);
  }
  for (const y of [domain.y.min, domain.y.max]) {
    if (Math.abs(profitX) > 1e-7) candidates.push([(value - profitY * y) / profitX, y]);
  }
  const visible = uniquePoints(candidates.filter(inside));
  const first = visible[0];
  const second = visible[1];
  return first !== undefined && second !== undefined ? [first, second] : null;
};

const RegionPlot = ({
  model,
  state,
}: {
  readonly model: LinearProgrammingModel;
  readonly state: LinearProgrammingState;
}) => {
  const polygonPoints = model.region.vertices
    .map(toSvgPoint)
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
  const [optimumX, optimumY] = toSvgPoint(model.solution.point);
  const [testX, testY] = toSvgPoint(model.testPoint);
  const segment = objectiveSegment(model.solution.value, state.profitX, state.profitY);

  return (
    <figure aria-label="Feasible region and objective line" className="vector-stage vector-stage--product" role="img">
      <PlotFrame domain={domain} grid="cartesian" aspect="auto">
        <polygon
          fill="#bfdbfe"
          opacity="0.72"
          points={polygonPoints}
          stroke="#2563eb"
          strokeWidth="3"
        />
        {segment === null ? null : (
          <line
            aria-hidden="true"
            stroke="#d97706"
            strokeDasharray="8 6"
            strokeWidth="4"
            x1={toSvgPoint(segment[0])[0]}
            x2={toSvgPoint(segment[1])[0]}
            y1={toSvgPoint(segment[0])[1]}
            y2={toSvgPoint(segment[1])[1]}
          />
        )}
        {model.region.vertices.map((vertex, index) => {
          const [x, y] = toSvgPoint(vertex);
          return (
            <circle
              aria-hidden="true"
              cx={x}
              cy={y}
              fill="#2563eb"
              key={`${index}-${format(vertex[0])}-${format(vertex[1])}`}
              r="5"
              stroke="#ffffff"
              strokeWidth="2"
            />
          );
        })}
        <circle cx={optimumX} cy={optimumY} fill="#d97706" r="8" stroke="#ffffff" strokeWidth="2" />
        <circle cx={testX} cy={testY} fill="#7c3aed" r="7" stroke="#ffffff" strokeWidth="2" />
      </PlotFrame>
      <figcaption>
        Blue is the feasible polygon clipped to 0 to 10 batches on each axis. Amber is the
        objective-line optimum returned by the optimization kernel. Purple is the point being
        tested by substitution.
      </figcaption>
    </figure>
  );
};

const FormulaPanel = ({
  model,
  state,
}: {
  readonly model: LinearProgrammingModel;
  readonly state: LinearProgrammingState;
}) => (
  <section aria-label="Formula used" className="formula-panel formula-panel--product">
    <p className="lab-kicker">Corner search rule</p>
    <h3>Formula used</h3>
    <pre aria-label="Formula" className="formula-code">
      <code>
        <span className="formula-var formula-var--orange">Z</span>
        {" = "}
        <span className="formula-var formula-var--blue">c_x</span>
        <span className="formula-var formula-var--purple">x</span>
        {" + "}
        <span className="formula-var formula-var--green">c_y</span>
        <span className="formula-var formula-var--purple">y</span>
      </code>
    </pre>
    <p className="lab-kicker">Legend</p>
    <dl aria-label="Formula legend" className="formula-legend">
      <div>
        <dt>
          <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> Z
        </dt>
        <dd>objective value, in profit-units</dd>
      </div>
      <div>
        <dt>
          <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> c_x
        </dt>
        <dd>profit per x batch, in profit-units per batch</dd>
      </div>
      <div>
        <dt>
          <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> c_y
        </dt>
        <dd>profit per y batch, in profit-units per batch</dd>
      </div>
      <div>
        <dt>
          <span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> x, y
        </dt>
        <dd>production quantities, in batches</dd>
      </div>
    </dl>
    <p>Units: x and y are batches, and Z is measured in profit-units.</p>
    <p>
      Substitution: optimum gives Z = ({format(state.profitX)} profit-units/batch)({format(
        model.solution.point[0],
      )} batches) + ({format(state.profitY)} profit-units/batch)({format(
        model.solution.point[1],
      )} batches) = {format(model.solution.value)} profit-units.
    </p>
    <p>
      Result: the objective reaches {format(model.solution.value)} profit-units at the selected
      feasible corner.
    </p>
    <p>
      Test point substitution: ({format(state.testX)}, {format(state.testY)}) gives Z ={" "}
      {format(model.testObjective)} profit-units and is{" "}
      {model.testFeasible ? "inside all constraints" : "outside at least one constraint"}.
    </p>
    <p className="formula-note">
      The rule applies because a linear objective has parallel level lines, so the last level line
      touching a bounded feasible polygon touches an edge or corner.
    </p>
  </section>
);

const ConstraintReadout = ({ rows }: { readonly rows: readonly ConstraintRow[] }) => (
  <dl aria-label="Constraint substitutions" className="result-readout result-readout--cards">
    {rows.map((row) => (
      <div key={row.shortLabel}>
        <dt>
          <span aria-hidden="true" className={`legend-swatch ${row.colorClass}`} /> {row.label}
        </dt>
        <dd>
          {row.left} = {format(row.value)} {row.unit} {"<= "} {format(row.limit)} {row.unit}:{" "}
          {row.passed ? "feasible" : "violated"}
        </dd>
      </div>
    ))}
  </dl>
);

export const LinearProgrammingFeasibleRegionSim = () => {
  const [state, setState] = useState<LinearProgrammingState>(defaultLinearProgrammingState);
  const model = useMemo(() => buildLinearProgrammingModel(state), [state]);

  return (
    <PredictionGate
      packageId={lpFeasibleRegionPackageId}
      predict={linearProgrammingPredict}
      simId={lpFeasibleRegionSimId}
    >
      <section aria-label="LP feasible region visualiser" className="vector-lab vector-lab--product">
        <div aria-label="Constraint and objective controls" className="vector-controls vector-controls--product">
          <p className="lab-kicker">Manipulate the model</p>
          <ControlGroup legend="Constraint limits">
            <Slider
              label="Assembly capacity"
              max={14}
              min={8}
              onChange={(value) => setState((current) => ({ ...current, assemblyLimit: value }))}
              step={1}
              unit="batch-hours"
              value={state.assemblyLimit}
            />
            <Slider
              label="Labour capacity"
              max={18}
              min={10}
              onChange={(value) => setState((current) => ({ ...current, laborLimit: value }))}
              step={1}
              unit="labour-hours"
              value={state.laborLimit}
            />
            <Slider
              label="Material capacity"
              max={24}
              min={12}
              onChange={(value) => setState((current) => ({ ...current, materialLimit: value }))}
              step={1}
              unit="material-units"
              value={state.materialLimit}
            />
          </ControlGroup>
          <ControlGroup legend="Objective and test point">
            <Slider
              label="Profit from x"
              max={6}
              min={1}
              onChange={(value) => setState((current) => ({ ...current, profitX: value }))}
              step={0.5}
              unit="profit-units per batch"
              value={state.profitX}
            />
            <Slider
              label="Profit from y"
              max={6}
              min={1}
              onChange={(value) => setState((current) => ({ ...current, profitY: value }))}
              step={0.5}
              unit="profit-units per batch"
              value={state.profitY}
            />
            <Slider
              label="Test x"
              max={10}
              min={0}
              onChange={(value) => setState((current) => ({ ...current, testX: value }))}
              step={0.5}
              unit="batches"
              value={state.testX}
            />
            <Slider
              label="Test y"
              max={10}
              min={0}
              onChange={(value) => setState((current) => ({ ...current, testY: value }))}
              step={0.5}
              unit="batches"
              value={state.testY}
            />
          </ControlGroup>
          <div aria-label="Scenario presets" className="preset-strip">
            <button onClick={() => setState(defaultLinearProgrammingState)} type="button">
              baseline
            </button>
            <button
              onClick={() =>
                setState({
                  ...defaultLinearProgrammingState,
                  testX: 6,
                  testY: 2,
                  profitX: 4,
                  profitY: 3,
                })
              }
              type="button"
            >
              corner check
            </button>
            <button
              onClick={() =>
                setState({
                  ...defaultLinearProgrammingState,
                  assemblyLimit: 8,
                  laborLimit: 10,
                  materialLimit: 12,
                  testX: 7,
                  testY: 4,
                })
              }
              type="button"
            >
              infeasible test
            </button>
          </div>
        </div>

        {model.ok ? (
          <section aria-label="Observation unlocked" role="region">
            <RegionPlot model={model.value} state={state} />
            <dl aria-label="Optimisation readout" className="result-readout result-readout--cards">
              <div>
                <dt>Kernel optimum</dt>
                <dd>
                  ({format(model.value.solution.point[0])}, {format(model.value.solution.point[1])})
                  batches
                </dd>
              </div>
              <div>
                <dt>Objective value</dt>
                <dd>{format(model.value.solution.value)} profit-units</dd>
              </div>
              <div>
                <dt>Interpretation</dt>
                <dd>{model.value.interpretation}</dd>
              </div>
            </dl>
            <ConstraintReadout rows={model.value.rows} />
            <FormulaPanel model={model.value} state={state} />
          </section>
        ) : (
          <p role="alert">The current constraints cannot be evaluated: {model.error.message}</p>
        )}
      </section>
    </PredictionGate>
  );
};

export default LinearProgrammingFeasibleRegionSim;
