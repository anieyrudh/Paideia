# core/a11y - agent contract

## What this module is

Pure accessibility evidence helpers for shells, simulation harnesses, and
container tests. It owns impact-level ordering, axe-style violation summaries,
explicit accessibility budgets, and small validators for accessible names and
DOM id tokens. It returns values only; browser automation and axe execution live
in test packages and app shells.

This package is the shared vocabulary for "no critical violations" and "no
serious or critical violations" so containers do not each reinvent filtering
logic.

## Public interface

Exports from `@paideia/a11y`:

- `A11yImpact = "minor" | "moderate" | "serious" | "critical"`
- `A11yViolationNode = { target?: readonly string[]; html?: string; failureSummary?: string }`
- `A11yViolation = { id: string; impact?: A11yImpact | null; description?: string; help?: string; nodes?: readonly A11yViolationNode[] }`
- `A11yImpactCounts = { minor: number; moderate: number; serious: number; critical: number }`
- `A11yBudget = Partial<A11yImpactCounts>`
- `A11yScanSummary = { total: number; counts: A11yImpactCounts; highestImpact: A11yImpact | null; blockingViolations: readonly A11yViolation[] }`
- `AccessibleName = Brand<string, "A11y.AccessibleName">`
- `DomIdToken = Brand<string, "A11y.DomIdToken">`
- `impactRank(impact: A11yImpact): number`
- `accessibleName(value: string): KernelResult<AccessibleName>`
- `domIdToken(value: string): KernelResult<DomIdToken>`
- `violationsAtOrAbove(violations: readonly A11yViolation[], minimumImpact: A11yImpact): KernelResult<readonly A11yViolation[]>`
- `summarizeA11yViolations(violations: readonly A11yViolation[], minimumImpact?: A11yImpact): KernelResult<A11yScanSummary>`
- `assertA11yBudget(violations: readonly A11yViolation[], budget: A11yBudget): KernelResult<A11yScanSummary>`

## Invariants the caller must preserve

- Violation ids must be non-empty trimmed strings.
- Known impacts are ordered `minor < moderate < serious < critical`.
- Missing impact is treated as `minor` for counting and as non-blocking unless
  the caller explicitly budgets `minor`.
- Budgets must contain finite non-negative integers.
- `summarizeA11yViolations()` defaults to blocking `serious` and `critical`
  violations.
- Accessible names must be non-empty after whitespace collapse.
- DOM id tokens must be non-empty, trimmed, and contain no whitespace.
- Inputs are never mutated.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not run axe, Playwright, browsers, screenshots, or DOM queries.
- Does not define visual design, contrast palettes, focus styles, or CSS.
- Does not suppress rules or approve known violations.
- Does not import branch-specific shells, generated graph data, or containers.
- Does not replace manual accessibility review for learning quality.

## When to consider this module

Use `core/a11y` when a test or shell needs canonical severity filtering,
accessibility-budget checks, accessible-name validation, or shared language for
axe-style violation summaries. If a test is about to hand-roll
`violation.impact === "critical" || violation.impact === "serious"`, use this
module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current test/shell consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to severity ordering, default blocking threshold,
   or budget semantics.

## Anti-patterns (will be rejected in PR review)

- Importing Playwright, axe, jsdom, or DOM globals into this pure kernel.
- Silently ignoring malformed violation records.
- Treating moderate issues as automatically acceptable in all contexts.
- Branch-specific thresholds (`if SUTD then critical only`).
- Mutable global allowlists or hidden suppression registries.

## How the Anieyrudh Filter reads this module

The Filter probes that accessibility claims name the actual severity threshold
used. A container may say "no critical violations" only when that is the budget
tested; it may not let that phrase imply a full accessibility pass.
