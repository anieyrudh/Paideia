---
concept: pid-step-response
branch: sutd
subject: epd
level: Undergraduate
syllabus_ref: SUTD EPD / Control and Engineering Systems / closed-loop time response
prerequisites:
  - differential-equations
  - transfer-functions
  - feedback-control
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
title: "PID Step Response"
---

# PID Step Response

A PID controller drives a plant toward a setpoint by combining three terms on the error \(e(t) = r(t) - y(t)\): a **proportional** term \(K_p\, e(t)\) reacting to the present error, an **integral** term \(K_i\int_0^t e(\tau)\,d\tau\) accumulating past error, and a **derivative** term \(K_d\,\dot{e}(t)\) anticipating future error from the current trend. The step response of the closed loop is judged by four numbers: **rise time** (how fast it reaches the setpoint), **overshoot** (how far it exceeds it), **settling time** (how quickly it stays within a tolerance band), and **steady-state error** (the offset that survives \(t\to\infty\)).

## First-Principles Explanation

For the fixed plant \(G(s) = 1/(s^2+2s+1)\) — a critically damped second-order system — the closed-loop transfer function with a parallel PID controller \(C(s) = K_p + K_i/s + K_d s\) is

\[
T(s) = \frac{C(s)\,G(s)}{1 + C(s)\,G(s)} = \frac{K_d s^2 + K_p s + K_i}{s^3 + (2+K_d)s^2 + (1+K_p)s + K_i}.
\]

Each gain has a distinct mechanical effect on this denominator:

- **\(K_p\)** raises the bandwidth, which shortens the rise time and shrinks (but does not zero) the steady-state error to a step input.
- **\(K_i\)** adds a pole at the origin in the open loop, which is what drives steady-state error of a step input to zero. The cost is a sluggish low-frequency response and integral wind-up under saturation.
- **\(K_d\)** adds damping by reacting to \(\dot{e}\). It tames the overshoot \(K_p\) and \(K_i\) introduce, at the cost of amplifying high-frequency measurement noise.

No single gain is optimal in isolation; tuning is a search over the trade space (rise vs. overshoot vs. settle vs. steady-state error). Classical recipes such as **Ziegler–Nichols** seed reasonable starting points; modern practice tunes inside a stability envelope informed by the open-loop Bode plot or a closed-loop pole-placement target.

## Canonical Example

Start with \(K_p = 1,\ K_i = 0,\ K_d = 0\). The step response rises smoothly but parks below the setpoint — pure proportional control cannot eliminate the offset. Add \(K_i = 0.5\); the output now reaches the setpoint, but with visible overshoot and a longer settling time. Push \(K_p\) to 4 to chase a faster rise; the overshoot worsens and the trace begins to ring. Add \(K_d = 0.6\); the ringing damps and the settling time collapses. The resulting trio \(K_p = 4,\ K_i = 0.5,\ K_d = 0.6\) lands near a typical industrial sweet spot: rise time short, overshoot bounded, steady-state error eliminated.

## Common Misconceptions

- **"Higher gain is always better."** Higher \(K_p\) raises bandwidth but also overshoot, and at sufficiently high \(K_p\) the closed loop crosses into instability — the dominant poles cross the imaginary axis.
- **"Derivative action removes steady-state error."** It does not. Only the integrator drives steady-state error of a step input to zero; the derivative term reshapes the transient.
- **"More integral means faster correction."** Excess \(K_i\) slows the response, deepens overshoot, and under actuator saturation causes integral wind-up, where accumulated error keeps the actuator pinned long after the error reverses sign.
- **"Tuning is a one-shot calculation."** PID tuning is iterative: it trades rise time against overshoot against noise rejection, and the right point depends on plant uncertainty and disturbance spectrum.

## Transfer

The same three-term decomposition governs the thermal chamber transfer problem (`transfer-pid-thermal-chamber`): the plant changes from a textbook second-order model to a slower first-order-plus-dead-time process, but the tuning logic — proportional sets bandwidth, integral kills offset, derivative damps overshoot — carries over directly. Downstream the same reasoning underlies cascaded control loops, gain-scheduled controllers, and the model-based tuning used in motion control and process automation.
