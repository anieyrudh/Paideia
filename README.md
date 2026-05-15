# Paideia

> Open educational infrastructure. Concept-mastery learning across institutions.
> Predict → Manipulate → Observe → Explain → Transfer.

[![CI](https://github.com/Paideia/paideia/actions/workflows/ci.yml/badge.svg)](https://github.com/Paideia/paideia/actions/workflows/ci.yml)
[![Accessibility](https://github.com/Paideia/paideia/actions/workflows/accessibility.yml/badge.svg)](https://github.com/Paideia/paideia/actions/workflows/accessibility.yml)
[![Boundary](https://github.com/Paideia/paideia/actions/workflows/boundary-check.yml/badge.svg)](https://github.com/Paideia/paideia/actions/workflows/boundary-check.yml)
[![License](https://github.com/Paideia/paideia/actions/workflows/license-check.yml/badge.svg)](https://github.com/Paideia/paideia/actions/workflows/license-check.yml)

## Branches

- [`a-level/`](./a-level/) — Paideia A-Level. SG A-Level (SEAB 2027). Production: _TBD_
- [`sutd/`](./sutd/) — Paideia SUTD. SUTD Freshmore AY2026. Production: _TBD_

## Core modules

The shared foundation that every branch consumes. Each module owns a stable
contract under `core/<module>/AGENTS.md`. See [docs/core-modules.md](docs/core-modules.md) for the full inventory.

- [`core/aniegpt/`](./core/aniegpt/) — The Anieyrudh Filter (canonical critique engine)
- [`core/content-schema/`](./core/content-schema/) — Zod schemas: `ConceptPackageSpec`, `SimulationSpec`, etc.
- [`core/shared/`](./core/shared/) — Universal type vocabulary (`Function2D`, `Renderable<T>`, `KernelResult<T>`)
- [`core/prediction-gate/`](./core/prediction-gate/) — Predict-before-reveal primitive
- [`core/sim-runtime/`](./core/sim-runtime/) — PMOE-T state machine
- [`core/scaffolder/`](./core/scaffolder/) — `new-container` CLI

## The Container model

The unit of work is a **ConceptPackage** (a container). A container holds one
or more sims plus its concept card, decision matrix, transfer problems,
misconceptions, sources, and assessments. The student launches the container;
the prediction gate opens; items inside become accessible. The catalogue lists
containers, not sims.

See [docs/container-spec.md](docs/container-spec.md) for the canonical layout.

## Quickstart

```bash
# Clone and install
git clone https://github.com/Paideia/paideia.git && cd paideia
pnpm install

# Validate that all containers conform to the layout spec
pnpm container:validate

# Run boundary + license checks locally
pnpm boundary
pnpm license:check

# Run all tests
pnpm test

# Scaffold a new container (interactive)
pnpm container:new
```

## Documentation

- [Mission and governance](docs/README.md)
- [Container specification](docs/container-spec.md) — uniform layout for every concept package
- [Core module inventory](docs/core-modules.md)
- [GitHub configuration](docs/github-setup.md)
- [Anieyrudh Filter (canonical)](core/aniegpt/aniegpt-system-prompt.md)
- Per-branch briefs in each branch's folder.

## License

- **Code**: [MIT](LICENSE)
- **Content** (curriculum, concept cards, decision matrices, sources): [CC-BY-4.0](LICENSE-content)
- **Third-party**: enumerated in [NOTICE](NOTICE). Allowlist in [LICENSES.json](LICENSES.json).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All PRs run the Anieyrudh Filter, the
container-auditor subagent, and a boundary check that forbids cross-branch
imports.
