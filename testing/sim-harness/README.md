# Sim Harness

Generic browser mount for Paideia simulations.

Content-level tests under `sims/<sim-id>/<sim-id>.test.ts` should import the
Playwright contract helpers from this package and pass a registered sim id. The
harness owns the Vite app and browser lifecycle, while each container owns its
prediction-gate assertion next to the sim spec.

## Register a sim

Add the exported sim component to `src/registry.tsx`:

```tsx
export const simRegistry = {
  "a-level/physics/scalars-and-vectors/resultant-magnitude": {
    id: "a-level/physics/scalars-and-vectors/resultant-magnitude",
    title: "Resultant Magnitude Explorer",
    Component: ResultantMagnitudeSim,
  },
};
```

## Run

```bash
pnpm -F @paideia/sim-harness test
```
