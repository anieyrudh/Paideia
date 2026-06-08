// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectileMotionSim } from "./projectile-motion.js";

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
    root?.render(createElement(ProjectileMotionSim));
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

export const runProjectileMotionGateContract = () => {
  describe("projectile-motion prediction-checkpoint contract", () => {
    it("blocks trajectory and formula readouts until the prediction checkpoint is committed", async () => {
      await renderSim();

      expect(document.querySelector("[aria-label='Observation unlocked']")).not.toBeNull();
      expect(document.body.textContent).toContain("horizontal range");

      await click(controlByLabel("It stays constant if air resistance is ignored."));
      await change(controlByLabel("Rationale"), "Gravity has no horizontal component in this model.");
      await click(commitButton());

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(document.querySelector("[aria-label='Projectile trajectory diagram']")).toBeTruthy();
      expect(document.querySelector("pre[aria-label='Projectile formula']")).toBeTruthy();
      expect(document.querySelector("[aria-label='Formula legend']")).toBeTruthy();
      expect(document.body.textContent).toContain("Result: horizontal range");
    });

    it("updates the visible range when launch speed changes", async () => {
      await renderSim();

      await click(controlByLabel("It stays constant if air resistance is ignored."));
      await change(controlByLabel("Rationale"), "Gravity changes only vertical velocity.");
      await click(commitButton());

      const before = document.querySelector("[aria-label='Observation unlocked']")?.textContent ?? "";
      await change(controlByLabel("Launch speed"), "24");
      const after = document.querySelector("[aria-label='Observation unlocked']")?.textContent ?? "";

      expect(before).not.toEqual(after);
      expect(after).toContain("Range");
    });
  });
};
