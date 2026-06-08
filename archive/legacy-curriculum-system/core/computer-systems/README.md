# @paideia/computer-systems

Deterministic finite computer-systems calculations for Paideia simulations.

Use this package when a sim needs shared numbers for FCFS scheduling metrics or
page-number/offset address decomposition.

## Example

```ts
import { firstComeFirstServedSchedule } from "@paideia/computer-systems";

const schedule = firstComeFirstServedSchedule([
  { id: "P1", arrivalTime: 0, burstTime: 4 },
  { id: "P2", arrivalTime: 1, burstTime: 3 },
]);
```

The call returns a `KernelResult`. Expected invalid inputs, such as blank
process IDs or fractional addresses, return `err(...)` rather than throwing.

## Scope

This package models finite FCFS scheduling and page-offset arithmetic only. It
does not simulate an OS, caches, TLBs, interrupts, page replacement, or hardware.
