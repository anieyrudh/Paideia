# Problem-Solving Algorithm

1. Write the candidate vector `v` and confirm it is not the zero vector.
2. Multiply the matrix by the vector to find `Av`.
3. Compare `Av` with `v` component by component.
4. If a single scalar `lambda` satisfies `Av = lambda v`, report the eigenvector and eigenvalue.
5. Interpret `lambda` as the scale factor along the preserved direction, with units if the vector components carry units.
