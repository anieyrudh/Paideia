// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { NormalDistributionSim } from "./normal-distribution.js";

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
    root?.render(createElement(NormalDistributionSim));
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

export const runNormalDistributionGateContract = () => {
  describe("normal distribution prediction-checkpoint contract", () => {
    it("blocks the normal-area readout until the prediction-checkpoint is committed", async () => {
      await renderSim();

      await click(buttonByText("Set up normal model"));
      await click(buttonByText("Reveal area"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Area");
      expect(document.body.textContent).toContain("Standardised interval");

      await click(controlByLabel("The central interval"));
      await change(
        controlByLabel("Rationale"),
        "The central band covers the dense middle of the curve, while the upper tail starts two standard deviations above the mean.",
      );
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Area");
      expect(document.body.textContent).toContain("68.3%");
      expect(document.body.textContent).toContain("Standardised interval");
    });

    it("updates the standardised interval when the upper bound changes before reveal", async () => {
      await renderSim();

      await click(buttonByText("Set up normal model"));
      await change(controlByLabel("Upper bound"), "124");
      await click(buttonByText("Reveal area"));
      await click(controlByLabel("The central interval"));
      await change(controlByLabel("Rationale"), "The upper bound is two standard deviations above the mean.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Area readout']")?.textContent).toContain("81.9%");
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "z_upper = (124 - 100) / 12.00",
      );
    });
  });
};
