// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ElectricFieldsSim } from "./electric-fields.js";

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
    root?.render(createElement(ElectricFieldsSim));
  });
};

const click = async (control: HTMLElement) => {
  await act(async () => {
    control.click();
  });
};

const buttonByText = (text: string): HTMLButtonElement => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === text,
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Could not find button ${text}`);
  }
  return button;
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

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  host?.remove();
  root = null;
  host = null;
  localStorage.clear();
});

export const runElectricFieldsGateContract = () => {
  describe("electric fields prediction-gate contract", () => {
    it("blocks field readouts until the prediction gate is committed", async () => {
      await renderSim();

      await click(buttonByText("Set charge position"));
      await click(buttonByText("Reveal field result"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(document.body.textContent).not.toContain("Electric field strength");

      await click(controlByLabel("To the left"));
      await change(
        controlByLabel("Rationale"),
        "A negative test charge feels force opposite to the electric field.",
      );
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Electric field strength");
      expect(document.body.textContent).toContain("2.00 x 10^5 N/C");
      expect(document.body.textContent).toContain("Delta U = q Delta V");
    });

    it("updates field strength when separation changes before reveal", async () => {
      await renderSim();

      await click(buttonByText("Set charge position"));
      await change(controlByLabel("Separation"), "10");
      await click(buttonByText("Reveal field result"));
      await click(controlByLabel("To the left"));
      await change(controlByLabel("Rationale"), "Closer points have stronger inverse-square fields.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Electric field readout']")?.textContent).toContain(
        "4.49 x 10^5 N/C",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "E = kQ / r^2",
      );
    });
  });
};
