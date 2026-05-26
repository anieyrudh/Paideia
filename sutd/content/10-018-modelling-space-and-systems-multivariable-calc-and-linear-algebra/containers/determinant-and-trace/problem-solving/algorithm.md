# Problem-Solving Algorithm

1. Identify the four entries `a`, `b`, `c`, `d` of the 2x2 matrix `A`.
2. Compute the determinant `D = ad - bc`.
3. Compute the trace `T = a + d`.
4. Read `D` as the signed area scale factor; a negative value means the transformation flips orientation, zero means dimension collapse.
5. Read `T` as the sum of the two eigenvalues `lambda_1 + lambda_2 = T` and `D = lambda_1 lambda_2`.
6. Compute the discriminant `T^2 - 4D` to classify the eigenvalues: positive means real and distinct, zero means a real repeated root, negative means complex conjugates.
7. For 2D linear-system stability, classify the origin from the sign pattern of `T` and `D` on the trace-determinant plane: `D > 0` and `T < 0` is a stable node or spiral, `D > 0` and `T > 0` is unstable, `D < 0` is a saddle.
