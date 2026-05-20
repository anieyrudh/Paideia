// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ResultantMagnitudeSim } from "./resultant-magnitude.js";

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
    root?.render(createElement(ResultantMagnitudeSim));
  });
};

const text = (): string => document.body.textContent ?? "";

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

export const runResultantMagnitudeGateContract = () => {
  describe("resultant-magnitude prediction-gate contract", () => {
    it("blocks the observation until the prediction gate is committed", async () => {
      await renderSim();

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();

      await click(controlByLabel("7.1 m"));
      await change(
        controlByLabel("Rationale"),
        "Perpendicular arrows should form a right triangle, not a straight line.",
      );
      await click(commitButton());

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(text()).toContain("Geometric resultant");
      expect(document.querySelector("pre[aria-label='Resultant magnitude formula']")).toBeTruthy();
      expect(document.querySelector("[aria-label='Formula legend']")).toBeTruthy();
      expect(text()).toContain("Substitution: |R|");
      expect(text()).toContain("7.1 m");
      expect(text()).toContain("10.0 m");
    });

    it("updates the resultant when the angle changes", async () => {
      await renderSim();

      await click(controlByLabel("7.1 m"));
      await change(controlByLabel("Rationale"), "I expect angle to matter.");
      await click(commitButton());
      await change(controlByLabel("Angle between vectors"), "0");

      expect(document.querySelector("[aria-label='Observation unlocked']")?.textContent).toContain(
        "10.0 m",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "cos(0 degrees)",
      );
    });
  });
};
