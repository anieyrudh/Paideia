import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  breadthFirstSearch,
  depthFirstSearch,
  dijkstraShortestPath,
  type WeightedGraph,
} from "@paideia/graph-algorithms";
import { ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";

type TraversalMode = "BFS" | "DFS";
type GraphSearchState = { mode: TraversalMode };

interface GraphSearchModel {
  readonly mode: TraversalMode;
  readonly traversalOrder: readonly string[];
  readonly bfsDistanceToF: number;
  readonly dijkstraPath: readonly string[];
  readonly dijkstraDistance: number;
}

export const graphSearchPackageId =
  "sutd/csd/graph-search-and-shortest-paths" as ConceptPackageId;

export const graphSearchAndShortestPathsSpec: TSimulationSpec = {
  id: "graph-search-and-shortest-paths",
  title: "Graph Search and Shortest Paths",
  interaction_type: "algorithm-state-visualisation",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate", "core/graph-algorithms"],
  predict: {
    prompt: "Which statement is correct for directed non-negative weighted graphs?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "BFS and Dijkstra optimize the same objective.",
        "BFS minimizes edge count; Dijkstra minimizes total non-negative weight.",
        "DFS always returns a minimum-cost path first.",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "traversal-mode",
        label: "Traversal mode",
        kind: "selector",
        kernel_binding: "state.mode",
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "traversal-and-cost-panel",
        module: "local",
        symbol: "ObservePanel",
        props_binding: "Traversal order and Dijkstra cost comparison.",
      },
    ],
  },
  explain: {
    prompt: "Explain why edge-count shortest paths can differ from weighted shortest paths.",
    socratic: true,
    expected_misconceptions_surfaced: ["BFS minimizes weighted cost"],
  },
};

const exampleGraph: WeightedGraph = {
  directed: true,
  nodes: ["A", "B", "C", "D", "E", "F"].map((id) => ({ id })),
  edges: [
    { source: "A", target: "B", weight: 2 },
    { source: "A", target: "C", weight: 5 },
    { source: "B", target: "D", weight: 4 },
    { source: "B", target: "E", weight: 1 },
    { source: "C", target: "E", weight: 2 },
    { source: "D", target: "F", weight: 1 },
    { source: "E", target: "F", weight: 3 },
  ],
};

const distanceTo = (
  distances: readonly { readonly id: string; readonly distance: number }[],
  id: string,
): number => distances.find((distance) => distance.id === id)?.distance ?? Number.POSITIVE_INFINITY;

const formatOrder = (order: readonly string[]): string => order.join(" → ");

const nodePositions: Record<string, { readonly x: number; readonly y: number }> = {
  A: { x: 38, y: 78 },
  B: { x: 104, y: 38 },
  C: { x: 104, y: 118 },
  D: { x: 188, y: 34 },
  E: { x: 188, y: 112 },
  F: { x: 268, y: 78 },
};

export const graphSearchModel = (mode: TraversalMode): KernelResult<GraphSearchModel> => {
  const bfs = breadthFirstSearch(exampleGraph, "A");
  if (!bfs.ok) return bfs;
  const dfs = depthFirstSearch(exampleGraph, "A");
  if (!dfs.ok) return dfs;
  const dijkstra = dijkstraShortestPath(exampleGraph, "A", "F");
  if (!dijkstra.ok) return dijkstra;

  return ok({
    mode,
    traversalOrder: mode === "BFS" ? bfs.value.order : dfs.value.preorder,
    bfsDistanceToF: distanceTo(bfs.value.distances, "F"),
    dijkstraPath: dijkstra.value.path,
    dijkstraDistance: dijkstra.value.distance,
  });
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<GraphSearchState>();
  const mode = state.mode ?? "BFS";

  return (
    <section aria-label="Traversal controls" role="region">
      <fieldset>
        <legend>Traversal mode</legend>
        <label>
          <input
            checked={mode === "BFS"}
            name="traversal-mode"
            onChange={() => set("mode", "BFS")}
            type="radio"
          />
          BFS traversal
        </label>
        <label>
          <input
            checked={mode === "DFS"}
            name="traversal-mode"
            onChange={() => set("mode", "DFS")}
            type="radio"
          />
          DFS traversal
        </label>
      </fieldset>
      <button type="button" onClick={() => stage.advance()}>
        Reveal graph evidence
      </button>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = useSimState<Partial<GraphSearchState>>();
  const model = graphSearchModel(state.mode ?? "BFS");

  if (!model.ok) {
    return <p role="alert">The graph search model could not evaluate this graph.</p>;
  }

  const dijkstraEdges = new Set(
    model.value.dijkstraPath.slice(0, -1).map((node, index) => `${node}-${model.value.dijkstraPath[index + 1] ?? ""}`),
  );
  const visited = new Set(model.value.traversalOrder);

  return (
    <section aria-label="Observation unlocked" role="region">
      <h2>Search evidence</h2>
      <figure>
        <svg aria-label="Graph traversal diagram" role="img" viewBox="0 0 310 160" width="100%">
          <title>Directed graph with visited nodes and highlighted weighted path</title>
          <defs>
            <marker id="arrowhead" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="3">
              <path d="M0,0 L8,3 L0,6 Z" fill="#34423a" />
            </marker>
          </defs>
          {exampleGraph.edges.map((edge) => {
            const start = nodePositions[edge.source] ?? { x: 0, y: 0 };
            const end = nodePositions[edge.target] ?? { x: 0, y: 0 };
            const highlighted = dijkstraEdges.has(`${edge.source}-${edge.target}`);
            return (
              <g key={`${edge.source}-${edge.target}`}>
                <line
                  markerEnd="url(#arrowhead)"
                  stroke={highlighted ? "#d97706" : "#8aa097"}
                  strokeWidth={highlighted ? 4 : 2}
                  x1={start.x}
                  x2={end.x}
                  y1={start.y}
                  y2={end.y}
                />
                <text
                  fill="#23352d"
                  fontSize="11"
                  x={(start.x + end.x) / 2}
                  y={(start.y + end.y) / 2 - 4}
                >
                  {edge.weight}
                </text>
              </g>
            );
          })}
          {Object.entries(nodePositions).map(([id, point]) => (
            <g key={id}>
              <circle
                cx={point.x}
                cy={point.y}
                fill={visited.has(id) ? "#dff4e8" : "#ffffff"}
                r="15"
                stroke={model.value.dijkstraPath.includes(id) ? "#d97706" : "#256f5d"}
                strokeWidth="3"
              />
              <text fill="#17251f" fontSize="13" fontWeight="700" textAnchor="middle" x={point.x} y={point.y + 5}>
                {id}
              </text>
            </g>
          ))}
        </svg>
        <figcaption>
          Green nodes have been visited by {model.value.mode}; orange edges are the weighted
          Dijkstra path to F.
        </figcaption>
      </figure>
      <p>Traversal mode: {model.value.mode}</p>
      <p>Traversal order from node A: {formatOrder(model.value.traversalOrder)}</p>
      <p>Unweighted BFS path to F uses {model.value.bfsDistanceToF} edges.</p>
      <p>
        Dijkstra weighted shortest path: {formatOrder(model.value.dijkstraPath)} with total
        cost {model.value.dijkstraDistance}.
      </p>
      <p>Formula used: total path cost = sum of edge weights along the chosen path.</p>
      <p>Substitution: A → B → E → F = 2 + 1 + 3 = {model.value.dijkstraDistance}.</p>
      <p>Units: edge weights are cost units.</p>
      <p>Result: weighted shortest path cost is {model.value.dijkstraDistance}.</p>
      <p>Legend: orange = Dijkstra path, green fill = traversal visited node, grey = other edge.</p>
      <button type="button" onClick={() => stage.advance()}>
        Explain difference
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" role="region">
      <p>{graphSearchAndShortestPathsSpec.explain.prompt}</p>
      <p>
        Transfer: in a transport network, fewest hops can differ from lowest travel time
        when edge weights represent minutes instead of edges.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another traversal
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
      <p>Predict what BFS and Dijkstra optimize before revealing the graph evidence.</p>
      <button type="button" onClick={() => stage.advance()}>
        Choose traversal
      </button>
    </section>
  );
};

export default function GraphSearchAndShortestPaths() {
  return (
    <SimRuntime spec={graphSearchAndShortestPathsSpec} packageId={graphSearchPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
