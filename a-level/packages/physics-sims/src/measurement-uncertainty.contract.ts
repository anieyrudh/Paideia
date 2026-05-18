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
    it("blocks uncertainty calculations until the prediction gate is committed", async () => {
      await renderSim();

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(document.body.textContent).not.toContain("Best estimate");
      expect(document.body.textContent).not.toContain("speed = length ÷ time");

      await click(controlByLabel("The reading spread between students"));
      await change(
        controlByLabel("Rationale"),
        "The two readings disagree by more than the ruler division, so the spread should matter.",
      );
      await click(commitButton());

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(document.body.textContent).toContain("Best estimate");
      expect(document.body.textContent).toContain("12.60 cm");
      expect(document.body.textContent).toContain("±0.20 cm");
      expect(document.body.textContent).toContain("speed = length ÷ time");
    });

    it("updates the visible uncertainty model when readings change", async () => {
      await renderSim();

      await click(controlByLabel("The reading spread between students"));
      await change(controlByLabel("Rationale"), "I will compare repeat spread against instrument limit.");
      await click(commitButton());
      await change(controlByLabel("Reading 2"), "13.0");

      expect(document.querySelector("[aria-label='Observation unlocked']")?.textContent).toContain(
        "12.70 cm",
      );
      expect(document.querySelector("[aria-label='Formula and unit reasoning']")?.textContent).toContain(
        "±0.30 cm",
      );
    });
  });
};
