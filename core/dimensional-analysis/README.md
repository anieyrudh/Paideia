# @paideia/dimensional-analysis

Reusable dimensional-analysis kernel for Paideia simulations. It represents
physical dimensions as exponent vectors over the seven SI base dimensions, then
combines those vectors through multiplication, division, and powers.

Use this package when a sim needs to derive or check units such as speed,
acceleration, force, pressure, or any equation where both sides must have the
same physical dimension.

```ts
import {
  baseDimensions,
  diagnoseEquation,
  divideDimensions,
  formatDimension,
} from "@paideia/dimensional-analysis";

const speed = divideDimensions(baseDimensions.length, baseDimensions.time);

if (speed.ok) {
  console.log(formatDimension(speed.value)); // "L T^-1"
}

const invalid = diagnoseEquation(baseDimensions.length, baseDimensions.time, {
  left: "distance",
  right: "time",
});

if (invalid.ok && !invalid.value.valid) {
  console.log(invalid.value.message);
}
```

## Scope

- Pure TypeScript kernel. No React, DOM, parser, or symbolic algebra.
- Returns `KernelResult` for invalid preconditions and non-finite arithmetic.
- Keeps compatibility checks separate from physics truth: a dimensionally valid
  equation can still be the wrong model.
- Does not ship a broad unit registry. Callers declare the few units they need.

## License

MIT code. No runtime dependency was added beyond workspace `@paideia/shared`.
