# Thermal Physics Problem-Solving Algorithm

## Decision Procedure

1. **Name the target.** Decide whether the unknown is gas pressure, gas volume, amount, thermodynamic temperature, or energy transferred by heating.
2. **Convert absolute gas-law temperature.** Use `T_K = T_C + 273.15` before substituting into `pV = nRT`.
3. **Keep pressure-volume units consistent.** `R = 8.314 J mol^-1 K^-1` works with SI units; `R = 8.314 kPa L mol^-1 K^-1` works with kPa and litres because `1 kPa L = 1 J`.
4. **Isolate the gas-law unknown.** Rearrange `pV = nRT` before substituting values.
5. **Use heat-transfer reasoning separately.** For a material sample, calculate `Q = mc Delta T`; do not treat temperature itself as an amount of energy.
6. **Interpret controlled variables.** At fixed `n` and `T_K`, pressure is proportional to `1/V`; at fixed mass and material, energy transfer is proportional to `Delta T`.

## Error Checks

- Celsius substituted into `pV = nRT` is a conceptual error, not a rounding issue.
- A temperature difference of `1 deg C` has the same size as `1 K`; an absolute temperature reading does not.
- Pressure should decrease when volume increases if amount and thermodynamic temperature are fixed.
- Heating a larger mass through the same temperature rise needs more energy.
