# Problem-Solving Algorithm

This container is educational only. The algorithm uses two closed-form models for teaching, not for clinical decision-making.

1. Identify the clone's driver count `k`, per-driver advantage `s`, starting size `N`, and elapsed generations `g`.
2. Compute the relative fitness `F = (1 + s)^k`.
3. Compute the clone size at `g` generations: `N(g) = N * F^g`.
4. Compare with a baseline clone (e.g. `drivers = 0` giving `F = 1`) to surface the multiplicative effect of drivers.
5. Identify the therapy's `IC50`, `n`, and the dose `d` (or the target response `R*`).
6. Apply the Hill dose-response: `R(d) = d^n / (IC50^n + d^n)`.
7. If a resistance factor `f >= 1` is in play, replace `IC50` with `f * IC50` before plotting the curve or inverting it.
8. To find the dose for a target response, invert: `d* = IC50_eff * (R* / (1 - R*))^(1/n)`.
9. Compute the therapeutic index `TI = toxicDose / d*`. If `TI > 1`, the required dose is below the toxic dose; if `TI < 1`, the therapeutic window has closed under the current resistance profile.
10. Interpret in plain language. The result is not a clinical recommendation; it is a qualitative illustration of how driver-driven growth interacts with the dose-response curve and a resistance multiplier.
