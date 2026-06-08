# Problem-Solving Algorithm

1. Identify the ions that cross this membrane: typically K+, Na+, and Cl-.
2. Note each ion's bath concentration and the cell's internal concentration.
3. Compute the Nernst potential per ion using `E = (RT / zF) ln(C_out / C_in)` at body temperature (310.15 K).
4. Rank the ions by permeability. The most permeable ion will pull the resting voltage closest to its Nernst potential.
5. Apply the Goldman-Hodgkin-Katz equation for the resting voltage:

   ```latex
   V_m = (R T / F) ln(
     (P_K [K+]_out + P_Na [Na+]_out + P_Cl [Cl-]_in)
     / (P_K [K+]_in + P_Na [Na+]_in + P_Cl [Cl-]_out)
   )
   ```

6. Estimate equilibration time and flux direction. Use Fick's first law `J = P (C_out - C_in)` for the steady single-ion flux, and the cell-geometry estimate `t = L^2 / (6 D)` for how long the bath takes to mix on the length scale `L` of the cell.
7. Compare the result with the K+ Nernst potential. If `V_m` is far from `E_K`, identify which ion's permeability is responsible.
8. Interpret the result in plain language: "the membrane is K-dominant", "Na permeability is rising", or "Cl- is pulling the voltage toward `E_Cl`".
