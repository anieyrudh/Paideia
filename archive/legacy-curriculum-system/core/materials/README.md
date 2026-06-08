# @paideia/materials

Pure material-property helpers for Paideia simulations.

Use this package when a container needs a reference answer for yield strain,
simplified tensile response, safety factor, or Ashby-style performance ranking.
The package does not include a material database; callers provide cited property
records from their container sources.

```ts
import {
  densityKgPerCubicMetre,
  pascals,
  performanceIndex,
  strain,
  stressAtStrain,
} from "@paideia/materials";

const demoMaterial = {
  id: "demo-ductile",
  name: "Demo ductile material",
  class: "metal" as const,
  density: densityKgPerCubicMetre(1000),
  youngModulus: pascals(10e9),
  yieldStrength: pascals(50e6),
  ultimateStrength: pascals(80e6),
};

if (
  demoMaterial.density.ok &&
  demoMaterial.youngModulus.ok &&
  demoMaterial.yieldStrength.ok &&
  demoMaterial.ultimateStrength.ok
) {
  const material = {
    ...demoMaterial,
    density: demoMaterial.density.value,
    youngModulus: demoMaterial.youngModulus.value,
    yieldStrength: demoMaterial.yieldStrength.value,
    ultimateStrength: demoMaterial.ultimateStrength.value,
  };
  const index = performanceIndex(material, "specific-strength");
  const probe = strain(0.001);
  const point = probe.ok ? stressAtStrain(material, probe.value) : probe;
  console.log(index, point);
}
```

## Model

`stressAtStrain` is a teaching model:

- elastic up to yield strain `epsilon_y = sigma_y / E`;
- linear hardening from yield to ultimate when `fractureStrain` is supplied;
- ductile stress beyond yield requires `fractureStrain`, so the kernel does not
  invent a fracture point;
- brittle elastic-to-fracture behavior when no yield strength is supplied.

Use this for first-pass concept simulations, not as a replacement for nonlinear
materials testing, fatigue analysis, creep, fracture mechanics, or FEA.

## Data ownership

Property values belong in containers with citations. This kernel validates and
uses records supplied by a caller; it does not ship a hidden material library.
