# Misconceptions

## Dynamic programming means any loop

**Evidence:** Learners often recognise the visible loop in a tabulation implementation but miss the first-principles structure: a named state, base cases, a recurrence, and overlapping subproblems.

**Surface in predict?** Yes. The prediction option "Count only the loop iterations and ignore the state definition" is designed to expose this misconception.

**Correction:** A loop can implement a dynamic programming table, but the concept is the state-recursion model that defines what each table entry means and where it comes from.

## Memoisation changes the recurrence result

**Evidence:** Learners may treat the cache as a numerical shortcut that changes the answer, instead of storage for values already implied by the recurrence.

**Surface in predict?** Yes. The prediction options contrast reuse with recomputation and with changing the recurrence.

**Correction:** Memoisation preserves the recurrence value. It changes the amount of repeated work by reusing a previously solved state.
