// @vitest-environment jsdom
//
// Playwright tests for the component live in the first consuming container's
// `*.test.ts` file. Vitest doesn't render React DOM here; we use
// `@testing-library/react` for state tests only.

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "./component.js";

const predict: TPredictSpec = {
  prompt: "Predict the period before comparing with the oscillator.",
  commit_format: { kind: "value", unit: "seconds" },
  rationale_required: true,
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("<PredictionGate>", () => {
  it("renders children immediately and saves a prediction checkpoint", () => {
    render(
      <PredictionGate packageId="pkg" predict={predict} simId="package">
        <div>answer-shaped observation</div>
      </PredictionGate>,
    );

    expect(screen.getByText("answer-shaped observation")).toBeTruthy();
    expect(screen.getByRole("form", { name: "Prediction checkpoint" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Prediction"), {
      target: { value: "2.5" },
    });
    fireEvent.change(screen.getByLabelText("Rationale"), {
      target: { value: "Longer string means longer period." },
    });
    fireEvent.click(screen.getByText("Commit prediction"));
    expect(screen.getByText("answer-shaped observation")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Prediction checkpoint" }).textContent).toContain(
      "Saved prediction",
    );
  });

  it("rejects an empty required rationale without hiding children", () => {
    render(
      <PredictionGate packageId="pkg" predict={predict} simId="package">
        <div>revealed observation</div>
      </PredictionGate>,
    );

    fireEvent.change(screen.getByLabelText("Prediction"), {
      target: { value: "2.5" },
    });
    fireEvent.click(screen.getByText("Commit prediction"));

    expect(screen.getByText("revealed observation")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("rationale");
  });

  it("preserves commit state across remounts through localStorage", () => {
    const first = render(
      <PredictionGate packageId="pkg" predict={predict} simId="sim-a">
        <div>revealed after refresh</div>
      </PredictionGate>,
    );
    fireEvent.change(screen.getByLabelText("Prediction"), {
      target: { value: "1.5" },
    });
    fireEvent.change(screen.getByLabelText("Rationale"), {
      target: { value: "I expect a short period." },
    });
    fireEvent.click(screen.getByText("Commit prediction"));
    first.unmount();

    render(
      <PredictionGate packageId="pkg" predict={predict} simId="sim-a">
        <div>revealed after refresh</div>
      </PredictionGate>,
    );
    expect(screen.getByText("revealed after refresh")).toBeTruthy();
  });
});
