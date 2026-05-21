// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CircularMotionSim } from "./circular-motion.js";

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
    root?.render(createElement(CircularMotionSim));
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
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Could not find button ${text}`);
  }
  return button;
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

export const runCircularMotionGateContract = () => {
  describe("circular motion prediction-gate contract", () => {
    it("blocks force readouts until the prediction gate is committed", async () => {
      await renderSim();

      await click(buttonByText("Set up circular path"));
      await click(buttonByText("Reveal force vectors"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(document.body.textContent).not.toContain("F_c = m a_c");

      await click(controlByLabel("Toward the centre of the circle"));
      await change(
        controlByLabel("Rationale"),
        "The velocity changes direction, so acceleration points toward the centre.",
      );
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(document.body.textContent).toContain("Radial acceleration");
      expect(document.body.textContent).toContain("9.00 m s^-2");
      expect(document.body.textContent).toContain("F_c = m a_c");
    });

    it("updates the formula readout when speed changes before reveal", async () => {
      await renderSim();

      await click(buttonByText("Set up circular path"));
      await change(controlByLabel("Speed"), "8");
      await click(buttonByText("Reveal force vectors"));
      await click(controlByLabel("Toward the centre of the circle"));
      await change(controlByLabel("Rationale"), "Changing direction requires inward acceleration.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Circular motion readout']")?.textContent).toContain(
        "16.00 m s^-2",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "a_c = (8.00 m s^-1)^2 / 4.00 m = 16.00 m s^-2",
      );
    });
  });
};
