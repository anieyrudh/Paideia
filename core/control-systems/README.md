# @paideia/control-systems

Pure continuous-time control-system helpers for Paideia simulations. The package owns transfer-function arithmetic, PID controller construction, unity-feedback closure, frequency-response sampling, and step-response sampling.

It does not render plots or controls. Compose it with `@paideia/plotting`, `@paideia/charting`, `@paideia/ui-sim`, and `@paideia/sim-runtime` for learner-facing simulations.

## Exports

- `transferFunction`
- `evaluateTransferFunction`
- `multiplyTransferFunctions`
- `addTransferFunctions`
- `closeUnityFeedbackLoop`
- `pidController`
- `stepResponse`
- `bode`
- `controlTolerance`

## Usage

```ts
import {
  bode,
  closeUnityFeedbackLoop,
  multiplyTransferFunctions,
  pidController,
  stepResponse,
  transferFunction,
} from "@paideia/control-systems";
import { seconds } from "@paideia/shared";

const plant = transferFunction([1], [1, 1]); // 1 / (s + 1)
const controller = pidController({ kp: 2, ki: 1, kd: 0 });

if (plant.ok && controller.ok) {
  const openLoop = multiplyTransferFunctions(controller.value, plant.value);
  if (openLoop.ok) {
    const closedLoop = closeUnityFeedbackLoop(openLoop.value);
    if (closedLoop.ok) {
      const response = stepResponse(closedLoop.value, {
        durationSeconds: seconds(5),
        dtSeconds: seconds(0.01),
      });

      const frequency = bode(closedLoop.value, [0.1, 1, 10]);
      console.log(response, frequency);
    }
  }
}
```

Coefficients are descending powers of `s`. `transferFunction([2, 4], [2, 6])` is normalized to numerator `[1, 2]` and denominator `[1, 3]`.
