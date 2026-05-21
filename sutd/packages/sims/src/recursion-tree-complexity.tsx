import { useMemo, type CSSProperties } from "react";
import { traceSort } from "@paideia/algorithm-trace";
import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import { treeLayout, type LayoutResult2D, type TreeNode } from "@paideia/graph-layout";
import { PredictionGate, type PredictionScope } from "@paideia/prediction-gate";
import { ok, err, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Selector } from "@paideia/ui-sim";

type BranchingFactor = 2 | 3;
type ShrinkFactor = 2 | 3;
type CombineExponent = 0 | 1 | 2;
type Dominance = "root-heavy" | "balanced" | "leaf-heavy";

interface RecursionTreeState {
  readonly inputSize: number;
  readonly branchingFactor: BranchingFactor;
  readonly shrinkFactor: ShrinkFactor;
  readonly combineExponent: CombineExponent;
}

interface LevelCost {
  readonly level: number;
  readonly nodes: number;
  readonly subproblemSize: number;
  readonly perNodeWork: number;
  readonly totalWork: number;
  readonly kind: "combine" | "base";
}

interface RecursionTreeModel {
  readonly state: RecursionTreeState;
  readonly height: number;
  readonly levelRatio: number;
  readonly dominance: Dominance;
  readonly asymptoticClass: string;
  readonly levelCosts: readonly LevelCost[];
  readonly layout: LayoutResult2D;
  readonly visibleDepth: number;
  readonly representativeLevel: LevelCost;
  readonly totalWork: number;
  readonly substitution: string;
  readonly interpretation: string;
  readonly mergeTraceComparisons: number;
  readonly mergeTraceSteps: number;
}

export const recursionTreeComplexityPackageId =
  "sutd/csd/recursion-tree-complexity" as ConceptPackageId;

export const recursionTreeComplexitySpec: TSimulationSpec = {
  id: "recursion-tree-complexity",
  title: "Recursion Tree Complexity Lab",
  interaction_type: "algorithm-state-visualisation",
  kernel_deps: [
    "core/sim-runtime",
    "core/algorithm-trace",
    "core/graph-layout",
    "core/charting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "For T(n) = 2T(n/2) + n, which part of the recursion tree contributes the same order of work as every other level?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Every level contributes n operations, so the height adds a log n factor.",
        "Only the root matters because it sees the full input size.",
        "Only the leaves matter because there are many base cases.",
        "The base case never changes the total work.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "input-size",
        label: "Input size",
        kind: "selector",
        kernel_binding: "state.inputSize",
      },
      {
        id: "branching-factor",
        label: "Recursive calls per node",
        kind: "selector",
        kernel_binding: "state.branchingFactor",
      },
      {
        id: "shrink-factor",
        label: "Shrink factor",
        kind: "selector",
        kernel_binding: "state.shrinkFactor",
      },
      {
        id: "combine-exponent",
        label: "Combine-work pattern",
        kind: "selector",
        kernel_binding: "state.combineExponent",
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "recursion-tree-panel",
        module: "@paideia/sutd-sims/recursion-tree-complexity",
        symbol: "RecursionTreeComplexity",
        props_binding: "Recursion tree, level-cost chart, formula substitution, and trace evidence.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why the same recursive shape can be root-heavy, balanced, or leaf-heavy depending on per-node work.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "recursive code always has exponential cost",
      "base cases do not affect total work",
    ],
  },
};

const inputSizeOptions = [
  { value: 64, label: "64 items" },
  { value: 81, label: "81 items" },
  { value: 128, label: "128 items" },
  { value: 256, label: "256 items" },
] as const;

const branchingOptions = [
  { value: 2 as const, label: "2 branches" },
  { value: 3 as const, label: "3 branches" },
] as const;

const shrinkOptions = [
  { value: 2 as const, label: "n/2" },
  { value: 3 as const, label: "n/3" },
] as const;

const exponentOptions = [
  { value: 0 as const, label: "constant combine work" },
  { value: 1 as const, label: "linear combine work" },
  { value: 2 as const, label: "quadratic combine work" },
] as const;

const defaultState: RecursionTreeState = {
  inputSize: 128,
  branchingFactor: 2,
  shrinkFactor: 2,
  combineExponent: 1,
};

const contains = <T extends number>(options: readonly { readonly value: T }[], value: number): value is T =>
  options.some((option) => option.value === value);

const normalizeState = (input: Partial<RecursionTreeState> = {}): RecursionTreeState => ({
  inputSize: contains(inputSizeOptions, input.inputSize ?? defaultState.inputSize)
    ? input.inputSize ?? defaultState.inputSize
    : defaultState.inputSize,
  branchingFactor: contains(branchingOptions, input.branchingFactor ?? defaultState.branchingFactor)
    ? input.branchingFactor ?? defaultState.branchingFactor
    : defaultState.branchingFactor,
  shrinkFactor: contains(shrinkOptions, input.shrinkFactor ?? defaultState.shrinkFactor)
    ? input.shrinkFactor ?? defaultState.shrinkFactor
    : defaultState.shrinkFactor,
  combineExponent: contains(exponentOptions, input.combineExponent ?? defaultState.combineExponent)
    ? input.combineExponent ?? defaultState.combineExponent
    : defaultState.combineExponent,
});

const pow = (base: number, exponent: number): number => base ** exponent;

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

const formatRatio = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");

const polynomialTerm = (exponent: CombineExponent): string => {
  if (exponent === 0) return "1";
  if (exponent === 1) return "n";
  return "n^2";
};

const leafTerm = (branchingFactor: BranchingFactor, shrinkFactor: ShrinkFactor): string => {
  const exponent = Math.log(branchingFactor) / Math.log(shrinkFactor);
  if (Math.abs(exponent - 1) < 1e-9) return "n";
  return `n^${formatRatio(exponent)}`;
};

const asymptoticClass = (
  dominance: Dominance,
  state: RecursionTreeState,
): string => {
  if (dominance === "balanced") {
    const term = polynomialTerm(state.combineExponent);
    return term === "1" ? "Theta(log n)" : `Theta(${term} log n)`;
  }
  if (dominance === "root-heavy") return `Theta(${polynomialTerm(state.combineExponent)})`;
  return `Theta(${leafTerm(state.branchingFactor, state.shrinkFactor)})`;
};

const dominanceLabel = (dominance: Dominance): string => {
  if (dominance === "balanced") return "balanced across levels";
  if (dominance === "root-heavy") return "root-heavy";
  return "leaf-heavy";
};

const buildTree = (
  branchingFactor: BranchingFactor,
  shrinkFactor: ShrinkFactor,
  depth: number,
  level = 0,
  path = "r",
): TreeNode => {
  const id = `level-${level}:${path}:n/${pow(shrinkFactor, level)}`;
  if (level >= depth) return { id };
  return {
    id,
    children: Array.from({ length: branchingFactor }, (_, index) =>
      buildTree(branchingFactor, shrinkFactor, depth, level + 1, `${path}${index + 1}`),
    ),
  };
};

const nodeLevel = (id: string): number => {
  const match = /^level-(\d+):/.exec(id);
  return match === null ? 0 : Number(match[1]);
};

const buildLevelCosts = (state: RecursionTreeState, height: number): readonly LevelCost[] =>
  Array.from({ length: height + 1 }, (_, level) => {
    const nodes = pow(state.branchingFactor, level);
    const subproblemSize = state.inputSize / pow(state.shrinkFactor, level);
    const isLeaf = level === height;
    const perNodeWork = isLeaf ? 1 : pow(subproblemSize, state.combineExponent);
    return {
      level,
      nodes,
      subproblemSize,
      perNodeWork,
      totalWork: nodes * perNodeWork,
      kind: isLeaf ? "base" : "combine",
    };
  });

export const buildRecursionTreeComplexityModel = (
  input: Partial<RecursionTreeState> = {},
): KernelResult<RecursionTreeModel> => {
  const state = normalizeState(input);
  const height = Math.max(1, Math.floor(Math.log(state.inputSize) / Math.log(state.shrinkFactor)));
  const visibleDepth = Math.min(3, height);
  const tree = buildTree(state.branchingFactor, state.shrinkFactor, visibleDepth);
  const layout = treeLayout(tree, { orientation: "vertical", nodeSpacing: 82 });
  if (!layout.ok) return layout;

  const levelRatio = state.branchingFactor / pow(state.shrinkFactor, state.combineExponent);
  const dominance: Dominance =
    Math.abs(levelRatio - 1) < 1e-9 ? "balanced" : levelRatio < 1 ? "root-heavy" : "leaf-heavy";
  const levelCosts = buildLevelCosts(state, height);
  const representativeLevel = levelCosts[Math.min(2, Math.max(0, height - 1))];
  if (representativeLevel === undefined) {
    return err("precondition-violated", "A recursion tree needs at least one level.");
  }

  const mergeTrace = traceSort([8, 3, 7, 1, 6, 2, 5, 4], "merge");
  if (!mergeTrace.ok) return mergeTrace;

  const totalWork = levelCosts.reduce((sum, level) => sum + level.totalWork, 0);
  const substitution =
    `L_${representativeLevel.level} = ${state.branchingFactor}^${representativeLevel.level} ` +
    `* 1 * (${state.inputSize} / ${state.shrinkFactor}^${representativeLevel.level})^${state.combineExponent} ` +
    `= ${formatNumber(representativeLevel.totalWork)} operations`;
  const interpretation =
    `The level ratio is a / b^p = ${state.branchingFactor} / ${state.shrinkFactor}^${state.combineExponent} ` +
    `= ${formatRatio(levelRatio)}, so this tree is ${dominanceLabel(dominance)} with ${asymptoticClass(dominance, state)} growth.`;

  return ok({
    state,
    height,
    levelRatio,
    dominance,
    asymptoticClass: asymptoticClass(dominance, state),
    levelCosts,
    layout: layout.value,
    visibleDepth,
    representativeLevel,
    totalWork,
    substitution,
    interpretation,
    mergeTraceComparisons: mergeTrace.value.meta.comparisons,
    mergeTraceSteps: mergeTrace.value.steps.length,
  });
};

const surfaceStyle: CSSProperties = {
  boxSizing: "border-box",
  color: "#14201c",
  display: "grid",
  gap: "1rem",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  lineHeight: 1.45,
  maxWidth: "74rem",
  width: "100%",
};

const simCss = `
.rtc-sim {
  color: #14201c;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  padding: clamp(1rem, 2vw, 1.5rem);
}
.rtc-sim h1,
.rtc-sim h2 {
  letter-spacing: 0;
}
.rtc-sim button {
  background: #1f5f8b;
  border: 0;
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  min-height: 2.65rem;
  padding: 0.65rem 1rem;
}
.rtc-sim button:focus-visible,
.rtc-sim input:focus-visible,
.rtc-sim textarea:focus-visible,
.rtc-sim select:focus-visible {
  outline: 3px solid #f59e0b;
  outline-offset: 2px;
}
.rtc-sim form[aria-label="Prediction gate"] {
  background: #fbfdf9;
  border: 1px solid #d0d8d2;
  border-radius: 8px;
  display: grid;
  gap: 0.85rem;
  max-width: 64rem;
  padding: 1rem;
}
.rtc-sim fieldset {
  border: 1px solid #d0d8d2;
  border-radius: 8px;
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0.85rem;
}
.rtc-sim label {
  display: grid;
  gap: 0.35rem;
}
.rtc-sim fieldset label {
  align-items: start;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: max-content 1fr;
}
.rtc-sim textarea,
.rtc-sim select {
  border: 1px solid #b8c5bd;
  border-radius: 8px;
  color: #14201c;
  font: inherit;
  max-width: 100%;
  min-height: 2.35rem;
  padding: 0.45rem 0.55rem;
}
.rtc-sim textarea {
  min-height: 5rem;
  resize: vertical;
}
.rtc-sim svg {
  background: #ffffff;
  border-radius: 8px;
}
@media (max-width: 640px) {
  .rtc-sim {
    padding: 0.75rem;
  }
  .rtc-sim form[aria-label="Prediction gate"] {
    padding: 0.8rem;
  }
}
`;

const gridStyle: CSSProperties = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
  minWidth: 0,
};

const panelStyle: CSSProperties = {
  background: "#fbfdf9",
  border: "1px solid #d0d8d2",
  borderRadius: "8px",
  boxSizing: "border-box",
  minWidth: 0,
  padding: "1rem",
};

const formulaStyle: CSSProperties = {
  background: "#17211d",
  borderRadius: "8px",
  color: "#f7fff8",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: "0.95rem",
  overflowX: "auto",
  padding: "0.9rem",
  whiteSpace: "pre-wrap",
};

const mutedStyle: CSSProperties = { color: "#52635b", margin: 0 };

const tableStyle: CSSProperties = {
  borderCollapse: "collapse",
  fontSize: "0.92rem",
  minWidth: "36rem",
  width: "100%",
};

const cellStyle: CSSProperties = {
  borderBottom: "1px solid #d9e2db",
  padding: "0.45rem",
  textAlign: "left",
};

const levelColor = (level: number, visibleDepth: number): string => {
  if (level === 0) return "#2563eb";
  if (level === visibleDepth) return "#f59e0b";
  return "#059669";
};

const getNode = (layout: LayoutResult2D, id: string): { readonly x: number; readonly y: number } => {
  const node = layout.nodes.find((candidate) => candidate.id === id);
  return { x: node?.x ?? 0, y: node?.y ?? 0 };
};

const RecursionTreeView = ({ model }: { readonly model: RecursionTreeModel }) => {
  const xs = model.layout.nodes.map((node) => node.x);
  const ys = model.layout.nodes.map((node) => node.y);
  const minX = Math.min(...xs) - 42;
  const maxX = Math.max(...xs) + 42;
  const minY = Math.min(...ys) - 42;
  const maxY = Math.max(...ys) + 42;

  return (
    <svg
      aria-label={`Visible recursion tree through level ${model.visibleDepth}`}
      role="img"
      style={{ aspectRatio: "16 / 9", maxWidth: "100%", width: "100%" }}
      viewBox={`${minX} ${minY} ${Math.max(1, maxX - minX)} ${Math.max(1, maxY - minY)}`}
    >
      {model.layout.links.map((link) => {
        const source = getNode(model.layout, link.source);
        const target = getNode(model.layout, link.target);
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
      {model.layout.nodes.map((node) => {
        const level = nodeLevel(node.id);
        const label = level === 0 ? "n" : `n/${pow(model.state.shrinkFactor, level)}`;
        return (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              fill={levelColor(level, model.visibleDepth)}
              r={level === 0 ? 22 : 18}
              stroke="#17211d"
              strokeWidth={level === 0 ? 2.5 : 1.5}
            />
            <text
              fill="#ffffff"
              fontSize="10"
              fontWeight="700"
              textAnchor="middle"
              x={node.x}
              y={node.y + 4}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const FormulaPanel = ({ model }: { readonly model: RecursionTreeModel }) => (
  <section aria-label="Formula and interpretation" style={panelStyle}>
    <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Formula</h2>
    <pre aria-label="level cost formula" style={formulaStyle}>{String.raw`\color{#2563eb}{L_k}
= \color{#7c3aed}{a^k}
  \cdot \color{#059669}{c(n/b^k)^p}`}</pre>
    <dl style={{ display: "grid", gap: "0.35rem", gridTemplateColumns: "max-content 1fr", margin: "0.8rem 0" }}>
      <dt><span aria-hidden="true" style={{ color: "#2563eb" }}>■</span> L_k</dt>
      <dd style={{ margin: 0 }}>total work at level k, measured in operations</dd>
      <dt><span aria-hidden="true" style={{ color: "#7c3aed" }}>■</span> a^k</dt>
      <dd style={{ margin: 0 }}>number of nodes at level k, measured in subproblems</dd>
      <dt><span aria-hidden="true" style={{ color: "#059669" }}>■</span> c(n/b^k)^p</dt>
      <dd style={{ margin: 0 }}>work per node, measured in operations per subproblem</dd>
    </dl>
    <p><strong>Substitution:</strong> {model.substitution}.</p>
    <p><strong>Interpretation:</strong> {model.interpretation}</p>
  </section>
);

const LevelCostChart = ({ model }: { readonly model: RecursionTreeModel }) => {
  const yMax = Math.max(...model.levelCosts.map((level) => level.totalWork), 1);
  const chartData = model.levelCosts.map((level) => ({
    x: level.level,
    y: level.totalWork,
    series: "level cost",
  }));

  return (
    <section aria-label="Level-cost chart" style={panelStyle}>
      <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Level costs</h2>
      <LineChart
        ariaLabel="Line chart of recursion tree level costs in operations"
        data={chartData}
        x={{ domain: { min: 0, max: model.height }, label: "level" }}
        y={{ domain: { min: 0, max: yMax * 1.08 }, label: "operations" }}
      />
      <p style={mutedStyle}>
        Height: {model.height} levels; estimated total: {formatNumber(model.totalWork)} operations.
      </p>
    </section>
  );
};

const LevelTable = ({ model }: { readonly model: RecursionTreeModel }) => (
  <section aria-label="Level-cost table" style={panelStyle}>
    <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Level-cost table</h2>
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cellStyle}>Level</th>
            <th style={cellStyle}>Nodes</th>
            <th style={cellStyle}>Size per node</th>
            <th style={cellStyle}>Work per node</th>
            <th style={cellStyle}>Total level work</th>
          </tr>
        </thead>
        <tbody>
          {model.levelCosts.map((level) => (
            <tr key={level.level}>
              <td style={cellStyle}>{level.kind === "base" ? `${level.level} (base)` : level.level}</td>
              <td style={cellStyle}>{formatNumber(level.nodes)} subproblems</td>
              <td style={cellStyle}>{formatNumber(level.subproblemSize)} items</td>
              <td style={cellStyle}>{formatNumber(level.perNodeWork)} operations</td>
              <td style={cellStyle}>{formatNumber(level.totalWork)} operations</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const TraceEvidence = ({ model }: { readonly model: RecursionTreeModel }) => (
  <section aria-label="Algorithm trace evidence" style={panelStyle}>
    <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Algorithm trace evidence</h2>
    <p style={mutedStyle}>
      A merge-sort trace over 8 items records {model.mergeTraceComparisons} comparisons across{" "}
      {model.mergeTraceSteps} trace steps. The trace is a concrete algorithm run; the recursion tree explains the
      growth pattern when the same split-and-merge idea scales to n items.
    </p>
  </section>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<RecursionTreeState>();
  const normalized = normalizeState(state);
  const model = buildRecursionTreeComplexityModel(normalized);

  return (
    <section aria-label="Recurrence controls" role="region" style={surfaceStyle}>
      <div>
        <h1 style={{ fontSize: "1.8rem", margin: "0 0 0.35rem" }}>Recursion tree complexity</h1>
        <p style={mutedStyle}>
          Tune the recurrence shape, then reveal which region of the tree controls total work.
        </p>
      </div>
      <div style={gridStyle}>
        <div style={panelStyle}>
          <ControlGroup legend="Recurrence parameters">
            <Selector
              label="Input size"
              onChange={(value) => set("inputSize", value)}
              options={inputSizeOptions}
              value={normalized.inputSize}
            />
            <Selector
              label="Recursive calls per node"
              onChange={(value) => set("branchingFactor", value)}
              options={branchingOptions}
              value={normalized.branchingFactor}
            />
            <Selector
              label="Shrink factor"
              onChange={(value) => set("shrinkFactor", value)}
              options={shrinkOptions}
              value={normalized.shrinkFactor}
            />
            <Selector
              label="Combine-work pattern"
              onChange={(value) => set("combineExponent", value)}
              options={exponentOptions}
              value={normalized.combineExponent}
            />
          </ControlGroup>
        </div>
        <div style={panelStyle}>
          <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Live setup</h2>
          {model.ok ? (
            <>
              <p style={{ fontSize: "1.45rem", fontWeight: 700, margin: "0.2rem 0" }}>
                T(n) = {normalized.branchingFactor}T(n/{normalized.shrinkFactor}) + {polynomialTerm(normalized.combineExponent)}
              </p>
              <p style={mutedStyle}>
                Level ratio: {formatRatio(model.value.levelRatio)}; tree height: {model.value.height} levels.
              </p>
            </>
          ) : (
            <p role="alert">The selected recurrence could not be evaluated.</p>
          )}
        </div>
      </div>
      <button onClick={() => stage.advance()} style={{ justifySelf: "start" }} type="button">
        Reveal level costs
      </button>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = useSimState<Partial<RecursionTreeState>>();
  const model = useMemo(
    () => buildRecursionTreeComplexityModel(state),
    [state.branchingFactor, state.combineExponent, state.inputSize, state.shrinkFactor],
  );

  if (!model.ok) return <p role="alert">The recursion tree model could not be evaluated.</p>;

  return (
    <section aria-label="Observation unlocked" role="region" style={surfaceStyle}>
      <div>
        <h1 style={{ fontSize: "1.8rem", margin: "0 0 0.35rem" }}>Level-cost evidence</h1>
        <p style={mutedStyle}>
          Compare node growth with shrinking subproblem cost before naming the asymptotic class.
        </p>
      </div>
      <div style={gridStyle}>
        <section aria-label="Recursion tree diagram" style={panelStyle}>
          <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Recursion tree</h2>
          <RecursionTreeView model={model.value} />
        </section>
        <FormulaPanel model={model.value} />
      </div>
      <div style={gridStyle}>
        <LevelCostChart model={model.value} />
        <TraceEvidence model={model.value} />
      </div>
      <LevelTable model={model.value} />
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
          Explain why recursive shape alone is not enough.
        </h2>
        <ol>
          <li>What are the units of one node's combine work?</li>
          <li>How does the number of nodes change from one level to the next?</li>
          <li>How does per-node work change from one level to the next?</li>
          <li>For the search-index transfer, why does each level still cost 2n operations?</li>
        </ol>
      </div>
      <button onClick={() => stage.reset()} style={{ justifySelf: "start" }} type="button">
        Try another recurrence
      </button>
    </section>
  );
};

const PredictStage = () => {
  const stage = useStage();
  const predict = recursionTreeComplexitySpec.predict;
  if (predict === undefined) return null;

  return (
    <section aria-label="Prediction setup" role="region" style={surfaceStyle}>
      <h1 style={{ fontSize: "1.8rem", margin: "0 0 0.35rem" }}>Recursion tree complexity</h1>
      <p style={mutedStyle}>
        Commit a prediction about merge-sort-style level costs before the tree and chart are revealed.
      </p>
      <PredictionGate
        packageId={recursionTreeComplexityPackageId}
        predict={predict}
        simId={recursionTreeComplexitySpec.id as PredictionScope}
      >
        <button onClick={() => stage.advance()} style={{ justifySelf: "start" }} type="button">
          Build tree
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

export default function RecursionTreeComplexity() {
  return (
    <SimRuntime packageId={recursionTreeComplexityPackageId} spec={recursionTreeComplexitySpec}>
      <style>{simCss}</style>
      <div className="rtc-sim">
        <StageSurface />
      </div>
    </SimRuntime>
  );
}
