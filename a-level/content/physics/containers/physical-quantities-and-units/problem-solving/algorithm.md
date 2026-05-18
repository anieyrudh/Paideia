# Problem-Solving Algorithm

Use this when checking a measured quantity, conversion, or formula.

1. **Name the physical quantity.** Decide what is being measured or calculated before looking only at the number.
2. **Separate value from unit.** A measurement is incomplete unless it has both, such as `9.8 m s^-2` rather than only `9.8`.
3. **Classify the unit.** Ask whether the unit is an SI base unit such as `m`, `kg`, or `s`, or a derived unit such as `m s^-1`, `m s^-2`, or `N`.
4. **Reduce derived units into base dimensions.** For example, acceleration has dimension `L T^-2` because it is velocity change per unit time.
5. **Check operations before calculating.** Addition and comparison require matching dimensions; equations must have the same units on both sides.
6. **Explain the verdict.** State the unit reasoning, not only whether the answer is right or wrong.
7. **Convert using a ratio equal to one.** Conversion changes the numerical value and unit together without changing the physical quantity.

## Unit-balance examples

- `speed = distance / time` is allowed because `m / s = m s^-1`.
- `acceleration = velocity / time` is allowed because `(m s^-1) / s = m s^-2`.
- A recorded acceleration of `9.8 m s^-1` is blocked because `m s^-1` is speed units, not acceleration units.
- `distance = speed + time` is blocked because `m s^-1` and `s` are unlike dimensions and cannot be added.
