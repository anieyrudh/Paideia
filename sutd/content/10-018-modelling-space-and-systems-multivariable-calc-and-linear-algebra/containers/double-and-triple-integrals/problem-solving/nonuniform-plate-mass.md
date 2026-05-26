# Transfer Problem: Nonuniform Plate Mass

A rectangular plate occupies \(0\le x\le 2\), \(0\le y\le 3\). Its areal
density is

```latex
\rho(x,y)=1+x+0.5y
```

kg/m². Find the total mass. Then extend the result to a box of height \(h=0.4\)
m with the same density through height.

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

For constant height, the volume accumulation is \(0.4M=6.6\) kg if the density
is interpreted per square metre and repeated uniformly through height.

## Rubric

- Bounds match the rectangular plate.
- Integrand includes both x and y terms.
- Units distinguish areal density from stacked volume interpretation.
- Final answer is checked against base area and average density.
