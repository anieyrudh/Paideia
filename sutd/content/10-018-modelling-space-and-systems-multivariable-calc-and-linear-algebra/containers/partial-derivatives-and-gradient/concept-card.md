---
subject: "10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra"
concept: partial-derivatives-and-gradient
branch: sutd
level: Undergraduate
syllabus_ref: SUTD 10.018 Modelling Space and Systems / partial derivatives and gradient
prerequisites:
  - single-variable-derivatives
  - contour-plots
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Partial Derivatives and Gradient

## First-Principles Explanation

For a surface \(z=f(x,y)\), a partial derivative changes one input while holding
the other fixed:

```latex
f_x(x_0,y_0)=\lim_{h\to 0}\frac{f(x_0+h,y_0)-f(x_0,y_0)}{h}
```

The gradient collects both local one-axis slopes into one vector:

```latex
\nabla f(x_0,y_0)=\langle f_x(x_0,y_0), f_y(x_0,y_0)\rangle
```

The dot product with a unit direction \(\mathbf u\) gives the directional
derivative:

```latex
D_{\mathbf u}f=\nabla f\cdot\mathbf u
```

This is why the gradient is more than two unrelated slopes. It is the local
linear model of the surface, and it points in the direction of fastest
first-order increase.

## Why It Matters

SUTD modelling problems use gradients for optimization, heat and concentration
maps, design sensitivity, machine-learning loss surfaces, and vector calculus.
Before Lagrange multipliers or divergence/curl make sense, learners need to see
that a contour plot, two partial derivatives, and a directional derivative are
the same local story.

## Canonical Example

For \(f(x,y)=x^2+xy+y^2\), at \((1,1)\),

```latex
\nabla f(1,1)=\langle 2x+y,\ x+2y\rangle_{(1,1)}=\langle 3,3\rangle
```

Moving in the unit direction \(\langle 1/\sqrt2,1/\sqrt2\rangle\) increases
the surface at \(3\sqrt2\) height units per unit step. Moving tangent to the
level curve has dot product zero, so the first-order height change is zero.

## Common Misconceptions

- The gradient does not run along a contour. It crosses contours toward the
  fastest increase.
- A partial derivative is not the whole slope of the surface. It is one
  component of the gradient.
- A zero directional derivative in one direction does not mean the point is a
  maximum or minimum. It may only mean that direction is tangent to a contour.
