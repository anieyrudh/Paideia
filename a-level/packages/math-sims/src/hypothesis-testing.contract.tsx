// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { HypothesisTestingSim } from "./hypothesis-testing.js";

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
    root?.render(createElement(HypothesisTestingSim));
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

export const runHypothesisTestingGateContract = () => {
  describe("hypothesis testing prediction-checkpoint contract", () => {
    it("blocks the decision readout until the prediction checkpoint is committed", async () => {
      await renderSim();

      await click(buttonByText("Set up test"));
      await click(buttonByText("Reveal decision"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Test statistic");
      expect(document.body.textContent).toContain("p-value comparison");

      await click(controlByLabel("The evidence strengthens"));
      await change(
        controlByLabel("Rationale"),
        "A larger sample reduces the standard error when sigma is fixed.",
      );
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Test statistic");
      expect(document.body.textContent).toContain("Reject H0");
      expect(document.body.textContent).toContain("p-value comparison");
    });

    it("updates the decision when sample size changes before reveal", async () => {
      await renderSim();

      await click(buttonByText("Set up test"));
      await change(controlByLabel("Sample size"), "16");
      await click(buttonByText("Reveal decision"));
      await click(controlByLabel("The evidence strengthens"));
      await change(controlByLabel("Rationale"), "The smaller sample has a wider standard error.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Decision readout']")?.textContent).toContain(
        "Do not reject H0",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain("sqrt(16)");
    });
  });
};
