# @paideia/uncertainty-propagation

Deterministic uncertainty-propagation kernels for Paideia measurement sims.

The package returns `KernelResult` values for expected invalid inputs and includes
display-ready calculation steps so React sims do not duplicate uncertainty rules
in UI code.

## Public API

- `measuredValue(value, absoluteUncertainty, opts?)`
- `absoluteUncertainty(measurement)`
- `relativeUncertainty(measurement)`
- `percentageUncertainty(measurement)`
- `addSubtractAbsoluteUncertainty(terms)`
- `multiplyDivideRelativeUncertainty(factors)`
- `powerUncertainty(measurement, exponent)`
- `repeatedReadingUncertainty(readings, opts?)`
- `instrumentResolutionUncertainty(resolution, opts?)`
- `chooseLargerUncertaintySource(sources)`
- `measurementUncertaintyFromSources(opts)`
- `formatUncertainty(measurement, opts?)`
- `uncertaintyTolerance`

## Example

```ts
import {
  measuredValue,
  multiplyDivideRelativeUncertainty,
} from "@paideia/uncertainty-propagation";
import { metres, seconds } from "@paideia/shared";

const distance = measuredValue(metres(2), metres(0.02), {
  label: "distance",
  unit: "m",
});
const time = measuredValue(seconds(0.8), seconds(0.02), {
  label: "time",
  unit: "s",
});

if (distance.ok && time.ok) {
  const speed = multiplyDivideRelativeUncertainty([
    { measurement: distance.value },
    { operation: "divide", measurement: time.value },
  ]);

  // speed.value.steps is ready for a sim notebook or explanation panel.
}
```

## Rules

- Addition and subtraction add absolute uncertainties.
- Multiplication and division add relative uncertainties.
- Powers use the simple first-order rule `|n| × relative uncertainty`.
- Repeated readings use half the range.
- When repeated readings and instrument resolution are both available, use the
  larger absolute uncertainty source.
