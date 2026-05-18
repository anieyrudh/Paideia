// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { UnitClassificationLab } from "./physical-quantities.js";

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
    root?.render(createElement(UnitClassificationLab));
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

const text = (): string => document.body.textContent ?? "";

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  host?.remove();
  root = null;
  host = null;
  localStorage.clear();
});

export const runPhysicalQuantitiesGateContract = () => {
  describe("physical-quantities unit-classification prediction-gate contract", () => {
    it("blocks the lab observations until a prediction is committed", async () => {
      await renderSim();

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(text()).not.toContain("Unit balance");
      expect(text()).not.toContain("classification matches");

      await click(controlByLabel("The unit describes speed, not acceleration."));
      await change(controlByLabel("Rationale"), "Acceleration needs one more per second than speed.");
      await click(commitButton());

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(text()).toContain("Acceleration");
      expect(text()).toContain("m s^-2");
      expect(text()).toContain("units clash");
    });

    it("lets learners classify a new card and inspect a consistent equation", async () => {
      await renderSim();

      await click(controlByLabel("The unit describes speed, not acceleration."));
      await change(controlByLabel("Rationale"), "I am checking the unit dimension before trusting it.");
      await click(commitButton());

      await change(controlByLabel("Quantity card"), "0");
      await change(controlByLabel("Quantity family"), "0");
      await change(controlByLabel("Direction needed?"), "0");
      await change(controlByLabel("Equation to test"), "0");

      expect(text()).toContain("Length");
      expect(text()).toContain("classification matches");
      expect(text()).toContain("m / s = m s^-1");
      expect(text()).toContain("units agree");
    });
  });
};
