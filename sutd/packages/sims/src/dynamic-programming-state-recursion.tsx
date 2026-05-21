import { useMemo, type ComponentProps, type CSSProperties } from "react";
import { forceDirected2D, type Graph as LayoutGraph, type LayoutResult2D } from "@paideia/graph-layout";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { PredictionGate, type PredictionScope } from "@paideia/prediction-gate";
import { Slider, Selector } from "@paideia/ui-sim";

type RecursionStrategy = "memoized" | "plain";

interface DynamicProgrammingState {
  readonly targetStep: number;
  readonly strategy: RecursionStrategy;
}

interface TraceStep {
  readonly kind: "compare" | "swap" | "set" | "visit" | "mark" | "annotate";
  readonly at: readonly number[];
  readonly value?: number | string;
  readonly note?: string;
}

interface LinearRecurrenceRow {
  readonly index: number;
  readonly value: number;
  readonly dependencies: readonly number[];
  readonly status: "base" | "derived";
}

interface LinearRecurrenceTraceEntry {
  readonly state: number;
  readonly value: number;
  readonly kind: "base" | "derive" | "reuse";
}

interface LinearRecurrenceTrace {
  readonly target: number;
  readonly rows: readonly LinearRecurrenceRow[];
  readonly entries: readonly LinearRecurrenceTraceEntry[];
  readonly steps: readonly TraceStep[];
  readonly plainCallCount: number;
  readonly memoizedEvaluations: number;
  readonly memoHits: number;
}

type DpStateRow = LinearRecurrenceRow & { readonly expression: string };
type DpTraceEntry = LinearRecurrenceTraceEntry & { readonly label: string };

type LocalResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: { readonly code: "precondition-violated"; readonly message: string } };

interface DynamicProgrammingModel {
  readonly targetStep: number;
  readonly strategy: RecursionStrategy;
  readonly rows: readonly DpStateRow[];
  readonly traceEntries: readonly DpTraceEntry[];
  readonly layout: LayoutResult2D;
  readonly result: number;
  readonly plainCallCount: number;
  readonly memoizedEvaluations: number;
  readonly memoHits: number;
  readonly avoidedCalls: number;
  readonly substitution: string;
  readonly interpretation: string;
}

export const dynamicProgrammingStateRecursionPackageId =
  "sutd/csd/dynamic-programming-state-recursion" as ComponentProps<typeof SimRuntime>["packageId"];

export const dynamicProgrammingStateRecursionSpec = {
  id: "dynamic-programming-state-recursion",
  title: "Dynamic Programming State Recursion",
  interaction_type: "algorithm-state-visualisation",
  kernel_deps: [
    "core/sim-runtime",
    "core/graph-layout",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "When ways(5) needs ways(4), and ways(4) was already computed, what should the table do?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Reuse ways(4) without changing its value.",
        "Recompute every branch below ways(4) so the answer is more accurate.",
        "Change the recurrence because memoisation changes the problem.",
        "Count only the loop iterations and ignore the state definition.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "target-step",
        label: "Target step",
        kind: "slider",
        kernel_binding: "state.targetStep",
        bounds: { min: 4, max: 8, step: 1 },
      },
      {
        id: "recursion-strategy",
        label: "Trace style",
        kind: "selector",
        kernel_binding: "state.strategy",
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "state-recursion-panel",
        module: "local",
        symbol: "DynamicProgrammingStateRecursion",
        props_binding: "State graph, memo table, recurrence substitution, and trace.",
      },
    ],
  },
  explain: {
    prompt:
      "Why does storing repeated states reduce work without changing the recurrence result?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "dynamic programming means any loop",
      "memoisation changes the recurrence result",
    ],
  },
} satisfies ComponentProps<typeof SimRuntime>["spec"];

const ok = <T,>(value: T): LocalResult<T> => ({ ok: true, value });

const preconditionError = (message: string): LocalResult<never> => ({
  ok: false,
  error: { code: "precondition-violated", message },
});

const validateTarget = (target: number): LocalResult<number> =>
  Number.isInteger(target) && target >= 0 && target <= 64
    ? ok(target)
    : preconditionError("target must be an integer in [0, 64]");

const validateBaseValues = (baseValues: readonly number[]): LocalResult<readonly number[]> => {
  if (baseValues.length === 0) return preconditionError("at least one base value is required");
  for (const value of baseValues) {
    if (!Number.isFinite(value)) return preconditionError("base values must be finite");
  }
  return ok(baseValues);
};

const validateOffsets = (offsets: readonly number[]): LocalResult<readonly number[]> => {
  if (offsets.length === 0) return preconditionError("at least one dependency offset is required");
  for (const offset of offsets) {
    if (!Number.isInteger(offset) || offset <= 0) {
      return preconditionError("dependency offsets must be positive integers");
    }
  }
  return ok(offsets);
};

const dependencyStates = (state: number, offsets: readonly number[]): readonly number[] =>
  offsets.map((offset) => state - offset).filter((candidate) => candidate >= 0);

const plainCallCount = (
  state: number,
  baseCount: number,
  offsets: readonly number[],
): number => {
  if (state < baseCount) return 1;
  return (
    1 +
    dependencyStates(state, offsets)
      .map((dependency) => plainCallCount(dependency, baseCount, offsets))
      .reduce((sum, calls) => sum + calls, 0)
  );
};

const traceLinearRecurrence = (
  target: number,
  baseValues: readonly number[],
  dependencyOffsets: readonly number[],
): LocalResult<LinearRecurrenceTrace> => {
  const validTarget = validateTarget(target);
  if (!validTarget.ok) return validTarget;
  const validBase = validateBaseValues(baseValues);
  if (!validBase.ok) return validBase;
  const validOffsets = validateOffsets(dependencyOffsets);
  if (!validOffsets.ok) return validOffsets;

  const rows: LinearRecurrenceRow[] = [];
  for (let index = 0; index <= target; index += 1) {
    if (index < baseValues.length) {
      rows.push({
        index,
        value: baseValues[index] ?? 0,
        dependencies: [],
        status: "base",
      });
      continue;
    }

    const dependencies = dependencyStates(index, dependencyOffsets);
    if (dependencies.length !== dependencyOffsets.length) {
      return preconditionError("dependency offsets must resolve to existing states");
    }
    const value = dependencies
      .map((dependency) => rows[dependency]?.value ?? 0)
      .reduce((sum, entry) => sum + entry, 0);
    rows.push({ index, value, dependencies, status: "derived" });
  }

  const cache = new Map<number, number>();
  const entries: LinearRecurrenceTraceEntry[] = [];
  const steps: TraceStep[] = [];
  let memoHits = 0;

  const visit = (state: number): number => {
    const cached = cache.get(state);
    if (cached !== undefined) {
      memoHits += 1;
      entries.push({ state, value: cached, kind: "reuse" });
      steps.push({
        kind: "annotate",
        at: [state],
        value: cached,
        note: `state ${state} reused from table`,
      });
      return cached;
    }

    steps.push({ kind: "visit", at: [state], note: `visit state ${state}` });
    const row = rows[state];
    if (row === undefined) return 0;
    if (row.status === "base") {
      cache.set(state, row.value);
      entries.push({ state, value: row.value, kind: "base" });
      steps.push({ kind: "set", at: [state], value: row.value, note: "base case" });
      return row.value;
    }

    const value = row.dependencies
      .map((dependency) => visit(dependency))
      .reduce((sum, entry) => sum + entry, 0);
    cache.set(state, value);
    entries.push({ state, value, kind: "derive" });
    steps.push({ kind: "set", at: [state], value, note: `state ${state} derived` });
    return value;
  };

  visit(target);

  return ok({
    target,
    rows,
    entries,
    steps,
    plainCallCount: plainCallCount(target, baseValues.length, dependencyOffsets),
    memoizedEvaluations: rows.length,
    memoHits,
  });
};

const clampTargetStep = (value: number): number =>
  Math.min(8, Math.max(4, Number.isInteger(value) ? value : 5));

const expressionForRow = (row: LinearRecurrenceRow, rows: readonly LinearRecurrenceRow[]): string =>
  row.status === "base"
    ? `base case = ${row.value}`
    : `ways(${row.dependencies[0]}) + ways(${row.dependencies[1]}) = ${
        rows[row.dependencies[0] ?? 0]?.value ?? 0
      } + ${rows[row.dependencies[1] ?? 0]?.value ?? 0}`;

const labelForTraceEntry = (entry: LinearRecurrenceTraceEntry, rows: readonly LinearRecurrenceRow[]): string => {
  if (entry.kind === "reuse") return `reuse ways(${entry.state})`;
  if (entry.kind === "base") return `set base ways(${entry.state})`;
  const row = rows[entry.state];
  const left = row?.dependencies[0] ?? 0;
  const right = row?.dependencies[1] ?? 0;
  return `derive ways(${entry.state}) = ${rows[left]?.value ?? 0} + ${rows[right]?.value ?? 0}`;
};

const buildDependencyGraph = (rows: readonly DpStateRow[]): LayoutGraph => ({
  nodes: rows.map((row) => ({ id: `ways(${row.index})`, weight: row.status === "base" ? 1.2 : 1 })),
  links: rows.flatMap((row) =>
    row.index <= 1
      ? []
      : [
          { source: `ways(${row.index})`, target: `ways(${row.index - 1})`, strength: 1 },
          { source: `ways(${row.index})`, target: `ways(${row.index - 2})`, strength: 0.8 },
        ],
  ),
});

const buildLayout = (graph: LayoutGraph): LocalResult<LayoutResult2D> => {
  const layout = forceDirected2D(graph, { iterations: 180, seed: 42, charge: -180, linkDistance: 88 });
  return layout.ok ? ok(layout.value) : preconditionError(layout.error.message);
};

export const buildDynamicProgrammingStateRecursionModel = (
  input: Partial<DynamicProgrammingState> = {},
): LocalResult<DynamicProgrammingModel> => {
  const targetStep = clampTargetStep(input.targetStep ?? 5);
  const strategy = input.strategy ?? "memoized";
  const trace = traceLinearRecurrence(targetStep, [1, 1], [1, 2]);
  if (!trace.ok) return preconditionError(trace.error.message);
  const rows = trace.value.rows.map((row) => ({
    ...row,
    expression: expressionForRow(row, trace.value.rows),
  }));
  const graph = buildDependencyGraph(rows);
  const layout = buildLayout(graph);
  if (!layout.ok) return layout;

  const targetRow = rows[targetStep];
  const previous = rows[targetStep - 1];
  const beforePrevious = rows[targetStep - 2];
  if (targetRow === undefined || previous === undefined || beforePrevious === undefined) {
    return preconditionError("Target step must have two predecessor states.");
  }

  const naiveCalls = trace.value.plainCallCount;
  const memoizedEvaluations = trace.value.memoizedEvaluations;
  const avoidedCalls = Math.max(0, naiveCalls - memoizedEvaluations);

  return ok({
    targetStep,
    strategy,
    rows,
    traceEntries: trace.value.entries.map((entry) => ({
      ...entry,
      label: labelForTraceEntry(entry, trace.value.rows),
    })),
    layout: layout.value,
    result: targetRow.value,
    plainCallCount: naiveCalls,
    memoizedEvaluations,
    memoHits: trace.value.memoHits,
    avoidedCalls,
    substitution: `ways(${targetStep}) = ways(${targetStep - 1}) + ways(${targetStep - 2}) = ${
      previous.value
    } + ${beforePrevious.value} = ${targetRow.value}`,
    interpretation: `There are ${targetRow.value} possible step sequences for ${targetStep} steps. Storing each state keeps the recurrence result but avoids ${avoidedCalls} repeated recursive calls.`,
  });
};

const strategyOptions = [
  { value: "memoized" as const, label: "Memoised trace" },
  { value: "plain" as const, label: "Plain recursion comparison" },
];

const surfaceStyle: CSSProperties = {
  color: "#14201c",
  display: "grid",
  gap: "1rem",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  lineHeight: 1.45,
  maxWidth: "70rem",
};

const panelStyle: CSSProperties = {
  border: "1px solid #d0d8d2",
  borderRadius: "8px",
  padding: "1rem",
  background: "#fbfdf9",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
};

const mutedStyle: CSSProperties = { color: "#52635b", margin: 0 };

const formulaStyle: CSSProperties = {
  background: "#17211d",
  borderRadius: "8px",
  color: "#f7fff8",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "1rem",
  overflowWrap: "anywhere",
  padding: "0.9rem",
};

const tableStyle: CSSProperties = {
  borderCollapse: "collapse",
  fontSize: "0.92rem",
  minWidth: "34rem",
  width: "100%",
};

const cellStyle: CSSProperties = {
  borderBottom: "1px solid #d9e2db",
  padding: "0.45rem",
  textAlign: "left",
};

const stateFill = (row: DpStateRow): string => (row.status === "base" ? "#f7c948" : "#4f9d69");

const getNodePosition = (layout: LayoutResult2D, id: string): { readonly x: number; readonly y: number } => {
  const node = layout.nodes.find((candidate) => candidate.id === id);
  return { x: node?.x ?? 0, y: node?.y ?? 0 };
};

const DependencyGraphView = ({ model }: { readonly model: DynamicProgrammingModel }) => {
  const xs = model.layout.nodes.map((node) => node.x);
  const ys = model.layout.nodes.map((node) => node.y);
  const minX = Math.min(...xs) - 40;
  const maxX = Math.max(...xs) + 40;
  const minY = Math.min(...ys) - 40;
  const maxY = Math.max(...ys) + 40;
  const graph = buildDependencyGraph(model.rows);

  return (
    <svg
      aria-label={`Dependency graph for ways(${model.targetStep})`}
      role="img"
      style={{ aspectRatio: "16 / 9", maxWidth: "100%", width: "100%" }}
      viewBox={`${minX} ${minY} ${Math.max(1, maxX - minX)} ${Math.max(1, maxY - minY)}`}
    >
      {graph.links.map((link) => {
        const source = getNodePosition(model.layout, link.source);
        const target = getNodePosition(model.layout, link.target);
        return (
          <line
            aria-hidden="true"
            key={`${link.source}->${link.target}`}
            stroke="#8aa397"
            strokeWidth="2"
            x1={source.x}
            x2={target.x}
            y1={source.y}
            y2={target.y}
          />
        );
      })}
      {model.rows.map((row) => {
        const id = `ways(${row.index})`;
        const node = getNodePosition(model.layout, id);
        const isTarget = row.index === model.targetStep;
        return (
          <g key={id}>
            <circle
              cx={node.x}
              cy={node.y}
              fill={stateFill(row)}
              r={isTarget ? 24 : 20}
              stroke={isTarget ? "#17211d" : "#315846"}
              strokeWidth={isTarget ? 3 : 2}
            />
            <text
              fill={row.status === "base" ? "#1f1a08" : "#ffffff"}
              fontSize="11"
              fontWeight="700"
              textAnchor="middle"
              x={node.x}
              y={node.y + 4}
            >
              w({row.index})
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<DynamicProgrammingState>();
  const targetStep = clampTargetStep(state.targetStep ?? 5);
  const strategy = state.strategy ?? "memoized";
  const preview = buildDynamicProgrammingStateRecursionModel({ targetStep, strategy });

  return (
    <section aria-label="Recurrence controls" role="region" style={surfaceStyle}>
      <div>
        <h1 style={{ fontSize: "1.8rem", margin: "0 0 0.35rem" }}>Dynamic programming state recursion</h1>
        <p style={mutedStyle}>
          Choose a target state, then reveal how a recurrence becomes a table instead of a repeated call tree.
        </p>
      </div>
      <div style={gridStyle}>
        <div style={panelStyle}>
          <Slider
            label="Target step"
            max={8}
            min={4}
            onChange={(value) => set("targetStep", Math.round(value))}
            step={1}
            unit="steps"
            value={targetStep}
          />
          <div style={{ marginTop: "0.8rem" }}>
            <Selector
              label="Trace style"
              onChange={(value) => set("strategy", value)}
              options={strategyOptions}
              value={strategy}
            />
          </div>
          <div aria-label="Preset targets" role="group" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.9rem" }}>
            {[5, 7, 8].map((preset) => (
              <button key={preset} onClick={() => set("targetStep", preset)} type="button">
                n = {preset}
              </button>
            ))}
          </div>
        </div>
        <div style={panelStyle}>
          <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Live preview</h2>
          {preview.ok ? (
            <>
              <p style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.2rem 0" }}>
                ways({preview.value.targetStep}) = {preview.value.result}
              </p>
              <p style={mutedStyle}>
                Memo table states: {preview.value.memoizedEvaluations}; plain recursive calls:{" "}
                {preview.value.plainCallCount}.
              </p>
            </>
          ) : (
            <p role="alert">The selected recurrence could not be evaluated.</p>
          )}
        </div>
      </div>
      <button onClick={() => stage.advance()} style={{ justifySelf: "start" }} type="button">
        Reveal recursion trace
      </button>
    </section>
  );
};

const FormulaPanel = ({ model }: { readonly model: DynamicProgrammingModel }) => (
  <section aria-label="Formula and interpretation" style={panelStyle}>
    <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Formula</h2>
    <div aria-label="recurrence formula" style={formulaStyle}>
      ways(i) = ways(i - 1) + ways(i - 2), with ways(0) = 1 and ways(1) = 1
    </div>
    <dl style={{ display: "grid", gap: "0.35rem", gridTemplateColumns: "max-content 1fr", margin: "0.8rem 0" }}>
      <dt><span aria-hidden="true" style={{ color: "#4f9d69" }}>■</span> ways(i)</dt>
      <dd style={{ margin: 0 }}>number of step sequences that end exactly at state i, measured in sequences</dd>
      <dt><span aria-hidden="true" style={{ color: "#f7c948" }}>■</span> i</dt>
      <dd style={{ margin: 0 }}>state index, measured in steps from the ground</dd>
      <dt><span aria-hidden="true" style={{ color: "#8aa397" }}>■</span> arrows</dt>
      <dd style={{ margin: 0 }}>dependency on smaller states, measured as subproblem links</dd>
    </dl>
    <p><strong>Substitution:</strong> {model.substitution} sequences.</p>
    <p><strong>Interpretation:</strong> {model.interpretation}</p>
  </section>
);

const MemoTable = ({ model }: { readonly model: DynamicProgrammingModel }) => (
  <section aria-label="Memoisation table" style={panelStyle}>
    <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Memoisation table</h2>
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cellStyle}>State</th>
            <th style={cellStyle}>Stored value</th>
            <th style={cellStyle}>How it is obtained</th>
          </tr>
        </thead>
        <tbody>
          {model.rows.map((row) => (
            <tr key={row.index}>
              <td style={cellStyle}>ways({row.index})</td>
              <td style={cellStyle}>{row.value} sequences</td>
              <td style={cellStyle}>{row.expression}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const TracePanel = ({ model }: { readonly model: DynamicProgrammingModel }) => {
  const visibleEntries =
    model.strategy === "memoized"
      ? model.traceEntries.slice(0, 12)
      : model.traceEntries.filter((entry) => entry.kind !== "reuse").slice(0, 10);
  return (
    <section aria-label="Trace readout" style={panelStyle}>
      <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Trace readout</h2>
      <p style={mutedStyle}>
        Memo hits: {model.memoHits}; plain recursive calls: {model.plainCallCount}; stored state evaluations:{" "}
        {model.memoizedEvaluations}.
      </p>
      <ol>
        {visibleEntries.map((entry, index) => (
          <li key={`${entry.kind}:${entry.state}:${index}`}>
            {entry.label}; value {entry.value} sequences
          </li>
        ))}
      </ol>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = useSimState<Partial<DynamicProgrammingState>>();
  const model = useMemo(
    () => buildDynamicProgrammingStateRecursionModel(state),
    [state.strategy, state.targetStep],
  );

  if (!model.ok) {
    return <p role="alert">The recurrence model could not be evaluated.</p>;
  }

  return (
    <section aria-label="Observation unlocked" role="region" style={surfaceStyle}>
      <div>
        <h1 style={{ fontSize: "1.8rem", margin: "0 0 0.35rem" }}>State recursion evidence</h1>
        <p style={mutedStyle}>
          The same recurrence value is preserved; the table changes how much repeated work is done.
        </p>
      </div>
      <div style={gridStyle}>
        <section aria-label="State dependency graph" style={panelStyle}>
          <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>State dependency graph</h2>
          <DependencyGraphView model={model.value} />
        </section>
        <FormulaPanel model={model.value} />
      </div>
      <div style={gridStyle}>
        <MemoTable model={model.value} />
        <TracePanel model={model.value} />
      </div>
      <button onClick={() => stage.advance()} style={{ justifySelf: "start" }} type="button">
        Explain and transfer
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" role="region" style={surfaceStyle}>
      <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Transfer</h1>
      <div style={panelStyle}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>
          Why does storing repeated states reduce work without changing the recurrence result?
        </h2>
        <ol>
          <li>What is the state value in this problem, and what are its units?</li>
          <li>Which smaller states does the recurrence need?</li>
          <li>When a needed state is already in the table, what exactly is reused?</li>
          <li>For the resource-allocation transfer, what would one table cell mean before any recurrence is written?</li>
        </ol>
      </div>
      <button onClick={() => stage.reset()} style={{ justifySelf: "start" }} type="button">
        Try another state
      </button>
    </section>
  );
};

const PredictStage = () => {
  const stage = useStage();
  const prediction = dynamicProgrammingStateRecursionSpec.predict;
  return (
    <section aria-label="Prediction setup" role="region" style={surfaceStyle}>
      <h1 style={{ fontSize: "1.8rem", margin: "0 0 0.35rem" }}>Dynamic programming state recursion</h1>
      <p style={mutedStyle}>
        Before seeing the table, predict what memoisation changes: the recurrence value, or the amount of repeated
        work.
      </p>
      <PredictionGate
        packageId={dynamicProgrammingStateRecursionPackageId}
        predict={prediction}
        simId={dynamicProgrammingStateRecursionSpec.id as PredictionScope}
      >
        <button onClick={() => stage.advance()} style={{ justifySelf: "start" }} type="button">
          Define recurrence state
        </button>
      </PredictionGate>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") return <ExplainStage />;
  return <PredictStage />;
};

export default function DynamicProgrammingStateRecursion() {
  return (
    <SimRuntime
      packageId={dynamicProgrammingStateRecursionPackageId}
      spec={dynamicProgrammingStateRecursionSpec}
    >
      <StageSurface />
    </SimRuntime>
  );
}
