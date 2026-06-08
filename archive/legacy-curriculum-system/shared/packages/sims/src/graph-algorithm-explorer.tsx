import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { traceTraversal, type Trace } from "@paideia/algorithm-trace";
import {
  breadthFirstSearch,
  depthFirstSearch,
  dijkstraShortestPath,
  type NodePredecessor,
  type WeightedEdge,
  type WeightedGraph,
} from "@paideia/graph-algorithms";
import { forceDirected2D, type Graph as LayoutGraph, type LayoutResult2D } from "@paideia/graph-layout";
import { PredictionGate } from "@paideia/prediction-gate";
import { ok, type KernelResult } from "@paideia/shared";
import { ControlGroup, Selector } from "@paideia/ui-sim";

export const graphAlgorithmExplorerPackageId = "graph-algorithm-explorer";
export const graphAlgorithmExplorerSimId = "graph-algorithm-explorer";

type AlgorithmMode = "bfs" | "dfs" | "dijkstra";
type GraphScenario = "weighted-detour" | "tie-order";

export interface GraphAlgorithmExplorerState {
  readonly algorithmMode: AlgorithmMode;
  readonly graphScenario: GraphScenario;
}

interface ScenarioSpec {
  readonly id: GraphScenario;
  readonly label: string;
  readonly start: string;
  readonly target: string;
  readonly graph: WeightedGraph;
  readonly layout: LayoutGraph;
  readonly note: string;
}

export interface GraphAlgorithmExplorerModel {
  readonly scenario: ScenarioSpec;
  readonly mode: AlgorithmMode;
  readonly layout: LayoutResult2D;
  readonly traversalOrder: readonly string[];
  readonly traversalTrace: Trace<string>;
  readonly bfsPath: readonly string[];
  readonly bfsHopCount: number;
  readonly bfsPathCost: number;
  readonly dijkstraPath: readonly string[];
  readonly dijkstraDistance: number;
  readonly selectedPath: readonly string[];
  readonly selectedCost: number;
  readonly interpretation: string;
}

const weightedDetourGraph: WeightedGraph = {
  directed: true,
  nodes: ["S", "A", "B", "C", "T"].map((id) => ({ id })),
  edges: [
    { source: "S", target: "A", weight: 1 },
    { source: "A", target: "T", weight: 10 },
    { source: "S", target: "B", weight: 2 },
    { source: "B", target: "C", weight: 2 },
    { source: "C", target: "T", weight: 2 },
    { source: "A", target: "C", weight: 2 },
  ],
};

const tieOrderGraph: WeightedGraph = {
  directed: true,
  nodes: ["S", "A", "B", "C", "D", "T"].map((id) => ({ id })),
  edges: [
    { source: "S", target: "A", weight: 2 },
    { source: "S", target: "B", weight: 2 },
    { source: "A", target: "C", weight: 2 },
    { source: "B", target: "D", weight: 2 },
    { source: "C", target: "T", weight: 4 },
    { source: "D", target: "T", weight: 1 },
    { source: "A", target: "D", weight: 5 },
  ],
};

const toLayoutGraph = (graph: WeightedGraph): LayoutGraph => ({
  nodes: graph.nodes,
  links: graph.edges.map((edge) => ({ source: edge.source, target: edge.target, strength: 1 })),
});

const scenarios: Record<GraphScenario, ScenarioSpec> = {
  "weighted-detour": {
    id: "weighted-detour",
    label: "Weighted detour",
    start: "S",
    target: "T",
    graph: weightedDetourGraph,
    layout: toLayoutGraph(weightedDetourGraph),
    note:
      "The two-edge route reaches the target quickly by hop count, but the three-edge route has lower total weight.",
  },
  "tie-order": {
    id: "tie-order",
    label: "Tie-order traversal",
    start: "S",
    target: "T",
    graph: tieOrderGraph,
    layout: toLayoutGraph(tieOrderGraph),
    note:
      "The first two neighbours have equal weights; the represented adjacency order decides which one enters the trace first.",
  },
};

const modeOptions: readonly { readonly value: AlgorithmMode; readonly label: string }[] = [
  { value: "bfs", label: "BFS frontier" },
  { value: "dfs", label: "DFS branch" },
  { value: "dijkstra", label: "Dijkstra weighted path" },
];

const scenarioOptions: readonly { readonly value: GraphScenario; readonly label: string }[] = [
  { value: "weighted-detour", label: "Weighted detour" },
  { value: "tie-order", label: "Tie-order traversal" },
];

export const graphAlgorithmExplorerPredict: TPredictSpec = {
  prompt: "In a weighted graph, which claim is safest before you run the algorithms?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "BFS finds the fewest edges, while Dijkstra finds the lowest total weight",
      "DFS always reaches the cheapest route first",
      "The visually closest node must have the smallest edge weight",
      "Every valid graph has only one possible visited order",
    ],
    correct_index: 0,
  },
  rationale_required: true,
};

export const defaultGraphAlgorithmExplorerState: GraphAlgorithmExplorerState = {
  algorithmMode: "bfs",
  graphScenario: "weighted-detour",
};

const formatOrder = (ids: readonly string[]): string => ids.join(" -> ");

const edgeWeight = (edges: readonly WeightedEdge[], source: string, target: string): number | null =>
  edges.find((edge) => edge.source === source && edge.target === target)?.weight ?? null;

const pathCost = (graph: WeightedGraph, path: readonly string[]): number => {
  let total = 0;
  for (let index = 0; index < path.length - 1; index += 1) {
    const source = path[index];
    const target = path[index + 1];
    if (source === undefined || target === undefined) return Number.POSITIVE_INFINITY;
    const weight = edgeWeight(graph.edges, source, target);
    if (weight === null) return Number.POSITIVE_INFINITY;
    total += weight;
  }
  return total;
};

const reconstructPath = (
  predecessors: readonly NodePredecessor[],
  start: string,
  target: string,
): readonly string[] => {
  const previous = new Map(predecessors.map((entry) => [entry.id, entry.predecessor]));
  const path: string[] = [];
  let current: string | null = target;

  while (current !== null) {
    path.push(current);
    if (current === start) break;
    current = previous.get(current) ?? null;
  }

  if (path[path.length - 1] !== start) return [];
  return path.reverse();
};

const normalizeLayout = (layout: LayoutResult2D): LayoutResult2D => {
  const width = 640;
  const height = 360;
  const margin = 56;
  const xs = layout.nodes.map((node) => node.x);
  const ys = layout.nodes.map((node) => node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);

  return {
    links: layout.links,
    nodes: layout.nodes.map((node) => ({
      id: node.id,
      x: margin + ((node.x - minX) / spanX) * (width - margin * 2),
      y: margin + ((node.y - minY) / spanY) * (height - margin * 2),
    })),
  };
};

const selectedInterpretation = (mode: AlgorithmMode): string => {
  if (mode === "bfs") {
    return "fewest-edge objective: BFS visits by frontier layers, so the first target route minimizes hop count.";
  }
  if (mode === "dfs") {
    return "branch-first evidence: DFS explains one deterministic exploration order, not a shortest-path guarantee.";
  }
  return "lowest-weight objective: Dijkstra settles the smallest tentative distance using non-negative weights.";
};

export const buildGraphAlgorithmExplorerModel = (
  state: GraphAlgorithmExplorerState,
): KernelResult<GraphAlgorithmExplorerModel> => {
  const scenario = scenarios[state.graphScenario];
  const layout = forceDirected2D(scenario.layout, {
    seed: state.graphScenario === "weighted-detour" ? 17 : 41,
    iterations: 90,
    charge: -160,
    linkDistance: 96,
  });
  if (!layout.ok) return layout;

  const bfs = breadthFirstSearch(scenario.graph, scenario.start);
  if (!bfs.ok) return bfs;
  const dfs = depthFirstSearch(scenario.graph, scenario.start);
  if (!dfs.ok) return dfs;
  const dijkstra = dijkstraShortestPath(scenario.graph, scenario.start, scenario.target);
  if (!dijkstra.ok) return dijkstra;

  const traceMode = state.algorithmMode === "dfs" ? "dfs" : "bfs";
  const traversalTrace = traceTraversal(scenario.layout, scenario.start, traceMode);
  if (!traversalTrace.ok) return traversalTrace;

  const bfsPath = reconstructPath(bfs.value.predecessors, scenario.start, scenario.target);
  const bfsHopDistance =
    bfs.value.distances.find((distance) => distance.id === scenario.target)?.distance ??
    Number.POSITIVE_INFINITY;
  const traversalOrder = state.algorithmMode === "dfs" ? dfs.value.preorder : bfs.value.order;
  const selectedPath =
    state.algorithmMode === "dijkstra"
      ? dijkstra.value.path
      : state.algorithmMode === "dfs"
        ? dfs.value.preorder
        : bfsPath;
  const selectedCost =
    state.algorithmMode === "dijkstra" ? dijkstra.value.distance : pathCost(scenario.graph, selectedPath);

  return ok({
    scenario,
    mode: state.algorithmMode,
    layout: normalizeLayout(layout.value),
    traversalOrder,
    traversalTrace: traversalTrace.value,
    bfsPath,
    bfsHopCount: bfsHopDistance,
    bfsPathCost: pathCost(scenario.graph, bfsPath),
    dijkstraPath: dijkstra.value.path,
    dijkstraDistance: dijkstra.value.distance,
    selectedPath,
    selectedCost,
    interpretation: selectedInterpretation(state.algorithmMode),
  });
};

const edgeKey = (source: string, target: string): string => `${source}->${target}`;

const pathEdges = (path: readonly string[]): ReadonlySet<string> => {
  const keys = new Set<string>();
  for (let index = 0; index < path.length - 1; index += 1) {
    const source = path[index];
    const target = path[index + 1];
    if (source !== undefined && target !== undefined) keys.add(edgeKey(source, target));
  }
  return keys;
};

const GraphDiagram = ({ model }: { readonly model: GraphAlgorithmExplorerModel }) => {
  const nodeById = new Map(model.layout.nodes.map((node) => [node.id, node]));
  const highlighted = pathEdges(model.mode === "dijkstra" ? model.dijkstraPath : model.bfsPath);
  const visited = new Set(model.traversalOrder);

  return (
    <figure aria-label="Graph algorithm diagram" className="vector-stage vector-stage--product" role="img">
      <svg aria-hidden="true" viewBox="0 0 640 360">
        <rect fill="#f8fafc" height="360" rx="8" width="640" />
        {model.scenario.graph.edges.map((edge) => {
          const source = nodeById.get(edge.source);
          const target = nodeById.get(edge.target);
          if (source === undefined || target === undefined) return null;
          const isHighlighted = highlighted.has(edgeKey(edge.source, edge.target));
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          return (
            <g key={edgeKey(edge.source, edge.target)}>
              <line
                stroke={isHighlighted ? "#7c3aed" : "#94a3b8"}
                strokeLinecap="round"
                strokeWidth={isHighlighted ? 6 : 3}
                x1={source.x}
                x2={target.x}
                y1={source.y}
                y2={target.y}
              />
              <rect fill="#ffffff" height="24" rx="4" width="34" x={midX - 17} y={midY - 18} />
              <text
                fill="#334155"
                fontFamily="Arial, sans-serif"
                fontSize="16"
                fontWeight="700"
                textAnchor="middle"
                x={midX}
                y={midY}
              >
                {edge.weight ?? 1}
              </text>
            </g>
          );
        })}
        {model.layout.nodes.map((node) => {
          const isStart = node.id === model.scenario.start;
          const isTarget = node.id === model.scenario.target;
          const fill = isStart
            ? "#2563eb"
            : isTarget
              ? "#059669"
              : visited.has(node.id)
                ? "#ede9fe"
                : "#e2e8f0";
          const stroke = visited.has(node.id) && !isStart && !isTarget ? "#7c3aed" : "#ffffff";
          return (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} fill={fill} r="28" stroke={stroke} strokeWidth="3" />
              <text
                fill={isStart || isTarget ? "#ffffff" : "#0f172a"}
                fontFamily="Arial, sans-serif"
                fontSize="18"
                fontWeight="700"
                textAnchor="middle"
                x={node.x}
                y={node.y + 6}
              >
                {node.id}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        Purple edges show the compared route. Labels are weights in cost units; screen distance is only layout.
      </figcaption>
    </figure>
  );
};

const FormulaPanel = ({ model }: { readonly model: GraphAlgorithmExplorerModel }) => {
  const pathWeights = model.selectedPath
    .slice(0, -1)
    .map((source, index) => {
      const target = model.selectedPath[index + 1];
      return target === undefined ? null : edgeWeight(model.scenario.graph.edges, source, target);
    })
    .filter((weight): weight is number => weight !== null);
  const substitution =
    pathWeights.length > 0 ? pathWeights.join(" + ") : "branch trace has no single path-cost claim";
  const result = Number.isFinite(model.selectedCost)
    ? `${model.selectedCost} weight units`
    : "not a route cost";

  return (
    <section aria-label="Formula used" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Path-cost check</p>
      <h3>Formula used</h3>
      <pre aria-label="Path cost formula" className="formula-code">
        <code>
          <span className="formula-var formula-var--purple">cost(P)</span>
          {" = "}
          <span className="formula-var formula-var--blue">sum</span>
          {" "}
          <span className="formula-var formula-var--green">w(u, v)</span>
        </code>
      </pre>
      <p className="lab-kicker">Legend</p>
      <dl aria-label="Formula legend" className="formula-legend">
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> cost(P)
          </dt>
          <dd>total cost of the selected path, in weight units</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> sum
          </dt>
          <dd>add one term for each edge on the selected path</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> w(u, v)
          </dt>
          <dd>edge weight from node u to node v, in weight units</dd>
        </div>
      </dl>
      <p>Units: edge labels are measured in weight units.</p>
      <p>
        Substitution: selected path {formatOrder(model.selectedPath)} gives cost = {substitution} = {result}.
      </p>
      <p>Result: the selected path has total cost {result}.</p>
      <p>
        BFS comparison: {formatOrder(model.bfsPath)} uses {model.bfsHopCount} edge
        {model.bfsHopCount === 1 ? "" : "s"} and costs {model.bfsPathCost} weight units.
      </p>
      <p>
        Dijkstra comparison: {formatOrder(model.dijkstraPath)} costs {model.dijkstraDistance} weight units.
      </p>
      <p className="formula-note">
        The formula applies because a weighted path objective is the sum of edge labels along the represented route, not the drawing distance between nodes.
      </p>
    </section>
  );
};

const TracePanel = ({ model }: { readonly model: GraphAlgorithmExplorerModel }) => {
  const firstSteps = model.traversalTrace.steps.slice(0, 8);
  return (
    <dl aria-label="Trace evidence" className="result-readout result-readout--cards">
      <div>
        <dt>Visited order</dt>
        <dd>{formatOrder(model.traversalOrder)}</dd>
      </div>
      <div>
        <dt>Trace operations</dt>
        <dd>
          {firstSteps
            .map((step) => `${step.kind} ${String(step.value ?? "")}`.trim())
            .join(" | ")}
        </dd>
      </div>
      <div>
        <dt>Invariant</dt>
        <dd>{model.interpretation}</dd>
      </div>
    </dl>
  );
};

export const GraphAlgorithmExplorerSim = () => {
  const [state, setState] = useState<GraphAlgorithmExplorerState>(
    defaultGraphAlgorithmExplorerState,
  );
  const model = useMemo(() => buildGraphAlgorithmExplorerModel(state), [state]);

  return (
    <PredictionGate
      packageId={graphAlgorithmExplorerPackageId}
      predict={graphAlgorithmExplorerPredict}
      simId={graphAlgorithmExplorerSimId}
    >
      <section aria-label="Graph algorithm explorer" className="vector-lab vector-lab--product">
        <div className="vector-controls vector-controls--product" aria-label="Graph controls">
          <p className="lab-kicker">Manipulate the algorithm evidence</p>
          <ControlGroup legend="Algorithm and graph">
            <Selector
              label="Algorithm mode"
              onChange={(value) => setState((current) => ({ ...current, algorithmMode: value }))}
              options={modeOptions}
              value={state.algorithmMode}
            />
            <Selector
              label="Graph scenario"
              onChange={(value) => setState((current) => ({ ...current, graphScenario: value }))}
              options={scenarioOptions}
              value={state.graphScenario}
            />
          </ControlGroup>
          <div className="preset-strip" aria-label="Scenario presets">
            <button onClick={() => setState(defaultGraphAlgorithmExplorerState)} type="button">
              fewest-edge
            </button>
            <button
              onClick={() =>
                setState({ algorithmMode: "dijkstra", graphScenario: "weighted-detour" })
              }
              type="button"
            >
              lowest-weight
            </button>
            <button
              onClick={() => setState({ algorithmMode: "dfs", graphScenario: "tie-order" })}
              type="button"
            >
              branch trace
            </button>
          </div>
        </div>

        {model.ok ? (
          <section aria-label="Observation unlocked" role="region">
            <GraphDiagram model={model.value} />
            <h2>Algorithm evidence</h2>
            <p>{model.value.scenario.note}</p>
            <p>{model.value.interpretation}</p>
            <TracePanel model={model.value} />
            <FormulaPanel model={model.value} />
          </section>
        ) : (
          <p role="alert">The current graph cannot be evaluated: {model.error.message}</p>
        )}
      </section>
    </PredictionGate>
  );
};

export default GraphAlgorithmExplorerSim;
