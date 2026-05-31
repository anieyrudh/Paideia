// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { WavesSim } from "./waves.js";

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
    root?.render(createElement(WavesSim));
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

export const runWavesGateContract = () => {
  describe("waves prediction-checkpoint contract", () => {
    it("blocks the resultant wave readouts until the prediction checkpoint is committed", async () => {
      await renderSim();

      await click(buttonByText("Set up wave behaviour"));
      await click(buttonByText("Reveal wave behaviour"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("resultant displacement");

      await click(controlByLabel("They add to double the displacement"));
      await change(controlByLabel("Rationale"), "In phase crests have displacements in the same direction.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("Resultant at marker");
      expect(document.body.textContent).toContain("+3.00 m");
      expect(document.body.textContent).toContain("resultant displacement");
    });

    it("updates the interference readout when phase changes before reveal", async () => {
      await renderSim();

      await click(buttonByText("Set up wave behaviour"));
      await change(controlByLabel("Phase difference"), "180");
      await click(buttonByText("Reveal wave behaviour"));
      await click(controlByLabel("They cancel to zero"));
      await change(controlByLabel("Rationale"), "Opposite phase gives equal and opposite displacement.");
      await click(buttonByText("Commit prediction"));

      expect(document.querySelector("[aria-label='Wave readout']")?.textContent).toContain(
        "+0.00 m",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "resultant displacement =",
      );
    });
  });
};
