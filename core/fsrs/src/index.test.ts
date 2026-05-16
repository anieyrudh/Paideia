import { describe, expect, it } from "vitest";
import { createElement, isValidElement } from "react";
import {
  ReviewQueue,
  dueCards,
  newCard,
  scheduleReview,
  type CardId,
  type ReviewCard,
} from "./index.js";

const id = (value: string) => value as CardId;
const now = new Date("2026-01-10T12:00:00.000Z");

const card = (overrides: Partial<ReviewCard> = {}): ReviewCard => ({
  ...newCard(id("card-a"), now),
  ...overrides,
});

describe("@paideia/fsrs", () => {
  it("creates a new card due immediately without mutating time", () => {
    const created = newCard(id("card-1"), now);

    expect(created).toEqual({
      id: id("card-1"),
      due: now,
      stability: 0,
      difficulty: 5,
      reps: 0,
      lapses: 0,
      state: "new",
    });
    expect(created.due).not.toBe(now);
  });

  it("schedules new-card ratings into ordered intervals", () => {
    const created = newCard(id("card-1"), now);
    const again = scheduleReview(created, "again", now);
    const hard = scheduleReview(created, "hard", now);
    const good = scheduleReview(created, "good", now);
    const easy = scheduleReview(created, "easy", now);

    expect(again.ok && hard.ok && good.ok && easy.ok).toBe(true);
    if (again.ok && hard.ok && good.ok && easy.ok) {
      expect(again.value.card.due.getTime()).toBeLessThan(
        hard.value.card.due.getTime(),
      );
      expect(hard.value.card.due.getTime()).toBeLessThan(
        good.value.card.due.getTime(),
      );
      expect(good.value.card.due.getTime()).toBeLessThan(
        easy.value.card.due.getTime(),
      );
      expect(again.value.card.lapses).toBe(1);
      expect(good.value.card.state).toBe("review");
    }
  });

  it("is deterministic for the same card, rating, and now", () => {
    const reviewCard = card({
      due: new Date("2026-01-01T12:00:00.000Z"),
      stability: 3,
      difficulty: 5,
      reps: 4,
      state: "review",
    });

    const first = scheduleReview(reviewCard, "good", now);
    const second = scheduleReview(reviewCard, "good", now);

    expect(first).toEqual(second);
  });

  it("returns due cards sorted by due date and then id", () => {
    const cards = [
      card({ id: id("b"), due: new Date("2026-01-10T12:00:01.000Z") }),
      card({ id: id("c"), due: new Date("2026-01-09T12:00:00.000Z") }),
      card({ id: id("a"), due: new Date("2026-01-10T12:00:00.000Z") }),
      card({ id: id("z"), due: new Date("2026-01-11T12:00:00.000Z") }),
    ];

    expect(dueCards(cards, now).map((due) => due.id)).toEqual([
      id("c"),
      id("a"),
    ]);
  });

  it("rejects invalid cards through KernelResult", () => {
    const result = scheduleReview(
      card({ stability: Number.NaN }),
      "good",
      now,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("renders a due-order queue element", () => {
    const rendered = ReviewQueue({
      cards: [
        card({ id: id("second"), due: new Date("2026-01-10T11:00:00.000Z") }),
        card({ id: id("first"), due: new Date("2026-01-10T10:00:00.000Z") }),
      ],
      renderCard: (reviewCard) => createElement("span", null, reviewCard.id),
      onReview: () => undefined,
    });

    expect(isValidElement(rendered)).toBe(true);
    if (isValidElement(rendered)) {
      expect(rendered.props["aria-label"]).toBe("Due review cards");
      expect(rendered.props.children[0].key).toBe("first");
      expect(rendered.props.children[1].key).toBe("second");
    }
  });
});
