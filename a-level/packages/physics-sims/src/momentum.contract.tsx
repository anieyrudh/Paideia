// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MomentumSim } from "./momentum.js";

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
    root?.render(createElement(MomentumSim));
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

export const runMomentumGateContract = () => {
  describe("momentum prediction-gate contract", () => {
    it("blocks the work and power readouts until the prediction gate is committed", async () => {
      await renderSim();

      await click(buttonByText("Set up energy transfer"));
      await click(buttonByText("Reveal energy transfer"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(document.body.textContent).not.toContain("W = F s cos(theta)");

      await click(controlByLabel("30 J and 15 W"));
      await change(controlByLabel("Rationale"), "The pull is in the same direction as the motion.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(document.body.textContent).toContain("Work done");
      expect(document.body.textContent).toContain("+30.00 J");
      expect(document.body.textContent).toContain("W = F s cos(theta)");
    });

    it("updates the power readout when elapsed time changes before reveal", async () => {
      await renderSim();

      await click(buttonByText("Set up energy transfer"));
      await change(controlByLabel("Elapsed time"), "6");
      await click(buttonByText("Reveal energy transfer"));
      await click(controlByLabel("30 J and 15 W"));
      await change(controlByLabel("Rationale"), "The same work spread over more time lowers power.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Energy readout']")?.textContent).toContain(
        "+5.00 W",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "+30.00 J / 6.0 s",
      );
    });
  });
};
