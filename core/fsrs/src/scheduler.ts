import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade,
} from "ts-fsrs";
import {
  err,
  ok,
  type Brand,
  type KernelResult,
} from "@paideia/shared";

export type CardId = Brand<string, "CardId">;
export type ReviewRating = "again" | "hard" | "good" | "easy";
export type ReviewState = "new" | "learning" | "review" | "relearning";

export interface ReviewCard {
  readonly id: CardId;
  readonly due: Date;
  readonly stability: number;
  readonly difficulty: number;
  readonly reps: number;
  readonly lapses: number;
  readonly state: ReviewState;
}

export interface NextReview {
  readonly card: ReviewCard;
  readonly log: {
    readonly rating: ReviewRating;
    readonly reviewedAt: Date;
    readonly elapsedDays: number;
    readonly scheduledDays: number;
  };
}

const defaultNow = (): Date => new Date();

const ratingToFsrs = (rating: ReviewRating): KernelResult<Grade> => {
  switch (rating) {
    case "again":
      return ok(Rating.Again);
    case "hard":
      return ok(Rating.Hard);
    case "good":
      return ok(Rating.Good);
    case "easy":
      return ok(Rating.Easy);
    default:
      return err("precondition-violated", `Unsupported review rating: ${String(rating)}`);
  }
};

const stateToFsrs = (state: ReviewState): KernelResult<State> => {
  switch (state) {
    case "new":
      return ok(State.New);
    case "learning":
      return ok(State.Learning);
    case "review":
      return ok(State.Review);
    case "relearning":
      return ok(State.Relearning);
    default:
      return err("precondition-violated", `Unsupported review state: ${String(state)}`);
  }
};

const stateFromFsrs = (state: State): ReviewState => {
  switch (state) {
    case State.New:
      return "new";
    case State.Learning:
      return "learning";
    case State.Review:
      return "review";
    case State.Relearning:
      return "relearning";
  }
};

const isValidDate = (date: Date): boolean => Number.isFinite(date.getTime());

const cloneDate = (date: Date): Date => new Date(date.getTime());

const validateCard = (card: ReviewCard): KernelResult<void> => {
  if (!isValidDate(card.due)) {
    return err("precondition-violated", "card.due must be a valid Date");
  }

  if (!Number.isFinite(card.stability) || card.stability < 0) {
    return err(
      "precondition-violated",
      `card.stability must be a non-negative finite number, got ${card.stability}`,
    );
  }

  const newCardDifficulty = card.state === "new" && card.reps === 0 && card.difficulty === 0;
  if (
    !newCardDifficulty &&
    (!Number.isFinite(card.difficulty) ||
      card.difficulty < 1 ||
      card.difficulty > 10)
  ) {
    return err(
      "precondition-violated",
      `card.difficulty must be in [1,10] after first review, got ${card.difficulty}`,
    );
  }

  if (!Number.isInteger(card.reps) || card.reps < 0) {
    return err(
      "precondition-violated",
      `card.reps must be a non-negative integer, got ${card.reps}`,
    );
  }

  if (!Number.isInteger(card.lapses) || card.lapses < 0) {
    return err(
      "precondition-violated",
      `card.lapses must be a non-negative integer, got ${card.lapses}`,
    );
  }

  return stateToFsrs(card.state).ok ? ok(undefined) : err("precondition-violated", "card.state is invalid");
};

const toFsrsCard = (card: ReviewCard): KernelResult<Card> => {
  const state = stateToFsrs(card.state);
  if (!state.ok) return state;
  return ok({
    due: cloneDate(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: state.value,
    ...(card.reps === 0 ? {} : { last_review: cloneDate(card.due) }),
  });
};

const fromFsrsCard = (id: CardId, card: Card): ReviewCard => ({
  id,
  due: cloneDate(card.due),
  stability: card.stability,
  difficulty: card.difficulty,
  reps: card.reps,
  lapses: card.lapses,
  state: stateFromFsrs(card.state),
});

const scheduler = () =>
  fsrs(generatorParameters({
    enable_fuzz: false,
  }));

export const newCard = (id: CardId, now: Date = defaultNow()): ReviewCard => {
  const card = createEmptyCard(now);
  return fromFsrsCard(id, card);
};

export const scheduleReview = (
  card: ReviewCard,
  rating: ReviewRating,
  now: Date = defaultNow(),
): KernelResult<NextReview> => {
  const validCard = validateCard(card);
  if (!validCard.ok) return validCard;

  const grade = ratingToFsrs(rating);
  if (!grade.ok) return grade;

  if (!isValidDate(now)) {
    return err("precondition-violated", "now must be a valid Date");
  }

  const fsrsCard = toFsrsCard(card);
  if (!fsrsCard.ok) return fsrsCard;

  const result = scheduler().next(fsrsCard.value, now, grade.value);

  return ok({
    card: fromFsrsCard(card.id, result.card),
    log: {
      rating,
      reviewedAt: cloneDate(result.log.review),
      elapsedDays: result.log.elapsed_days,
      scheduledDays: result.log.scheduled_days,
    },
  });
};

export const dueCards = (
  cards: readonly ReviewCard[],
  now: Date = defaultNow(),
): readonly ReviewCard[] =>
  cards
    .filter((card) => card.due.getTime() <= now.getTime())
    .sort((a, b) => {
      const byDue = a.due.getTime() - b.due.getTime();
      if (byDue !== 0) return byDue;
      return String(a.id).localeCompare(String(b.id));
    });
