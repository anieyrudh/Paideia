import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  bode,
  closeUnityFeedbackLoop,
  multiplyTransferFunctions,
  pidController,
  stabilityMargins,
  stepResponse,
  transferFunction,
  type FrequencyResponsePoint,
  type StabilityMarginPoint,
  type StepResponseSample,
  type TransferFunction,
} from "@paideia/control-systems";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ok, seconds, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export interface PidBodeState {
  readonly kp: number;
  readonly ki: number;
  readonly kd: number;
  readonly naturalFrequencyRadPerSec: number;
  readonly dampingRatio: number;
}

export interface PidBodeEvidence {
  readonly state: PidBodeState;
  readonly stepSamples: readonly StepResponseSample[];
  readonly bodePoints: readonly FrequencyResponsePoint[];
  readonly marginPoints: readonly StabilityMarginPoint[];
  readonly gainCrossover: StabilityMarginPoint | null;
  readonly phaseCrossover: StabilityMarginPoint | null;
  readonly phaseMarginDeg: number | null;
  readonly gainMarginDb: number | null;
  readonly peak: number;
  readonly finalValue: number;
  readonly overshootPercent: number;
  readonly settlingTimeSeconds: number;
  readonly steadyStateError: number;
  readonly interpretation: string;
}

export const pidBodeBuilderPackageId = "shared/systems/pid-bode-builder" as ConceptPackageId;

export const pidBodeBuilderSpec: TSimulationSpec = {
  id: "pid-bode-builder",
  title: "PID Tuner and Bode Builder",
  interaction_type: "systems-flow-diagram",
  kernel_deps: [
    "core/sim-runtime",
    "core/control-systems",
    "core/charting",
    "core/prediction-gate",
    "core/ui-sim",
    "core/shared",
  ],
  manipulate: {
    controls: [
      {
        id: "proportional-gain",
        label: "Proportional gain Kp",
        kind: "slider",
        kernel_binding: "state.kp",
        bounds: { min: 0.2, max: 5, step: 0.1 },
      },
      {
        id: "integral-gain",
        label: "Integral gain Ki",
        kind: "slider",
        kernel_binding: "state.ki",
        bounds: { min: 0, max: 2.5, step: 0.05 },
      },
      {
        id: "derivative-gain",
        label: "Derivative gain Kd",
        kind: "slider",
        kernel_binding: "state.kd",
        bounds: { min: 0, max: 1, step: 0.02 },
      },
      {
        id: "natural-frequency",
        label: "Plant natural frequency",
        kind: "slider",
        kernel_binding: "state.naturalFrequencyRadPerSec",
        bounds: { min: 1, max: 6, step: 0.1 },
      },
      {
        id: "damping-ratio",
        label: "Plant damping ratio",
        kind: "slider",
        kernel_binding: "state.dampingRatio",
        bounds: { min: 0.15, max: 1.2, step: 0.05 },
      },
    ],
  },
  predict: {
    prompt:
      "A PID loop starts with Kp = 1.4, Ki = 0.7, and Kd = 0.18. If Kp is increased while the plant is unchanged, what is the most likely robustness tradeoff?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The response can get faster, but the phase margin may shrink.",
        "The phase margin must increase because the controller is stronger.",
        "Only the Bode magnitude changes; the step response cannot change.",
        "Derivative action will remove the final steady-state error.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "pid-bode-readout",
        module: "@paideia/shared-sims/pid-bode-builder",
        symbol: "PidBodeBuilderSim",
        props_binding:
          "Show PID gains, closed-loop step response, open-loop Bode traces, margin readouts, formula legend, substitutions, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Which gain improved the time response, and what did it cost in phase margin or overshoot?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "High gain always improves control",
      "Bode magnitude alone determines stability",
      "Derivative gain removes steady-state error",
    ],
  },
};

const defaults: PidBodeState = {
  kp: 1.4,
  ki: 0.7,
  kd: 0.18,
  naturalFrequencyRadPerSec: 2.5,
  dampingRatio: 0.45,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<PidBodeState>): PidBodeState => ({
  kp: clamp(state.kp ?? defaults.kp, 0.2, 5),
  ki: clamp(state.ki ?? defaults.ki, 0, 2.5),
  kd: clamp(state.kd ?? defaults.kd, 0, 1),
  naturalFrequencyRadPerSec: clamp(
    state.naturalFrequencyRadPerSec ?? defaults.naturalFrequencyRadPerSec,
    1,
    6,
  ),
  dampingRatio: clamp(state.dampingRatio ?? defaults.dampingRatio, 0.15, 1.2),
});

const fmt = (value: number, places = 2): string => {
  const rounded = Number(value.toFixed(places));
  return Object.is(rounded, -0) ? "0" : rounded.toFixed(places);
};

const multiplyAll = (
  first: TransferFunction,
  rest: readonly TransferFunction[],
): KernelResult<TransferFunction> => {
  let product = first;
  for (const factor of rest) {
    const next = multiplyTransferFunctions(product, factor);
    if (!next.ok) return next;
    product = next.value;
  }
  return ok(product);
};

const plantTransfer = (state: PidBodeState): KernelResult<TransferFunction> => {
  const wn = state.naturalFrequencyRadPerSec;
  return transferFunction([wn * wn], [1, 2 * state.dampingRatio * wn, wn * wn]);
};

const openLoopTransfer = (state: PidBodeState): KernelResult<TransferFunction> => {
  const controller = pidController({
    kp: state.kp,
    ki: state.ki,
    kd: state.kd,
  });
  if (!controller.ok) return controller;
  const plant = plantTransfer(state);
  if (!plant.ok) return plant;
  return multiplyAll(controller.value, [plant.value]);
};

const settlingTime = (samples: readonly StepResponseSample[]): number => {
  const tolerance = 0.02;
  for (let index = 0; index < samples.length; index += 1) {
    const tail = samples.slice(index);
    if (tail.every((sample) => Math.abs(1 - sample.y) <= tolerance)) {
      return samples[index]?.t ?? samples.at(-1)?.t ?? 0;
    }
  }
  return samples.at(-1)?.t ?? 0;
};

const interpretationFor = (
  phaseMarginDeg: number | null,
  overshootPercent: number,
): string => {
  if (phaseMarginDeg === null) {
    return "no 0 dB crossover appears in the scanned range, so compare the time response before trusting the margin readout";
  }
  if (phaseMarginDeg < 20) {
    return "the loop has a thin phase buffer and should be treated as fragile against extra lag";
  }
  if (phaseMarginDeg < 35) {
    return "the loop is responsive but has limited robustness margin";
  }
  if (overshootPercent > 20) {
    return "the Bode margin is usable, but the step response still overshoots too much for a delicate actuator";
  }
  return "the selected gains give a useful speed and robustness compromise for the modelled plant";
};

const frequencyGrid = (): readonly number[] => {
  const values: number[] = [];
  for (let index = 0; index < 72; index += 1) {
    values.push(0.1 * 10 ** (index / 18));
  }
  return values;
};

export const pidBodeEvidence = (state: PidBodeState): KernelResult<PidBodeEvidence> => {
  const openLoop = openLoopTransfer(state);
  if (!openLoop.ok) return openLoop;
  const closedLoop = closeUnityFeedbackLoop(openLoop.value);
  if (!closedLoop.ok) return closedLoop;
  const response = stepResponse(closedLoop.value, {
    durationSeconds: seconds(8),
    dtSeconds: seconds(0.04),
  });
  if (!response.ok) return response;
  const bodeResponse = bode(openLoop.value, frequencyGrid());
  if (!bodeResponse.ok) return bodeResponse;
  const margins = stabilityMargins(openLoop.value);
  if (!margins.ok) return margins;

  const samples = response.value;
  const finalValue = samples.at(-1)?.y ?? 0;
  const peak = samples.reduce((max, sample) => Math.max(max, sample.y), 0);
  const overshootPercent = Math.max(0, (peak - 1) * 100);
  const phaseMarginDeg = margins.value.phaseMarginDeg;

  return ok({
    state,
    stepSamples: samples,
    bodePoints: bodeResponse.value,
    marginPoints: margins.value.points,
    gainCrossover: margins.value.gainCrossover,
    phaseCrossover: margins.value.phaseCrossover,
    phaseMarginDeg,
    gainMarginDb: margins.value.gainMarginDb,
    peak,
    finalValue,
    overshootPercent,
    settlingTimeSeconds: settlingTime(samples),
    steadyStateError: Math.abs(1 - finalValue),
    interpretation: interpretationFor(phaseMarginDeg, overshootPercent),
  });
};

const stepChartData = (samples: readonly StepResponseSample[]) =>
  samples.map((sample) => ({
    x: sample.t,
    y: sample.y,
    series: "closed-loop output",
  }));

const bodeChartData = (
  points: readonly FrequencyResponsePoint[],
  key: "magnitudeDb" | "phaseDeg",
  series: string,
) =>
  points.map((point) => ({
    x: point.frequencyRadPerSec,
    y: point[key],
    series,
  }));

const MarginReadout = ({ evidence }: { readonly evidence: PidBodeEvidence }) => (
  <dl aria-label="PID and Bode readout" className="sutd-result-grid">
    <div>
      <dt>Overshoot</dt>
      <dd>{fmt(evidence.overshootPercent, 1)}%</dd>
    </div>
    <div>
      <dt>Settling time</dt>
      <dd>{fmt(evidence.settlingTimeSeconds, 2)} s</dd>
    </div>
    <div>
      <dt>Phase margin</dt>
      <dd>
        {evidence.phaseMarginDeg === null
          ? "not available"
          : `${fmt(evidence.phaseMarginDeg, 1)} deg`}
      </dd>
    </div>
    <div>
      <dt>Gain crossover</dt>
      <dd>
        {evidence.gainCrossover === null
          ? "not crossed"
          : `${fmt(evidence.gainCrossover.frequencyRadPerSec, 2)} rad/s`}
      </dd>
    </div>
    <div>
      <dt>Gain margin</dt>
      <dd>
        {evidence.gainMarginDb === null
          ? "not available"
          : `${fmt(evidence.gainMarginDb, 1)} dB`}
      </dd>
    </div>
    <div>
      <dt>Final error</dt>
      <dd>{fmt(evidence.steadyStateError, 3)}</dd>
    </div>
  </dl>
);

const FormulaPanel = ({ evidence }: { readonly evidence: PidBodeEvidence }) => {
  const gainCrossover = evidence.gainCrossover;
  const phaseMarginLine =
    gainCrossover === null
      ? String.raw`\omega_{gc}: no\ 0\ dB\ crossing\ in\ the\ scan`
      : String.raw`\omega_{gc} = ${fmt(gainCrossover.frequencyRadPerSec, 2)}\ \mathrm{rad/s}
\angle L(j\omega_{gc}) = ${fmt(gainCrossover.phaseDeg, 1)}^\circ
PM = 180^\circ + (${fmt(gainCrossover.phaseDeg, 1)}^\circ)
PM = ${fmt(evidence.phaseMarginDeg ?? 0, 1)}^\circ`;

  return (
    <section aria-label="Formula used" className="sutd-formula-card">
      <p className="meta-line">Formula used</p>
      <h3>Connect time response to the same loop</h3>
      <pre className="formula-code" aria-label="PID Bode formula">
        <code>{String.raw`\color{#2563eb}{C(s)}
= \color{#2563eb}{K_p}
  + \frac{\color{#059669}{K_i}}{s}
  + \color{#7c3aed}{K_d}s

\color{#dc2626}{L(s)}
= \color{#2563eb}{C(s)}\color{#f97316}{G(s)}

\color{#0f766e}{T(s)}
= \frac{\color{#dc2626}{L(s)}}{1 + \color{#dc2626}{L(s)}}

\color{#9333ea}{PM}
= 180^\circ + \angle \color{#dc2626}{L(j\omega_{gc})}`}</code>
      </pre>
      <p className="lab-kicker">Legend</p>
      <dl aria-label="Formula legend" className="formula-legend">
        <div>
          <dt>Kp</dt>
          <dd>proportional gain, dimensionless for this model</dd>
        </div>
        <div>
          <dt>Ki</dt>
          <dd>integral gain, per second in the PID term</dd>
        </div>
        <div>
          <dt>Kd</dt>
          <dd>derivative gain, seconds in the PID term</dd>
        </div>
        <div>
          <dt>G(s)</dt>
          <dd>second-order plant with natural frequency in rad/s and damping ratio</dd>
        </div>
        <div>
          <dt>PM</dt>
          <dd>phase margin, degrees</dd>
        </div>
      </dl>
      <p>Units: gains follow the displayed PID terms; frequencies use rad/s, margins use degrees or decibels, and settling time uses seconds.</p>
      <p>
        Substitution: Kp = {fmt(evidence.state.kp)}, Ki = {fmt(evidence.state.ki)}, Kd ={" "}
        {fmt(evidence.state.kd)}, natural frequency ={" "}
        {fmt(evidence.state.naturalFrequencyRadPerSec, 1)} rad/s, damping ratio ={" "}
        {fmt(evidence.state.dampingRatio, 2)}.
      </p>
      <pre className="formula-code" aria-label="PID Bode substitution">
        <code>{String.raw`overshoot = \max(0, y_{peak} - 1)\times 100
overshoot = \max(0, ${fmt(evidence.peak)} - 1)\times 100
overshoot = ${fmt(evidence.overshootPercent, 1)}\%

${phaseMarginLine}`}</code>
      </pre>
      <p>
        Result: {evidence.interpretation}. The result uses seconds for settling time, rad/s for
        crossover frequency, degrees for phase margin, and decibels for gain margin.
      </p>
    </section>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<PidBodeState>();
  const current = currentState(state);

  return (
    <section aria-label="PID tuning controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <ControlGroup legend="Controller gains">
          <Slider
            label="Proportional gain Kp"
            max={5}
            min={0.2}
            onChange={(value) => set("kp", value)}
            step={0.1}
            unit="x"
            value={current.kp}
          />
          <Slider
            label="Integral gain Ki"
            max={2.5}
            min={0}
            onChange={(value) => set("ki", value)}
            step={0.05}
            unit="1/s"
            value={current.ki}
          />
          <Slider
            label="Derivative gain Kd"
            max={1}
            min={0}
            onChange={(value) => set("kd", value)}
            step={0.02}
            unit="s"
            value={current.kd}
          />
        </ControlGroup>
        <ControlGroup legend="Plant model">
          <Slider
            label="Plant natural frequency"
            max={6}
            min={1}
            onChange={(value) => set("naturalFrequencyRadPerSec", value)}
            step={0.1}
            unit="rad/s"
            value={current.naturalFrequencyRadPerSec}
          />
          <Slider
            label="Plant damping ratio"
            max={1.2}
            min={0.15}
            onChange={(value) => set("dampingRatio", value)}
            step={0.05}
            unit="ratio"
            value={current.dampingRatio}
          />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal response and Bode evidence
        </button>
      </div>
      <section aria-label="Loop model preview" className="sutd-formula-card">
        <p className="meta-line">Manipulate</p>
        <h2>Shape one loop, then compare both views</h2>
        <p>
          Kp = {fmt(current.kp)}, Ki = {fmt(current.ki)}, Kd = {fmt(current.kd)}. The plant
          has natural frequency {fmt(current.naturalFrequencyRadPerSec, 1)} rad/s and damping
          ratio {fmt(current.dampingRatio, 2)}.
        </p>
        <p>
          The reveal computes the closed-loop step response and the open-loop Bode margins from
          the same transfer functions.
        </p>
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = pidBodeEvidence(currentState(useSimState<Partial<PidBodeState>>()));

  if (!evidence.ok) {
    return (
      <section role="region" aria-label="Observation unlocked" className="sutd-formula-card">
        <p role="alert">{evidence.error.message}</p>
      </section>
    );
  }

  return (
    <section role="region" aria-label="Observation unlocked" className="sutd-sim-panel">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Closed-loop and Bode evidence</h2>
        <p>
          Kp = {fmt(evidence.value.state.kp)}, Ki = {fmt(evidence.value.state.ki)}, Kd ={" "}
          {fmt(evidence.value.state.kd)}. {evidence.value.interpretation}.
        </p>
        <MarginReadout evidence={evidence.value} />
        <section aria-label="Step response chart">
          <h3>Closed-loop step response</h3>
          <LineChart
            ariaLabel="Step response chart, output against time in seconds"
            data={stepChartData(evidence.value.stepSamples)}
            x={{ domain: { min: 0, max: 8 } }}
            y={{ domain: { min: 0, max: Math.max(1.4, evidence.value.peak + 0.1) } }}
          />
        </section>
        <section aria-label="Magnitude response chart">
          <h3>Open-loop magnitude response</h3>
          <LineChart
            ariaLabel="Magnitude response chart, decibels against frequency in radians per second"
            data={bodeChartData(evidence.value.bodePoints, "magnitudeDb", "magnitude")}
            x={{ domain: { min: 0.1, max: 100 }, scale: "log" }}
            y={{ domain: { min: -60, max: 40 } }}
          />
        </section>
        <section aria-label="Phase response chart">
          <h3>Open-loop phase response</h3>
          <LineChart
            ariaLabel="Phase response chart, degrees against frequency in radians per second"
            data={bodeChartData(evidence.value.bodePoints, "phaseDeg", "phase")}
            x={{ domain: { min: 0.1, max: 100 }, scale: "log" }}
            y={{ domain: { min: -270, max: 30 } }}
          />
        </section>
        <button type="button" onClick={() => stage.advance()}>
          Explain tuning tradeoff
        </button>
      </div>
      <FormulaPanel evidence={evidence.value} />
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  const evidence = pidBodeEvidence(currentState(useSimState<Partial<PidBodeState>>()));

  return (
    <section aria-label="Explain and transfer" className="sutd-sim-panel">
      <section aria-label="Explain the tradeoff" className="sutd-formula-card">
        <p className="meta-line">Explain</p>
        <h2>Make the tuning argument</h2>
        <p>{pidBodeBuilderSpec.explain.prompt}</p>
        {evidence.ok ? (
          <p>
            Use your numbers: overshoot was {fmt(evidence.value.overshootPercent, 1)}%, settling
            time was {fmt(evidence.value.settlingTimeSeconds, 2)} s, and phase margin was{" "}
            {evidence.value.phaseMarginDeg === null
              ? "not available"
              : `${fmt(evidence.value.phaseMarginDeg, 1)} deg`}
            .
          </p>
        ) : null}
      </section>
      <section aria-label="Transfer challenge" className="sutd-formula-card">
        <p className="meta-line">Transfer</p>
        <h2>Retune a slower thermal loop</h2>
        <p>
          A thermal chamber has extra sensor lag. Choose gains that keep overshoot below 15% and
          phase margin at or above 35 deg. Explain which gain you changed first and why.
        </p>
        <button type="button" onClick={() => stage.reset()}>
          Try another tuning
        </button>
      </section>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") return <ExplainStage />;

  return (
    <section aria-label="Prediction setup" className="sutd-formula-card">
      <p className="meta-line">Predict first</p>
      <h1>PID Tuner and Bode Builder</h1>
      <p>
        Predict the robustness tradeoff before seeing the response and Bode evidence. Then tune
        PID gains and read both views from the same feedback loop.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Start PID tuning
      </button>
    </section>
  );
};

const PidBodeBuilderSim = () => (
  <SimRuntime packageId={pidBodeBuilderPackageId} spec={pidBodeBuilderSpec}>
    <StageSurface />
  </SimRuntime>
);

export default PidBodeBuilderSim;
