import { useMemo, useState } from "react";
import { SimRuntime } from "@paideia/sim-runtime";
import { PredictionGate } from "@paideia/prediction-gate";
import spec from "./simulation.yaml";

type NodeId = "A"|"B"|"C"|"D"|"E"|"F";
type Edge = { from: NodeId; to: NodeId; w: number };
const edges: Edge[] = [
  { from: "A", to: "B", w: 2 },{ from: "A", to: "C", w: 5 },{ from: "B", to: "D", w: 4 },
  { from: "B", to: "E", w: 1 },{ from: "C", to: "E", w: 2 },{ from: "D", to: "F", w: 1 },{ from: "E", to: "F", w: 3 }
];
const neighbors = (n: NodeId) => edges.filter((e) => e.from === n).map((e) => e.to);
const bfs = (): NodeId[] => { const q: NodeId[]=["A"]; const seen=new Set<NodeId>(["A"]); const out:NodeId[]=[]; while(q.length){const n=q.shift()!; out.push(n); for(const m of neighbors(n)){if(!seen.has(m)){seen.add(m); q.push(m);}}} return out; };
const dfs = (): NodeId[] => { const st: NodeId[]=["A"]; const seen=new Set<NodeId>(); const out:NodeId[]=[]; while(st.length){const n=st.pop()!; if(seen.has(n)) continue; seen.add(n); out.push(n); const ns=[...neighbors(n)].reverse(); for(const m of ns) st.push(m);} return out; };
const dijkstraDistance = (): number => { const dist: Record<NodeId, number>={A:0,B:Infinity,C:Infinity,D:Infinity,E:Infinity,F:Infinity}; const un=new Set<NodeId>(["A","B","C","D","E","F"]); while(un.size){let u:NodeId|undefined; let best=Infinity; for(const n of un){if(dist[n]<best){best=dist[n];u=n;}} if(!u) break; un.delete(u); for(const e of edges.filter((x)=>x.from===u)){dist[e.to]=Math.min(dist[e.to], dist[u]+e.w);} } return dist.F; };

export default function GraphSearchAndShortestPaths() {
  const [mode, setMode] = useState<"BFS"|"DFS">("BFS");
  const order = useMemo(() => (mode === "BFS" ? bfs() : dfs()), [mode]);
  const pathCost = useMemo(() => dijkstraDistance(), []);
  const bfsEdges = 2 + 4 + 1;

  return <SimRuntime spec={spec} renderStage={(stage) => {
    if (stage === "predict") return <PredictionGate spec={spec.predict ?? null} />;
    if (stage === "manipulate") return <fieldset><legend>Traversal choice</legend><label><input aria-label="BFS traversal" type="radio" checked={mode==="BFS"} onChange={()=>setMode("BFS")} />BFS</label><label><input aria-label="DFS traversal" type="radio" checked={mode==="DFS"} onChange={()=>setMode("DFS")} />DFS</label></fieldset>;
    if (stage === "observe") return <div><p>Traversal order from node A: <strong>{order.join(" → ")}</strong></p><p>Unweighted BFS path to F uses {bfsEdges} edges.</p><p>Dijkstra weighted shortest path cost to F: {pathCost} = 0 + 2 + 1 + 3.</p></div>;
    if (stage === "explain") return <div><p>{spec.explain.prompt}</p><p>Interpretation: BFS minimizes number of edges in unweighted search, while Dijkstra minimizes total non-negative weight.</p></div>;
    return null;
  }} />;
}
