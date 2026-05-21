---
concept: dynamic-programming-state-recursion
branch: sutd
subject: csd
status: draft
---

# Dynamic Programming State Recursion

## Core Idea

Dynamic programming starts by naming a state whose value answers a smaller version of the same problem. A recurrence then defines a state from earlier states. Memoisation or tabulation stores those state values so overlapping subproblems are reused, but the recurrence and final value do not change.

## First-Principles Explanation

A recursive solution asks the same smaller questions again and again. Dynamic programming works when those questions can be named as states, each state has clear base cases, and later states depend only on earlier states. The table is a memory of solved questions, not a new recurrence.

## Learner Outcome

Given a small recursive problem, a learner can define the state, write the recurrence with base cases, trace the table entries, and explain which repeated calls memoisation avoids.

## Misconception Map

- Dynamic programming means any loop: the package contrasts a recurrence table with plain looping language and asks learners to identify state, dependency, and reuse.
- Memoisation changes the recurrence result: the simulation shows the same `ways(n)` value while the repeated-call count changes.

## Observable Evidence

The simulation uses a stair-counting recurrence as a compact state graph:

- `ways(i)` means the number of sequences that reach step `i`.
- `ways(i) = ways(i - 1) + ways(i - 2)` for `i >= 2`.
- `ways(0) = 1` and `ways(1) = 1`.

The formula panel shows the symbolic recurrence, substituted values, units, and interpretation beside the state graph and memo table.

## Transfer

The problem-solving artifact transfers the pattern to resource allocation, where a state combines project index and remaining budget.
