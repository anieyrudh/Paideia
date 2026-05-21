# @paideia/electromagnetism

Pure point-charge electromagnetism helpers for simulations.

```ts
import { coulombs, pointChargeModel } from "@paideia/electromagnetism";

const model = pointChargeModel({
  sourceChargeCoulombs: coulombs(0.5e-6),
  testChargeCoulombs: coulombs(-20e-9),
  pointMetres: [0.15, 0],
  minRadiusMetres: 0.025,
});

if (model.ok) {
  console.log(model.value.electricFieldStrengthNewtonsPerCoulomb);
}
```

All public inputs use SI units: coulombs, metres, newtons per coulomb, volts,
and joules. The package performs no rendering and has no branch-specific logic.
