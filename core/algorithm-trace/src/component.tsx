import { useMemo, useState } from "react";
import type { Trace, TraceStep } from "./types.js";

export interface TraceVisualizerProps {
  readonly trace: Trace<unknown>;
  readonly speed?: number;
  readonly onStep?: (i: number) => void;
  readonly controls?: "full" | "minimal" | "none";
}

const replay = (trace: Trace<unknown>, stepIndex: number): readonly unknown[] => {
  const values = [...trace.initial];
  for (let i = 0; i < stepIndex; i += 1) {
    const step = trace.steps[i];
    if (step === undefined) continue;
    if (step.kind === "swap") {
      const leftIndex = step.at[0];
      const rightIndex = step.at[1];
      if (leftIndex === undefined || rightIndex === undefined) continue;
      const left = values[leftIndex];
      values[leftIndex] = values[rightIndex];
      values[rightIndex] = left;
    }
    if (step.kind === "set") {
      const index = step.at[0];
      if (index !== undefined) values[index] = step.value;
    }
  }
  return values;
};

const stepLabel = (step: TraceStep | undefined): string =>
  step === undefined
    ? "Start"
    : `${step.kind} ${step.at.join(",")}${step.note === undefined ? "" : `: ${step.note}`}`;

export const TraceVisualizer = ({
  trace,
  speed = 1,
  onStep,
  controls = "full",
}: TraceVisualizerProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const current = useMemo(() => replay(trace, stepIndex), [trace, stepIndex]);
  const active = trace.steps[stepIndex - 1];
  const lastStep = trace.steps.length;

  const go = (next: number) => {
    const bounded = Math.min(Math.max(next, 0), lastStep);
    setStepIndex(bounded);
    onStep?.(bounded);
  };

  return (
    <section aria-label="Algorithm trace" data-speed={speed}>
      <ol>
        {current.map((value, index) => (
          <li
            aria-current={active?.at.includes(index) === true ? "step" : undefined}
            key={index}
          >
            {String(value)}
          </li>
        ))}
      </ol>
      <p>{stepLabel(active)}</p>
      {controls === "none" ? null : (
        <div>
          <button disabled={stepIndex === 0} onClick={() => go(stepIndex - 1)} type="button">
            Previous
          </button>
          {controls === "full" ? (
            <input
              aria-label="Step"
              max={lastStep}
              min={0}
              onChange={(event) => go(Number(event.currentTarget.value))}
              type="range"
              value={stepIndex}
            />
          ) : null}
          <button disabled={stepIndex === lastStep} onClick={() => go(stepIndex + 1)} type="button">
            Next
          </button>
        </div>
      )}
    </section>
  );
};
