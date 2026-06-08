// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MomentumSim } from "./momentum.js";

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
    root?.render(createElement(MomentumSim));
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

export const runMomentumGateContract = () => {
  describe("momentum prediction-checkpoint contract", () => {
    it("blocks momentum readouts until the prediction checkpoint is committed", async () => {
      await renderSim();

      await click(buttonByText("Set up collision"));
      await click(buttonByText("Reveal collision result"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("p = mv");

      await click(controlByLabel("Total momentum stays constant"));
      await change(
        controlByLabel("Rationale"),
        "The carts exert internal forces on each other, so the system total stays constant.",
      );
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(document.body.textContent).toContain("Total momentum before");
      expect(document.body.textContent).toContain("+0.50 kg m s^-1");
      expect(document.body.textContent).toContain("p = mv");
    });

    it("updates the total momentum when an initial velocity changes before reveal", async () => {
      await renderSim();

      await click(buttonByText("Set up collision"));
      await change(controlByLabel("Initial velocity of cart B"), "0");
      await click(buttonByText("Reveal collision result"));
      await click(controlByLabel("Total momentum stays constant"));
      await change(controlByLabel("Rationale"), "With no external impulse, total momentum is conserved.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Momentum readout']")?.textContent).toContain(
        "+1.00 kg m s^-1",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "total p = m_Au_A + m_Bu_B",
      );
    });
  });
};
