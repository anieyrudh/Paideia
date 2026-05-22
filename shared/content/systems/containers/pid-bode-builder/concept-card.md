---
subject: systems
concept: pid-bode-builder
branch: shared
level: Shared core
syllabus_ref: Shared systems / Control theory / PID response and Bode stability margins
prerequisites:
  - odes
  - transfer-functions
aid_types:
  - simulation
  - transfer-problem
  - misconception-audit
status: reviewed
---

# PID Tuner and Bode Builder

A feedback controller acts on the error between a reference and a measured output. A PID controller combines three actions:

- proportional action reacts to the present error;
- integral action accumulates past error and can remove steady-state offset;
- derivative action reacts to the slope of the error and can add damping when the model is appropriate.

For a plant \(G(s)\), the controller \(C(s)\) and plant form an open loop:

```latex
L(s) = C(s)G(s)
```

and a negative-unity-feedback closed loop:

```latex
T(s) = \frac{L(s)}{1 + L(s)}.
```

The same gain choice has two visible consequences. In the time domain, the step response shows overshoot, settling time, and steady-state error. In the frequency domain, the Bode plot shows where the loop crosses 0 dB and how much phase margin remains. Good tuning is not "make every gain large"; it is choosing a tradeoff that is fast enough, accurate enough, and still robust to extra lag.

## First-Principles Explanation

Start with the loop model. The plant converts control effort into output. The controller converts error into control effort. Multiplying them gives the open-loop transfer function \(L(s)\), which tells how a sinusoidal error component is amplified and shifted before feedback closes the loop.

At the gain crossover frequency \(\omega_{gc}\), the open-loop magnitude is 1, or 0 dB. The phase margin is the angular distance from the loop phase to \(-180^\circ\):

```latex
PM = 180^\circ + \angle L(j\omega_{gc}).
```

If the phase margin is small, a little extra delay, actuator lag, or sensor filtering can push the loop toward oscillation. The time response may look faster, but the system has less robustness buffer.

## Canonical Example

Use a second-order plant with natural frequency \(2.5\ \mathrm{rad/s}\) and damping ratio \(0.45\). Add \(K_p = 1.4\), \(K_i = 0.7\), and \(K_d = 0.18\). The closed-loop step response can be checked for overshoot and settling time, while the open-loop Bode trace gives phase margin and gain margin. Increasing \(K_p\) may reduce rise time, but it often moves crossover to a frequency where the plant contributes more phase lag.

## Common Misconceptions

- Higher gain always improves control. It can speed response while shrinking phase margin.
- Bode magnitude alone determines stability. Magnitude and phase must be read together.
- Derivative gain removes steady-state error. Integral action is the term that directly accumulates persistent error.
- The step response and Bode plot are separate topics. They are two views of the same loop.
