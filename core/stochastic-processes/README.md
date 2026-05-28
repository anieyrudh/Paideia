# @paideia/stochastic-processes

Deterministic finite stochastic-process calculations for Paideia simulations.

Use this package when a sim needs shared numbers for finite Markov-chain
transition validation or deterministic distribution propagation.

## Example

```ts
import { nextDistribution } from "@paideia/stochastic-processes";

const result = nextDistribution({
  distribution: [1, 0],
  transitionMatrix: [
    [0.7, 0.3],
    [0.2, 0.8],
  ],
});
```

The call returns a `KernelResult`. Expected invalid inputs, such as non-square
or non-stochastic matrices, return `err(...)` rather than throwing.

## Scope

This package models deterministic finite Markov-chain arithmetic. It does not
sample paths, fit transition matrices, or model continuous-time processes.
