# @paideia/queueing-systems

Pure queueing-theory helpers for Paideia service, manufacturing, network, and
operations simulations.

Use this package when a container needs reference metrics for utilisation,
Little's Law, M/M/1, M/M/c, or M/G/1 queues. The caller owns units: if rates
are per hour, returned times are in hours.

```ts
import {
  arrivalRate,
  mm1Metrics,
  serviceRate,
} from "@paideia/queueing-systems";

const arrivals = arrivalRate(8); // customers per hour
const service = serviceRate(10); // customers per hour

if (arrivals.ok && service.ok) {
  const queue = mm1Metrics({
    arrivalRate: arrivals.value,
    serviceRate: service.value,
  });
  if (queue.ok) {
    console.log(queue.value.averageTimeInSystem); // hours
  }
}
```

## Assumptions

- Inputs use one consistent caller-owned time unit.
- M/M/1 and M/M/c assume Poisson arrivals and exponential service times.
- M/G/1 assumes Poisson arrivals and caller-supplied mean and variance for the
  service time distribution. Variance uses squared duration units, created with
  `durationSquared`.
- Stable queues require `rho < 1`; unstable queues return `KernelResult.err`.
- This package computes formulas only. Animations and stochastic simulations
  belong in container code or future runtime packages.

## Formulas

- Little's Law: `L = lambda W`.
- Utilisation: `rho = lambda / (c mu)`.
- M/M/1: `L = rho / (1 - rho)`, `Lq = rho^2 / (1 - rho)`.
- M/M/c: Erlang C wait probability with `a = lambda / mu`.
- M/G/1: `Wq = lambda E[S^2] / (2(1 - rho))`.
