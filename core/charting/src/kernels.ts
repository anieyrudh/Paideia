import type { Interval } from "@paideia/shared";

export interface AxisSpec {
  readonly label?: string;
  readonly domain?: Interval;
  readonly scale?: "linear" | "log" | "time";
  readonly tickFormat?: (v: number) => string;
}

export interface Margin {
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
}

export interface SankeyNode {
  readonly id: string;
  readonly label?: string;
}

export interface SankeyLink {
  readonly source: string;
  readonly target: string;
  readonly value: number;
}

export interface LineDatum {
  readonly x: number | Date;
  readonly y: number;
  readonly series?: string;
}

export interface HistogramBin {
  readonly x0: number;
  readonly x1: number;
  readonly count: number;
  readonly density: number;
}

export interface DensityPoint {
  readonly x: number;
  readonly y: number;
}

const toNumber = (value: number | Date): number =>
  value instanceof Date ? value.getTime() : value;

export const axisDomain = (
  values: readonly number[],
  explicit: Interval | undefined,
): Interval => {
  if (explicit !== undefined) return explicit;
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
};

export const projectValue = (
  value: number,
  domain: Interval,
  scale: AxisSpec["scale"],
): number | null => {
  if (!Number.isFinite(value)) return null;
  if (scale === "log") {
    if (value <= 0 || domain.min <= 0 || domain.max <= 0) return null;
    return (Math.log10(value) - Math.log10(domain.min)) /
      (Math.log10(domain.max) - Math.log10(domain.min));
  }
  return (value - domain.min) / (domain.max - domain.min);
};

export const groupLineData = (
  data: readonly LineDatum[],
): ReadonlyMap<string, readonly LineDatum[]> => {
  const groups = new Map<string, LineDatum[]>();
  for (const datum of data) {
    const series = datum.series ?? "default";
    const existing = groups.get(series);
    if (existing === undefined) {
      groups.set(series, [datum]);
    } else {
      existing.push(datum);
    }
  }

  const sorted = new Map<string, readonly LineDatum[]>();
  for (const [series, values] of groups) {
    sorted.set(
      series,
      [...values].sort((a, b) => toNumber(a.x) - toNumber(b.x)),
    );
  }
  return sorted;
};

export const makeHistogramBins = (
  samples: readonly number[],
  bins: number | readonly number[] = 20,
): readonly HistogramBin[] => {
  const finite = samples.filter((sample) => Number.isFinite(sample));
  if (finite.length === 0) return [];
  const edges =
    typeof bins === "number"
      ? uniformEdges(Math.min(Math.max(1, Math.floor(bins)), finite.length), finite)
      : [...bins].sort((a, b) => a - b);
  if (edges.length < 2) return [];

  const counts = Array.from({ length: edges.length - 1 }, () => 0);
  for (const sample of finite) {
    const lastEdge = edges[edges.length - 1];
    const firstEdge = edges[0];
    if (
      firstEdge === undefined ||
      lastEdge === undefined ||
      sample < firstEdge ||
      sample > lastEdge
    ) {
      continue;
    }
    const found = edges.findIndex((edge, index) => {
      const next = edges[index + 1];
      return next !== undefined && sample >= edge && (sample < next || sample === lastEdge);
    });
    if (found >= 0) counts[found] = (counts[found] ?? 0) + 1;
  }

  return counts.flatMap((count, index) => {
    const x0 = edges[index];
    const x1 = edges[index + 1];
    if (x0 === undefined || x1 === undefined || x1 <= x0) return [];
    return [{ x0, x1, count, density: count / (finite.length * (x1 - x0)) }];
  });
};

const uniformEdges = (binCount: number, samples: readonly number[]): readonly number[] => {
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  if (min === max) return [min - 0.5, max + 0.5];
  const step = (max - min) / binCount;
  return Array.from({ length: binCount + 1 }, (_, index) => min + step * index);
};

const standardDeviation = (samples: readonly number[]): number => {
  if (samples.length < 2) return 1;
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const variance =
    samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (samples.length - 1);
  return Math.sqrt(variance);
};

export const silvermanBandwidth = (samples: readonly number[]): number => {
  const sd = standardDeviation(samples);
  return Math.max(1e-6, 1.06 * sd * samples.length ** -0.2);
};

export const kernelDensity = (
  samples: readonly number[],
  bandwidth: number | "silverman" = "silverman",
  points = 80,
): readonly DensityPoint[] => {
  const finite = samples.filter((sample) => Number.isFinite(sample));
  if (finite.length === 0) return [];
  const h = bandwidth === "silverman" ? silvermanBandwidth(finite) : bandwidth;
  if (!Number.isFinite(h) || h <= 0) return [];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max === min ? 1 : max - min;
  const start = min - span * 0.1;
  const end = max + span * 0.1;
  const denominator = finite.length * h * Math.sqrt(2 * Math.PI);

  return Array.from({ length: points }, (_, index) => {
    const x = start + ((end - start) * index) / Math.max(1, points - 1);
    const y =
      finite.reduce((sum, sample) => {
        const z = (x - sample) / h;
        return sum + Math.exp(-0.5 * z * z);
      }, 0) / denominator;
    return { x, y };
  });
};

export const lineNumericX = (data: readonly LineDatum[]): readonly number[] =>
  data.map((datum) => toNumber(datum.x));
