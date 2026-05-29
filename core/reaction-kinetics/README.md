# @paideia/reaction-kinetics

Reusable first-year reaction-kinetics helpers for Paideia containers. The
kernel covers zero-order, first-order, and second-order integrated rate laws,
half-life comparisons, Arrhenius rate ratios, and bounded concentration-time
samples.

It is not a mechanism solver, fitting tool, graph renderer, or chemistry data
table.

## Example

```ts
import {
  concentrationMolar,
  rateConstant,
  sampleConcentrationSeries,
} from "@paideia/reaction-kinetics";
import { seconds } from "@paideia/shared";

const initial = concentrationMolar(1.2);
const k = rateConstant(0.08);

if (initial.ok && k.ok) {
  const series = sampleConcentrationSeries({
    order: 1,
    initialConcentration: initial.value,
    rateConstant: k.value,
    endSeconds: seconds(60),
    sampleCount: 7,
  });

  if (series.ok) {
    console.log(series.value);
  }
}
```

All expected invalid inputs return `KernelResult.err(...)`; container code
should surface those errors instead of rendering `NaN` or `Infinity`.
