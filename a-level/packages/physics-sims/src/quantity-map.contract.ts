// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { dimensionText, quantityMapModel, QuantityMapLab } from "./quantity-map.js";

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
    root?.render(createElement(QuantityMapLab));
  });
};

const controlByLabel = (labelText: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
  const labels = Array.from(document.querySelectorAll("label"));
  const label = labels.find((candidate) => candidate.textContent?.includes(labelText));
  const nestedControl = label?.querySelector("input, textarea, select");
  const labelledControl =
    label?.htmlFor === undefined || label.htmlFor.length === 0
      ? null
      : document.getElementById(label.htmlFor);
  const control = nestedControl ?? labelledControl;
  if (
    !(control instanceof HTMLInputElement) &&
    !(control instanceof HTMLTextAreaElement) &&
    !(control instanceof HTMLSelectElement)
  ) {
    throw new Error(`Could not find control labelled ${labelText}`);
  }
  return control;
};

const change = async (
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) => {
  await act(async () => {
    const prototype =
      control instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : control instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLSelectElement.prototype;
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

export const runQuantityMapGateContract = () => {
  describe("quantity-map prediction-gate contract", () => {
    it("blocks the dependency graph and formula check until prediction is committed", async () => {
      await renderSim();

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeNull();
      expect(document.body.textContent).not.toContain("dimensionally consistent");

      await click(controlByLabel("speed = distance / time"));
      await change(controlByLabel("Rationale"), "Dividing distance by time should leave metres per second.");
      await click(commitButton());

      expect(document.querySelector("[aria-label='Observation unlocked']")).toBeTruthy();
      expect(document.body.textContent).toContain("Dependency graph lab");
      expect(document.body.textContent).toContain("Speed");
      expect(document.body.textContent).toContain("Dimension: L T^-1");
      expect(document.body.textContent).toContain("dimensionally consistent");
    });

    it("surfaces a mismatch when an impossible equation is selected", async () => {
      await renderSim();

      await click(controlByLabel("speed = distance / time"));
      await change(controlByLabel("Rationale"), "I will check dimensions before accepting the formula.");
      await click(commitButton());
      await change(controlByLabel("Equation to test"), "3");

      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "dimension mismatch",
      );
      expect(document.querySelector("[aria-label='Formula used']")?.textContent).toContain(
        "M L T^-1",
      );
    });

    it("builds force from mass, length, time, and acceleration dependencies", () => {
      const model = quantityMapModel({
        focusQuantityId: "force",
        equationId: "force-mass-acceleration",
      });

      expect(model.dependencies.map((node) => node.id)).toEqual([
        "length",
        "time",
        "mass",
        "velocity",
        "acceleration",
      ]);
      expect(dimensionText(model.focus.dimensions)).toBe("M L T^-2");
      expect(model.equation.status).toBe("consistent");
    });
  });
};
