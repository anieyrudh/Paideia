import type { ReactNode } from "react";
import type { Interval } from "@paideia/shared";
import {
  axisDomain,
  groupLineData,
  kernelDensity,
  lineNumericX,
  makeHistogramBins,
  projectValue,
  type AxisSpec,
  type LineDatum,
  type Margin,
  type SankeyLink,
  type SankeyNode,
} from "./kernels.js";

const WIDTH = 640;
const HEIGHT = 360;
const defaultMargin: Required<Margin> = { top: 24, right: 24, bottom: 42, left: 54 };
const palette = ["#1f5f8b", "#b42318", "#027a48", "#6941c6", "#b54708"];

interface ChartFrameProps {
  readonly width?: number;
  readonly height?: number;
  readonly margin?: Margin;
  readonly ariaLabel?: string;
  readonly children: ReactNode;
}

interface LineChartProps {
  readonly data: readonly LineDatum[];
  readonly x?: AxisSpec;
  readonly y?: AxisSpec;
  readonly ariaLabel?: string;
}

interface HistogramProps {
  readonly samples: readonly number[];
  readonly bins?: number | readonly number[];
  readonly density?: boolean;
}

interface DensityPlotProps {
  readonly samples: readonly number[];
  readonly bandwidth?: number | "silverman";
}

interface SankeyProps {
  readonly nodes: readonly SankeyNode[];
  readonly links: readonly SankeyLink[];
}

const marginOf = (margin: Margin | undefined): Required<Margin> => ({
  top: margin?.top ?? defaultMargin.top,
  right: margin?.right ?? defaultMargin.right,
  bottom: margin?.bottom ?? defaultMargin.bottom,
  left: margin?.left ?? defaultMargin.left,
});

const pointToSvg = (
  x: number,
  y: number,
  xDomain: Interval,
  yDomain: Interval,
  xSpec: AxisSpec | undefined,
  ySpec: AxisSpec | undefined,
  margin: Required<Margin>,
) => {
  const xProjected = projectValue(x, xDomain, xSpec?.scale ?? "linear");
  const yProjected = projectValue(y, yDomain, ySpec?.scale ?? "linear");
  if (xProjected === null || yProjected === null) return null;
  return {
    x: margin.left + xProjected * (WIDTH - margin.left - margin.right),
    y: HEIGHT - margin.bottom - yProjected * (HEIGHT - margin.top - margin.bottom),
  };
};

const axis = (margin: Required<Margin>) => (
  <g aria-hidden="true">
    <line
      stroke="#667085"
      x1={margin.left}
      x2={WIDTH - margin.right}
      y1={HEIGHT - margin.bottom}
      y2={HEIGHT - margin.bottom}
    />
    <line
      stroke="#667085"
      x1={margin.left}
      x2={margin.left}
      y1={margin.top}
      y2={HEIGHT - margin.bottom}
    />
  </g>
);

const lineSegments = (
  values: readonly LineDatum[],
  xDomain: Interval,
  yDomain: Interval,
  xSpec: AxisSpec | undefined,
  ySpec: AxisSpec | undefined,
  margin: Required<Margin>,
): readonly string[] => {
  const segments: string[] = [];
  let commands: string[] = [];

  for (const datum of values) {
    const point = pointToSvg(
      datum.x instanceof Date ? datum.x.getTime() : datum.x,
      datum.y,
      xDomain,
      yDomain,
      xSpec,
      ySpec,
      margin,
    );
    if (point === null) {
      if (commands.length > 0) segments.push(commands.join(" "));
      commands = [];
      continue;
    }
    commands.push(`${commands.length === 0 ? "M" : "L"} ${point.x.toFixed(3)} ${point.y.toFixed(3)}`);
  }

  if (commands.length > 0) segments.push(commands.join(" "));
  return segments;
};

const validSankeyLinks = (links: readonly SankeyLink[]): boolean =>
  links.every((link) => Number.isFinite(link.value) && link.value >= 0);

const domainSource = (
  values: readonly number[],
  spec: AxisSpec | undefined,
): readonly number[] =>
  spec?.scale === "log" && spec.domain === undefined
    ? values.filter((value) => value > 0)
    : values;

export const ChartFrame = ({
  width = WIDTH,
  height = HEIGHT,
  margin,
  ariaLabel = "Chart",
  children,
}: ChartFrameProps) => {
  const resolved = marginOf(margin);
  return (
    <svg
      aria-label={ariaLabel}
      role="img"
      style={{ height, maxWidth: "100%", width }}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    >
      {axis(resolved)}
      {children}
    </svg>
  );
};

export const LineChart = ({ data, x, y, ariaLabel = "Line chart" }: LineChartProps) => {
  const margin = marginOf(undefined);
  const xs = lineNumericX(data);
  const ys = data.map((datum) => datum.y);
  const xDomain = axisDomain(domainSource(xs, x), x?.domain);
  const yDomain = axisDomain(domainSource(ys, y), y?.domain);
  const groups = groupLineData(data);

  return (
    <ChartFrame ariaLabel={ariaLabel}>
      {[...groups].map(([series, values], seriesIndex) => {
        const segments = lineSegments(values, xDomain, yDomain, x, y, margin);
        return segments.map((commands, segmentIndex) => (
          <path
            d={commands}
            fill="none"
            key={`${series}:${segmentIndex}`}
            stroke={palette[seriesIndex % palette.length]}
            strokeWidth="2"
          />
        ));
      })}
    </ChartFrame>
  );
};

export const Histogram = ({
  samples,
  bins = 20,
  density = false,
}: HistogramProps) => {
  const margin = marginOf(undefined);
  const computed = makeHistogramBins(samples, bins);
  const values = computed.map((bin) => (density ? bin.density : bin.count));
  const first = computed[0];
  const last = computed.at(-1);
  const xDomain =
    first === undefined || last === undefined
      ? { min: 0, max: 1 }
      : { min: first.x0, max: last.x1 };
  const yDomain = axisDomain(values, { min: 0, max: Math.max(1, ...values) });

  return (
    <ChartFrame>
      {computed.map((bin) => {
        const left = pointToSvg(bin.x0, 0, xDomain, yDomain, undefined, undefined, margin);
        const right = pointToSvg(bin.x1, density ? bin.density : bin.count, xDomain, yDomain, undefined, undefined, margin);
        if (left === null || right === null) return null;
        return (
          <rect
            fill="#1f5f8b"
            height={Math.max(0, left.y - right.y)}
            key={`${bin.x0}:${bin.x1}`}
            opacity="0.78"
            width={Math.max(0, right.x - left.x - 1)}
            x={left.x}
            y={right.y}
          />
        );
      })}
    </ChartFrame>
  );
};

export const DensityPlot = ({
  samples,
  bandwidth = "silverman",
}: DensityPlotProps) => {
  const margin = marginOf(undefined);
  const density = kernelDensity(samples, bandwidth);
  const xDomain = axisDomain(density.map((point) => point.x), undefined);
  const yDomain = axisDomain(density.map((point) => point.y), { min: 0, max: Math.max(1e-6, ...density.map((point) => point.y)) });
  const path = density.flatMap((point, index) => {
    const svg = pointToSvg(point.x, point.y, xDomain, yDomain, undefined, undefined, margin);
    return svg === null ? [] : [`${index === 0 ? "M" : "L"} ${svg.x.toFixed(3)} ${svg.y.toFixed(3)}`];
  });

  return (
    <ChartFrame>
      <path d={path.join(" ")} fill="none" stroke="#b42318" strokeWidth="2" />
    </ChartFrame>
  );
};

export const Sankey = ({ nodes, links }: SankeyProps) => {
  if (!validSankeyLinks(links)) {
    return (
      <ChartFrame height={420}>
        <text fill="#b42318" fontSize="12" x="54" y="48">
          Invalid Sankey link value
        </text>
      </ChartFrame>
    );
  }

  const leftIds = new Set(links.map((link) => link.source));
  const rightIds = new Set(links.map((link) => link.target));
  const maxValue = Math.max(1, ...links.map((link) => Math.max(0, link.value)));
  const yFor = (id: string): number => {
    const column = leftIds.has(id) && !rightIds.has(id) ? [...leftIds] : [...rightIds];
    const index = Math.max(0, column.indexOf(id));
    return 60 + index * 70;
  };
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return (
    <ChartFrame height={420}>
      {links.map((link, linkIndex) => {
        const y1 = yFor(link.source);
        const y2 = yFor(link.target);
        const width = link.value === 0 ? 0 : Math.max(1, (link.value / maxValue) * 18);
        return (
          <path
            d={`M 110 ${y1} C 270 ${y1}, 370 ${y2}, 530 ${y2}`}
            fill="none"
            key={`${link.source}:${link.target}:${linkIndex}`}
            opacity="0.72"
            stroke="#1f5f8b"
            strokeWidth={width}
          />
        );
      })}
      {nodes.map((node) => {
        const x = leftIds.has(node.id) && !rightIds.has(node.id) ? 86 : 530;
        return (
          <g key={node.id}>
            <rect fill="#344054" height="24" rx="4" width="24" x={x} y={yFor(node.id) - 12} />
            <text fill="#101828" fontSize="12" x={x + 30} y={yFor(node.id) + 4}>
              {nodeById.get(node.id)?.label ?? node.id}
            </text>
          </g>
        );
      })}
    </ChartFrame>
  );
};
