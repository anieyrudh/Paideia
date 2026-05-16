export interface TraceStep {
  readonly kind: "compare" | "swap" | "set" | "visit" | "mark" | "annotate";
  readonly at: readonly number[];
  readonly value?: number | string;
  readonly note?: string;
}

export interface Trace<T> {
  readonly initial: readonly T[];
  readonly steps: readonly TraceStep[];
  readonly final: readonly T[];
  readonly meta: {
    readonly algorithm: string;
    readonly n: number;
    readonly comparisons: number;
    readonly swaps: number;
  };
}

export type SortAlgorithm = "bubble" | "insertion" | "selection" | "merge" | "quick" | "heap";
export type SearchAlgorithm = "linear" | "binary";
export type TraversalAlgorithm = "bfs" | "dfs";

export interface GraphNode {
  readonly id: string;
  readonly weight?: number;
}

export interface GraphLink {
  readonly source: string;
  readonly target: string;
  readonly strength?: number;
}

export interface Graph {
  readonly nodes: readonly GraphNode[];
  readonly links: readonly GraphLink[];
}
