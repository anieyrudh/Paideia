# @paideia/electromagnetism

Pure electromagnetism helpers for simulations: point charges, ideal dielectric
capacitors, Gauss-law symmetric flux surfaces, uniform-flux induction, and
electromagnetic waves.

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

```ts
import {
  coulombs,
  gaussLawSymmetricFieldModel,
} from "@paideia/electromagnetism";

const gaussianSphere = gaussLawSymmetricFieldModel({
  symmetry: "spherical",
  enclosedChargeCoulombs: coulombs(2e-9),
  radiusMetres: 0.2,
});

if (gaussianSphere.ok) {
  console.log(gaussianSphere.value.electricFluxVoltsMetres);
}
```

All public inputs use SI units: coulombs, metres, square metres, newtons per
coulomb, volts, joules, and volt-metres for electric flux. The package performs
no rendering and has no branch-specific logic.
