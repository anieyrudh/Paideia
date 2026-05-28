# core/ml-linear-models · agent contract

## What this module is
The deterministic ML linear-models kernel for Paideia simulations. It owns
teaching-scale univariate ordinary least squares, linear prediction, and mean
squared error. It is pure TypeScript and returns `KernelResult` values for
expected invalid inputs.

## Public interface
Exports from `@paideia/ml-linear-models`:

- `mlLinearTolerance: { readonly default: number; readonly tight: number; readonly loose: number }`
- `type Point2D`
- `type LinearModel`
- `type FitUnivariateLinearRegressionInput`
- `type LinearRegressionFit`
- `type PredictLinearInput`
- `type MeanSquaredErrorInput`
- `fitUnivariateLinearRegression(input: FitUnivariateLinearRegressionInput): KernelResult<LinearRegressionFit>`
- `predictLinear(input: PredictLinearInput): KernelResult<number>`
- `meanSquaredError(input: MeanSquaredErrorInput): KernelResult<number>`

## Invariants the caller must preserve
- Points and model coefficients are finite numbers.
- Fitting requires at least two points and non-zero variation in `x`.
- The kernel is deterministic and does not split data, train iteratively, or use
  random initialisation.

## What this module does NOT do
- Does **not** import ML frameworks or numerical packages.
- Does **not** implement multivariate regression, classification, regularisation,
  gradient descent, model selection, or train/test splitting.
- Does **not** hide branch-specific datasets, feature transforms, or presets.

## When to consider this module
Use `core/ml-linear-models` when a sim is about to inline a teaching-scale
univariate OLS fit, a linear prediction, or MSE calculation. If a sim needs a
full ML framework, define a separate future contract.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current ML sim that would
   consume the new primitive.
2. Add property tests for every new estimator or loss invariant.
3. Use `core!:` for public API changes that alter coefficient, residual, or
   loss semantics.

## Anti-patterns
- Adding hidden randomness, data splits, or training loops.
- Adding TensorFlow, scikit-learn, ONNX, or other ML runtime dependencies.
- Mutating caller-provided point arrays.
- Adding branch-specific feature engineering.

## How the Anieyrudh Filter reads this module
The Filter checks that linear-model visuals report coefficients, predictions,
and loss values consistent with this kernel. It rejects visuals that imply a
trained ML framework when this closed-form teaching model is being used.
