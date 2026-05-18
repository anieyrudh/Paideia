# Unit and Dimension Consistency Algorithm

Use this routine whenever a formula, answer, or experimental note mixes physical
quantities.

1. **Name the target quantity.** Decide what the left side or requested answer is: length, time, velocity, acceleration, force, and so on.
2. **Attach the unit to every value.** A bare number is not a complete measurement.
3. **Expand derived units.** Replace units such as `N` with their base form when the comparison is unclear: `N = kg m s^-2`.
4. **Compare addable terms.** Quantities joined by `+` or `-` must have the same dimensions.
5. **Compare both sides.** The left and right sides of an equation must reduce to the same base dimensions.
6. **Only then calculate.** If the dimensions fail, the equation is impossible for that physical situation, no matter how neat the numbers look.
7. **Convert by ratios equal to one.** Unit conversion changes representation, not the physical quantity.

## Example

For `s = vt + 1/2 at`:

- `s` has dimension `L`.
- `vt` has `(L T^-1)(T) = L`.
- `at` has `(L T^-2)(T) = L T^-1`.

The second term is a velocity, not a length, so it cannot be added to `vt` as a
displacement term. The corrected kinematics form is `s = vt + 1/2 at^2` when
acceleration is constant and the symbols match the chosen convention.
