import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { ConceptPackageId } from "@paideia/shared";
import spec from "./simulation.yaml";

type LPState = { x: number; y: number };
const packageId = "sutd/esd/linear-programming-feasible-region" as ConceptPackageId;
const clamp = (v: number): number => Math.min(10, Math.max(0, v));

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<LPState>();
  const x = clamp(state.x ?? 2);
  const y = clamp(state.y ?? 2);
  return (
    <section>
      <label htmlFor="x-control">x units</label>
      <input id="x-control" type="range" min={0} max={10} step={1} value={x} onChange={(e) => set("x", Number(e.currentTarget.value))} />
      <label htmlFor="y-control">y units</label>
      <input id="y-control" type="range" min={0} max={10} step={1} value={y} onChange={(e) => set("y", Number(e.currentTarget.value))} />
      <button type="button" onClick={() => stage.advance()}>Observe this point</button>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const s = useSimState<Partial<LPState>>();
  const x = clamp(s.x ?? 2);
  const y = clamp(s.y ?? 2);
  const c1 = x + y;
  const c2 = 2 * x + y;
  const c3 = x + 3 * y;
  const z = 3 * x + 2 * y;
  return <section><p>x+y={x}+{y}={c1} ≤ 10 {c1 <= 10 ? "✓" : "✗"}</p><p>2x+y=2({x})+{y}={c2} ≤ 14 {c2 <= 14 ? "✓" : "✗"}</p><p>x+3y={x}+3({y})={c3} ≤ 18 {c3 <= 18 ? "✓" : "✗"}</p><p>Z=3x+2y=3({x})+2({y})={z} value-units. Interpretation: {c1<=10&&c2<=14&&c3<=18?"feasible point":"infeasible point"}.</p><button type="button" onClick={() => stage.advance()}>Explain</button></section>;
};

const ExplainStage = () => {
  const stage = useStage();
  return <section><p>Explain which constraints are binding and why corner points matter.</p><p>Transfer problem: maximize Z=4x+3y under x+y≤12, x+2y≤14, x,y≥0. Use substitution and interpret.</p><button type="button" onClick={() => stage.reset()}>Try another point</button></section>;
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") return <ExplainStage />;
  return <section><p>Commit a prediction to unlock reveal, then manipulate a point.</p><button type="button" onClick={() => stage.advance()}>Start manipulating</button></section>;
};

export default function LinearProgrammingFeasibleRegion() {
  return <SimRuntime spec={spec} packageId={packageId}><StageSurface /></SimRuntime>;
}
