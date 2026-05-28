# Parallel Container Wave - 2026-05-28

This file is the handoff list for external Codex or Claude Code instances. It removes duplicate aliases and groups promoted queue IDs into batches of at most 10. Each instance should still build one queue ID at a time, one branch and one PR per container.

## Rules

- Sync `main` before claiming work.
- Claim exactly one `ready-for-build` queue ID by changing it to `in-build` on the branch.
- Build one product-quality container per PR.
- Use the kernels listed in `docs/product/container-build-queue.yaml`; do not inline reusable math, science, or algorithms.
- Regenerate graph artifacts with `pnpm graph:generate` and require `pnpm graph:check` before PR.
- Run `pnpm container:validate`, `pnpm container:quality`, `pnpm roadmap:validate`, and the relevant package tests before PR.
- Resolve P0/P1 issues before asking for review. Record P2 follow-ups in `TECHNICAL.md`.

## Duplicate Aliases Removed

- alevel.physics.physical-quantities-and-units
- alevel.physics.resolving-vectors
- alevel.physics.kinematics-in-1d
- alevel.physics.forces-and-equilibrium
- alevel.physics.work-energy-power
- alevel.mathematics.normal-distribution
- alevel.mathematics.hypothesis-testing

These are not re-promoted because equivalent containers already exist under the reviewed build queue entries.

## Kernel-Available Promotions

These were previously held for deeper kernel or scope review. They are now ready because the reusable kernels landed on main:

- `core/fluid-mechanics` viscous and microfluidic helpers
- `core/semiconductor-devices`
- `core/analog-electronics`
- `core/complexity-theory`
- `core/distributed-data-systems`
- `core/statistical-inference`
- `core/stochastic-processes`
- `core/ml-linear-models`
- `core/ml-clustering`
- `core/computer-systems`

## Batches

### Batch A

- alevel.physics.projectile-motion
- sutd.10-022-modelling-uncertainty.conditional-probability-and-bayes
- sutd.10-022-modelling-uncertainty.central-limit-theorem
- sutd.10-023-designing-energy-systems.heat-transfer-modes
- sutd.40-012-manufacturing-and-service-operations-mso.scheduling-and-project-management
- sutd.10-022-modelling-uncertainty.discrete-rvs-geometric-binomial-poisson
- sutd.10-022-modelling-uncertainty.continuous-rvs-uniform-exponential
- sutd.10-022-modelling-uncertainty.joint-and-marginal-distributions
- sutd.10-022-modelling-uncertainty.linear-regression
- sutd.10-022-modelling-uncertainty.maximum-likelihood-estimation

### Batch B

- sutd.10-023-designing-energy-systems.open-systems-energy-balance
- sutd.10-023-designing-energy-systems.entropy-and-carnot-efficiency
- sutd.30-001-structures-and-materials.load-paths-and-free-body-diagrams
- sutd.30-001-structures-and-materials.stress-strain-and-material-behaviour
- sutd.30-001-structures-and-materials.statically-indeterminate-structures
- sutd.30-001-structures-and-materials.combined-loading
- sutd.30-001-structures-and-materials.fea-as-design-validation
- sutd.30-001-structures-and-materials.material-selection-and-failure
- sutd.30-103-fluid-mechanics.fluid-properties-and-reynolds-number
- sutd.30-103-fluid-mechanics.hydrostatics-and-buoyancy

### Batch C

- sutd.30-103-fluid-mechanics.bernoulli-equation
- sutd.30-103-fluid-mechanics.control-volume-analysis
- sutd.30-103-fluid-mechanics.laminar-vs-turbulent-pipe-flow
- sutd.electronics-3-x.digital-electronics
- sutd.electronics-3-x.circuit-basics-ohm-and-kirchhoff
- sutd.electronics-3-x.linear-network-analysis
- sutd.electronics-3-x.sinusoidal-ac-analysis
- sutd.electronics-3-x.transients
- sutd.50-004-algorithms.asymptotic-notation-and-complexity
- sutd.50-004-algorithms.sorting-algorithms-comparison-and-linear-time

### Batch D

- sutd.50-004-algorithms.heaps-and-priority-queues
- sutd.50-004-algorithms.binary-search-trees-and-avl-self-balancing
- sutd.50-004-algorithms.hashing-and-hash-tables
- sutd.50-004-algorithms.graph-search-bfs-dfs-topological-sort
- sutd.50-004-algorithms.shortest-path-bellman-ford-and-dijkstra
- sutd.50-004-algorithms.dynamic-programming
- sutd.50-043-database-systems.relational-model-and-er-diagrams
- sutd.50-043-database-systems.sql-fundamentals-and-joins-and-aggregation
- sutd.50-043-database-systems.functional-dependencies-and-normalization
- sutd.50-043-database-systems.indexing-and-query-optimisation

### Batch E

- sutd.50-043-database-systems.transactions-acid-concurrency-control
- sutd.10-023-designing-energy-systems.exergy-and-system-optimisation
- sutd.10-023-designing-energy-systems.photovoltaics-and-iv-curve
- sutd.10-023-designing-energy-systems.battery-sizing-and-solar-placement

### Batch F

- sutd.30-103-fluid-mechanics.navier-stokes-and-viscous-flow
- sutd.30-103-fluid-mechanics.microfluidic-devices
- sutd.electronics-3-x.diodes
- sutd.electronics-3-x.op-amps-intro-and-applications
- sutd.electronics-3-x.mosfet-as-amplifier-and-switch
- sutd.50-004-algorithms.np-completeness-and-reductions
- sutd.50-043-database-systems.big-data-hdfs-and-spark
- sutd.40-017-probability-and-statistics.poisson-process
- sutd.40-017-probability-and-statistics.hypothesis-testing-two-sample-t-tests
- sutd.50-005-computer-systems-engineering.process-management-and-scheduling

### Batch G

- sutd.50-007-machine-learning.linear-regression-canonical
- sutd.50-007-machine-learning.unsupervised-learning-k-means-and-k-medoids
- sutd.40-017-probability-and-statistics.conditional-distributions-and-conditional-independence
- sutd.40-017-probability-and-statistics.bayesian-statistics-intro
- sutd.40-017-probability-and-statistics.regression-dummy-variables-variable-selection
