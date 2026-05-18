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

const selectByLabel = (labelText: string): HTMLSelectElement => {
  const labels = Array.from(document.querySelectorAll("label"));
  const label = labels.find((candidate) => candidate.textContent?.includes(labelText));
  const labelledControl =
    label?.htmlFor === undefined || label.htmlFor.length === 0
      ? null
      : document.getElementById(label.htmlFor);
  if (!(labelledControl instanceof HTMLSelectElement)) {
    throw new Error(`Could not find select labelled ${labelText}`);
  }
  return labelledControl;
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

const choose = async (control: HTMLSelectElement, value: string) => {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
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
    it("blocks the verdict until the prediction gate is committed", async () => {
      await renderSim();

      expect(document.querySelector("[aria-label='Impossible equation detector']")).toBeNull();
      expect(document.body.textContent).not.toContain("Impossible as written");

      await click(controlByLabel("v = u + 1/2 at^2"));
      await change(
        controlByLabel("Rationale"),
        "The acceleration term has t squared, so it may become a length rather than a velocity.",
      );
      await click(commitButton());

      expect(document.querySelector("[aria-label='Impossible equation detector']")).toBeTruthy();
      expect(document.body.textContent).toContain("Impossible as written");
      expect(document.body.textContent).toContain("Unit reasoning");
      expect(document.body.textContent).toContain("Replace t^2 with t");
    });

    it("updates the verdict when a consistent equation is selected", async () => {
      await renderSim();

      await click(controlByLabel("v = u + 1/2 at^2"));
      await change(controlByLabel("Rationale"), "I expect the units to expose the wrong term.");
      await click(commitButton());
      await choose(selectByLabel("Equation"), "0");

      expect(document.body.textContent).toContain("Dimensionally possible");
      expect(document.body.textContent).toContain("v = u + at");
    });
  });
};
