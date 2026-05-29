# @paideia/equilibrium

Reusable equilibrium helpers for Paideia containers. The kernel covers
equilibrium constants, reaction quotients, `Q` versus `K` direction evidence,
and simple ICE-table concentration changes.

It is not a reaction balancer, symbolic equilibrium solver, chemistry data
table, or renderer.

## Example

```ts
import {
  compareReactionQuotient,
  concentrationMolar,
  equilibriumConstant,
  reactionQuotient,
} from "@paideia/equilibrium";

const a = concentrationMolar(0.5);
const b = concentrationMolar(0.2);
const k = equilibriumConstant(0.4);

if (a.ok && b.ok && k.ok) {
  const q = reactionQuotient({
    products: [{ species: "B", concentration: b.value, coefficient: 2 }],
    reactants: [{ species: "A", concentration: a.value, coefficient: 1 }],
  });

  if (q.ok) {
    const comparison = compareReactionQuotient({
      reactionQuotient: q.value,
      equilibriumConstant: k.value,
    });

    console.log(comparison);
  }
}
```

All expected invalid inputs return `KernelResult.err(...)`; container code
should surface those errors instead of rendering `NaN` or `Infinity`.
