# Pickup Coil Design

## Task

A pickup coil sees a magnetic field change from `50 mT` to `450 mT` in `0.25 s`.
The coil face is normal to the field. Design a coil that produces at least
`100 mV` without exceeding `25 mA` through its load.

Choose:

- number of turns;
- loop area;
- load resistance.

Then state the Lenz-law direction for increasing outward flux.

## Worked Design

Choose `N = 80` turns and `A = 10 cm^2 = 1.0e-3 m^2`.

```latex
\Delta \Phi = (0.450\ T - 0.050\ T)(1.0\times10^{-3}\ m^2)
= 4.0\times10^{-4}\ Wb
```

```latex
|\mathcal{E}| =
(80)\frac{4.0\times10^{-4}\ Wb}{0.25\ s}
= 0.128\ V
```

The design exceeds the `100 mV` target. To keep current below `25 mA`:

```latex
R \geq \frac{0.128\ V}{0.025\ A} = 5.12\ \Omega
```

A `10 ohm` load gives:

```latex
I = \frac{0.128\ V}{10\ \Omega} = 12.8\ mA
```

## Lenz Direction

If outward flux is increasing, the induced magnetic effect points into the page.
That direction opposes the increase in outward flux. It does not mean the coil
always opposes the applied field; it opposes the change in flux.

## Rubric

- Converts mT, cm^2, and seconds into SI units.
- Computes flux change through one turn before multiplying by turns.
- Uses Faraday's law for emf magnitude and Ohm's law for current.
- Chooses resistance from the current constraint instead of guessing.
- Explains Lenz direction from flux change.
