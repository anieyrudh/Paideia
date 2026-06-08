---
subject: 10-022-modelling-uncertainty
concept: continuous-rvs-uniform-exponential
branch: sutd
level: "SUTD 10.022"
syllabus_ref: "SUTD 10.022 Modelling Uncertainty / Continuous RVs: Uniform, Exponential"
prerequisites:
  - foundational-notation
  - probability-distributions
aid_types:
  - simulation
  - transfer-problem
  - misconception-audit
title: "Continuous RVs: Uniform, Exponential"
status: reviewed
---

# Continuous RVs: Uniform, Exponential

A continuous random variable assigns probability to intervals, not to single
points. The curve height is a density; probability is area under that curve.

The uniform model fits a bounded interval where every equal-length subinterval
is equally likely. If `X ~ Uniform(a,b)`, then `f(x)=1/(b-a)` on the interval,
`E(X)=(a+b)/2`, and `Var(X)=(b-a)^2/12`.

The exponential model fits waiting time until the next event under a constant
event rate. If `X ~ Exponential(lambda)`, then `f(x)=lambda e^{-lambda x}`,
`E(X)=1/lambda`, and `Var(X)=1/lambda^2`.

The model choice comes before substitution. A bounded laboratory tolerance range
points to uniform reasoning; a time-to-next-failure story points to exponential
reasoning. The key check is whether the probability question is asking for area
across an interval.
