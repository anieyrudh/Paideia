// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { GravitationalFieldsSim } from "./gravitational-fields.js";

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
    root?.render(createElement(GravitationalFieldsSim));
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

export const runGravitationalFieldsGateContract = () => {
  describe("gravitational-fields prediction-gate contract", () => {
    it("blocks field and potential readouts until the prediction gate is committed", async () => {
      await renderSim();

      await click(buttonByText("Set up field lab"));
      await click(buttonByText("Reveal field strength"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(document.body.textContent).not.toContain("g = GM / r^2");

      await click(controlByLabel("It becomes one quarter as large."));
      await change(controlByLabel("Rationale"), "Field strength follows an inverse-square law.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(document.body.textContent).toContain("Field strength");
      expect(document.body.textContent).toContain("g = GM / r^2");
      expect(document.body.textContent).toContain("9.820 N kg^-1");
    });

    it("updates the inverse-square comparison when radius changes before reveal", async () => {
      await renderSim();

      await click(buttonByText("Set up field lab"));
      await change(controlByLabel("Field point radius"), "2");
      await change(controlByLabel("Comparison radius"), "1");
      await click(buttonByText("Reveal field strength"));
      await click(controlByLabel("It becomes one quarter as large."));
      await change(controlByLabel("Rationale"), "At twice the radius, the field is one quarter.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Gravitational field readout']")?.textContent).toContain(
        "2.455 N kg^-1",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "which is 4.000 times the current field",
      );
    });
  });
};
