import { useEffect, useMemo, useState } from "react";
import { replayTrace } from "./replay.js";
import type { Trace, TraceStep } from "./types.js";

export interface TraceVisualizerProps {
  readonly trace: Trace<unknown>;
  readonly speed?: number;
  readonly onStep?: (i: number) => void;
  readonly controls?: "full" | "minimal" | "none";
}

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
  const current = useMemo(() => replayTrace(trace, stepIndex), [trace, stepIndex]);
  const active = trace.steps[stepIndex - 1];
  const lastStep = trace.steps.length;

  const go = (next: number) => {
    const bounded = Math.min(Math.max(next, 0), lastStep);
    setStepIndex(bounded);
    onStep?.(bounded);
  };

  useEffect(() => {
    if (speed <= 0 || stepIndex >= lastStep) return undefined;
    const ms = Math.max(50, 1000 / speed);
    const timer = globalThis.setTimeout(() => go(stepIndex + 1), ms);
    return () => globalThis.clearTimeout(timer);
  }, [lastStep, speed, stepIndex]);

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
