# Problem-Solving Algorithm

1. Identify the 2x2 matrix entries `a`, `b`, `c`, `d`.
2. Compute trace `T = a + d` and determinant `D = ad - bc`.
3. Write the characteristic polynomial `lambda^2 - T lambda + D = 0`.
4. Compute the discriminant `T^2 - 4D` and classify: positive means two distinct real eigenvalues, zero means one repeated real eigenvalue, negative means complex conjugate eigenvalues.
5. Solve for the eigenvalues using `lambda = (T plus or minus sqrt(T^2 - 4D)) / 2`. For the complex case, report the real part and imaginary magnitude.
6. For each real eigenvalue `lambda_k`, find the eigenspace by solving `(A - lambda_k I) v = 0`. Any non-zero solution is an eigenvector for `lambda_k`.
7. Verify by checking that `A v_k` equals `lambda_k v_k`.
8. Interpret the result: do the eigenvectors give a real coordinate basis that diagonalises `A`, or does `A` act by rotation and scaling without a real invariant line?
