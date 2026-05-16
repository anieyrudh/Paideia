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

const minuteMs = 60 * 1000;
const dayMs = 24 * 60 * minuteMs;

const ratingDifficultyDelta: Record<ReviewRating, number> = {
  again: 0.8,
  hard: 0.35,
  good: -0.15,
  easy: -0.35,
};

const ratingStabilityFactor: Record<ReviewRating, number> = {
  again: 0.45,
  hard: 1.2,
  good: 2.5,
  easy: 3.6,
};

const initialIntervalsMs: Record<ReviewRating, number> = {
  again: 5 * minuteMs,
  hard: 10 * minuteMs,
  good: dayMs,
  easy: 4 * dayMs,
};

const initialStability: Record<ReviewRating, number> = {
  again: 0.1,
  hard: 0.4,
  good: 1,
  easy: 4,
};

const initialDifficulty: Record<ReviewRating, number> = {
  again: 7,
  hard: 6,
  good: 5,
  easy: 4,
};

const isValidDate = (date: Date): boolean => Number.isFinite(date.getTime());

const cloneDate = (date: Date): Date => new Date(date.getTime());

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

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

  if (
    !Number.isFinite(card.difficulty) ||
    card.difficulty < 1 ||
    card.difficulty > 10
  ) {
    return err(
      "precondition-violated",
      `card.difficulty must be in [1,10], got ${card.difficulty}`,
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

  return ok(undefined);
};

const elapsedDays = (fromDue: Date, now: Date): number =>
  Math.max(0, Math.floor((now.getTime() - fromDue.getTime()) / dayMs));

const addMilliseconds = (date: Date, ms: number): Date =>
  new Date(date.getTime() + ms);

const scheduledDaysFromMs = (ms: number): number => Math.floor(ms / dayMs);

const reviewStateFor = (
  rating: ReviewRating,
  scheduledDays: number,
): ReviewState => {
  if (rating === "again") return "relearning";
  if (scheduledDays < 1) return "learning";
  return "review";
};

const retention = (stability: number, daysElapsed: number): number => {
  if (stability <= 0) return 0;
  return Math.exp(-daysElapsed / stability);
};

const nextStability = (
  card: ReviewCard,
  rating: ReviewRating,
  daysElapsed: number,
): number => {
  if (card.reps === 0 || card.state === "new") {
    return initialStability[rating];
  }

  if (rating === "again") {
    return clamp(card.stability * ratingStabilityFactor.again, 0.1, 36500);
  }

  const recall = retention(card.stability, daysElapsed);
  const difficultyPenalty = (11 - card.difficulty) / 10;
  const recallBonus = 1 + (1 - recall) * 0.8;
  return clamp(
    card.stability *
      ratingStabilityFactor[rating] *
      difficultyPenalty *
      recallBonus,
    0.1,
    36500,
  );
};

const nextIntervalMs = (
  card: ReviewCard,
  rating: ReviewRating,
  stability: number,
): number => {
  if (card.reps === 0 || card.state === "new") {
    return initialIntervalsMs[rating];
  }

  if (rating === "again") return 10 * minuteMs;
  if (rating === "hard") return Math.max(1, Math.round(stability)) * dayMs;
  if (rating === "good") return Math.max(1, Math.round(stability)) * dayMs;
  return Math.max(2, Math.round(stability * 1.3)) * dayMs;
};

export const newCard = (id: CardId, now: Date = new Date()): ReviewCard => ({
  id,
  due: cloneDate(now),
  stability: 0,
  difficulty: 5,
  reps: 0,
  lapses: 0,
  state: "new",
});

export const scheduleReview = (
  card: ReviewCard,
  rating: ReviewRating,
  now: Date = new Date(),
): KernelResult<NextReview> => {
  const validCard = validateCard(card);
  if (!validCard.ok) return validCard;

  if (!isValidDate(now)) {
    return err("precondition-violated", "now must be a valid Date");
  }

  const daysElapsed = elapsedDays(card.due, now);
  const stability = nextStability(card, rating, daysElapsed);
  const difficulty = clamp(
    (card.reps === 0 || card.state === "new"
      ? initialDifficulty[rating]
      : card.difficulty) + ratingDifficultyDelta[rating],
    1,
    10,
  );
  const intervalMs = nextIntervalMs(card, rating, stability);
  const scheduledDays = scheduledDaysFromMs(intervalMs);
  const nextDue = addMilliseconds(now, intervalMs);
  const reviewedAt = cloneDate(now);

  return ok({
    card: {
      id: card.id,
      due: nextDue,
      stability,
      difficulty,
      reps: card.reps + 1,
      lapses: card.lapses + (rating === "again" ? 1 : 0),
      state: reviewStateFor(rating, scheduledDays),
    },
    log: {
      rating,
      reviewedAt,
      elapsedDays: daysElapsed,
      scheduledDays,
    },
  });
};

export const dueCards = (
  cards: readonly ReviewCard[],
  now: Date = new Date(),
): readonly ReviewCard[] =>
  cards
    .filter((card) => card.due.getTime() <= now.getTime())
    .sort((a, b) => {
      const byDue = a.due.getTime() - b.due.getTime();
      if (byDue !== 0) return byDue;
      return String(a.id).localeCompare(String(b.id));
    });
