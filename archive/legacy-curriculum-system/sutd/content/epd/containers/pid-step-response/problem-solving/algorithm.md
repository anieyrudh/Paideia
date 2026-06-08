# Algorithm: PID step-response tuning for a fixed plant

1. Set the plant and input: use the fixed plant \(G(s)=1/(s^2+2s+1)\) and unit step \(r(t)=1\).
2. Start from a preset and record baseline metrics: overshoot \(M_p\), settling time \(T_s\), steady-state error \(e_{ss}\).
3. Change one gain at a time to isolate effects.
4. Compare metrics and justify tradeoffs.
5. Pick gains that satisfy your design priority (speed, low overshoot, or low steady-state error).

## Example calculation format

Steady-state error interpretation for a unit step:

\[
e_{ss}=|r(\infty)-y(\infty)|
\]

If \(r(\infty)=1.00\) and measured \(y(\infty)=0.94\), then

\[
e_{ss}=|1.00-0.94|=0.06\;\text{(unitless)}
\]

Interpretation: the output settles 6% below the target.
