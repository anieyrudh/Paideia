// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { CapacitanceSim } from "./capacitance.js";

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
    root?.render(createElement(CapacitanceSim));
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
  return button instanceof HTMLButtonElement ? button : document.createElement("button");
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

export const runCapacitanceGateContract = () => {
  describe("capacitance prediction-checkpoint contract", () => {
    it("blocks capacitor readouts until the prediction checkpoint is committed", async () => {
      await renderSim();

      await click(buttonByText("Set capacitor values"));
      await click(buttonByText("Reveal capacitor result"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.querySelector("[aria-label='Capacitance readout']")).not.toBeNull();

      await click(controlByLabel("Both stored charge and stored energy double"));
      await change(
        controlByLabel("Rationale"),
        "At fixed voltage, Q = CV and U = one half C V squared both scale with C.",
      );
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Stored charge");
      expect(document.body.textContent).toContain("2820.0 microC");
      expect(document.body.textContent).toContain("U = 1/2");
      expect(document.body.textContent).toContain("V(t) = V0 e^(-t/tau)");
    });

    it("updates stored charge when capacitance changes before reveal", async () => {
      await renderSim();

      await click(buttonByText("Set capacitor values"));
      await change(controlByLabel("Capacitance"), "940");
      await click(buttonByText("Reveal capacitor result"));
      await click(controlByLabel("Both stored charge and stored energy double"));
      await change(controlByLabel("Rationale"), "Doubling capacitance at fixed voltage doubles Q.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Capacitance readout']")?.textContent).toContain(
        "5640.0 microC",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "Q = CV",
      );
    });
  });
};
