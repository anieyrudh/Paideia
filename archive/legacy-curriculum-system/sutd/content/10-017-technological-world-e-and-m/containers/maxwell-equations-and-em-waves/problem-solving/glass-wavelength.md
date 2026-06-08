# Glass Wavelength Transfer Problem

## Problem

A 500 THz electromagnetic wave has wavelength 600 nm in vacuum and 400 nm in a glass slab. Estimate the refractive index and wave speed in the slab.

## Solution

Frequency stays fixed when the wave crosses the boundary. Use v = f lambda.

```text
v_glass = (5.00 x 10^14 Hz)(400 x 10^-9 m)
        = 2.00 x 10^8 m/s
```

The refractive index is

```text
n = c / v_glass
  = (3.00 x 10^8 m/s) / (2.00 x 10^8 m/s)
  = 1.50
```

Equivalently, compare wavelengths at fixed frequency:

```text
n = lambda_vacuum / lambda_glass = 600 nm / 400 nm = 1.50
```

## Rubric

- Full credit: keeps frequency fixed, computes v = 2.00 x 10^8 m/s, and reports n = 1.50.
- Partial credit: gets the wavelength ratio but does not connect it to wave speed.
- Misconception flag: says glass makes the wave faster because the material is denser or more polarizable.
