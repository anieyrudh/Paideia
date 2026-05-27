# Algorithm

1. Parameterise the path as `r(t)` over the chosen interval.
2. Compute the tangent `r'(t)` and sample the vector field along the path.
3. Integrate `F(r(t)) . r'(t) dt`.
4. If `F = grad(phi)`, compare the result with `phi(end) - phi(start)`.
5. Use matching endpoint potential change as the certificate for path independence.
