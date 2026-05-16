# A-Level Physics Sims

Executable React harness for A-Level Physics container simulations.

## Current sims

- `resultant-magnitude` — first proof-of-concept sim for
  `a-level/content/physics/containers/scalars-and-vectors`.

## Usage

```tsx
import { ResultantMagnitudeSim } from "@paideia/a-level-physics-sims/resultant-magnitude";

export const Page = () => <ResultantMagnitudeSim />;
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
