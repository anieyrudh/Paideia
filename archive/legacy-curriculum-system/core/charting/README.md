# @paideia/charting

React/SVG chart components for rows and sample-shaped data: line charts,
histograms, density plots, and simple Sankey flows. Inputs are read-only and
all sorting, binning, and density work happens on copied arrays.

```tsx
import { Histogram, LineChart } from "@paideia/charting";

export function ResponseHistogram({ samples }: { readonly samples: readonly number[] }) {
  return <Histogram bins={8} samples={samples} />;
}

export function MarginTrace({ data }: { readonly data: readonly { x: number; y: number }[] }) {
  return (
    <LineChart
      ariaLabel="Phase response chart, degrees against frequency in radians per second"
      data={data}
      x={{ label: "Frequency", scale: "log" }}
      y={{ label: "Phase" }}
    />
  );
}
```

The caller chooses scale semantics through `AxisSpec`. The package does not
auto-switch a chart to log or time scale based on data shape.
