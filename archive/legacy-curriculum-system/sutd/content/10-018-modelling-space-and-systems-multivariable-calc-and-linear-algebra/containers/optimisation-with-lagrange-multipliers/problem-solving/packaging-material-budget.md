# Transfer Problem: Packaging Material Budget

A design has profit

```latex
P(x,y)=12x+9y-x^2-y^2
```

and a material budget

```latex
g(x,y)=x^2/16+y^2/9=1
```

Find the constrained-optimum equations and explain what \(\lambda\) means.

## Solution Sketch

```latex
\nabla P=\langle 12-2x,\ 9-2y\rangle
```

```latex
\nabla g=\langle x/8,\ 2y/9\rangle
```

The Lagrange system is

```latex
12-2x=\lambda x/8,\qquad 9-2y=\lambda 2y/9,\qquad x^2/16+y^2/9=1
```

Solving gives candidate feasible designs. \(\lambda\) measures marginal profit
per unit relaxation of the material-budget constraint.

## Rubric

- Computes both gradients correctly.
- Includes the constraint equation in the system.
- Evaluates feasible candidates rather than only solving the gradient equation.
- Interprets \(\lambda\) as sensitivity.
