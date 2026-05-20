// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CircuitsSim } from "./circuits.js";

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
    root?.render(createElement(CircuitsSim));
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

export const runCircuitsGateContract = () => {
  describe("circuits prediction-gate contract", () => {
    it("blocks circuit readouts until the prediction gate is committed", async () => {
      await renderSim();

      await click(buttonByText("Build circuit"));
      await click(buttonByText("Reveal circuit result"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(document.body.textContent).not.toContain("R_p}");

      await click(controlByLabel("The total current increases"));
      await change(
        controlByLabel("Rationale"),
        "Adding a parallel branch lowers equivalent resistance, so current rises for fixed voltage.",
      );
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Total current");
      expect(document.body.textContent).toContain("0.205 A");
      expect(document.body.textContent).toContain("R_p}");
    });

    it("updates the total current when resistance changes before reveal", async () => {
      await renderSim();

      await click(buttonByText("Build circuit"));
      await change(controlByLabel("Series resistor"), "10");
      await click(buttonByText("Reveal circuit result"));
      await click(controlByLabel("The total current increases"));
      await change(
        controlByLabel("Rationale"),
        "A smaller series resistance gives less total resistance.",
      );
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Circuit readout']")?.textContent).toContain(
        "0.265 A",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "I}=\\frac",
      );
    });
  });
};
