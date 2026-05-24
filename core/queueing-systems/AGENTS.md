# core/queueing-systems - agent contract

## What this module is

Pure queueing-theory kernels for service, manufacturing, network, and operations
simulations. It owns Little's Law, utilisation, M/M/1, M/M/c, and M/G/1
reference calculations. It returns deterministic numbers and readonly records
only; event animation, arrivals simulation, server visuals, scheduling policies,
and learner controls live elsewhere.

All rates and durations must use one caller-consistent time unit. If a container
uses arrivals per hour, then service rates are also per hour and returned
durations are in hours.

## Public interface

Exports from `@paideia/queueing-systems`:

- `ArrivalRate = Brand<number, "Queueing.ArrivalRate">`
- `ServiceRate = Brand<number, "Queueing.ServiceRate">`
- `Duration = Brand<number, "Queueing.Duration">`
- `CustomerCount = Brand<number, "Queueing.CustomerCount">`
- `Utilization = Brand<number, "Queueing.Utilization">`
- `ServerCount = Brand<number, "Queueing.ServerCount">`
- `DurationSquared = Brand<number, "Queueing.DurationSquared">`
- `LittleLawFromArrivalWaitInput = { arrivalRate: ArrivalRate; averageTimeInSystem: Duration }`
- `LittleLawFromArrivalCountInput = { arrivalRate: ArrivalRate; averageNumberInSystem: CustomerCount }`
- `LittleLawFromCountWaitInput = { averageNumberInSystem: CustomerCount; averageTimeInSystem: Duration }`
- `UtilizationInput = { arrivalRate: ArrivalRate; serviceRate: ServiceRate; servers?: ServerCount }`
- `MM1Input = { arrivalRate: ArrivalRate; serviceRate: ServiceRate }`
- `MM1Metrics = { utilization: Utilization; averageNumberInSystem: CustomerCount; averageNumberInQueue: CustomerCount; averageTimeInSystem: Duration; averageTimeInQueue: Duration }`
- `MMCInput = { arrivalRate: ArrivalRate; serviceRate: ServiceRate; servers: ServerCount }`
- `MMCMetrics = MM1Metrics & { servers: ServerCount; probabilitySystemEmpty: number; erlangC: number }`
- `MG1Input = { arrivalRate: ArrivalRate; meanServiceTime: Duration; serviceTimeVariance: DurationSquared }`
- `MG1Metrics = MM1Metrics & { meanServiceTime: Duration; serviceTimeVariance: DurationSquared }`
- `arrivalRate(value: number): KernelResult<ArrivalRate>`
- `serviceRate(value: number): KernelResult<ServiceRate>`
- `duration(value: number): KernelResult<Duration>`
- `customerCount(value: number): KernelResult<CustomerCount>`
- `serverCount(value: number): KernelResult<ServerCount>`
- `utilization(value: number): KernelResult<Utilization>`
- `durationSquared(value: number): KernelResult<DurationSquared>`
- `littleLawAverageNumber(input: LittleLawFromArrivalWaitInput): KernelResult<CustomerCount>`
- `littleLawAverageTime(input: LittleLawFromArrivalCountInput): KernelResult<Duration>`
- `littleLawArrivalRate(input: LittleLawFromCountWaitInput): KernelResult<ArrivalRate>`
- `serverUtilization(input: UtilizationInput): KernelResult<Utilization>`
- `mm1Metrics(input: MM1Input): KernelResult<MM1Metrics>`
- `mmcMetrics(input: MMCInput): KernelResult<MMCMetrics>`
- `mg1Metrics(input: MG1Input): KernelResult<MG1Metrics>`

## Invariants the caller must preserve

- Arrival rates, service rates, durations, and customer counts must be finite and
  non-negative where the constructor allows zero.
- Service rates, positive durations used as divisors, and server counts must be
  finite and positive.
- Server counts are positive safe integers.
- Queueing formulas require stable systems: utilisation must satisfy `rho < 1`.
- M/G/1 service-time variance must be finite, non-negative, and in squared
  caller-duration units.
- Time units must be caller-consistent across each input object.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not render queue animations, Gantt charts, curves, or server diagrams.
- Does not run stochastic discrete-event simulations or own random number state.
- Does not model priorities, finite buffers, balking, reneging, networks, or
  scheduling rules.
- Does not infer time units or convert between seconds/minutes/hours.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/queueing-systems` when a sim needs canonical Little's Law,
utilisation, M/M/1, M/M/c, or M/G/1 reference metrics. If a service operations
or networks sim is about to inline `rho`, `L`, `Lq`, `W`, or `Wq`, use this
module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to formulas, stability behavior, or public types.

## Anti-patterns (will be rejected in PR review)

- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Treating unstable queues as valid by returning negative or infinite waits.
- Simulating arrivals inside this deterministic kernel.
- Mutating caller-owned input objects.
- Hidden global caches or random state.
- Branch-specific defaults (`if SUTD then ...`).

## How the Anieyrudh Filter reads this module

The Filter probes that displayed queueing claims match this kernel: utilisation
is computed from the same arrival, service, and server values; Little's Law
readouts conserve `L = lambda W`; and M/M/c wait metrics rise nonlinearly as
utilisation approaches 1. A visual that teaches linear queue growth near
saturation fails review.
