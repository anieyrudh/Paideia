# @paideia/semiconductor-devices

Deterministic introductory semiconductor-device calculations for Paideia
simulations.

Use this package when a sim needs shared numbers for Shockley diode current,
diode voltage from current, a single-resistor diode load-line intersection, or
an ideal NMOS square-law operating point. Rendering belongs in the consuming
simulation.

## Example

```ts
import {
  amps,
  ampsPerVoltSquared,
  diodeShockleyCurrent,
  nmosSquareLawOperatingPoint,
  volts,
} from "@paideia/semiconductor-devices";

const diode = diodeShockleyCurrent({
  diodeVoltageVolts: volts(0.65),
  saturationCurrentAmps: amps(1e-12),
  emissionCoefficient: 1,
});

const mosfet = nmosSquareLawOperatingPoint({
  gateSourceVoltageVolts: volts(3.3),
  drainSourceVoltageVolts: volts(2),
  thresholdVoltageVolts: volts(1),
  transconductanceParameterAmpsPerVoltSquared: ampsPerVoltSquared(0.002),
});
```

The calls return `KernelResult`. Expected invalid inputs, such as zero
saturation current, impossible diode inverse current, or negative
drain-source voltage, return `err(...)` rather than throwing.

## Scope

This package models scalar teaching equations. It does not model SPICE
netlists, arbitrary nonlinear circuits, BJT devices, capacitance, breakdown,
noise, body effect, real datasheet corners, or process variation.
