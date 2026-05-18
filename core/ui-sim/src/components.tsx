import {
  useEffect,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { Function2D, ParametricCurve2D, Rect } from "@paideia/shared";

export type Point2D = [number, number];

export interface SliderProps {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly label: string;
  readonly unit?: string;
  readonly onChange: (v: number) => void;
}

export interface StepperProps {
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly label: string;
  readonly onChange: (v: number) => void;
}

export interface ToggleProps {
  readonly value: boolean;
  readonly label: string;
  readonly onChange: (v: boolean) => void;
}

export interface SelectorOption<T> {
  readonly value: T;
  readonly label: string;
}

export interface SelectorProps<T> {
  readonly value: T;
  readonly options: readonly SelectorOption<T>[];
  readonly label: string;
  readonly onChange: (v: T) => void;
}

export interface DragPointProps {
  readonly value: Point2D;
  readonly bounds: Rect;
  readonly constraint?: "free" | "on-curve";
  readonly curve?: Function2D | ParametricCurve2D;
  readonly label: string;
  readonly onChange: (p: Point2D) => void;
}

export interface DragVectorProps {
  readonly tail: Point2D;
  readonly head: Point2D;
  readonly bounds: Rect;
  readonly label: string;
  readonly onChange: (tail: Point2D, head: Point2D) => void;
}

export interface NumberInputProps {
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly label: string;
  readonly onChange: (v: number) => void;
}

export interface ControlGroupProps {
  readonly legend: string;
  readonly children: ReactNode;
}

const DEFAULT_STEP = 1;
const DRAG_VIEWBOX_WIDTH = 240;
const DRAG_VIEWBOX_HEIGHT = 160;
const dragSurfaceStyle = {
  height: "var(--ui-sim-drag-height, 10rem)",
  maxWidth: "100%",
  touchAction: "none",
  width: "var(--ui-sim-drag-width, 15rem)",
};

const finiteOr = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

const normalizeRange = (min: number, max: number): readonly [number, number] =>
  min <= max ? [min, max] : [max, min];

const clamp = (value: number, min: number, max: number): number => {
  const [low, high] = normalizeRange(min, max);
  return Math.min(high, Math.max(low, finiteOr(value, low)));
};

const clampOptional = (value: number, min?: number, max?: number): number => {
  const low = min ?? Number.NEGATIVE_INFINITY;
  const high = max ?? Number.POSITIVE_INFINITY;
  return Math.min(high, Math.max(low, finiteOr(value, min ?? max ?? 0)));
};

const stepOf = (step: number | undefined): number =>
  step === undefined || !Number.isFinite(step) || step <= 0 ? DEFAULT_STEP : step;

const pointsEqual = (a: Point2D, b: Point2D): boolean => a[0] === b[0] && a[1] === b[1];

const clampPoint = (point: Point2D, bounds: Rect): Point2D => [
  clamp(point[0], bounds.x.min, bounds.x.max),
  clamp(point[1], bounds.y.min, bounds.y.max),
];

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toPrecision(6);

const pointText = (point: Point2D): string =>
  `x ${formatNumber(point[0])}, y ${formatNumber(point[1])}`;

const valueFromInput = (
  raw: string,
  min: number | undefined,
  max: number | undefined,
): number | null => {
  if (raw.trim().length === 0) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clampOptional(parsed, min, max) : null;
};

const useReportClampedNumber = (
  value: number,
  clamped: number,
  onChange: (v: number) => void,
) => {
  useEffect(() => {
    if (value !== clamped) onChange(clamped);
  }, [clamped, onChange, value]);
};

const useReportClampedPoint = (
  value: Point2D,
  clamped: Point2D,
  onChange: (p: Point2D) => void,
) => {
  useEffect(() => {
    if (!pointsEqual(value, clamped)) onChange(clamped);
  }, [clamped, onChange, value]);
};

const isParametricPoint = (value: unknown): value is Point2D =>
  Array.isArray(value) && value.length >= 2;

const evaluateCurve = (
  curve: Function2D | ParametricCurve2D,
  input: number,
): number | Point2D | null => {
  try {
    const value = curve(input);
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    return Number.isFinite(value[0]) && Number.isFinite(value[1])
      ? [value[0], value[1]]
      : null;
  } catch {
    return null;
  }
};

const inBounds = (point: Point2D, bounds: Rect): boolean =>
  point[0] >= bounds.x.min &&
  point[0] <= bounds.x.max &&
  point[1] >= bounds.y.min &&
  point[1] <= bounds.y.max;

const nearestInBoundsFunctionPoint = (
  point: Point2D,
  bounds: Rect,
  curve: Function2D | ParametricCurve2D,
): Point2D | null => {
  let nearest: Point2D | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= 120; index += 1) {
    const x = bounds.x.min + ((bounds.x.max - bounds.x.min) * index) / 120;
    const y = evaluateCurve(curve, x);
    if (y === null || isParametricPoint(y)) continue;
    const candidate: Point2D = [x, y];
    if (!inBounds(candidate, bounds)) continue;
    const dx = candidate[0] - point[0];
    const dy = candidate[1] - point[1];
    const distance = dx * dx + dy * dy;
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return nearest;
};

const projectToCurve = (
  point: Point2D,
  bounds: Rect,
  curve: Function2D | ParametricCurve2D | undefined,
): Point2D => {
  if (curve === undefined) return clampPoint(point, bounds);

  const x = clamp(point[0], bounds.x.min, bounds.x.max);
  const sample = evaluateCurve(curve, 0.5);
  if (sample === null) return clampPoint(point, bounds);

  if (!isParametricPoint(sample)) {
    const yAtX = evaluateCurve(curve, x);
    if (yAtX === null || isParametricPoint(yAtX)) return clampPoint(point, bounds);
    const candidate: Point2D = [x, yAtX];
    return inBounds(candidate, bounds)
      ? candidate
      : nearestInBoundsFunctionPoint(point, bounds, curve) ?? clampPoint(point, bounds);
  }

  const first = evaluateCurve(curve, 0);
  const initial = isParametricPoint(first) ? first : sample;
  let nearest: Point2D | null = inBounds(initial, bounds) ? initial : null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index <= 80; index += 1) {
    const t = index / 80;
    const candidateRaw = evaluateCurve(curve, t);
    if (!isParametricPoint(candidateRaw)) continue;
    const candidate = candidateRaw;
    if (!inBounds(candidate, bounds)) continue;
    const dx = candidate[0] - point[0];
    const dy = candidate[1] - point[1];
    const distance = dx * dx + dy * dy;
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest ?? clampPoint(point, bounds);
};

const constrainPoint = (
  point: Point2D,
  bounds: Rect,
  constraint: "free" | "on-curve" | undefined,
  curve: Function2D | ParametricCurve2D | undefined,
): Point2D => (constraint === "on-curve" ? projectToCurve(point, bounds, curve) : clampPoint(point, bounds));

const toSvgPoint = (point: Point2D, bounds: Rect): { readonly x: number; readonly y: number } => {
  const xSpan = bounds.x.max - bounds.x.min || 1;
  const ySpan = bounds.y.max - bounds.y.min || 1;
  return {
    x: ((point[0] - bounds.x.min) / xSpan) * DRAG_VIEWBOX_WIDTH,
    y: DRAG_VIEWBOX_HEIGHT - ((point[1] - bounds.y.min) / ySpan) * DRAG_VIEWBOX_HEIGHT,
  };
};

const fromSvgPoint = (
  x: number,
  y: number,
  bounds: Rect,
): Point2D => {
  const xSpan = bounds.x.max - bounds.x.min || 1;
  const ySpan = bounds.y.max - bounds.y.min || 1;
  return [
    bounds.x.min + (x / DRAG_VIEWBOX_WIDTH) * xSpan,
    bounds.y.min + ((DRAG_VIEWBOX_HEIGHT - y) / DRAG_VIEWBOX_HEIGHT) * ySpan,
  ];
};

const pointerPoint = (event: PointerEvent<SVGSVGElement>, bounds: Rect): Point2D => {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * DRAG_VIEWBOX_WIDTH;
  const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * DRAG_VIEWBOX_HEIGHT;
  return fromSvgPoint(x, y, bounds);
};

const keyboardDelta = (
  event: KeyboardEvent,
  bounds: Rect,
): Point2D | null => {
  const baseX = (bounds.x.max - bounds.x.min || 1) / 100;
  const baseY = (bounds.y.max - bounds.y.min || 1) / 100;
  const multiplier = event.shiftKey ? 10 : 1;
  switch (event.key) {
    case "ArrowLeft":
      return [-baseX * multiplier, 0];
    case "ArrowRight":
      return [baseX * multiplier, 0];
    case "ArrowDown":
      return [0, -baseY * multiplier];
    case "ArrowUp":
      return [0, baseY * multiplier];
    case "PageDown":
      return [0, -baseY * 10];
    case "PageUp":
      return [0, baseY * 10];
    default:
      return null;
  }
};

const useDragPointer = (
  bounds: Rect,
  onPoint: (point: Point2D) => void,
) => {
  const activePointer = useRef<number | null>(null);

  const start = (event: PointerEvent<SVGSVGElement>) => {
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    onPoint(pointerPoint(event, bounds));
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== event.pointerId) return;
    onPoint(pointerPoint(event, bounds));
  };

  const end = (event: PointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return { end, move, start };
};

export const Slider = ({
  value,
  min,
  max,
  step,
  label,
  unit,
  onChange,
}: SliderProps) => {
  const [low, high] = normalizeRange(min, max);
  const clamped = clamp(value, low, high);
  const id = useId();
  useReportClampedNumber(value, clamped, onChange);

  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <input
        aria-label={label}
        id={id}
        max={high}
        min={low}
        onChange={(event) => onChange(clamp(event.currentTarget.valueAsNumber, low, high))}
        step={stepOf(step)}
        type="range"
        value={clamped}
      />
      <output aria-live="polite" htmlFor={id}>
        {formatNumber(clamped)}
        {unit === undefined ? null : ` ${unit}`}
      </output>
    </label>
  );
};

export const NumberInput = ({
  value,
  min,
  max,
  step,
  label,
  onChange,
}: NumberInputProps) => {
  const clamped = clampOptional(value, min, max);
  const id = useId();
  useReportClampedNumber(value, clamped, onChange);

  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <input
        aria-label={label}
        id={id}
        max={max}
        min={min}
        onChange={(event) => {
          const next = valueFromInput(event.currentTarget.value, min, max);
          if (next !== null) onChange(next);
        }}
        onKeyDown={(event) => {
          const amount = stepOf(step) * (event.shiftKey ? 10 : 1);
          if (event.key === "ArrowUp") {
            event.preventDefault();
            onChange(clampOptional(clamped + amount, min, max));
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            onChange(clampOptional(clamped - amount, min, max));
          }
        }}
        step={stepOf(step)}
        type="number"
        value={clamped}
      />
    </label>
  );
};

export const Stepper = ({
  value,
  min,
  max,
  step,
  label,
  onChange,
}: StepperProps) => {
  const [low, high] = normalizeRange(min, max);
  const resolvedStep = stepOf(step);
  const clamped = clamp(value, low, high);
  const id = useId();
  useReportClampedNumber(value, clamped, onChange);

  const update = (next: number) => onChange(clamp(next, low, high));

  return (
    <div aria-label={label} role="group">
      <label htmlFor={id}>{label}</label>
      <button
        aria-label={`Decrease ${label}`}
        disabled={clamped <= low}
        onClick={() => update(clamped - resolvedStep)}
        type="button"
      >
        -
      </button>
      <input
        aria-label={label}
        id={id}
        max={high}
        min={low}
        onChange={(event) => update(event.currentTarget.valueAsNumber)}
        onKeyDown={(event) => {
          if (event.key === "PageUp") {
            event.preventDefault();
            update(clamped + resolvedStep * 10);
          }
          if (event.key === "PageDown") {
            event.preventDefault();
            update(clamped - resolvedStep * 10);
          }
        }}
        step={resolvedStep}
        type="number"
        value={clamped}
      />
      <button
        aria-label={`Increase ${label}`}
        disabled={clamped >= high}
        onClick={() => update(clamped + resolvedStep)}
        type="button"
      >
        +
      </button>
    </div>
  );
};

export const Toggle = ({ value, label, onChange }: ToggleProps) => {
  const id = useId();
  return (
    <label htmlFor={id}>
      <input
        aria-label={label}
        checked={value}
        id={id}
        onChange={(event) => onChange(event.currentTarget.checked)}
        role="switch"
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
};

export const Selector = <T,>({
  value,
  options,
  label,
  onChange,
}: SelectorProps<T>) => {
  const id = useId();
  const selectedIndex = options.findIndex((option) => Object.is(option.value, value));
  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <select
        aria-label={label}
        id={id}
        onChange={(event) => {
          const option = options[Number(event.currentTarget.value)];
          if (option !== undefined) onChange(option.value);
        }}
        value={selectedIndex >= 0 ? String(selectedIndex) : ""}
      >
        {selectedIndex >= 0 ? null : (
          <option disabled value="">
            Select {label}
          </option>
        )}
        {options.map((option, index) => (
          <option key={`${index}:${option.label}`} value={index}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
};

export const DragPoint = ({
  value,
  bounds,
  constraint = "free",
  curve,
  label,
  onChange,
}: DragPointProps) => {
  const clamped = useMemo(
    () => constrainPoint(value, bounds, constraint, curve),
    [bounds, constraint, curve, value],
  );
  const svgPoint = toSvgPoint(clamped, bounds);
  const pointer = useDragPointer(bounds, (point) =>
    onChange(constrainPoint(point, bounds, constraint, curve)),
  );
  useReportClampedPoint(value, clamped, onChange);

  return (
    <svg
      aria-label={label}
      onPointerDown={pointer.start}
      onPointerMove={pointer.move}
      onPointerUp={pointer.end}
      role="group"
      style={dragSurfaceStyle}
      viewBox={`0 0 ${DRAG_VIEWBOX_WIDTH} ${DRAG_VIEWBOX_HEIGHT}`}
    >
      <rect
        aria-hidden="true"
        fill="var(--ui-sim-drag-surface, transparent)"
        height={DRAG_VIEWBOX_HEIGHT}
        stroke="var(--ui-sim-drag-border, currentColor)"
        width={DRAG_VIEWBOX_WIDTH}
      />
      <circle
        aria-label={label}
        aria-valuemax={bounds.x.max}
        aria-valuemin={bounds.x.min}
        aria-valuenow={clamped[0]}
        aria-valuetext={pointText(clamped)}
        cx={svgPoint.x}
        cy={svgPoint.y}
        fill="var(--ui-sim-drag-handle-fill, Canvas)"
        onKeyDown={(event) => {
          const delta = keyboardDelta(event, bounds);
          if (delta === null) return;
          event.preventDefault();
          onChange(constrainPoint([clamped[0] + delta[0], clamped[1] + delta[1]], bounds, constraint, curve));
        }}
        r="var(--ui-sim-drag-handle-radius, 7)"
        role="slider"
        stroke="var(--ui-sim-drag-handle-stroke, currentColor)"
        strokeWidth="var(--ui-sim-drag-handle-stroke-width, 2)"
        tabIndex={0}
      />
    </svg>
  );
};

export const DragVector = ({
  tail,
  head,
  bounds,
  label,
  onChange,
}: DragVectorProps) => {
  const clampedTail = useMemo(() => clampPoint(tail, bounds), [bounds, tail]);
  const clampedHead = useMemo(() => clampPoint(head, bounds), [bounds, head]);
  const tailSvg = toSvgPoint(clampedTail, bounds);
  const headSvg = toSvgPoint(clampedHead, bounds);
  const activeHandle = useRef<"tail" | "head">("head");
  const pointer = useDragPointer(bounds, (point) => {
    if (activeHandle.current === "tail") {
      onChange(clampPoint(point, bounds), clampedHead);
    } else {
      onChange(clampedTail, clampPoint(point, bounds));
    }
  });

  useEffect(() => {
    if (!pointsEqual(tail, clampedTail) || !pointsEqual(head, clampedHead)) {
      onChange(clampedTail, clampedHead);
    }
  }, [clampedHead, clampedTail, head, onChange, tail]);

  const moveHandle = (handle: "tail" | "head", delta: Point2D) => {
    if (handle === "tail") {
      onChange(clampPoint([clampedTail[0] + delta[0], clampedTail[1] + delta[1]], bounds), clampedHead);
    } else {
      onChange(clampedTail, clampPoint([clampedHead[0] + delta[0], clampedHead[1] + delta[1]], bounds));
    }
  };

  const handleKey = (handle: "tail" | "head", event: KeyboardEvent<SVGCircleElement>) => {
    const delta = keyboardDelta(event, bounds);
    if (delta === null) return;
    event.preventDefault();
    moveHandle(handle, delta);
  };

  return (
    <svg
      aria-label={label}
      onPointerDown={(event) => {
        const clicked = event.target;
        activeHandle.current =
          clicked instanceof SVGCircleElement && clicked.dataset.handle === "tail" ? "tail" : "head";
        pointer.start(event);
      }}
      onPointerMove={pointer.move}
      onPointerUp={pointer.end}
      role="group"
      style={dragSurfaceStyle}
      viewBox={`0 0 ${DRAG_VIEWBOX_WIDTH} ${DRAG_VIEWBOX_HEIGHT}`}
    >
      <rect
        aria-hidden="true"
        fill="var(--ui-sim-drag-surface, transparent)"
        height={DRAG_VIEWBOX_HEIGHT}
        stroke="var(--ui-sim-drag-border, currentColor)"
        width={DRAG_VIEWBOX_WIDTH}
      />
      <line
        aria-hidden="true"
        stroke="var(--ui-sim-vector-stroke, currentColor)"
        strokeWidth="var(--ui-sim-vector-stroke-width, 2)"
        x1={tailSvg.x}
        x2={headSvg.x}
        y1={tailSvg.y}
        y2={headSvg.y}
      />
      <circle
        aria-label={`${label} tail`}
        aria-valuemax={bounds.x.max}
        aria-valuemin={bounds.x.min}
        aria-valuenow={clampedTail[0]}
        aria-valuetext={pointText(clampedTail)}
        cx={tailSvg.x}
        cy={tailSvg.y}
        data-handle="tail"
        fill="var(--ui-sim-drag-handle-fill, Canvas)"
        onKeyDown={(event) => handleKey("tail", event)}
        r="var(--ui-sim-drag-handle-radius, 7)"
        role="slider"
        stroke="var(--ui-sim-drag-handle-stroke, currentColor)"
        strokeWidth="var(--ui-sim-drag-handle-stroke-width, 2)"
        tabIndex={0}
      />
      <circle
        aria-label={`${label} head`}
        aria-valuemax={bounds.x.max}
        aria-valuemin={bounds.x.min}
        aria-valuenow={clampedHead[0]}
        aria-valuetext={pointText(clampedHead)}
        cx={headSvg.x}
        cy={headSvg.y}
        data-handle="head"
        fill="var(--ui-sim-drag-handle-fill, Canvas)"
        onKeyDown={(event) => handleKey("head", event)}
        r="var(--ui-sim-drag-handle-radius, 7)"
        role="slider"
        stroke="var(--ui-sim-drag-handle-stroke, currentColor)"
        strokeWidth="var(--ui-sim-drag-handle-stroke-width, 2)"
        tabIndex={0}
      />
    </svg>
  );
};

export const ControlGroup = ({ legend, children }: ControlGroupProps) => (
  <fieldset>
    <legend>{legend}</legend>
    {children}
  </fieldset>
);
