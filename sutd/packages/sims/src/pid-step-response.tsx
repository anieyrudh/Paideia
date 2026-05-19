import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  closeUnityFeedbackLoop,
  multiplyTransferFunctions,
  pidController,
  stepResponse,
  transferFunction,
} from "@paideia/control-systems";
import { ok, seconds, type ConceptPackageId, type KernelResult } from "@paideia/shared";

type PidState = { kp: number; ki: number; kd: number };

interface PidMetrics {
  readonly kp: number;
  readonly ki: number;
  readonly kd: number;
  readonly peak: number;
  readonly finalValue: number;
  readonly overshootPercent: number;
  readonly settlingTimeSeconds: number;
  readonly steadyStateError: number;
}

export const pidStepPackageId = "sutd/epd/pid-step-response" as ConceptPackageId;

export const pidStepResponseSpec: TSimulationSpec = {
  id: "pid-step-response",
  title: "PID Step Response Explorer",
  interaction_type: "comparative-matrix",
  kernel_deps: [
    "core/sim-runtime",
    "core/control-systems",
    "core/prediction-gate",
    "core/charting",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "kp",
        label: "Proportional gain Kp",
        kind: "slider",
        kernel_binding: "state.kp",
        bounds: { min: 0, max: 8, step: 0.1 },
      },
      {
        id: "ki",
        label: "Integral gain Ki",
        kind: "slider",
        kernel_binding: "state.ki",
        bounds: { min: 0, max: 4, step: 0.05 },
      },
      {
        id: "kd",
        label: "Derivative gain Kd",
        kind: "slider",
        kernel_binding: "state.kd",
        bounds: { min: 0, max: 2, step: 0.05 },
      },
    ],
  },
  predict: {
    prompt:
      "For a unit step on a fixed plant, which gain change is most likely to reduce steady-state error without increasing overshoot too much?",
    commit_format: {
      kind: "multiple-choice",
      options: ["Increase Kp only", "Increase Ki moderately", "Increase Kd only"],
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "step-response-summary",
        module: "core/control-systems",
        symbol: "stepResponse",
        props_binding:
          "Summarize overshoot, 2% settling time, and steady-state error for the selected PID gains.",
      },
    ],
  },
  explain: {
    prompt:
      "Compare two runs: which gain changed the error term fastest, and which increased oscillation risk?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Higher gain is always better.",
      "Derivative control fixes steady-state error.",
    ],
  },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const defaultState: PidState = { kp: 1.2, ki: 0.8, kd: 0.2 };

const round = (value: number, places = 2): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const format = (value: number, places = 2): string => round(value, places).toFixed(places);

const currentState = (state: Partial<PidState>): PidState => ({
  kp: clamp(state.kp ?? defaultState.kp, 0, 8),
  ki: clamp(state.ki ?? defaultState.ki, 0, 4),
  kd: clamp(state.kd ?? defaultState.kd, 0, 2),
});

const settlingTime = (samples: readonly { readonly t: number; readonly y: number }[]): number => {
  const tolerance = 0.02;
  for (let index = 0; index < samples.length; index += 1) {
    const tail = samples.slice(index);
    if (tail.every((sample) => Math.abs(1 - sample.y) <= tolerance)) {
      return samples[index]?.t ?? samples.at(-1)?.t ?? 0;
    }
  }
  return samples.at(-1)?.t ?? 0;
};

export const pidStepMetrics = (state: PidState): KernelResult<PidMetrics> => {
  const plant = transferFunction([1], [1, 2, 1]);
  if (!plant.ok) return plant;
  const controller = pidController(state);
  if (!controller.ok) return controller;
  const openLoop = multiplyTransferFunctions(controller.value, plant.value);
  if (!openLoop.ok) return openLoop;
  const closedLoop = closeUnityFeedbackLoop(openLoop.value);
  if (!closedLoop.ok) return closedLoop;
  const response = stepResponse(closedLoop.value, {
    durationSeconds: seconds(8),
    dtSeconds: seconds(0.05),
  });
  if (!response.ok) return response;

  const samples = response.value;
  const finalValue = samples.at(-1)?.y ?? 0;
  const peak = samples.reduce((max, sample) => Math.max(max, sample.y), 0);

  return ok({
    ...state,
    peak,
    finalValue,
    overshootPercent: Math.max(0, (peak - 1) * 100),
    settlingTimeSeconds: settlingTime(samples),
    steadyStateError: Math.abs(1 - finalValue),
  });
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<PidState>();
  const current = currentState(state);

  return (
    <section aria-label="PID gain controls" role="region">
      <label htmlFor="kp-control">Proportional gain Kp</label>
      <input
        id="kp-control"
        max={8}
        min={0}
        onChange={(event) => set("kp", Number(event.currentTarget.value))}
        step={0.1}
        type="range"
        value={current.kp}
      />
      <label htmlFor="ki-control">Integral gain Ki</label>
      <input
        id="ki-control"
        max={4}
        min={0}
        onChange={(event) => set("ki", Number(event.currentTarget.value))}
        step={0.05}
        type="range"
        value={current.ki}
      />
      <label htmlFor="kd-control">Derivative gain Kd</label>
      <input
        id="kd-control"
        max={2}
        min={0}
        onChange={(event) => set("kd", Number(event.currentTarget.value))}
        step={0.05}
        type="range"
        value={current.kd}
      />
      <button type="button" onClick={() => stage.advance()}>
        Observe response
      </button>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const metrics = pidStepMetrics(currentState(useSimState<Partial<PidState>>()));

  if (!metrics.ok) {
    return <p role="alert">These gains produce an unsupported closed-loop model.</p>;
  }

  return (
    <section aria-label="Observation unlocked" role="region">
      <h2>Step response evidence</h2>
      <p>
        Gains: Kp = {format(metrics.value.kp, 1)}, Ki = {format(metrics.value.ki, 2)}, Kd ={" "}
        {format(metrics.value.kd, 2)}.
      </p>
      <p>
        Peak response = {format(metrics.value.peak)}; overshoot ={" "}
        {format(metrics.value.overshootPercent, 1)}%.
      </p>
      <p>
        2% settling time = {format(metrics.value.settlingTimeSeconds)} s; steady-state error ={" "}
        {format(metrics.value.steadyStateError, 3)}.
      </p>
      <p>
        Formula used: e_ss = |1 - y_final|, overshoot % = max(0, y_peak - 1) × 100.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Explain tradeoff
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" role="region">
      <p>{pidStepResponseSpec.explain.prompt}</p>
      <p>
        Transfer: tune a thermal chamber where overshoot is costly. Use the same evidence:
        overshoot, settling time, and final error.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another tuning
      </button>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") return <ExplainStage />;

  return (
    <section aria-label="Prediction setup" role="region">
      <p>Choose gains, then predict which control action best reduces final error.</p>
      <button type="button" onClick={() => stage.advance()}>
        Start tuning
      </button>
    </section>
  );
};

export default function PidStepResponse() {
  return (
    <SimRuntime spec={pidStepResponseSpec} packageId={pidStepPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
