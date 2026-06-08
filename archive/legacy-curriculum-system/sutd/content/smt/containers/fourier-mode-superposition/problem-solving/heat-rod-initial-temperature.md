# Transfer Rubric: Heat Rod Initial Temperature

Use the same projection logic on a temperature profile rather than a string
displacement.

| Criterion | Full-credit evidence |
| --- | --- |
| Basis choice | Uses sine modes because the rod ends are fixed at the reference temperature. |
| Coefficients | Computes \(c_n=(2/L)\int_0^L f(x)\sin(n\pi x/L)\,dx\) with substituted values and units. |
| Reconstruction | Writes \(f_N(x)=\sum c_n\sin(n\pi x/L)\) and includes each kept mode once. |
| Error comparison | Names which added mode reduces the RMS residual most and explains the sign pattern. |
| Interpretation | Explains that each mode evolves separately in the heat model after decomposition. |
