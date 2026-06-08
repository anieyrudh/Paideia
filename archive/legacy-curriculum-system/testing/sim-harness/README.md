# Sim Harness

Generic browser mount for Paideia simulations.

Content-level tests under `simulation/simulation.test.ts` should import the
Playwright contract helpers from this package and pass a registered sim id. The
harness owns the Vite app and browser lifecycle, while each container owns its
prediction-checkpoint assertion next to the sim spec.

## Register a sim

Declare the simulation in the container metadata:

```yaml
simulation:
  spec: simulation/simulation.yaml

observe:
  renderers:
    - module: "@paideia/a-level-physics-sims/resultant-magnitude"
```

Then run `pnpm graph:generate`. The generator emits
`src/generated/sim-registry.tsx` with static imports for Vite and Playwright.

## Run

```bash
pnpm -F @paideia/sim-harness test
```
