// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  ControlGroup,
  DragPoint,
  DragVector,
  NumberInput,
  Selector,
  Slider,
  Stepper,
  Toggle,
} from "./components.js";

const bounds = {
  x: { min: 0, max: 10 },
  y: { min: 0, max: 10 },
};

const lastPoint = (onChange: ReturnType<typeof vi.fn>): [number, number] => {
  const point = onChange.mock.calls.at(-1)?.[0] as [number, number] | undefined;
  expect(point).toBeDefined();
  return point ?? [Number.NaN, Number.NaN];
};

afterEach(() => {
  cleanup();
});

describe("@paideia/ui-sim controls", () => {
  it("renders Slider as a controlled labelled range and reports clamped values", () => {
    const onChange = vi.fn();
    render(<Slider label="Amplitude" max={10} min={0} onChange={onChange} unit="m" value={12} />);

    expect(screen.getByLabelText("Amplitude")).toBeTruthy();
    expect(screen.getByText("10 m")).toBeTruthy();
    expect(onChange).toHaveBeenCalledWith(10);

    fireEvent.change(screen.getByLabelText("Amplitude"), { target: { value: "4" } });
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it("increments and clamps Stepper with explicit caller-visible changes", () => {
    const onChange = vi.fn();
    render(<Stepper label="Mass" max={3} min={0} onChange={onChange} step={2} value={2} />);

    fireEvent.click(screen.getByLabelText("Increase Mass"));
    expect(onChange).toHaveBeenCalledWith(3);

    fireEvent.keyDown(screen.getByRole("spinbutton", { name: "Mass" }), { key: "PageDown" });
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("keeps Toggle controlled and keyboard reachable through the native switch", () => {
    const onChange = vi.fn();
    render(<Toggle label="Show vectors" onChange={onChange} value={false} />);

    const toggle = screen.getByRole("switch", { name: "Show vectors" });
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("maps generic Selector options back to caller values", () => {
    const quadratic = { id: "quadratic" } as const;
    const linear = { id: "linear" } as const;
    const onChange = vi.fn();

    render(
      <Selector
        label="Model"
        onChange={onChange}
        options={[
          { label: "Linear", value: linear },
          { label: "Quadratic", value: quadratic },
        ]}
        value={linear}
      />,
    );

    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "1" } });
    expect(onChange).toHaveBeenCalledWith(quadratic);
  });

  it("clamps NumberInput and supports arrow-key stepping", () => {
    const onChange = vi.fn();
    render(<NumberInput label="Frequency" max={5} min={1} onChange={onChange} step={0.5} value={0} />);

    expect(onChange).toHaveBeenCalledWith(1);

    fireEvent.keyDown(screen.getByLabelText("Frequency"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith(1.5);
  });

  it("moves DragPoint with keyboard and constrains function curves", () => {
    const onChange = vi.fn();
    render(
      <DragPoint
        bounds={bounds}
        constraint="on-curve"
        curve={(x) => x * 2}
        label="Point A"
        onChange={onChange}
        value={[4, 3]}
      />,
    );

    expect(onChange).toHaveBeenCalledWith([4, 8]);

    fireEvent.keyDown(screen.getByRole("slider", { name: "Point A" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith([4.1, 8.2]);
  });

  it("keeps function-constrained DragPoint values on the visible curve", () => {
    const onChange = vi.fn();
    render(
      <DragPoint
        bounds={bounds}
        constraint="on-curve"
        curve={(x) => x * 2}
        label="Curve point"
        onChange={onChange}
        value={[8, 9]}
      />,
    );

    const point = lastPoint(onChange);
    expect(point[0]).toBeGreaterThanOrEqual(bounds.x.min);
    expect(point[0]).toBeLessThanOrEqual(bounds.x.max);
    expect(point[1]).toBeGreaterThanOrEqual(bounds.y.min);
    expect(point[1]).toBeLessThanOrEqual(bounds.y.max);
    expect(point[1]).toBeCloseTo(point[0] * 2, 8);
  });

  it("keeps parametric-constrained DragPoint values on the visible curve", () => {
    const onChange = vi.fn();
    render(
      <DragPoint
        bounds={bounds}
        constraint="on-curve"
        curve={(t) => [20 * t, 20 * t]}
        label="Parametric point"
        onChange={onChange}
        value={[9, 8]}
      />,
    );

    const point = lastPoint(onChange);
    expect(point[0]).toBeGreaterThanOrEqual(bounds.x.min);
    expect(point[0]).toBeLessThanOrEqual(bounds.x.max);
    expect(point[1]).toBeGreaterThanOrEqual(bounds.y.min);
    expect(point[1]).toBeLessThanOrEqual(bounds.y.max);
    expect(point[1]).toBeCloseTo(point[0], 8);
  });

  it("moves each DragVector handle independently with keyboard", () => {
    const onChange = vi.fn();
    render(
      <DragVector
        bounds={bounds}
        head={[2, 2]}
        label="Velocity"
        onChange={onChange}
        tail={[1, 1]}
      />,
    );

    fireEvent.keyDown(screen.getByRole("slider", { name: "Velocity tail" }), { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith([1, 1.1], [2, 2]);

    fireEvent.keyDown(screen.getByRole("slider", { name: "Velocity head" }), { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith([1, 1], [1.9, 2]);
  });

  it("wraps related controls in a fieldset with a legend", () => {
    render(
      <ControlGroup legend="Initial state">
        <Toggle label="Enabled" onChange={() => undefined} value={true} />
      </ControlGroup>,
    );

    expect(screen.getByText("Initial state")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Enabled" })).toBeTruthy();
  });
});
