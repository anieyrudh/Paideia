# Problem-Solving Algorithm

1. State the interval length \(L\), the boundary condition, and the target
   shape \(f(x)\).
2. Choose the sine basis modes \(\phi_n(x)=\sin(n\pi x/L)\) that match the
   fixed-end boundary.
3. Compute each coefficient with
   \(c_n=(2/L)\int_0^L f(x)\sin(n\pi x/L)\,dx\).
4. Build the truncated reconstruction
   \(f_N(x)=\sum_{n=1}^{N}c_n\sin(n\pi x/L)\).
5. Compare the root-mean-square residual between \(f(x)\) and \(f_N(x)\).
6. Interpret the largest remaining residual: add the mode whose shape matches
   the missing sign pattern.
