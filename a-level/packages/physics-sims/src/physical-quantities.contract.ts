// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { PhysicalQuantitiesSim } from "./physical-quantities.js";

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
    root?.render(createElement(PhysicalQuantitiesSim));
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

export const runPhysicalQuantitiesGateContract = () => {
  describe("physical-quantities prediction-gate contract", () => {
    it("blocks the dimensional verdict until the prediction gate is committed", async () => {
      await renderSim();

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(text()).not.toContain("Units reject this equation");

      await click(controlByLabel("s = vt + 1/2 at"));
      await change(controlByLabel("Rationale"), "The acceleration term looks short by one time factor.");
      await click(commitButton());

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(text()).toContain("Units reject this equation");
      expect(text()).toContain("s = vt + 1/2 at");
      expect(text()).toContain("Fix: The second term needs another factor of time");
    });

    it("updates the audit when a consistent equation is selected", async () => {
      await renderSim();

      await click(controlByLabel("s = vt + 1/2 at"));
      await change(controlByLabel("Rationale"), "I want to compare both terms.");
      await click(commitButton());
      await change(controlByLabel("Equation"), "speed-from-distance-time");

      expect(document.querySelector("[aria-label='Observation unlocked']")?.textContent).toContain(
        "Dimensionally consistent",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "both sides reduce to m s^-1",
      );
    });
  });
};
