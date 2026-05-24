# @paideia/digital-logic

Pure digital-logic helpers for Paideia simulations.

Use this package when a container needs canonical gate outputs, binary addition,
truth tables, small sum-of-products expressions, or a single D flip-flop
transition. UI, circuit drawing, timing diagrams, and learner state live outside
this package.

```ts
import {
  binaryStringToBits,
  bitsToBinaryString,
  rippleCarryAdd,
  sumOfProducts,
} from "@paideia/digital-logic";

const a = binaryStringToBits("1011");
const b = binaryStringToBits("0110");

if (a.ok && b.ok) {
  const added = rippleCarryAdd(a.value, b.value);
  if (added.ok) {
    console.log(bitsToBinaryString([...added.value.sum, added.value.carryOut]));
  }
}

const sop = sumOfProducts(["A", "B", "C"], [3, 5, 6, 7]);
if (sop.ok) {
  console.log(sop.value.expression); // BC + AC + AB
}
```

## Bit order

Arithmetic vectors are least-significant bit first. `binaryStringToBits("1010")`
returns `[0, 1, 0, 1]`; `bitsToBinaryString` renders back to the student-facing
MSB-first string.

## Scope

This kernel does not render circuits, parse HDL, simulate propagation delay, or
hold sequential state across calls. Simulations should use it for the reference
answer and render their own circuit boards, waveforms, and explanations.
