# Problem-Solving Algorithm

1. Identify `T(e_1)` and `T(e_2)` — they are the two columns of `A`.
2. Check whether `T(e_1)` and `T(e_2)` are still mutually perpendicular and unit length: if both are unit-length and perpendicular, the transformation is a rotation or reflection (rigid motion).
3. Compute `det A`. Negative determinant signals a reflection (or a composite containing one). Zero determinant signals collapse to a lower dimension.
4. If `T(e_1)` and `T(e_2)` are perpendicular but not unit-length, the transformation is a scaling or scaled rotation; record the per-axis scale factors.
5. If one of the two columns equals the corresponding basis vector but the other has an off-diagonal component, the transformation is a shear.
6. If the columns combine more than one feature, write the transformation as a composite (for example, "rotate then scale") and decompose using the order of operations.
7. Verify by transforming a point off the basis (for example `(1, 1)`) and checking the result matches the expected composite.
