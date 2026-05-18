// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MeasurementUncertaintySim } from "./measurement-uncertainty.js";

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
    root?.render(createElement(MeasurementUncertaintySim));
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
    it("blocks measurement reasoning until the prediction gate is committed", async () => {
      await renderSim();

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(text()).not.toContain("Formula used");
      expect(text()).not.toContain("m / s =");

      await click(controlByLabel("m s^-1"));
      await change(controlByLabel("Rationale"), "Speed is distance divided by time, so metres divide by seconds.");
      await click(commitButton());

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(text()).toContain("Average speed");
      expect(text()).toContain("m / s =");
      expect(text()).toContain("0.40 ± 0.02 m s^-1");
      expect(text()).toContain("distance + time");
    });

    it("updates speed and uncertainty when readings change", async () => {
      await renderSim();

      await click(controlByLabel("m s^-1"));
      await change(controlByLabel("Rationale"), "The unit should be length per time.");
      await click(commitButton());
      await change(controlByLabel("Measured distance"), "100");
      await change(controlByLabel("Measured time"), "4");

      expect(document.querySelector("[aria-label='Observation unlocked']")?.textContent).toContain(
        "0.25 ± 0.01 m s^-1",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "1.00 m / 4.00 s",
      );
    });
  });
};
