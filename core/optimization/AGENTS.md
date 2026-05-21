# core/optimization · agent contract

## What this module is
The deterministic optimization kernel for educational sims. It owns finite-difference gradient-descent traces over scalar landscapes, clipped linear-programming feasible regions, and one-period discrete newsvendor critical-fractile analysis. It returns pure data only: no rendering, no React state, no persistence, and no branch-specific behaviour.

## Public interface
Exports from `@paideia/optimization`:

- `Point2 = readonly [number, number]`
- `GradientSample = { point: Point2; value: number; gradient: Point2; stepSize: number }`
- `GradientDescentOptions = { learningRate?: number; maxSteps?: number; tolerance?: number; h?: number; domain?: Rect }`
- `GradientDescentTrace = { initial: GradientSample; steps: readonly GradientSample[]; converged: boolean; reason: 'converged' | 'max-steps' | 'out-of-domain' }`
- `LinearConstraint = { a: number; b: number; relation: '<=' | '>=' | '='; c: number }`
- `LinearObjective = { cx: number; cy: number; direction: 'min' | 'max' }`
- `FeasibleRegion = { domain: Rect; constraints: readonly LinearConstraint[]; vertices: readonly Point2[] }`
- `LinearProgramSolution = { point: Point2; value: number; activeConstraints: readonly number[] }`
- `OrderQuantityUnits = Brand<number, 'OrderQuantityUnits'>`
- `CostSgdPerUnit = Brand<number, 'CostSgdPerUnit'>`
- `ExpectedCostSgd = Brand<number, 'ExpectedCostSgd'>`
- `NewsvendorInput = { distribution: DiscreteDistribution; orderQuantity: OrderQuantityUnits; underageCost: CostSgdPerUnit; overageCost: CostSgdPerUnit; quantityStep?: OrderQuantityUnits }`
- `NewsvendorCdfPoint = { quantity: OrderQuantityUnits; probability: Probability; cumulativeProbability: Probability }`
- `NewsvendorCostCurvePoint = { quantity: OrderQuantityUnits; expectedCost: ExpectedCostSgd }`
- `NewsvendorAnalysis = { meanDemand: OrderQuantityUnits; criticalFractile: Probability; recommendedQuantity: OrderQuantityUnits; recommendedServiceLevel: Probability; selectedServiceLevel: Probability; selectedExpectedCost: ExpectedCostSgd; recommendedExpectedCost: ExpectedCostSgd; meanDemandExpectedCost: ExpectedCostSgd; cdf: readonly NewsvendorCdfPoint[]; costCurve: readonly NewsvendorCostCurvePoint[]; dominantPenalty: 'shortage' | 'surplus' }`
- `optimizationTolerance: { default: number; tight: number; loose: number }`
- `orderQuantityUnits(n: number): OrderQuantityUnits`
- `costSgdPerUnit(n: number): CostSgdPerUnit`
- `expectedCostSgd(n: number): ExpectedCostSgd`
- `gradientDescent(f: Function3D, start: Point2, opts?: GradientDescentOptions): KernelResult<GradientDescentTrace>`
- `linearFeasibleRegion(constraints: readonly LinearConstraint[], domain: Rect): KernelResult<FeasibleRegion>`
- `optimizeLinearObjective(region: FeasibleRegion, objective: LinearObjective): KernelResult<LinearProgramSolution>`
- `newsvendorCriticalFractile(input: NewsvendorInput): KernelResult<NewsvendorAnalysis>`

## Invariants the caller must preserve
- Objective functions are pure and deterministic. Same `(x, y)` must produce the same finite value unless the point is genuinely undefined.
- `GradientDescentOptions.learningRate`, `maxSteps`, `tolerance`, and `h` are positive finite numbers when supplied.
- `domain` and LP `Rect` bounds are finite and ordered with `min < max`.
- Linear constraints use finite coefficients and at least one of `a` or `b` is non-zero.
- LP feasible regions are clipped to the caller-supplied domain. This module does not claim an unbounded mathematical optimum outside that domain.
- Newsvendor distributions are finite, non-empty, and validated by `core/probability-stats` with probabilities summing to 1.
- Newsvendor underage and overage costs are finite, non-negative, and not both zero; `quantityStep` is positive and bounded so cost-curve generation cannot allocate pathological arrays.

## What this module does NOT do
- Does **not** solve high-dimensional nonlinear programs, mixed-integer programs, or general convex optimization.
- Does **not** solve multi-period inventory control, reorder-point policies, capacity-constrained stocking, or supplier lead-time models.
- Does **not** symbolically differentiate. Gradients are finite-difference samples of a supplied `Function3D`.
- Does **not** choose a learning rate adaptively or guarantee global optimality.
- Does **not** render contour plots or feasible polygons. Pair with `core/plotting` or `core/charting`.
- Does **not** memoise sampled function values across calls.

## When to consider this module
Use `core/optimization` when a simulation needs a canonical gradient-descent path over a 2D landscape, a clipped 2D linear-programming feasible polygon, a linear objective optimum over that polygon, or a one-period newsvendor critical-fractile decision over a discrete demand distribution. If a sim is about to hand-roll gradient steps, LP corner checks, or critical-ratio inventory logic, use this module instead.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (optimization, ML, ESD, and IB Math AI sims).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change to tolerance defaults, trace shape, or LP clipping semantics.

## Anti-patterns (will be rejected in PR review)
- Returning `NaN`/`Infinity` instead of a `KernelResult.err(...)`.
- Mutating constraints, domains, or trace arrays supplied by the caller.
- Hidden global random seeds, caches, or iteration counters.
- Claiming convergence when only the step length, not the gradient norm, is small.
- Treating a viewport-clipped LP solution as a proof about an unbounded real-world model.

## How the Anieyrudh Filter reads this module
The Filter probes that **visual claims about optimization match the kernel trace and corner solution**. A descent animation must move through the points returned by `gradientDescent`; an LP visualizer must shade exactly the polygon from `linearFeasibleRegion`; an optimum badge must cite `optimizeLinearObjective` rather than re-checking corners in UI code.
