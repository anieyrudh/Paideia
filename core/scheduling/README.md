# @paideia/scheduling

Pure scheduling helpers for Paideia operations, project-management, and
operating-system simulations.

Use this package when a container needs sequencing-rule comparisons,
single-machine schedule metrics, round-robin traces, or critical-path analysis.

```ts
import {
  duration,
  jobId,
  singleMachineSchedule,
} from "@paideia/scheduling";

const a = jobId("A");
const b = jobId("B");
const five = duration(5);
const two = duration(2);

if (a.ok && b.ok && five.ok && two.ok) {
  const schedule = singleMachineSchedule(
    [
      { id: a.value, processingTime: five.value },
      { id: b.value, processingTime: two.value },
    ],
    "spt",
  );
  console.log(schedule);
}
```

## Assumptions

- Durations are positive; times are non-negative.
- Waiting time, tardiness, round-robin remaining time, and critical-path slack
  can be zero and are returned as `NonNegativeDuration`.
- Missing job arrival times default to zero.
- Missing due times default to the completion time for KPI calculation, but
  `edd` and `critical-ratio` sequencing require explicit due times.
- `singleMachineSchedule` is non-preemptive and one-machine only. It dispatches
  by the selected rule from jobs available at the current clock time, advancing
  to the next arrival when the machine is idle.
- `roundRobinSchedule` is deterministic and uses a fixed positive quantum.
- `criticalPath` requires a directed acyclic predecessor graph.

`nonNegativeDuration(0)` is useful only for tests and consumers that need to
construct zero-valued comparison records; job processing times and activity
durations should use `duration(value)`.
