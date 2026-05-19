import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import spec from "./simulation.yaml";

type SimState = { kp?: number; ki?: number; kd?: number };

function StageView() {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateView />;
  if (stage.current === "observe") return <ObserveView />;
  if (stage.current === "explain") return <div>{spec.explain.prompt}</div>;
  return <div>Make and commit your prediction to unlock observation.</div>;
}

function ManipulateView() {
  const { state, set } = useManipulate<SimState>();
  return <div>
    <label>Proportional gain Kp <input type="range" min={0} max={8} step={0.1} value={state.kp ?? 1.2} onChange={(e)=>set("kp", Number(e.currentTarget.value))}/></label>
    <label>Integral gain Ki <input type="range" min={0} max={4} step={0.05} value={state.ki ?? 0.8} onChange={(e)=>set("ki", Number(e.currentTarget.value))}/></label>
    <label>Derivative gain Kd <input type="range" min={0} max={2} step={0.05} value={state.kd ?? 0.2} onChange={(e)=>set("kd", Number(e.currentTarget.value))}/></label>
  </div>;
}
function ObserveView() { const s = useSimState<SimState>(); return <div>Current gains: Kp={s.kp ?? 1.2}, Ki={s.ki ?? 0.8}, Kd={s.kd ?? 0.2}.</div>; }

export default function PidStepResponse() { return <SimRuntime spec={spec} packageId="pid-step-response"><StageView /></SimRuntime>; }
