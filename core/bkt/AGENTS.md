# core/bkt · agent contract

## What this module is
Bayesian Knowledge Tracing: a hand-port of the pyBKT algorithm to TypeScript. It estimates the probability that a learner has mastered a given concept, given a sequence of evidence (correct/incorrect responses on assessment items tagged to that concept). It is the canonical place mastery probabilities live, separate from FSRS which decides _when_ to review.

## Public interface
Exports from `@paideia/bkt`:

- `BKTParameters = { pInit: Probability; pLearn: Probability; pSlip: Probability; pGuess: Probability }` — the four classical BKT parameters.
- `MasteryState = { conceptId: ConceptId; pMastery: Probability; evidenceCount: number; lastUpdated: Date }`
- `Evidence = { conceptId: ConceptId; correct: boolean; observedAt: Date; itemId?: string }`
- `defaultParameters: BKTParameters` — neutral defaults; advisors recalibrate per course.
- `updateMastery(prior: MasteryState, e: Evidence, params?: BKTParameters): KernelResult<MasteryState>` — pure Bayes update.
- `predictMastery(state: MasteryState, params?: BKTParameters): Probability` — probability the next item on this concept will be answered correctly.
- `fitParameters(history: readonly Evidence[]): KernelResult<BKTParameters>` — EM fit from a learner-or-cohort history (cohort-level fitting is the recommended default).

## Invariants the caller must preserve
- All probability inputs/outputs are branded `Probability` (`0 ≤ p ≤ 1`). Out-of-range is `invalid-input`.
- `updateMastery` is **pure**: same `(prior, evidence, params)` → same output. No global state.
- Caller owns persistence of `MasteryState`. The module reads and returns; it does not write.
- Evidence is per-concept per-item; the caller maps items to concepts. The module does not infer the mapping.

## What this module does NOT do
- Does **not** schedule reviews — that's `core/fsrs`. BKT estimates mastery; FSRS uses ratings to time review.
- Does **not** generate or grade items. Evidence comes in already-graded.
- Does **not** model multi-concept items (an item tagged with multiple concepts). The caller emits one `Evidence` per concept-tag.
- Does **not** model forgetting decay over time directly (classical BKT has no forgetting term). If forgetting matters, layer it on or extend with an ADR.
- Does **not** persist anywhere.
- Does **not** know about course structure — `core/content-schema` `CourseMap` ties concepts to items; this module operates on already-resolved `ConceptId`s.

## When to consider this module
Use `core/bkt` when you need a probability that a learner has mastered a particular concept, in order to gate progression, choose the next item, or surface a mastery indicator. If the question is "when should I show this card again?", that's `core/fsrs`.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (adaptive sequencing, dashboards, advisor reports).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change to `BKTParameters`, `MasteryState`, or the update equation that would shift previously-stored mastery numbers.

## Anti-patterns (will be rejected in PR review)
- Re-implementing the Bayes update outside this module.
- Storing `pMastery` as a plain `number` instead of `Probability` and skipping the clamp/validate.
- Hidden global parameter cache that drifts across calls.
- Auto-fitting parameters from a single learner's history (overfits; use cohort).
- Branch-specific parameter values hard-coded (`if SUTD then pLearn=0.3`) — pass `params`.
- Updating mastery on ungraded evidence ("the learner attempted, so they probably got it").

## How the Anieyrudh Filter reads this module
The Filter probes that **mastery probabilities reflect the evidence faithfully**: monotone increase on a streak of correct answers (modulo `pSlip`), real movement (not vanishing updates) on incorrect answers, and parameters that are auditable per course. A mastery dashboard whose number drifts without evidence is rejected.
