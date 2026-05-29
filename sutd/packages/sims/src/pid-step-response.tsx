import { LineChart } from "@paideia/charting";
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
  readonly stepSamples: readonly { readonly t: number; readonly y: number }[];
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
        id: "step-response-chart",
        module: "@paideia/sutd-sims/pid-step-response",
        symbol: "stepResponse",
        props_binding:
          "Plot y(t), show the PID feedback loop, and summarize overshoot, 2% settling time, and steady-state error for the selected PID gains.",
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
    stepSamples: samples,
  });
};

const stepChartData = (samples: PidMetrics["stepSamples"]) => [
  ...samples.map((sample) => ({
    x: sample.t,
    y: sample.y,
    series: "response y(t)",
  })),
  ...samples.map((sample) => ({
    x: sample.t,
    y: 1,
    series: "target setpoint",
  })),
];

const FeedbackLoopDiagram = () => (
  <svg
    aria-label="PID feedback loop diagram"
    role="img"
    viewBox="0 0 620 180"
    style={{ maxWidth: "100%", width: "100%" }}
  >
    <defs>
      <marker
        id="pid-arrow"
        markerHeight="8"
        markerWidth="8"
        orient="auto"
        refX="7"
        refY="4"
      >
        <path d="M0,0 L8,4 L0,8 Z" fill="#0f6b68" />
      </marker>
    </defs>
    <rect fill="#f8fbfa" height="180" rx="16" width="620" />
    <circle cx="92" cy="82" fill="#fffdf7" r="24" stroke="#0f6b68" strokeWidth="2" />
    <text fill="#16211f" fontSize="24" fontWeight="800" textAnchor="middle" x="92" y="91">
      Σ
    </text>
    <rect fill="#dcecea" height="54" rx="10" stroke="#0f6b68" width="116" x="174" y="55" />
    <text fill="#16211f" fontSize="15" fontWeight="800" textAnchor="middle" x="232" y="78">
      PID
    </text>
    <text fill="#5f6b68" fontSize="12" textAnchor="middle" x="232" y="96">
      Kp, Ki, Kd
    </text>
    <rect fill="#fffdf7" height="54" rx="10" stroke="#0f6b68" width="116" x="372" y="55" />
    <text fill="#16211f" fontSize="15" fontWeight="800" textAnchor="middle" x="430" y="78">
      Plant
    </text>
    <text fill="#5f6b68" fontSize="12" textAnchor="middle" x="430" y="96">
      1 / (s + 1)^2
    </text>
    <path
      d="M28 82 H68"
      fill="none"
      markerEnd="url(#pid-arrow)"
      stroke="#0f6b68"
      strokeWidth="2"
    />
    <path
      d="M116 82 H174"
      fill="none"
      markerEnd="url(#pid-arrow)"
      stroke="#0f6b68"
      strokeWidth="2"
    />
    <path
      d="M290 82 H372"
      fill="none"
      markerEnd="url(#pid-arrow)"
      stroke="#0f6b68"
      strokeWidth="2"
    />
    <path
      d="M488 82 H580"
      fill="none"
      markerEnd="url(#pid-arrow)"
      stroke="#0f6b68"
      strokeWidth="2"
    />
    <path
      d="M540 82 V142 H92 V106"
      fill="none"
      markerEnd="url(#pid-arrow)"
      stroke="#b42318"
      strokeWidth="2"
    />
    <text fill="#16211f" fontSize="13" fontWeight="800" x="22" y="67">
      r(t)
    </text>
    <text fill="#16211f" fontSize="13" fontWeight="800" x="552" y="67">
      y(t)
    </text>
    <text fill="#b42318" fontSize="13" fontWeight="800" x="298" y="135">
      feedback
    </text>
    <text fill="#5f6b68" fontSize="12" x="74" y="124">
      error = target - output
    </text>
  </svg>
);

const MetricReadout = ({ metrics }: { readonly metrics: PidMetrics }) => (
  <dl aria-label="PID response metrics" className="result-readout result-readout--cards">
    <div>
      <dt>Kp</dt>
      <dd>{format(metrics.kp, 1)}</dd>
    </div>
    <div>
      <dt>Ki</dt>
      <dd>{format(metrics.ki, 2)}</dd>
    </div>
    <div>
      <dt>Kd</dt>
      <dd>{format(metrics.kd, 2)}</dd>
    </div>
    <div>
      <dt>Peak y</dt>
      <dd>{format(metrics.peak)}</dd>
    </div>
    <div>
      <dt>Overshoot</dt>
      <dd>{format(metrics.overshootPercent, 1)}%</dd>
    </div>
    <div>
      <dt>Settling time</dt>
      <dd>{format(metrics.settlingTimeSeconds)} s</dd>
    </div>
    <div>
      <dt>Final error</dt>
      <dd>{format(metrics.steadyStateError, 3)}</dd>
    </div>
  </dl>
);

const FormulaPanel = ({ metrics }: { readonly metrics: PidMetrics }) => (
  <section aria-label="Formula used" className="formula-panel formula-panel--product">
    <p className="lab-kicker">Formula used</p>
    <pre className="formula-code">
{`Substitution:
e_ss = |1 - y_final|
      = |1 - ${format(metrics.finalValue, 3)}|
      = ${format(metrics.steadyStateError, 3)}

overshoot % = max(0, y_peak - 1) x 100
            = max(0, ${format(metrics.peak)} - 1) x 100
            = ${format(metrics.overshootPercent, 1)} %

settling time = first time after which y(t) stays within +/-2% of target
              = ${format(metrics.settlingTimeSeconds)} s`}
    </pre>
    <p className="lab-kicker">Legend</p>
    <dl aria-label="Formula legend" className="formula-legend">
      <div>
        <dt>
          <span className="legend-swatch legend-swatch--blue" />
          y(t)
        </dt>
        <dd>controller output shown by the blue response curve</dd>
      </div>
      <div>
        <dt>
          <span className="legend-swatch legend-swatch--red" />
          target
        </dt>
        <dd>unit step setpoint, drawn as the red reference line</dd>
      </div>
      <div>
        <dt>
          <span className="legend-swatch legend-swatch--green" />
          e_ss
        </dt>
        <dd>steady-state error, measured in output units</dd>
      </div>
      <div>
        <dt>
          <span className="legend-swatch legend-swatch--orange" />
          settling
        </dt>
        <dd>time in seconds to remain inside the 2% band</dd>
      </div>
    </dl>
    <p>
      Result: these gains settle in {format(metrics.settlingTimeSeconds)} s with{" "}
      {format(metrics.overshootPercent, 1)}% overshoot and final error{" "}
      {format(metrics.steadyStateError, 3)}.
    </p>
  </section>
);

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
    return (
      <section aria-label="Observation unlocked" role="region">
        <p role="alert">These gains produce an unsupported closed-loop model.</p>
      </section>
    );
  }

  return (
    <section aria-label="Observation unlocked" className="vector-stage vector-stage--product" role="region">
      <h2>Step response evidence</h2>
      <p>
        Kp = {format(metrics.value.kp, 1)}, Ki = {format(metrics.value.ki, 2)}, Kd ={" "}
        {format(metrics.value.kd, 2)}. The curve shows how the closed-loop output moves
        toward the unit step target.
      </p>
      <FeedbackLoopDiagram />
      <MetricReadout metrics={metrics.value} />
      <section aria-label="Step response chart">
        <h3>Closed-loop step response</h3>
        <LineChart
          ariaLabel="Step response chart, output against time in seconds"
          data={stepChartData(metrics.value.stepSamples)}
          x={{ domain: { min: 0, max: 8 } }}
          y={{ domain: { min: 0, max: Math.max(1.4, metrics.value.peak + 0.1) } }}
        />
      </section>
      <FormulaPanel metrics={metrics.value} />
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
