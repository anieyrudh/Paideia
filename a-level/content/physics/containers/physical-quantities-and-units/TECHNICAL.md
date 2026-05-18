# Technical Notes

## Architecture

The learner-facing renderer is owned by `@paideia/a-level-physics-sims` and is
mounted through `simulation/simulation.yaml`. The container surface imports the
renderer from `simulation/index.tsx`; reusable unit-fingerprint data and checks
live in the package rather than in the content folder.

The interaction model is a dimensional consistency checker. The sim compares SI
base-unit exponent vectors for both sides of a proposed equation. Multiplication
adds exponents, division subtracts exponents, and equality requires the final
left and right vectors to match exactly.

## Prediction-gate self-review

- The initial DOM is wrapped in `PredictionGate`; the equation verdict, balance table, and formula reasoning are children of the gate.
- The prediction prompt asks for the right-hand unit fingerprint of `force = mass × speed`; the unlocked verdict text is not rendered before commit.
- The sim package contract test asserts that `Observation unlocked` and `Impossible as written` are absent before committing a prediction.
- UI copy is student-facing: it refers to equation cards, fingerprints, and unit reasoning, not package names, YAML tokens, or implementation modules.

## Validation Notes

- `container.yaml` validates against `ContainerSpec` with `predict_at: per-sim`.
- `simulation/simulation.yaml` validates against `SimulationSpec` and declares the sim-level predict prompt.
- `simulation/simulation.test.ts` uses the shared prediction-gate harness.
- The embed API exposes `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.

## Failures and fixes recorded

- Initial productization exposed that the container had no `simulation/` surface. Added the canonical simulation files and moved the reusable dimensional checker into `@paideia/a-level-physics-sims`.
- The first branch setup found only a local `work` branch rather than a local `main` branch in this checkout. The product branch was created from the clean current checkout.
- Browser-based Playwright checks failed because the environment did not have the required Chromium executable. Attempting `pnpm -F @paideia/a-level-shell exec playwright install chromium` reached the Playwright CDN but received HTTP 403, so the browser install could not be fixed inside this run.

## Anieyrudh Filter pass

Date: 2026-05-17

- P0 answer leak check: passed. The prediction answer and dimensional verdicts are not in the rendered sim subtree until `PredictionGate` is committed.
- P0 pedagogy check: passed. The slice follows Predict → Manipulate → Observe → Explain → Transfer: predict the unit fingerprint, choose equation cards, observe the unit balance, explain base-unit reasoning, and transfer to the acceleration unit problem.
- P0 schema/container check: passed pending final validator run. The canonical simulation, embed, media, concept-map, and problem-solving surfaces are present.
- P1 product-quality check: passed. The UI uses an app-like equation card, base-unit balance, verdict panel, formula reasoning, and quantity shelf rather than a scaffold demo.
- P1 misconception coverage: passed. The lab directly surfaces “Unit as decoration” and “Dimension mismatch,” while the concept card and transfer problem address “Quantity equals number.”
- Deferred tradeoff: the checker uses a curated set of equation cards rather than free-form unit parsing, keeping the first product slice reliable and focused.
