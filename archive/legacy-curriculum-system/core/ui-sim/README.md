# @paideia/ui-sim

Simulation control primitives for Paideia containers. This package is the sanctioned source for learner-facing controls inside simulations: numeric sliders, steppers, toggles, selectors, drag points, drag vectors, number inputs, and grouped controls.

Every exported component is controlled. Callers own the value and receive every value change through `onChange`; the package does not persist state or keep shadow copies of simulation parameters.

## Exports

- `Slider`
- `Stepper`
- `Toggle`
- `Selector`
- `DragPoint`
- `DragVector`
- `NumberInput`
- `ControlGroup`

## Usage

```tsx
import { Slider, Toggle, ControlGroup } from "@paideia/ui-sim";

export const Controls = ({
  amplitude,
  showVectors,
  setAmplitude,
  setShowVectors,
}: {
  readonly amplitude: number;
  readonly showVectors: boolean;
  readonly setAmplitude: (value: number) => void;
  readonly setShowVectors: (value: boolean) => void;
}) => (
  <ControlGroup legend="Oscillator controls">
    <Slider
      label="Amplitude"
      max={10}
      min={0}
      onChange={setAmplitude}
      step={0.1}
      unit="m"
      value={amplitude}
    />
    <Toggle label="Show vectors" onChange={setShowVectors} value={showVectors} />
  </ControlGroup>
);
```

Numeric controls clamp to their declared bounds and report the clamped value back through `onChange`, including when the supplied `value` prop starts out of range. Units are display-only.

`DragPoint` and `DragVector` render compact SVG handles. They clamp handles to the supplied `Rect` from `@paideia/shared` and support keyboard movement with arrow keys; hold Shift for larger movement.

## Styling

The package intentionally avoids a design-token system. Consumers may style native controls with normal CSS and can override drag handle tokens:

- `--ui-sim-drag-surface`
- `--ui-sim-drag-border`
- `--ui-sim-drag-handle-fill`
- `--ui-sim-drag-handle-stroke`
- `--ui-sim-vector-stroke`
