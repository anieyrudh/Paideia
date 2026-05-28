# core/computer-systems · agent contract

## What this module is
The deterministic computer-systems kernel for Paideia simulations. It owns
narrow finite teaching helpers for first-come-first-served CPU scheduling
metrics and page/offset address decomposition. It is pure TypeScript and returns
`KernelResult` values for expected invalid inputs.

## Public interface
Exports from `@paideia/computer-systems`:

- `computerSystemsTolerance: { readonly default: number; readonly tight: number; readonly loose: number }`
- `type ProcessBurst`
- `type ScheduledProcess`
- `type FcfsScheduleResult`
- `type PageOffsetInput`
- `type PageOffsetResult`
- `firstComeFirstServedSchedule(processes: readonly ProcessBurst[]): KernelResult<FcfsScheduleResult>`
- `pageOffset(input: PageOffsetInput): KernelResult<PageOffsetResult>`

## Invariants the caller must preserve
- Process IDs are non-blank strings.
- Arrival times are finite and non-negative; burst times are finite and
  positive.
- Page addresses and page sizes are non-negative/positive integers as
  appropriate.
- The scheduling helper is finite FCFS only; it does not simulate interrupts or
  preemption.

## What this module does NOT do
- Does **not** simulate an operating system, CPU pipeline, cache hierarchy,
  virtual memory subsystem, or process lifecycle.
- Does **not** model preemptive schedulers, priority queues, page replacement,
  TLBs, interrupts, or real hardware.
- Does **not** hide branch-specific workloads or machine presets.

## When to consider this module
Use `core/computer-systems` when a sim is about to inline FCFS scheduling
metrics or page-number/offset arithmetic. If a sim needs a scheduler simulator,
cache simulator, or memory-management subsystem, define a separate future
contract or split into `os-scheduling` / `memory-systems`.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current computer-systems
   sim that would consume the new primitive.
2. Add property tests for every new scheduling or address invariant.
3. Use `core!:` for public API changes that alter timing or address semantics.

## Anti-patterns
- Adding a hidden event loop or OS simulator.
- Adding real hardware assumptions or branch-specific workloads.
- Mutating caller-provided process arrays.
- Silently accepting fractional addresses or page sizes.

## How the Anieyrudh Filter reads this module
The Filter checks that scheduling timelines and address-breakdown visuals match
these finite helpers and do not imply a broader OS/hardware simulator.
