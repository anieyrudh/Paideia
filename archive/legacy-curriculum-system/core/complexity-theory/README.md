# @paideia/complexity-theory

Deterministic finite complexity-theory evidence helpers for Paideia
simulations.

Use this package when a sim needs shared results for explicit finite language
membership, finite certificate verification, or many-one reduction preservation
over a displayed sample table.

## Example

```ts
import {
  checkFiniteManyOneReductionEvidence,
  finiteWord,
} from "@paideia/complexity-theory";

const a = finiteWord("a");
const fa = finiteWord("f(a)");

if (a.ok && fa.ok) {
  const evidence = checkFiniteManyOneReductionEvidence({
    reductionName: "toy-reduction",
    samples: [{
      sourceWord: a.value,
      targetWord: fa.value,
      sourceDecision: "accept",
      targetDecision: "accept",
    }],
  });
}
```

The call returns a `KernelResult`. Expected invalid inputs, such as blank
reduction names or empty word strings, return `err(...)` rather than throwing.

## Scope

This package models finite teaching evidence only. It does not prove class
membership, infer reductions, parse machines, run SAT solvers, or decide
infinite languages.
