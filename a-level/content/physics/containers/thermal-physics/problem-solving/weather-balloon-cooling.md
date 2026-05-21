# Transfer Problem: Weather Balloon Cooling

## Prompt

A weather balloon contains a fixed amount of gas. At launch, the gas is at
`20 deg C`, pressure is `100 kPa`, and volume is `2.4 m^3`. Higher in the
atmosphere, the gas temperature is `-30 deg C` and the outside pressure is
`40 kPa`. Assume the gas behaves ideally and the amount of gas is unchanged.

1. Calculate the balloon volume at altitude.
2. Explain why Celsius cannot be substituted directly.
3. Explain whether the balloon's temperature reading alone tells you the total internal energy.

## Worked Route

Convert temperatures first:

```text
T1 = 20 + 273.15 = 293.15 K
T2 = -30 + 273.15 = 243.15 K
```

For fixed `n`, use:

```text
p1 V1 / T1 = p2 V2 / T2
```

Rearrange:

```text
V2 = p1 V1 T2 / (p2 T1)
```

Substitute:

```text
V2 = (100 kPa)(2.4 m^3)(243.15 K) / ((40 kPa)(293.15 K))
V2 = 4.98 m^3
```

## Rubric

- Full credit: converts both temperatures to kelvin, rearranges the combined gas law, gives volume with units, and explains temperature is not total internal energy.
- Partial credit: correct proportional reasoning but missing one unit or interpretation.
- No credit: substitutes Celsius into the gas law or treats lower temperature as automatically lower total internal energy without considering amount of gas.
