# Transfer Problem: Nonuniform Plate Mass

A rectangular plate occupies \(0\le x\le 2\), \(0\le y\le 3\). Its areal
density is

```latex
\rho(x,y)=1+x+0.5y
```

kg/m². Find the total mass of the plate.

## Solution Sketch

```latex
M=\int_0^3\int_0^2 (1+x+0.5y)\,dx\,dy
```

Integrating first in \(x\):

```latex
\int_0^2 (1+x+0.5y)\,dx = 4+y
```

Then:

```latex
M=\int_0^3(4+y)\,dy=16.5\text{ kg}
```

Because \(\rho\) is an areal density, the double integral already returns the
plate mass in kg. A volume version would need a separate volumetric density in
kg/m³ before multiplying by height.

## Rubric

- Bounds match the rectangular plate.
- Integrand includes both x and y terms.
- Units distinguish areal density from stacked volume interpretation.
- Final answer is checked against base area and average density.
