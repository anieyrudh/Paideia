# @paideia/function-eval

Pure expression parsing, compilation, and scalar evaluation for Paideia math sims.

The package accepts a small arithmetic grammar, validates identifiers against caller-declared free variables, and exposes only the functions in `allowedFunctions`. It does not use JavaScript `eval`, the `Function` constructor, member access, or implicit global state.

## Public API

- `evaluate(expr, vars)`
- `compile(expr, freeVars)`
- `safeFunction(fn, domain)`
- `evaluateAt(f, x, domain?)`
- `allowedFunctions`
- `parseExpression(expr)`

All expected failures are returned as `KernelResult` values from `@paideia/shared`.

## Supported expression surface

- Numbers, variables, constants `pi` and `e`
- Operators `+`, `-`, `*`, `/`, and `^`
- Parentheses and comma-separated function calls
- Whitelisted functions such as `sin`, `cos`, `exp`, `ln`, `log`, `sqrt`, `abs`, `min`, `max`, and `pow`

The parser treats any unsupported character, unknown call, malformed number, or undeclared variable as `precondition-violated`.
