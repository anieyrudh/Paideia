# @paideia/analog-electronics

Deterministic ideal analog-electronics calculations for Paideia simulations.

Use this package when a sim needs shared numbers for ideal inverting,
non-inverting, balanced difference, or inverting summing op-amp stages with
explicit output rail saturation. Rendering belongs in the consuming simulation.

## Example

```ts
import {
  idealInvertingAmplifier,
  ohms,
  volts,
} from "@paideia/analog-electronics";

const stage = idealInvertingAmplifier({
  inputVoltageVolts: volts(0.2),
  inputResistanceOhms: ohms(1_000),
  feedbackResistanceOhms: ohms(10_000),
  outputLimit: {
    positiveRailVolts: volts(5),
    negativeRailVolts: volts(-5),
  },
});
```

The call returns a `KernelResult`. Expected invalid inputs, such as zero
resistance or inverted output rails, return `err(...)` rather than throwing.

## Scope

This package models scalar ideal op-amp algebra. It does not model SPICE
netlists, arbitrary circuits, real op-amp bandwidth, slew rate, offset, bias
current, common-mode limits, noise, output impedance, filters, or transient
response.
