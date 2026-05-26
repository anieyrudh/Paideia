# Transfer Problem: Temperature Surface Gradient

A plate has temperature

```latex
T(x,y)=40+2x^2+xy+3y^2
```

in degrees Celsius. A sensor is at \((1,2)\). Find the direction of fastest
temperature increase and estimate the temperature change for a \(0.1\) m move
in the unit direction \(\mathbf u=\langle 3/5,4/5\rangle\).

## Solution Sketch

```latex
T_x=4x+y,\qquad T_y=x+6y
```

At \((1,2)\),

```latex
\nabla T(1,2)=\langle 6,13\rangle
```

The fastest increase direction is the normalized gradient:

```latex
\frac{\nabla T}{\|\nabla T\|}=\frac{\langle 6,13\rangle}{\sqrt{205}}
```

The directional derivative in \(\mathbf u\) is

```latex
D_{\mathbf u}T=\langle 6,13\rangle\cdot\langle 3/5,4/5\rangle=14
```

For a \(0.1\) m move, the local linear estimate is a \(1.4^\circ\)C increase.

## Rubric

- Computes both partial derivatives correctly.
- Evaluates the gradient at the sensor point.
- Normalizes the fastest-increase direction.
- Uses a dot product for the requested direction.
- States the estimate with temperature units and a local-linear caveat.
