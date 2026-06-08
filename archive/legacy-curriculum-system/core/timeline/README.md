# @paideia/timeline

Hand-rolled SVG timelines for events, spans, lanes, and small branching
sequences. The pure `layoutTimeline()` kernel converts dates or Unix
milliseconds into deterministic SVG coordinates for testing and headless use.

```tsx
import { Timeline } from "@paideia/timeline";

export function LabSequence() {
  return (
    <Timeline
      events={[{ id: "observe", at: 1_716_000_000_000, label: "Observe" }]}
      spans={[{ id: "trial", from: 1_715_900_000_000, to: 1_716_100_000_000, label: "Trial" }]}
    />
  );
}
```

Inputs are copied before sorting. Reverse spans and invalid domains return
kernel errors rather than silently distorting spacing.
