// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { QuantityDependencyMapSim, quantityMapModel } from "./physical-quantities.js";

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
    root?.render(createElement(QuantityDependencyMapSim));
  });
};

const text = (): string => document.body.textContent ?? "";

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

const change = async (control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) => {
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

describe("physical quantities dependency map", () => {
  it("reduces force to SI base units through the dependency chain", () => {
    const force = quantityMapModel("force");

    expect(force.ok ? force.value.baseUnitText : "").toBe("kg m s^-2");
    expect(force.ok ? force.value.highlightedNodeIds : []).toEqual([
      "length",
      "mass",
      "time",
      "velocity",
      "acceleration",
      "force",
    ]);
  });

  it("blocks the map and unit reasoning until the prediction gate is committed", async () => {
    await renderSim();

    expect(document.querySelector("[aria-label='Unit reasoning panel']")).toBeNull();
    expect(text()).not.toContain("Quantity map lab");
    expect(text()).not.toContain("1 N = 1 kg m s^-2");

    await click(controlByLabel("force → mass and acceleration → length and time"));
    await change(controlByLabel("Rationale"), "Force depends on mass and acceleration, and acceleration already depends on length and time.");
    await click(commitButton());

    expect(document.querySelector("[aria-label='Unit reasoning panel']")).toBeTruthy();
    expect(text()).toContain("Quantity map lab");
    expect(text()).toContain("therefore 1 N = 1 kg m s^-2");
  });

  it("updates the visible reasoning when the selected quantity changes", async () => {
    await renderSim();

    await click(controlByLabel("force → mass and acceleration → length and time"));
    await change(controlByLabel("Rationale"), "I expect the dependency graph to trace derived units to base units.");
    await click(commitButton());
    await change(controlByLabel("Focus quantity"), "6");

    expect(text()).toContain("energy");
    expect(text()).toContain("1 J = 1 kg m^2 s^-2");
  });
});
