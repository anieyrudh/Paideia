# @paideia/systems-dynamics

Pure stock-flow helpers for conceptual systems dynamics simulations.

This package validates stock-flow models, creates initial state, evaluates
auxiliary variables, advances the system with deterministic Euler steps, and
returns time-series output. It does not parse equations, render diagrams, or
choose model parameters for a curriculum.

## Example

```ts
import { simulateSystem, systemVariableId } from "@paideia/systems-dynamics";

const requiredValue = (state: Readonly<Record<string, number>>, key: string): number => {
  const value = state[key];
  if (value === undefined) throw new Error(`Missing state value for ${key}`);
  return value;
};

const population = systemVariableId("population");
const births = systemVariableId("births");

if (population.ok && births.ok) {
  const result = simulateSystem(
    {
      stocks: [{ id: population.value, label: "Population", initial: 100, min: 0 }],
      flows: [
        {
          id: births.value,
          label: "Births",
          target: population.value,
          rate: (state) => requiredValue(state, "population") * 0.05,
        },
      ],
    },
    { dt: 1, duration: 10 },
  );

  // result.value is [{ t, state }, ...] when ok.
}
```

## Conventions

- Flow rates are evaluated from the caller-supplied state and time.
- Positive flow rate moves quantity from `source` to `target`.
- Missing state is rejected; it is never treated as zero.
- Euler integration is fixed-step and deterministic.
- For richer numerical ODE solvers, use `core/dynamical-systems`.
