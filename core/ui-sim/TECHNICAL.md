# @paideia/ui-sim technical notes

## Contract

`@paideia/ui-sim` exports only the simulation controls named in `AGENTS.md` from the package entry. Component prop interfaces stay internal to the implementation module. Components are thin React 18 wrappers over native form controls and SVG handles. React is a peer dependency; `@paideia/shared` supplies the `Rect`, `Function2D`, and `ParametricCurve2D` types used by drag controls.

## State model

The package does not own control values. It derives clamped display values from props and calls the caller's `onChange` when:

- the learner changes a control;
- a numeric prop is outside its declared bounds;
- a drag point or vector handle is outside its `Rect`.

This keeps clamping visible to the caller and prevents simulation state from diverging from what learners see.

## Accessibility

Controls receive accessible names from their required `label` or `legend` props. Native range, number, checkbox, and select controls provide baseline keyboard behaviour. SVG drag handles are focusable sliders with `aria-valuetext` that announces both coordinates, and they support arrow-key movement plus larger Shift-arrow steps.

## Drag constraints

`DragPoint` supports free movement or an `on-curve` constraint. For `Function2D`, the point is projected by clamping `x` and evaluating `y = f(x)` only when that point is inside the visible bounds; otherwise the nearest in-bounds curve sample is selected. For `ParametricCurve2D`, the nearest in-bounds sampled point on `t` in `[0, 1]` is selected. This keeps the public API dependency-free while preserving deterministic behaviour.

## Tests

The jsdom test suite verifies controlled value flow, clamping, accessible labels, keyboard movement, selector value mapping, in-bounds curve projection, vector handles, and fieldset grouping.

## Anieyrudh Filter pass

- P0 issues + resolution: all controls remain controlled-only and keyboard operable; no uncontrolled value path or hidden persistence was introduced.
- P1 issues + resolution: `on-curve` drag constraints now return visible in-bounds curve points instead of clamping off-curve values; drag sizing uses CSS custom properties for rendered dimensions and handle metrics.
- High-bandwidth questions surfaced: future design-system integration should supply theme tokens for these CSS variables rather than adding branch-specific control variants.
