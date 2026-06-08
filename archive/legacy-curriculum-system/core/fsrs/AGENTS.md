# core/fsrs · agent contract

## What this module is
The spaced-repetition scheduler. It wraps `ts-fsrs` (the canonical TypeScript port of the FSRS algorithm) and exposes a small, opinionated surface for the rest of the monorepo: schedule a card's next review given a learner's response, and render a review queue UI. It is the only module allowed to touch spaced-repetition state.

## Public interface
Exports from `@paideia/fsrs`:

- `ReviewRating = 'again' | 'hard' | 'good' | 'easy'`
- `ReviewCard = { id: CardId; due: Date; stability: number; difficulty: number; reps: number; lapses: number; state: 'new' | 'learning' | 'review' | 'relearning' }`
- `NextReview = { card: ReviewCard; log: { rating: ReviewRating; reviewedAt: Date; elapsedDays: number; scheduledDays: number } }`
- `scheduleReview(card: ReviewCard, rating: ReviewRating, now?: Date): KernelResult<NextReview>` — pure; same inputs → same output.
- `newCard(id: CardId, now?: Date): ReviewCard`
- `dueCards(cards: readonly ReviewCard[], now?: Date): readonly ReviewCard[]`
- `<ReviewQueue cards={readonly ReviewCard[]} renderCard={(c) => React.ReactNode} onReview={(id: CardId, rating: ReviewRating) => void} />`

## Invariants the caller must preserve
- Scheduling is **pure and deterministic**. Same `(card, rating, now)` → same `NextReview`.
- The caller owns persistence. This module reads and returns; it does not write to disk or network.
- `card.due` is timezone-naive UTC. Convert at the UI edge.
- The queue UI consumes a snapshot of `cards`; the caller updates state through `onReview` and re-passes a new array.

## What this module does NOT do
- Does **not** model mastery of a concept — that's `core/bkt`. FSRS and BKT are complementary; this module does not approximate one with the other.
- Does **not** generate card content. Cards are inputs.
- Does **not** persist anywhere. No localStorage, no IndexedDB, no server.
- Does **not** schedule per-concept or per-curriculum. The unit is a card; mapping cards to concepts is the caller's job.
- Does **not** expose FSRS parameter tuning beyond what `ts-fsrs` exposes via opts; we do not embed a learner-specific tuner here.
- Does **not** support custom rating scales — four ratings (`again | hard | good | easy`) match the algorithm.

## When to consider this module
Use `core/fsrs` whenever you need to decide when to show a learner a given review card next, given how they answered it this time. If the question is "does this learner understand this concept?", the answer is `core/bkt`, not this module.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (the review UI, concept-card review flows).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change to `ReviewCard`'s shape, scheduling output, or rating set.

## Anti-patterns (will be rejected in PR review)
- Re-implementing FSRS arithmetic outside this module.
- Persisting cards inside this module (it must stay pure).
- Auto-skipping `again` ratings as "noise".
- Custom rating values beyond the four — they break the algorithm's calibration.
- Branch-specific schedule overrides (`if A-Level then shorter interval`) — ratings are universal.

## How the Anieyrudh Filter reads this module
The Filter probes that **the scheduler's pure determinism holds** (so a learner's review intervals are reproducible and auditable) and that the queue UI shows cards in due order without secretly reordering by some other heuristic. A queue that lies about due dates undermines the algorithm and is rejected.
