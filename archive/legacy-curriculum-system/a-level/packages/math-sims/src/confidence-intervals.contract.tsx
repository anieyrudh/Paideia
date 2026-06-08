// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ConfidenceIntervalsSim } from "./confidence-intervals.js";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

const renderSim = async () => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(createElement(ConfidenceIntervalsSim));
  });
};

const click = async (control: HTMLElement) => {
  await act(async () => {
    control.click();
  });
};

const buttonByText = (text: string): HTMLButtonElement => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === text,
  );
  return button instanceof HTMLButtonElement ? button : document.createElement("button");
};

const controlByLabel = (labelText: string): HTMLInputElement | HTMLTextAreaElement => {
  const labels = Array.from(document.querySelectorAll("label"));
  const label = labels.find((candidate) => candidate.textContent?.includes(labelText));
  const nestedControl = label?.querySelector("input, textarea");
  const labelledControl =
    label?.htmlFor === undefined || label.htmlFor.length === 0
      ? null
      : document.getElementById(label.htmlFor);
  const control = nestedControl ?? labelledControl;
  if (!(control instanceof HTMLInputElement) && !(control instanceof HTMLTextAreaElement)) {
    throw new Error(`Could not find control labelled ${labelText}`);
  }
  return control;
};

const change = async (control: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  await act(async () => {
    const prototype =
      control instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    valueSetter?.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  host?.remove();
  root = null;
  host = null;
  localStorage.clear();
});

export const runConfidenceIntervalsGateContract = () => {
  describe("confidence intervals prediction-checkpoint contract", () => {
    it("blocks interval readouts until the prediction checkpoint is committed", async () => {
      await renderSim();

      await click(buttonByText("Set up interval"));
      await click(buttonByText("Reveal interval"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Margin of error");
      expect(document.body.textContent).toContain("CI = 68.00");

      await click(controlByLabel("The interval becomes wider"));
      await change(
        controlByLabel("Rationale"),
        "Higher confidence needs a larger z-star multiplier for the same standard error.",
      );
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Margin of error");
      expect(document.body.textContent).toContain("Claim lies outside");
      expect(document.body.textContent).toContain("CI = 68.00");
    });

    it("updates the interval width when sample size changes before reveal", async () => {
      await renderSim();

      await click(buttonByText("Set up interval"));
      await change(controlByLabel("Sample size"), "81");
      await click(buttonByText("Reveal interval"));
      await click(controlByLabel("The interval becomes wider"));
      await change(controlByLabel("Rationale"), "The interval width depends on sigma over sqrt n.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Interval readout']")?.textContent).toContain(
        "Margin of error",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain("sqrt(81)");
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain("1.960");
    });
  });
};
