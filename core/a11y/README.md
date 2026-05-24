# @paideia/a11y

Pure accessibility evidence helpers for Paideia tests and shell code.

This package does not run axe or Playwright. Test packages run the browser scan,
then pass axe-style violations into these helpers to apply the same severity
language everywhere.

## Example

```ts
import { assertA11yBudget } from "@paideia/a11y";

const result = assertA11yBudget(axeResults.violations, {
  critical: 0,
  serious: 0,
});

if (!result.ok) {
  throw new Error(result.error.message);
}
```

## Conventions

- Impact order is `minor < moderate < serious < critical`.
- Missing impact is counted as `minor`.
- `summarizeA11yViolations()` defaults to blocking `serious` and `critical`.
- Budgets are explicit. A test that only sets `{ critical: 0 }` is only making
  a critical-violation claim.
- Malformed violation records return `KernelResult.err(...)`; they are not
  filtered out silently.
- Accessible names collapse whitespace before validation.
- DOM id tokens must be non-empty and contain no whitespace.
