import { SimRuntime } from "@paideia/sim-runtime";
import { PredictionGate } from "@paideia/prediction-gate";
import spec from "./simulation.yaml";

const dot = (r1: number, r2: number, x: number, y: number) => r1 * x + r2 * y;

export default function VectorTransformations() {
  const x = 1;
  const y = 1;
  const a11 = 2;
  const a12 = 1;
  const a21 = 0;
  const a22 = 1;
  const xPrime = dot(a11, a12, x, y);
  const yPrime = dot(a21, a22, x, y);
  return <SimRuntime spec={spec} renderStage={(stage) => stage === "predict" ? <PredictionGate spec={null} /> : <div aria-live="polite"><p>Computed result: T(1,1)=({xPrime},{yPrime}).</p><p>Formula: x' = ({a11})(1) + ({a12})(1) = {xPrime}; y' = ({a21})(1)+({a22})(1) = {yPrime}.</p><p>Interpretation: basis vector e1 maps to ({a11},{a21}), e2 maps to ({a12},{a22}).</p><p>Invariant-direction check: test d=(1,0). T(d)=({a11},{a21}). It stays on same line only if a21 = 0.</p></div>} />;
}
