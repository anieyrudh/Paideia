# @paideia/fsrs

Pure spaced-repetition scheduling for review cards plus a small due-card queue
component. The caller owns card persistence and passes each rating back into the
scheduler.

```ts
import { newCard, scheduleReview } from "@paideia/fsrs";

const card = newCard(cardId, new Date("2026-01-01T00:00:00.000Z"));
const next = scheduleReview(card, "good", new Date("2026-01-01T00:05:00.000Z"));
```

```tsx
import { ReviewQueue } from "@paideia/fsrs";

<ReviewQueue
  cards={cards}
  renderCard={(card) => <CardPrompt card={card} />}
  onReview={(id, rating) => save(scheduleReviewById(id, rating))}
/>;
```

The queue renders only cards whose `due` time has passed, in due-date order.
This package does not model concept mastery; use `@paideia/bkt` for mastery
probabilities.
