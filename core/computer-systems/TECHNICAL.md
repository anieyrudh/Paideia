# @paideia/computer-systems Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: process/address
types and pure kernel functions for FCFS scheduling metrics and page-offset
decomposition.

## Numerical model

```text
FCFS start_i = max(previous_completion, arrival_i)
completion_i = start_i + burst_i
waiting_i = start_i - arrival_i
turnaround_i = completion_i - arrival_i
pageNumber = floor(address / pageSizeBytes)
offsetBytes = address mod pageSizeBytes
```

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Process IDs are non-blank | `nonBlank` returns `precondition-violated` |
| Arrival times are non-negative and burst times positive | `nonNegative` / `positive` guards |
| Address and page size are integers | `pageOffset` returns `precondition-violated` |
| Compound results are immutable | `Object.freeze` |

## Tests

The Vitest suite covers FCFS examples, page-offset examples, invalid inputs,
immutable results, and a property test that offsets stay within page bounds.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Split preemptive scheduling into `core/os-scheduling` after a consuming
  container defines event semantics.
- Split page-replacement/TLB helpers into `core/memory-systems` after a
  container defines trace format.
- Add cache-index decomposition only after cache geometry assumptions are fixed.

## Anieyrudh Filter pass

- P0 issues checked: no OS simulator, no hardware simulator, no hidden event
  loop, no branch-specific presets, no hidden mutable global state, no public
  `any`.
- P1 issues checked: public API is deliberately narrow, expected failures
  return `KernelResult.err`, timing/address semantics are documented, and
  compound results are immutable.
- High-bandwidth questions surfaced: preemption, priority scheduling, caches,
  TLBs, page replacement, interrupts, and hardware pipelines are intentionally
  deferred until consuming containers define the contract.
- Outcome: the kernel provides canonical finite FCFS and page-offset numbers
  for computer-systems visuals.
