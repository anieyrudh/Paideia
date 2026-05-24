# @paideia/scheduling technical note

## Public Surface

The public surface is exactly the symbols listed in `AGENTS.md`: branded
schedule IDs and times, positive and non-negative durations, sequencing rules,
single-machine metrics, round-robin traces, and critical-path analysis.

## Invariant Enforcement

| Invariant | Mechanism |
| --- | --- |
| IDs are non-empty and unique | `jobId`, `activityId`, `validateJobs`, `validateActivities`. |
| Processing/activity durations are positive | `duration` and validation before scheduling. |
| Zero-valued metrics are represented honestly | `NonNegativeDuration` for waiting, tardiness, slack, and round-robin remaining time. |
| Times are non-negative | `time` and validation before scheduling. |
| EDD/critical-ratio need due times | `validateJobs`. |
| Round-robin quantum is positive | `duration(input.quantum)`. |
| Activity graph is acyclic | `topologicalOrder`. |
| Inputs are not mutated | Sorting always copies arrays first. |
| Non-preemptive scheduling respects arrivals | `singleMachineSchedule` dispatches from jobs available at the current clock, then advances to the next arrival if idle. |

## Error Model

- `out-of-domain`: impossible numeric values, such as negative times,
  non-positive durations, non-finite priorities, or non-finite metrics.
- `precondition-violated`: duplicate IDs, missing due times/predecessors,
  cycles, and empty input sets.

## Dependencies

Runtime dependencies:

- `@paideia/shared` for `Brand`, `KernelResult`, `ok`, and `err`.

Dev-only dependencies:

- `vitest`
- `fast-check`
- `typescript`

No external runtime scheduling package is bundled.

## Numerical Notes

The kernel intentionally implements deterministic reference calculations rather
than optimal scheduling solvers. SPT is provided as a sequencing rule, not as a
general constrained optimiser. Critical path uses earliest/latest pass over a
topologically sorted activity graph.

## Anieyrudh Filter pass

P0 issues + resolution:

- P0 check: hidden mutable queue state. Resolution: all public functions are
  pure and allocate output records; there is no module-level mutable state.
- P0 check: input mutation while sorting. Resolution: sequencing and topological
  operations copy caller arrays before sorting.

P1 issues + resolution-or-deferred-issue-link:

- P1 check: Gantt bars could disagree with metrics. Resolution: schedule metrics
  are derived from the same start/completion values returned in `jobs` and
  `slices`.
- P1 check: zero waiting/slack/tardiness values could be misbranded as positive
  durations. Resolution: public metric fields that can be zero use
  `NonNegativeDuration`.
- P1 check: SPT/EDD/critical-ratio could select jobs that have not arrived yet.
  Resolution: `singleMachineSchedule` uses an available-job dispatcher and
  advances the machine clock only when no job is available.
- P1 check: FCFS arrival ties could reorder the caller's queue. Resolution:
  FCFS tie-breaking preserves original input order in both `sequenceJobs` and
  `singleMachineSchedule`.
- P1 check: critical path could accept cycles. Resolution: topological ordering
  rejects graphs whose emitted order length differs from activity count.

High-bandwidth questions surfaced:

- Should multi-machine scheduling or resource leveling live here? Deferred;
  those require a separate optimisation contract and likely consume
  `core/optimization`.

P2 cleanup:

- Deferred: add `core/scheduling` to `docs/core-modules.md` in a broader
  documentation inventory pass, so the catalogue does not churn for each
  individual kernel PR.
