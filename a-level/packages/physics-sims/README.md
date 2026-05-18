# A-Level Physics Sims

Executable React harness for A-Level Physics container simulations.

## Current sims

- `measurement-uncertainty` — product-slice lab for
  `a-level/content/physics/containers/physical-quantities-and-units`.
- `resultant-magnitude` — vector resultant lab for
  `a-level/content/physics/containers/scalars-and-vectors`.
- `resolving-vectors` — component resolution lab for
  `a-level/content/physics/containers/resolving-vectors`.

## Usage

```tsx
import { MeasurementUncertaintyLab } from "@paideia/a-level-physics-sims/measurement-uncertainty";

export const Page = () => <MeasurementUncertaintyLab />;
```

Content containers keep their canonical `simulation/index.tsx` entrypoint,
but executable code lives here until the A-Level learner app route exists. This
keeps workspace typecheck and tests inside an installable package while the
container remains the product record.

## Local checks

```bash
pnpm -F @paideia/a-level-physics-sims build
pnpm -F @paideia/a-level-physics-sims test
```
