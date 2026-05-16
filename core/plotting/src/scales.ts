import type { Interval, Rect } from "@paideia/shared";

export interface SvgPoint {
  readonly x: number;
  readonly y: number;
}

export interface PlotScale {
  readonly width: number;
  readonly height: number;
  readonly domain: Rect;
  readonly toSvg: (point: SvgPoint) => SvgPoint;
}

export const DEFAULT_WIDTH = 640;
export const DEFAULT_HEIGHT = 420;
export const DEFAULT_PADDING = 36;

export const isFiniteInterval = (interval: Interval): boolean =>
  Number.isFinite(interval.min) && Number.isFinite(interval.max) && interval.min < interval.max;

const span = (interval: Interval): number => interval.max - interval.min;

export const createPlotScale = (
  domain: Rect,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  padding = DEFAULT_PADDING,
): PlotScale => {
  const drawableWidth = Math.max(1, width - padding * 2);
  const drawableHeight = Math.max(1, height - padding * 2);

  return {
    width,
    height,
    domain,
    toSvg: (point: SvgPoint): SvgPoint => ({
      x: padding + ((point.x - domain.x.min) / span(domain.x)) * drawableWidth,
      y: height - padding - ((point.y - domain.y.min) / span(domain.y)) * drawableHeight,
    }),
  };
};

export const pathFromPoints = (points: readonly SvgPoint[], scale: PlotScale): string =>
  points
    .map((point, index) => {
      const svg = scale.toSvg(point);
      return `${index === 0 ? "M" : "L"} ${svg.x.toFixed(3)} ${svg.y.toFixed(3)}`;
    })
    .join(" ");
