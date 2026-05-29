// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ThermalPhysicsSim } from "./thermal-physics.js";

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
    root?.render(createElement(ThermalPhysicsSim));
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

export const runThermalPhysicsGateContract = () => {
  describe("thermal-physics prediction-checkpoint contract", () => {
    it("blocks pressure and heat readouts until the prediction checkpoint is committed", async () => {
      await renderSim();

      await click(buttonByText("Set up thermal lab"));
      await click(buttonByText("Reveal thermal behaviour"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Gas pressure");
      expect(document.body.textContent).toContain("p =");

      await click(controlByLabel("100 kPa"));
      await change(controlByLabel("Rationale"), "The gas-law temperature must be converted to kelvin.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Gas pressure");
      expect(document.body.textContent).toContain("99.8 kPa");
      expect(document.body.textContent).toContain("Q =");
    });

    it("updates the pressure readout when volume is changed before reveal", async () => {
      await renderSim();

      await click(buttonByText("Set up thermal lab"));
      await change(controlByLabel("Gas volume"), "0.5");
      await click(buttonByText("Reveal thermal behaviour"));
      await click(controlByLabel("100 kPa"));
      await change(controlByLabel("Rationale"), "Halving volume at fixed amount and temperature doubles pressure.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Thermal readout']")?.textContent).toContain(
        "199.6 kPa",
      );
      expect(document.querySelector("[aria-label='Formula legend']")?.textContent).toContain(
        "kelvin temperature",
      );
    });
  });
};
