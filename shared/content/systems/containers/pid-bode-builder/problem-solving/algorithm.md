# PID/Bode Tuning Algorithm

1. Write the plant \(G(s)\) and PID controller \(C(s)\).
2. Build the open loop \(L(s)=C(s)G(s)\).
3. Close negative unity feedback with \(T(s)=L(s)/(1+L(s))\).
4. Read the time response of \(T(s)\): peak, overshoot, settling time, and final error.
5. Read the Bode response of \(L(s)\): gain crossover, phase margin, phase crossover, and gain margin.
6. Compare the time-domain benefit with the robustness cost.
7. Retune one gain at a time and justify the tradeoff using both response views.

The decision rule is not "maximize gain." A tuning is acceptable only when it satisfies the task constraints for time response and leaves enough phase/gain margin for implementation uncertainty.
