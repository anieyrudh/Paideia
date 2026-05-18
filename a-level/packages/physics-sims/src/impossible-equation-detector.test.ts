// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import {
  ImpossibleEquationDetector,
  checkEquation,
  equationCases,
  formatDimension,
} from "./impossible-equation-detector.js";

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
    root?.render(createElement(ImpossibleEquationDetector));
  });
};

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

describe("impossible-equation detector", () => {
  it("detects invalid and valid equations by matching dimensions", () => {
    const missingTime = equationCases.find((equation) => equation.id === "missing-time-factor");
    const validSuvat = equationCases.find((equation) => equation.id === "valid-suvat");
    expect(missingTime).toBeDefined();
    expect(validSuvat).toBeDefined();

    if (missingTime === undefined || validSuvat === undefined) {
      throw new Error("Expected equation fixtures to exist");
    }

    expect(checkEquation(missingTime).valid).toBe(false);
    expect(checkEquation(validSuvat).valid).toBe(true);
    expect(formatDimension(checkEquation(validSuvat).left.dimension)).toBe("L");
  });

  it("blocks the verdict and unit reasoning until the prediction gate is committed", async () => {
    await renderSim();

    expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
    expect(document.body.textContent).not.toContain("Impossible as written");

    await click(controlByLabel("invalid: one right-hand term is velocity"));
    await change(
      controlByLabel("Rationale"),
      "The acceleration term needs another time factor before it can become a length.",
    );
    await click(commitButton());

    expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
    expect(document.body.textContent).toContain("Impossible as written");
    expect(document.body.textContent).toContain("dimensions: L");
    expect(document.body.textContent).toContain("velocity u or v × time t");
  });

  it("updates the detector verdict when a different equation is selected", async () => {
    await renderSim();
    await click(controlByLabel("invalid: one right-hand term is velocity"));
    await change(controlByLabel("Rationale"), "I will compare the dimensions of every term.");
    await click(commitButton());

    expect(document.body.textContent).toContain("Impossible as written");
    await change(controlByLabel("Proposed equation"), "3");

    expect(document.body.textContent).toContain("Newton's second law");
    expect(document.body.textContent).toContain("Possible by units");
    expect(document.body.textContent).toContain("M L T⁻²");
  });
});
