// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ImpossibleEquationDetectorSim } from "./impossible-equation-detector.js";

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
    root?.render(createElement(ImpossibleEquationDetectorSim));
  });
};

const text = (): string => document.body.textContent ?? "";

const controlByLabel = (labelText: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
  const labels = Array.from(document.querySelectorAll("label"));
  const label = labels.find((candidate) => candidate.textContent?.includes(labelText));
  const nestedControl = label?.querySelector("input, textarea, select");
  const labelledControl =
    label?.htmlFor === undefined || label.htmlFor.length === 0
      ? null
      : document.getElementById(label.htmlFor);
  const control = nestedControl ?? labelledControl;
  if (
    !(control instanceof HTMLInputElement) &&
    !(control instanceof HTMLTextAreaElement) &&
    !(control instanceof HTMLSelectElement)
  ) {
    throw new Error(`Could not find control labelled ${labelText}`);
  }
  return control;
};

const change = async (
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) => {
  await act(async () => {
    const prototype =
      control instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : control instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLSelectElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    valueSetter?.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const click = async (control: HTMLElement) => {
  await act(async () => {
    control.click();
  });
};

const commitButton = (): HTMLButtonElement => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === "Commit prediction",
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Could not find commit button");
  }
  return button;
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

export const runImpossibleEquationDetectorGateContract = () => {
  describe("impossible-equation-detector prediction-gate contract", () => {
    it("blocks detector feedback until the prediction gate is committed", async () => {
      await renderSim();

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(text()).not.toContain("Impossible as written");

      await click(controlByLabel("distance = speed + acceleration"));
      await change(
        controlByLabel("Rationale"),
        "Speed and acceleration have different powers of seconds, so they cannot be added.",
      );
      await click(commitButton());

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(text()).toContain("Impossible as written");
      expect(text()).toContain("L T^-2 is not L T^-1");
    });

    it("updates the unit reasoning when a different equation card is selected", async () => {
      await renderSim();

      await click(controlByLabel("distance = speed + acceleration"));
      await change(controlByLabel("Rationale"), "I predict the mixed dimensions fail.");
      await click(commitButton());
      await change(controlByLabel("Equation to test"), "1");

      expect(document.querySelector("[aria-label='Detector verdict']")?.textContent).toContain(
        "Passes the unit check",
      );
      expect(document.querySelector("[aria-label='Unit reasoning']")?.textContent).toContain(
        "M L T^-2",
      );
    });
  });
};
