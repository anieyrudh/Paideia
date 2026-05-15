# core/ui-sim · agent contract

## What this module is
The simulation control kit: sliders, steppers, toggles, selectors, drag-handles, and vector handles — the small set of primitives that every sim uses to let a learner set a parameter or grab a value. It wraps PhET's SceneryStack `sun` library (when that integration lands) for sim-tested control affordances and falls back to Radix UI primitives for accessibility-grade plumbing. It is the only sanctioned source of sim controls in the monorepo.

## Public interface
Exports from `@paideia/ui-sim`:

- `<Slider value={number} min={number} max={number} step?={number} label={string} unit?={string} onChange={(v: number) => void} />`
- `<Stepper value={number} min={number} max={number} step?={number} label={string} onChange={(v: number) => void} />`
- `<Toggle value={boolean} label={string} onChange={(v: boolean) => void} />`
- `<Selector<T> value={T} options={readonly { value: T; label: string }[]} label={string} onChange={(v: T) => void} />`
- `<DragPoint value={[number, number]} bounds={Rect} constraint?={'free' | 'on-curve'} curve?={Function2D | ParametricCurve2D} label={string} onChange={(p: [number, number]) => void} />`
- `<DragVector tail={[number, number]} head={[number, number]} bounds={Rect} label={string} onChange={(tail: [number, number], head: [number, number]) => void} />`
- `<NumberInput value={number} min?={number} max?={number} step?={number} label={string} onChange={(v: number) => void} />` — keyboard-first sibling to `<Slider>`.
- `<ControlGroup legend={string}>{children}</ControlGroup>` — fieldset wrapper for related controls.

## Invariants the caller must preserve
- Every control is **controlled**: the caller owns `value` and supplies `onChange`. No internal state, no uncontrolled mode.
- Every control is **keyboard-navigable**: focusable via Tab, adjustable via arrow keys / Page Up / Page Down where applicable. The caller does not need to wire keyboard handlers.
- Every control has an `aria-label` (from `label`) or `aria-labelledby` (when wrapped in `<ControlGroup>`).
- `Slider` and `Stepper` clamp `value` to `[min, max]` internally; an out-of-range value is shown clamped and reported back via `onChange`.
- Units are display-only — they do not change the numeric contract with the caller.

## What this module does NOT do
- Does **not** render plots, charts, scenes, timelines — those are their own core modules. Controls do not draw the thing they control.
- Does **not** own page-level layout components (header, sidebar, nav). That's a future `core/ui-app` or branch-app shell.
- Does **not** ship a design system token set. Theme tokens come from a separate styling layer; controls consume them.
- Does **not** persist values. Persistence is the sim-runtime or sim-author's concern.
- Does **not** depend on a specific math library — `DragPoint` constraints accept a `Function2D`, supplied by the caller.
- Does **not** localise labels — pass localised strings.
- Does **not** show error popovers, tooltips, or validation messages — keep the control's contract minimal; compose with a tooltip layer if needed.

## When to consider this module
Use `core/ui-sim` for every interactive control inside a simulation — a slider over a parameter, a toggle for a model option, a drag-handle for a point or vector. If a built-in `<input type="range">` is in a sim package, replace it with `<Slider>`.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (every sim package — controls are ubiquitous).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any prop rename, default behaviour change, or accessibility contract change.

## Anti-patterns (will be rejected in PR review)
- Uncontrolled mode (`defaultValue` without `value`).
- A control that is reachable by mouse but not by keyboard.
- Custom unlabelled drag handles in a sim package — extend `DragPoint`/`DragVector` instead.
- Native `<input type="range">` or `<select>` directly in a sim — use the wrapper, get the accessibility plumbing.
- Hard-coded colours and sizes — read theme tokens.
- Branch-specific control variants (`SUTDSlider`) — accept props.
- Side effects in `onChange` other than caller-supplied updates (no analytics calls hidden inside the slider).

## How the Anieyrudh Filter reads this module
The Filter probes that **every control is operable without a mouse and announces its current value to a screen reader**, and that the numeric value the caller sees through `onChange` is exactly what the learner set — no rounding the caller didn't ask for, no clamping silently outside `[min, max]`. A control that is decorative for some learners and functional for others fails review.
