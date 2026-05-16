import { createElement, type ReactNode } from "react";
import {
  dueCards,
  type CardId,
  type ReviewCard,
  type ReviewRating,
} from "./scheduler.js";

export interface ReviewQueueProps {
  readonly cards: readonly ReviewCard[];
  readonly renderCard: (card: ReviewCard) => ReactNode;
  readonly onReview: (id: CardId, rating: ReviewRating) => void;
}

const ratings: readonly ReviewRating[] = ["again", "hard", "good", "easy"];

export const ReviewQueue = ({
  cards,
  renderCard,
  onReview,
}: ReviewQueueProps): ReactNode =>
  createElement(
    "ol",
    { "aria-label": "Due review cards" },
    dueCards(cards).map((card) =>
      createElement(
        "li",
        { key: String(card.id) },
        renderCard(card),
        createElement(
          "div",
          { role: "group", "aria-label": `Review ${String(card.id)}` },
          ratings.map((rating) =>
            createElement(
              "button",
              {
                key: rating,
                type: "button",
                onClick: () => onReview(card.id, rating),
              },
              rating,
            ),
          ),
        ),
      ),
    ),
  );
