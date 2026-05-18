// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { UnitClassificationLab } from "./unit-classification.js";

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

const buttonByText = (buttonText: string): HTMLButtonElement => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.includes(buttonText) ?? false,
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Could not find button ${buttonText}`);
  }
  return button;
};

const commitPrediction = async () => {
  await click(controlByLabel("Trusting numbers before units"));
  await change(controlByLabel("Rationale"), "I often start with the number before checking what the unit allows.");
  await click(buttonByText("Commit prediction"));
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

export const runUnitClassificationGateContract = () => {
  describe("unit-classification prediction-gate contract", () => {
    it("blocks quantity classifications until the prediction gate is committed", async () => {
      await renderSim();

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(text()).not.toContain("Dimensionally consistent");
      expect(text()).not.toContain("acceleration = velocity change ÷ time");

      await commitPrediction();

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(text()).toContain("Unit classification lab");
      expect(text()).toContain("Formula used");
      expect(text()).toContain("speed = distance ÷ time");
    });

    it("lets learners inspect a vector derived quantity and reject an impossible equation", async () => {
      await renderSim();
      await commitPrediction();

      await click(buttonByText("Acceleration"));
      expect(text()).toContain("Acceleration");
      expect(text()).toContain("vector");
      expect(text()).toContain("m s⁻²");

      await click(buttonByText("acceleration = speed × time"));
      expect(text()).toContain("Not dimensionally consistent");
      expect(text()).toContain("Units rule this equation out before any numbers are substituted.");
    });
  });
};
