# @paideia/sim-runtime

`@paideia/sim-runtime` is the platform kernel for PMOE-T simulations. It owns the stage machine, validates `SimulationSpec` at mount time, exposes read-only runtime state through hooks, and places observe/explain rendering behind `@paideia/prediction-gate`.

## Public API

- `SimRuntime` wraps one simulation instance.
- `useStage()` reads the current PMOE-T stage and returns `advance()` / `reset()`.
- `useTransition()` returns the current stage transition snapshot while a transition is active.
- `useSimState<S>()` reads the shallow-frozen simulation state.
- `useManipulate<S>()` returns state plus `set(k, v)` and may only be used during the `manipulate` stage.

The exported stage type is:

```ts
type PmoeTStage = "predict" | "manipulate" | "observe" | "explain";
```

## Invariants

- `SimulationSpec.safeParse` must pass before children mount.
- Stages move forward only: `predict -> manipulate -> observe -> explain`.
- `reset()` returns the runtime to `predict` and clears per-session runtime state.
- Observe and explain children are wrapped in `PredictionGate`.
- If a valid `SimulationSpec` has no sim-level `predict`, observe/explain rendering is blocked rather than revealed.
- State mutation is available only through `useManipulate().set` during the `manipulate` stage.

This package does not compute domain results, render charts, run animation loops, or persist runtime state.
