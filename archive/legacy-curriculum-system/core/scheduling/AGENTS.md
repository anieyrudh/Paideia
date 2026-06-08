# core/scheduling - agent contract

## What this module is

Pure scheduling kernels for operations, project-management, and operating-system
simulations. It owns single-machine sequencing rules, non-preemptive schedule
metrics, round-robin CPU schedule traces, and CPM/PERT-style critical-path
analysis. It returns deterministic readonly records only; Gantt rendering,
drag/drop editing, calendar UI, resource leveling, and learner controls live
elsewhere.

## Public interface

Exports from `@paideia/scheduling`:

- `Time = Brand<number, "Scheduling.Time">`
- `Duration = Brand<number, "Scheduling.Duration">`
- `NonNegativeDuration = Brand<number, "Scheduling.NonNegativeDuration">`
- `JobId = Brand<string, "Scheduling.JobId">`
- `ActivityId = Brand<string, "Scheduling.ActivityId">`
- `SequencingRule = "fcfs" | "spt" | "edd" | "critical-ratio"`
- `Job = { id: JobId; processingTime: Duration; arrivalTime?: Time; dueTime?: Time; priority?: number }`
- `ScheduledJob = { id: JobId; startTime: Time; completionTime: Time; flowTime: Duration; waitingTime: NonNegativeDuration; lateness: number; tardiness: NonNegativeDuration }`
- `ScheduleMetrics = { jobs: readonly ScheduledJob[]; makespan: Duration; averageFlowTime: Duration; averageWaitingTime: NonNegativeDuration; averageTardiness: NonNegativeDuration; maxLateness: number; tardyJobCount: number }`
- `RoundRobinInput = { jobs: readonly Job[]; quantum: Duration }`
- `RoundRobinSlice = { id: JobId; startTime: Time; endTime: Time; remainingAfter: NonNegativeDuration }`
- `RoundRobinSchedule = ScheduleMetrics & { slices: readonly RoundRobinSlice[] }`
- `Activity = { id: ActivityId; duration: Duration; predecessors?: readonly ActivityId[] }`
- `ActivityTiming = { id: ActivityId; earliestStart: Time; earliestFinish: Time; latestStart: Time; latestFinish: Time; slack: NonNegativeDuration; critical: boolean }`
- `CriticalPathResult = { projectDuration: Duration; activities: readonly ActivityTiming[]; criticalPath: readonly ActivityId[] }`
- `time(value: number): KernelResult<Time>`
- `duration(value: number): KernelResult<Duration>`
- `nonNegativeDuration(value: number): KernelResult<NonNegativeDuration>`
- `jobId(value: string): KernelResult<JobId>`
- `activityId(value: string): KernelResult<ActivityId>`
- `sequenceJobs(jobs: readonly Job[], rule: SequencingRule, now?: Time): KernelResult<readonly Job[]>`
- `singleMachineSchedule(jobs: readonly Job[], rule?: SequencingRule): KernelResult<ScheduleMetrics>`
- `roundRobinSchedule(input: RoundRobinInput): KernelResult<RoundRobinSchedule>`
- `criticalPath(activities: readonly Activity[]): KernelResult<CriticalPathResult>`

## Invariants the caller must preserve

- Job/activity IDs are non-empty trimmed strings and unique within an input.
- Processing durations, activity durations, and round-robin quantum are finite
  and positive. Output metrics that can naturally be zero use
  `NonNegativeDuration`.
- Times are finite and non-negative.
- `critical-ratio` sequencing requires every job to include `dueTime`; missing
  arrival times default to zero.
- `singleMachineSchedule` is non-preemptive and uses one machine.
- `roundRobinSchedule` requires a positive quantum and finite positive job
  processing times.
- Critical-path activities form a directed acyclic graph and all predecessor
  IDs must be present.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not render Gantt charts, network diagrams, or calendar views.
- Does not do multi-machine optimisation, resource leveling, integer
  programming, or stochastic simulation.
- Does not model preemptive policies beyond deterministic round-robin traces.
- Does not mutate caller arrays or infer branch-specific scheduling defaults.

## When to consider this module

Use `core/scheduling` when a sim needs canonical FCFS/SPT/EDD/critical-ratio
sequencing, schedule KPI calculations, round-robin traces, or CPM critical-path
analysis. If an operations or OS sim is about to inline start/completion time,
waiting time, tardiness, or slack calculations, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for public type changes, tie-break changes, or metric semantics.

## Anti-patterns (will be rejected in PR review)

- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mutating caller-owned job/activity arrays while sorting.
- Hidden global queues or random state.
- Branch-specific defaults or syllabus flags.
- Rendering schedules from this package.

## How the Anieyrudh Filter reads this module

The Filter probes that displayed schedules preserve processing times, respect
arrival/predecessor constraints, and compute waiting, lateness, tardiness, and
critical-path slack from the same values the learner manipulated. A Gantt chart
whose bars do not match these timings fails review.
