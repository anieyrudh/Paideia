import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type A11yImpact = "minor" | "moderate" | "serious" | "critical";

export interface A11yViolationNode {
  readonly target?: readonly string[];
  readonly html?: string;
  readonly failureSummary?: string;
}

export interface A11yViolation {
  readonly id: string;
  readonly impact?: A11yImpact | null;
  readonly description?: string;
  readonly help?: string;
  readonly nodes?: readonly A11yViolationNode[];
}

export interface A11yImpactCounts {
  readonly minor: number;
  readonly moderate: number;
  readonly serious: number;
  readonly critical: number;
}

export type A11yBudget = Partial<A11yImpactCounts>;

export interface A11yScanSummary {
  readonly total: number;
  readonly counts: A11yImpactCounts;
  readonly highestImpact: A11yImpact | null;
  readonly blockingViolations: readonly A11yViolation[];
}

export type AccessibleName = Brand<string, "A11y.AccessibleName">;
export type DomIdToken = Brand<string, "A11y.DomIdToken">;

const impactOrder = {
  minor: 0,
  moderate: 1,
  serious: 2,
  critical: 3,
} satisfies Record<A11yImpact, number>;

export const impactRank = (impact: A11yImpact): number => impactOrder[impact];

export const accessibleName = (value: string): KernelResult<AccessibleName> => {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length === 0
    ? err("precondition-violated", "Accessible name must contain visible text")
    : ok(collapsed as AccessibleName);
};

export const domIdToken = (value: string): KernelResult<DomIdToken> => {
  if (value.length === 0 || value.trim() !== value || /\s/.test(value)) {
    return err(
      "precondition-violated",
      "DOM id token must be non-empty, trimmed, and contain no whitespace",
    );
  }

  return ok(value as DomIdToken);
};

export const violationsAtOrAbove = (
  violations: readonly A11yViolation[],
  minimumImpact: A11yImpact,
): KernelResult<readonly A11yViolation[]> => {
  const validated = validateViolations(violations);
  if (!validated.ok) return validated;

  return ok(
    violations.filter((violation) => {
      const impact = normalizeImpact(violation);
      return impactRank(impact) >= impactRank(minimumImpact);
    }),
  );
};

export const summarizeA11yViolations = (
  violations: readonly A11yViolation[],
  minimumImpact: A11yImpact = "serious",
): KernelResult<A11yScanSummary> => {
  const validated = validateViolations(violations);
  if (!validated.ok) return validated;

  const counts = emptyMutableCounts();
  let highestImpact: A11yImpact | null = null;

  for (const violation of violations) {
    const impact = normalizeImpact(violation);
    counts[impact] += 1;
    if (highestImpact === null || impactRank(impact) > impactRank(highestImpact)) {
      highestImpact = impact;
    }
  }

  const blockingViolations = violationsAtOrAbove(violations, minimumImpact);
  if (!blockingViolations.ok) return blockingViolations;

  return ok({
    total: violations.length,
    counts,
    highestImpact,
    blockingViolations: blockingViolations.value,
  });
};

export const assertA11yBudget = (
  violations: readonly A11yViolation[],
  budget: A11yBudget,
): KernelResult<A11yScanSummary> => {
  const validBudget = validateBudget(budget);
  if (!validBudget.ok) return validBudget;

  const summary = summarizeA11yViolations(violations, "minor");
  if (!summary.ok) return summary;

  for (const impact of a11yImpacts) {
    const allowed = budget[impact];
    if (allowed !== undefined && summary.value.counts[impact] > allowed) {
      const budgetSummary = withBudgetBlockingViolations(summary.value, budget);
      return err(
        "precondition-violated",
        `A11y budget exceeded for ${impact}: allowed ${allowed}, got ${summary.value.counts[impact]}`,
        budgetSummary,
      );
    }
  }

  return ok(withBudgetBlockingViolations(summary.value, budget));
};

const a11yImpacts = ["minor", "moderate", "serious", "critical"] as const;

const emptyMutableCounts = (): Record<A11yImpact, number> => ({
  minor: 0,
  moderate: 0,
  serious: 0,
  critical: 0,
});

const normalizeImpact = (violation: A11yViolation): A11yImpact =>
  violation.impact ?? "minor";

const withBudgetBlockingViolations = (
  summary: A11yScanSummary,
  budget: A11yBudget,
): A11yScanSummary => ({
  ...summary,
  blockingViolations: summary.blockingViolations.filter((violation) => {
    const impact = normalizeImpact(violation);
    const allowed = budget[impact];
    return allowed !== undefined && summary.counts[impact] > allowed;
  }),
});

const validateViolations = (
  violations: readonly A11yViolation[],
): KernelResult<readonly A11yViolation[]> => {
  for (const violation of violations) {
    if (violation.id.length === 0 || violation.id.trim() !== violation.id) {
      return err("precondition-violated", "A11y violation id must be non-empty and trimmed");
    }

    if (violation.impact !== undefined && violation.impact !== null) {
      const knownImpact = a11yImpacts.includes(violation.impact);
      if (!knownImpact) {
        return err("out-of-domain", `Unknown a11y impact: ${String(violation.impact)}`);
      }
    }
  }

  return ok(violations);
};

const validateBudget = (budget: A11yBudget): KernelResult<A11yBudget> => {
  for (const impact of a11yImpacts) {
    const value = budget[impact];
    if (value === undefined) continue;
    if (!Number.isInteger(value) || value < 0) {
      return err("out-of-domain", `${impact} budget must be a non-negative integer`);
    }
  }

  return ok(budget);
};
