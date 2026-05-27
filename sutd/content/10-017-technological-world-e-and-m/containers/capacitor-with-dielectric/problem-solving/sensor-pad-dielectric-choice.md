# Transfer Problem: Sensor Pad Dielectric Choice

A capacitive sensor pad must reach at least `600 pF` while keeping electric
field strength below `20 kV/m`. The available dielectric has `kappa = 5.5`.
Choose plate area, plate separation, and applied voltage.

## Worked Strategy

Start by choosing a safe field. With `V = 10 V`, the minimum separation for the
field limit is:

```latex
d \ge \frac{V}{E_{max}}
= \frac{10\ V}{20,000\ V/m}
= 5.0\times10^{-4}\ m
```

Choose `d = 0.60 mm`, which gives:

```latex
E = \frac{10\ V}{0.00060\ m}
= 1.67\times10^{4}\ V/m
= 16.7\ kV/m
```

Now solve for area:

```latex
A =
\frac{Cd}{\kappa\epsilon_0}
=
\frac{(600\times10^{-12}\ F)(0.00060\ m)}
{(5.5)(8.854\times10^{-12}\ F/m)}
= 0.00740\ m^2
```

That is about `74.0 cm^2`.

## Rubric

- Converts pF, mm, and cm^2 to SI units before substitution.
- Uses `C = kappa epsilon0 A / d`, not `C = QV`.
- Checks `E = V / d` against the field limit.
- Explains that increasing dielectric constant or plate area raises capacitance
  without raising field strength.
- Explains that reducing separation raises capacitance but also raises field
  strength.
