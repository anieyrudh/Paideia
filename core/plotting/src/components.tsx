import {
  useMemo,
  useRef,
  type PointerEvent,
  type ReactNode,
} from "react";
import type {
  Function2D,
  Interval,
  ParametricCurve2D,
  Rect,
  Renderable,
  VectorField2D,
} from "@paideia/shared";
import { derivative, linearRegression } from "@paideia/numerical-math";
import { createPlotScale, DEFAULT_HEIGHT, DEFAULT_WIDTH, pathFromPoints } from "./scales.js";
import {
  inferRange,
  inferRectFromPoints,
  sampleFunction,
  sampleParametricCurve,
  sampleVectorField,
} from "./sampling.js";

const stroke = "#1f5f8b";
const mutedStroke = "#98a2b3";
const accentStroke = "#b42318";

interface FunctionPlotProps {
  readonly f: Function2D;
  readonly domain: Interval;
  readonly range?: Interval;
  readonly samples?: number;
  readonly overlays?: readonly Renderable<ReactNode>[];
}

interface ParametricPlotProps {
  readonly curve: ParametricCurve2D;
  readonly t: Interval;
  readonly samples?: number;
}

interface VectorFieldPlotProps {
  readonly field: VectorField2D;
  readonly region: Rect;
  readonly density?: number;
  readonly normalize?: boolean;
}

interface ScatterPlotProps {
  readonly points: readonly (readonly [number, number])[];
  readonly fit?: "linear" | "none";
}

interface PlotFrameProps {
  readonly domain: Rect;
  readonly grid?: "cartesian" | "polar" | "none";
  readonly aspect?: "equal" | "auto";
  readonly children: ReactNode;
}

interface DraggablePointProps {
  readonly constraint?: "free" | "on-curve";
  readonly curve?: Function2D | ParametricCurve2D;
  readonly initial: readonly [number, number];
  readonly onMove: (p: readonly [number, number]) => void;
}

interface TangentProps {
  readonly f: Function2D;
  readonly at: number;
  readonly length?: number;
}

interface SecantLineProps {
  readonly f: Function2D;
  readonly a: number;
  readonly b: number;
}

const axisLine = (x1: number, y1: number, x2: number, y2: number, key: string) => (
  <line key={key} stroke={mutedStroke} strokeWidth="1" x1={x1} x2={x2} y1={y1} y2={y2} />
);

const renderGrid = (domain: Rect, grid: "cartesian" | "polar" | "none") => {
  if (grid === "none") return null;
  const scale = createPlotScale(domain);
  if (grid === "polar") {
    const origin = scale.toSvg({ x: 0, y: 0 });
    const maxRadius = Math.min(DEFAULT_WIDTH, DEFAULT_HEIGHT) / 2 - 40;
    return (
      <g aria-hidden="true">
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <circle
            cx={origin.x}
            cy={origin.y}
            fill="none"
            key={ratio}
            r={maxRadius * ratio}
            stroke={mutedStroke}
            strokeDasharray="3 5"
          />
        ))}
      </g>
    );
  }

  const lines: ReactNode[] = [];
  for (let index = 0; index <= 10; index += 1) {
    const x = domain.x.min + ((domain.x.max - domain.x.min) * index) / 10;
    const y = domain.y.min + ((domain.y.max - domain.y.min) * index) / 10;
    const xPoint = scale.toSvg({ x, y: domain.y.min });
    const yPoint = scale.toSvg({ x: domain.x.min, y });
    lines.push(axisLine(xPoint.x, 36, xPoint.x, DEFAULT_HEIGHT - 36, `x-${index}`));
    lines.push(axisLine(36, yPoint.y, DEFAULT_WIDTH - 36, yPoint.y, `y-${index}`));
  }
  return <g aria-hidden="true">{lines}</g>;
};

export const PlotFrame = ({
  domain,
  grid = "cartesian",
  aspect = "auto",
  children,
}: PlotFrameProps) => (
  <svg
    aria-label="Plot frame"
    role="img"
    style={{ aspectRatio: aspect === "equal" ? "1 / 1" : undefined, maxWidth: "100%" }}
    viewBox={`0 0 ${DEFAULT_WIDTH} ${DEFAULT_HEIGHT}`}
  >
    {renderGrid(domain, grid)}
    {children}
  </svg>
);

export const FunctionPlot = ({
  f,
  domain,
  range,
  samples = 160,
  overlays = [],
}: FunctionPlotProps) => {
  const sampled = useMemo(() => sampleFunction(f, domain, range, samples), [
    f,
    domain,
    range,
    samples,
  ]);
  const yRange = range ?? inferRange(sampled);
  const scale = createPlotScale({ x: domain, y: yRange });

  return (
    <PlotFrame domain={{ x: domain, y: yRange }}>
      <g>
        {sampled.segments.map((segment, index) => (
          <path
            d={pathFromPoints(segment, scale)}
            fill="none"
            key={`segment-${index}`}
            stroke={stroke}
            strokeWidth="2"
          />
        ))}
        {overlays.map((overlay, index) => (
          <g key={`overlay-${index}`}>{overlay}</g>
        ))}
      </g>
    </PlotFrame>
  );
};

export const ParametricPlot = ({
  curve,
  t,
  samples = 160,
}: ParametricPlotProps) => {
  const sampled = useMemo(() => sampleParametricCurve(curve, t, samples), [curve, t, samples]);
  const points = sampled.segments.flat();
  const rect = inferRectFromPoints(points.map((point) => [point.x, point.y] as const));
  const scale = createPlotScale(rect);

  return (
    <PlotFrame domain={rect}>
      {sampled.segments.map((segment, index) => (
        <path
          d={pathFromPoints(segment, scale)}
          fill="none"
          key={`curve-${index}`}
          stroke={stroke}
          strokeWidth="2"
        />
      ))}
    </PlotFrame>
  );
};

export const VectorFieldPlot = ({
  field,
  region,
  density = 12,
  normalize = false,
}: VectorFieldPlotProps) => {
  const vectors = useMemo(
    () => sampleVectorField(field, region, density, normalize),
    [field, region, density, normalize],
  );
  const scale = createPlotScale(region);
  const unit = Math.min(
    (region.x.max - region.x.min) / Math.max(1, density),
    (region.y.max - region.y.min) / Math.max(1, density),
  );

  return (
    <PlotFrame domain={region}>
      {vectors.map((vector) => {
        const from = scale.toSvg({ x: vector.x, y: vector.y });
        const to = scale.toSvg({
          x: vector.x + vector.vx * unit * 0.35,
          y: vector.y + vector.vy * unit * 0.35,
        });
        return (
          <line
            key={`${vector.x}:${vector.y}`}
            stroke={stroke}
            strokeLinecap="round"
            strokeWidth="1.5"
            x1={from.x}
            x2={to.x}
            y1={from.y}
            y2={to.y}
          />
        );
      })}
    </PlotFrame>
  );
};

const fitLine = (
  points: readonly (readonly [number, number])[],
): readonly [readonly [number, number], readonly [number, number]] | null => {
  if (points.length < 2) return null;
  const regression = linearRegression(points.map((point) => [point[0], point[1]]));
  if (!regression.ok) return null;
  const xs = points.map((point) => point[0]);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  return [
    [min, regression.value.m * min + regression.value.b],
    [max, regression.value.m * max + regression.value.b],
  ];
};

export const ScatterPlot = ({ points, fit = "none" }: ScatterPlotProps) => {
  const rect = inferRectFromPoints(points);
  const scale = createPlotScale(rect);
  const line = fit === "linear" ? fitLine(points) : null;

  return (
    <PlotFrame domain={rect}>
      {line === null ? null : (
        <path
          d={pathFromPoints(
            line.map((point) => ({ x: point[0], y: point[1] })),
            scale,
          )}
          fill="none"
          stroke={accentStroke}
          strokeWidth="2"
        />
      )}
      {points.map((point, index) => {
        const svg = scale.toSvg({ x: point[0], y: point[1] });
        return <circle cx={svg.x} cy={svg.y} fill={stroke} key={`${index}:${point[0]}`} r="3" />;
      })}
    </PlotFrame>
  );
};

const isParametric = (
  curve: Function2D | ParametricCurve2D,
): curve is ParametricCurve2D => {
  const sample = curve(0);
  return Array.isArray(sample);
};

const projectToCurve = (
  point: readonly [number, number],
  curve: Function2D | ParametricCurve2D | undefined,
): readonly [number, number] => {
  if (curve === undefined) return point;
  if (!isParametric(curve)) return [point[0], curve(point[0])];

  let best = curve(0);
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index <= 100; index += 1) {
    const t = -10 + index * 0.2;
    const candidate = curve(t);
    const distance = Math.hypot(candidate[0] - point[0], candidate[1] - point[1]);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
};

export const DraggablePoint = ({
  constraint = "free",
  curve,
  initial,
  onMove,
}: DraggablePointProps) => {
  const ref = useRef<SVGSVGElement | null>(null);
  const domain: Rect = {
    x: { min: initial[0] - 5, max: initial[0] + 5 },
    y: { min: initial[1] - 5, max: initial[1] + 5 },
  };
  const scale = createPlotScale(domain, 160, 160, 16);
  const current = scale.toSvg({ x: initial[0], y: initial[1] });

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (bounds === undefined) return;
    const x = domain.x.min + ((event.clientX - bounds.left) / bounds.width) * 10;
    const y = domain.y.max - ((event.clientY - bounds.top) / bounds.height) * 10;
    const next = constraint === "on-curve" ? projectToCurve([x, y], curve) : [x, y] as const;
    onMove(next);
  };

  return (
    <svg
      aria-label="Draggable point"
      onPointerMove={(event) => {
        if (event.buttons === 1) move(event);
      }}
      onPointerDown={move}
      ref={ref}
      role="img"
      viewBox="0 0 160 160"
    >
      <circle cx={current.x} cy={current.y} fill={accentStroke} r="6" />
    </svg>
  );
};

export const Tangent = ({ f, at, length = 2 }: TangentProps) => {
  const slope = derivative(f, at);
  const y = f(at);
  if (!slope.ok || !Number.isFinite(y)) return null;
  const half = length / 2;
  const p1 = [at - half, y - slope.value * half] as const;
  const p2 = [at + half, y + slope.value * half] as const;
  const rect = inferRectFromPoints([p1, p2]);
  const scale = createPlotScale(rect, 240, 160, 18);
  return (
    <svg aria-label="Tangent line" role="img" viewBox="0 0 240 160">
      <path
        d={pathFromPoints(
          [
            { x: p1[0], y: p1[1] },
            { x: p2[0], y: p2[1] },
          ],
          scale,
        )}
        fill="none"
        stroke={accentStroke}
        strokeWidth="2"
      />
    </svg>
  );
};

export const SecantLine = ({ f, a, b }: SecantLineProps) => {
  const fa = f(a);
  const fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || a === b) return null;
  const rect = inferRectFromPoints([
    [a, fa],
    [b, fb],
  ]);
  const scale = createPlotScale(rect, 240, 160, 18);
  return (
    <svg aria-label="Secant line" role="img" viewBox="0 0 240 160">
      <path
        d={pathFromPoints(
          [
            { x: a, y: fa },
            { x: b, y: fb },
          ],
          scale,
        )}
        fill="none"
        stroke={accentStroke}
        strokeWidth="2"
      />
    </svg>
  );
};
