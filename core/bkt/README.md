# @paideia/bkt

Bayesian Knowledge Tracing for concept mastery. The package owns the pure
mastery update equation, next-item correctness prediction, and deterministic EM
parameter fitting from already-graded evidence.

```ts
import { updateMastery, type MasteryState } from "@paideia/bkt";

const prior: MasteryState = {
  conceptId: "photosynthesis-light-dependent-reactions",
  pMastery: 0.42,
  evidenceCount: 0,
  lastUpdated: new Date("2026-01-01T00:00:00.000Z"),
};

const next = updateMastery(prior, {
  conceptId: "photosynthesis-light-dependent-reactions",
  correct: true,
  observedAt: new Date("2026-01-02T00:00:00.000Z"),
  itemId: "quiz-1",
});
```

The caller owns persistence, item grading, and item-to-concept mapping. This
package never schedules reviews; use `@paideia/fsrs` for review timing.
