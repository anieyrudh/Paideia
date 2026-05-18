// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MeasurementUncertaintyLab } from "./measurement-uncertainty.js";

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
    root?.render(createElement(MeasurementUncertaintyLab));
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

export const runMeasurementUncertaintyGateContract = () => {
  describe("measurement-uncertainty prediction-gate contract", () => {
    it("blocks the notebook answer until the prediction gate is committed", async () => {
      await renderSim();

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(text()).not.toContain("Formula and unit reasoning");

      await click(controlByLabel("2.50 m s^-1 ± 0.09 m s^-1"));
      await change(controlByLabel("Rationale"), "A complete measurement needs value, unit, and uncertainty.");
      await click(commitButton());

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(text()).toContain("Formula and unit reasoning");
      expect(text()).toContain("v = 2.50 ± 0.09 m s^-1");
      expect(text()).toContain("derived quantity · scalar · dimension L T^-1");
    });

    it("updates the speed and uncertainty reasoning when measurements change", async () => {
      await renderSim();

      await click(controlByLabel("2.50 m s^-1 ± 0.09 m s^-1"));
      await change(controlByLabel("Rationale"), "Speed divides a length by a time.");
      await click(commitButton());
      await change(controlByLabel("Distance travelled"), "4");
      await change(controlByLabel("Time measured"), "2");

      expect(document.querySelector("[aria-label='Observation unlocked']")?.textContent).toContain(
        "v = 2.00",
      );
      expect(document.querySelector("[aria-label='Formula and unit reasoning']")?.textContent).toContain(
        "m ÷ s becomes m s^-1",
      );
    });
  });
};
