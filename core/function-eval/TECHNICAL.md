# @paideia/function-eval technical notes

## Implementation

The kernel uses a hand-rolled lexer and recursive-descent parser. The grammar has no production for member access, indexing, assignment, object literals, template strings, `this`, or JavaScript calls. Function calls are resolved only through the static `allowedFunctions` table.

Compiled callables throw if their closed AST evaluates to a kernel error; `evaluateAt()` catches that throw and returns `undefined-at-point`. This keeps downstream samplers from receiving silent `NaN` values.

## Error contract

- Bad syntax, malformed numbers, duplicate free variables, and undeclared identifiers return `precondition-violated`.
- Out-of-domain `evaluateAt` calls return `out-of-domain`.
- Division by zero, non-finite function output, thrown raw function calls, and invalid math domains return `undefined-at-point`.

## Anieyrudh Filter pass

Diagnosis: the trust boundary is explicit because learner text is converted into a closed AST, never into executable JavaScript.

Falsifying scenario: an expression such as `sin.constructor('return process')()` or `__proto__.polluted` reaching runtime execution would fail the package; tests assert these shapes are rejected before evaluation.

Boundary decision: determinism stays in parser/evaluator code, while caller-supplied expression text is treated as untrusted cargo and must pass the whitelist plus declared-free-variable checks.

Remediation note: the previous hidden `WeakMap` for `safeFunction()` domains was replaced with a non-enumerable symbol on the returned function object, so there is no module-global mutable cache.
