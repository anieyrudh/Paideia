# Coaxial Cable Field Check

## Prompt

A long charged conductor in a coaxial cable has line charge density `2.4 nC/m`.
At radius `0.8 m`, choose a Gaussian surface and compute flux through a `1.0 m`
length and the field magnitude.

## Expected Solution

Choose a cylindrical Gaussian surface coaxial with the conductor. The electric
field is radial, so the curved side contributes flux and the end caps contribute
zero.

```latex
Q_{enc} = \lambda L = (2.4\times10^{-9}\ C/m)(1.0\ m)
= 2.4\times10^{-9}\ C
```

```latex
\Phi_E = Q_{enc}/\epsilon_0
= 2.71\times10^2\ V\,m
```

```latex
A_G = 2\pi rL = 2\pi(0.8\ m)(1.0\ m) = 5.03\ m^2
```

```latex
E = \Phi_E/A_G = 5.39\times10^1\ V/m
```

The positive line charge gives outward radial flux.

## Rubric

- Correctly chooses a cylindrical Gaussian surface: 2 points.
- Computes enclosed charge from `lambda L`: 2 points.
- Uses only the curved side area `2 pi r L`: 2 points.
- Computes flux and field with units: 3 points.
- Interprets outward direction for positive charge: 1 point.
