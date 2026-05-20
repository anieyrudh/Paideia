// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { KinematicsOneDimensionSim } from "./kinematics-one-dimension.js";

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
    root?.render(createElement(KinematicsOneDimensionSim));
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

export const runKinematicsGateContract = () => {
  describe("kinematics-in-one-dimension prediction-gate contract", () => {
    it("blocks motion readouts until the prediction gate is committed", async () => {
      await renderSim();

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(document.body.textContent).not.toContain("Substitution: s");

      await click(controlByLabel("9.0 m"));
      await change(controlByLabel("Rationale"), "Starting from rest leaves only the acceleration term.");
      await click(commitButton());

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(document.body.textContent).toContain("Displacement");
      expect(document.body.textContent).toContain("9.00 m");
      expect(document.querySelector("pre[aria-label='Constant acceleration formula']")).toBeTruthy();
      expect(document.querySelector("[aria-label='Formula legend']")).toBeTruthy();
      expect(document.body.textContent).toContain("Substitution: s");
    });

    it("updates displacement when elapsed time changes", async () => {
      await renderSim();

      await click(controlByLabel("9.0 m"));
      await change(controlByLabel("Rationale"), "The displacement depends on t squared when u is zero.");

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(document.querySelector("[aria-label='Formula used']")).toBeNull();

      await click(commitButton());
      await change(controlByLabel("Elapsed time"), "4");

      expect(document.querySelector("[aria-label='Observation unlocked']")?.textContent).toContain(
        "16.00 m",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "4.0 s)^2",
      );
    });
  });
};
