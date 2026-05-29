// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { OscillationsSim } from "./oscillations.js";

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
    root?.render(createElement(OscillationsSim));
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

export const runOscillationsGateContract = () => {
  describe("oscillations prediction-checkpoint contract", () => {
    it("blocks period and energy readouts until the prediction checkpoint is committed", async () => {
      await renderSim();

      await click(buttonByText("Set up oscillator"));
      await click(buttonByText("Open prediction checkpoint"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Energy:");

      await click(controlByLabel("The period stays the same"));
      await change(
        controlByLabel("Rationale"),
        "Amplitude is not in the ideal spring period formula.",
      );
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Period");
      expect(document.body.textContent).toContain("Energy:");
      expect(document.body.textContent).toContain("a = -ω²x");
    });

    it("updates the period readout when spring stiffness changes before reveal", async () => {
      await renderSim();

      await click(buttonByText("Set up oscillator"));
      await change(controlByLabel("Spring stiffness"), "64");
      await click(buttonByText("Open prediction checkpoint"));
      await click(controlByLabel("The period stays the same"));
      await change(
        controlByLabel("Rationale"),
        "Changing stiffness changes the period; changing amplitude alone does not.",
      );
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Oscillation readout']")?.textContent).toContain(
        "1.11 s",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "ω = sqrt",
      );
    });
  });
};
