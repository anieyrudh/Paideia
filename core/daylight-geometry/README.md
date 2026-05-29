# @paideia/daylight-geometry

Reusable daylight-geometry helpers for Paideia containers. The kernel covers
approximate solar declination, altitude, azimuth, shadow length, and vertical
window sun-path incidence samples.

It is not an ephemeris, timezone resolver, weather model, glare metric, or
building-energy simulator.

## Example

```ts
import { metres, radians } from "@paideia/shared";
import { dayOfYear, shadowLength, solarTimeHours } from "@paideia/daylight-geometry";

const day = dayOfYear(81);
const time = solarTimeHours(9);

if (day.ok && time.ok) {
  const shadow = shadowLength({
    latitudeRadians: radians(0),
    dayOfYear: day.value,
    solarTimeHours: time.value,
    objectHeightMetres: metres(2),
  });

  console.log(shadow);
}
```

All expected invalid inputs return `KernelResult.err(...)`; container code
should surface those errors instead of rendering `NaN` or `Infinity`.
