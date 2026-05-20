import type { TSimulationSpec } from "@paideia/content-schema";
import { LineChart } from "@paideia/charting";
import {
  multiplyTransferFunctions,
  stabilityMargins,
  transferFunction,
  type StabilityMarginPoint,
  type TransferFunction,
} from "@paideia/control-systems";
import { ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type BodeState = {
  readonly loopGain: number;
  readonly actuatorLagSeconds: number;
  readonly sensorLagSeconds: number;
};

type BodeEvidence = {
  readonly state: BodeState;
  readonly points: readonly StabilityMarginPoint[];
  readonly gainCrossover: StabilityMarginPoint | null;
  readonly phaseCrossover: StabilityMarginPoint | null;
  readonly phaseMarginDeg: number | null;
  readonly gainMarginDb: number | null;
  readonly interpretation: string;
};

export const bodeStabilityMarginPackageId =
  "sutd/epd/bode-stability-margin" as ConceptPackageId;

export const bodeStabilityMarginSpec: TSimulationSpec = {
  id: "bode-stability-margin",
  title: "Bode Margin Reader",
  interaction_type: "comparative-matrix",
  kernel_deps: [
    "core/shared",
    "core/content-schema",
    "core/sim-runtime",
    "core/control-systems",
    "core/charting",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "loop-gain",
        label: "Loop gain",
        kind: "slider",
        kernel_binding: "state.loopGain",
        bounds: { min: 1, max: 8, step: 0.5 },
      },
      {
        id: "actuator-lag",
        label: "Actuator lag",
        kind: "slider",
        kernel_binding: "state.actuatorLagSeconds",
        bounds: { min: 0.2, max: 1.2, step: 0.05 },
      },
      {
        id: "sensor-lag",
        label: "Sensor lag",
        kind: "slider",
        kernel_binding: "state.sensorLagSeconds",
        bounds: { min: 0.1, max: 0.6, step: 0.05 },
      },
    ],
  },
  predict: {
    prompt:
      "The open-loop gain starts at 2.0. If the loop gain is doubled while the plant lags stay the same, what is most likely to happen to the phase margin?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The phase margin increases because the loop is stronger",
        "The phase margin decreases because crossover moves to a higher-lag frequency",
        "The phase margin is unchanged because phase does not depend on gain",
        "The phase margin becomes exactly 180 degrees",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "bode-margin-readout",
        module: "@paideia/sutd-sims/bode-stability-margin",
        symbol: "BodeStabilityMargin",
        props_binding:
          "Show magnitude and phase traces for L(s), then read gain crossover, phase margin, phase crossover, and gain margin.",
      },
    ],
  },
  explain: {
    prompt:
      "Why can increasing loop gain make a feedback loop respond faster while also reducing its buffer against extra lag?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Higher gain always improves stability",
      "Magnitude alone decides closed-loop stability",
    ],
  },
};

const defaults: BodeState = {
  loopGain: 2,
  actuatorLagSeconds: 0.7,
  sensorLagSeconds: 0.25,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<BodeState>): BodeState => ({
  loopGain: clamp(state.loopGain ?? defaults.loopGain, 1, 8),
  actuatorLagSeconds: clamp(state.actuatorLagSeconds ?? defaults.actuatorLagSeconds, 0.2, 1.2),
  sensorLagSeconds: clamp(state.sensorLagSeconds ?? defaults.sensorLagSeconds, 0.1, 0.6),
});

const fmt = (value: number, places = 1): string => {
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

const openLoopTransfer = (state: BodeState): KernelResult<TransferFunction> => {
  const gain = transferFunction([state.loopGain], [1]);
  if (!gain.ok) return gain;
  const integrator = transferFunction([1], [1, 0]);
  if (!integrator.ok) return integrator;
  const actuatorLag = transferFunction([1], [state.actuatorLagSeconds, 1]);
  if (!actuatorLag.ok) return actuatorLag;
  const sensorLag = transferFunction([1], [state.sensorLagSeconds, 1]);
  if (!sensorLag.ok) return sensorLag;

  return multiplyAll(gain.value, [integrator.value, actuatorLag.value, sensorLag.value]);
};

const interpretationFor = (phaseMarginDeg: number | null): string => {
  if (phaseMarginDeg === null) {
    return "no 0 dB crossover appears in the scanned range";
  }
  if (phaseMarginDeg <= 0) {
    return "phase margin is negative, so the loop is at or beyond the oscillation boundary";
  }
  if (phaseMarginDeg < 20) {
    return "phase margin is thin, so extra lag could push the loop into oscillation";
  }
  if (phaseMarginDeg < 45) {
    return "phase margin is modest, so the loop needs careful implementation margin";
  }
  return "phase margin is broad enough for a first robustness buffer";
};

const bodeMarginEvidence = (state: BodeState): KernelResult<BodeEvidence> => {
  const openLoop = openLoopTransfer(state);
  if (!openLoop.ok) return openLoop;

  const margins = stabilityMargins(openLoop.value);
  if (!margins.ok) return margins;

  return ok({
    state,
    points: margins.value.points,
    gainCrossover: margins.value.gainCrossover,
    phaseCrossover: margins.value.phaseCrossover,
    phaseMarginDeg: margins.value.phaseMarginDeg,
    gainMarginDb: margins.value.gainMarginDb,
    interpretation: interpretationFor(margins.value.phaseMarginDeg),
  });
};

const chartData = (
  points: readonly StabilityMarginPoint[],
  key: "magnitudeDb" | "phaseDeg",
  series: string,
) =>
  points.map((point) => ({
    x: point.frequencyRadPerSec,
    y: point[key],
    series,
  }));

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<BodeState>();
  const current = currentState(state);

  return (
    <section aria-label="Bode controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <ControlGroup legend="Open-loop settings">
          <Slider
            label="Loop gain"
            max={8}
            min={1}
            onChange={(value) => set("loopGain", value)}
            step={0.5}
            unit="times"
            value={current.loopGain}
          />
          <Slider
            label="Actuator lag"
            max={1.2}
            min={0.2}
            onChange={(value) => set("actuatorLagSeconds", value)}
            step={0.05}
            unit="s"
            value={current.actuatorLagSeconds}
          />
          <Slider
            label="Sensor lag"
            max={0.6}
            min={0.1}
            onChange={(value) => set("sensorLagSeconds", value)}
            step={0.05}
            unit="s"
            value={current.sensorLagSeconds}
          />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal margin readout
        </button>
      </div>
      <section aria-label="Loop model preview" className="sutd-formula-card">
        <p className="meta-line">Manipulate</p>
        <h2>Shape the open-loop model</h2>
        <p>
          Loop gain K = {fmt(current.loopGain)} times, actuator lag ={" "}
          {fmt(current.actuatorLagSeconds, 2)} s, sensor lag ={" "}
          {fmt(current.sensorLagSeconds, 2)} s.
        </p>
        <p>
          The reveal will read how these choices move crossover frequencies and stability margins.
        </p>
      </section>
    </section>
  );
};

const MarginReadout = ({ evidence }: { readonly evidence: BodeEvidence }) => {
  const gainCrossover = evidence.gainCrossover;
  const phaseCrossover = evidence.phaseCrossover;

  return (
    <dl className="sutd-result-grid" aria-label="Bode margin readout">
      <div>
        <dt>Gain crossover</dt>
        <dd>
          {gainCrossover === null
            ? "not crossed"
            : `${fmt(gainCrossover.frequencyRadPerSec, 2)} rad/s`}
        </dd>
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
        <dt>Phase crossover</dt>
        <dd>
          {phaseCrossover === null
            ? "not crossed"
            : `${fmt(phaseCrossover.frequencyRadPerSec, 2)} rad/s`}
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
    </dl>
  );
};

const FormulaPanel = ({ evidence }: { readonly evidence: BodeEvidence }) => {
  const { state, gainCrossover, phaseCrossover } = evidence;
  const gainSubstitution =
    gainCrossover === null
      ? String.raw`\omega_{gc}: no\ 0\ dB\ crossing\ from\ 0.1\ to\ 100\ rad/s`
      : String.raw`\omega_{gc} = ${fmt(gainCrossover.frequencyRadPerSec, 2)}\ rad/s
\angle L(j\omega_{gc}) = ${fmt(gainCrossover.phaseDeg, 1)}^\circ
PM = 180^\circ + (${fmt(gainCrossover.phaseDeg, 1)}^\circ)
PM = ${fmt(evidence.phaseMarginDeg ?? 0, 1)}^\circ`;
  const phaseSubstitution =
    phaseCrossover === null
      ? String.raw`\omega_{pc}: no\ -180^\circ\ crossing\ from\ 0.1\ to\ 100\ rad/s`
      : String.raw`\omega_{pc} = ${fmt(phaseCrossover.frequencyRadPerSec, 2)}\ rad/s
|L(j\omega_{pc})| = ${fmt(phaseCrossover.magnitudeDb, 1)}\ dB
GM_{dB} = -(${fmt(phaseCrossover.magnitudeDb, 1)}\ dB)
GM_{dB} = ${fmt(evidence.gainMarginDb ?? 0, 1)}\ dB`;

  return (
    <section className="sutd-formula-card" aria-label="Formula used">
      <p className="meta-line">Formula used</p>
      <h3>Read the buffer before the loop turns positive</h3>
      <pre className="formula-code" aria-label="Stability margin formula">
        <code>{String.raw`\color{#dc2626}{L(j\omega)} = open\ loop\ response

\color{#2563eb}{\omega_{gc}}:\ |L(j\omega_{gc})| = 1

\color{#059669}{PM}
= 180^\circ + \color{#dc2626}{\angle L(j\omega_{gc})}

\color{#7c3aed}{\omega_{pc}}:\ \angle L(j\omega_{pc}) = -180^\circ

\color{#f97316}{GM_{dB}}
= -20\log_{10}\color{#dc2626}{|L(j\omega_{pc})|}`}</code>
      </pre>
      <dl className="formula-legend" aria-label="Formula legend">
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--red" /> L(jomega)
          </dt>
          <dd>open-loop response at a chosen angular frequency</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--red" /> |L| and angle L
          </dt>
          <dd>response magnitude and phase read from the Bode traces</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> omega_gc
          </dt>
          <dd>gain crossover frequency, rad/s</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> omega_pc
          </dt>
          <dd>phase crossover frequency, rad/s</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--green" /> PM
          </dt>
          <dd>phase margin, degrees</dd>
        </div>
        <div>
          <dt>
            <span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> GM_dB
          </dt>
          <dd>gain margin, decibels</dd>
        </div>
      </dl>
      <p>
        Substitution: Loop gain K = {fmt(state.loopGain)} times, actuator lag ={" "}
        {fmt(state.actuatorLagSeconds, 2)} s, sensor lag = {fmt(state.sensorLagSeconds, 2)} s.
      </p>
      <pre className="formula-code" aria-label="Stability margin substitution">
        <code>{`${gainSubstitution}\n\n${phaseSubstitution}`}</code>
      </pre>
      <p>
        Gain crossover:{" "}
        {gainCrossover === null
          ? "no 0 dB crossing was found from 0.1 rad/s to 100 rad/s."
          : `omega_gc = ${fmt(gainCrossover.frequencyRadPerSec, 2)} rad/s, phase = ${fmt(
              gainCrossover.phaseDeg,
              1,
            )} deg, so PM = ${fmt(evidence.phaseMarginDeg ?? 0, 1)} deg.`}
      </p>
      <p>
        Phase crossover:{" "}
        {phaseCrossover === null
          ? "no -180 deg crossing was found from 0.1 rad/s to 100 rad/s."
          : `omega_pc = ${fmt(phaseCrossover.frequencyRadPerSec, 2)} rad/s, magnitude = ${fmt(
              phaseCrossover.magnitudeDb,
              1,
            )} dB, so GM = ${fmt(evidence.gainMarginDb ?? 0, 1)} dB.`}
      </p>
      <p className="formula-note">Result: {evidence.interpretation}.</p>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = bodeMarginEvidence(currentState(useSimState<Partial<BodeState>>()));

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
        <h2>Bode margin evidence</h2>
        <p>
          Loop gain K = {fmt(evidence.value.state.loopGain)} times. The{" "}
          {evidence.value.interpretation}.
        </p>
        <MarginReadout evidence={evidence.value} />
        <section aria-label="Magnitude trace">
          <h3>Magnitude response</h3>
          <LineChart
            ariaLabel="Magnitude response chart, decibels against frequency in radians per second"
            data={chartData(evidence.value.points, "magnitudeDb", "magnitude")}
            x={{ domain: { min: 0.1, max: 100 }, scale: "log" }}
            y={{ domain: { min: -60, max: 40 } }}
          />
        </section>
        <section aria-label="Phase trace">
          <h3>Phase response</h3>
          <LineChart
            ariaLabel="Phase response chart, degrees against frequency in radians per second"
            data={chartData(evidence.value.points, "phaseDeg", "phase")}
            x={{ domain: { min: 0.1, max: 100 }, scale: "log" }}
            y={{ domain: { min: -270, max: -60 } }}
          />
        </section>
        <button type="button" onClick={() => stage.advance()}>
          Explain robustness tradeoff
        </button>
      </div>
      <FormulaPanel evidence={evidence.value} />
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  const evidence = bodeMarginEvidence(currentState(useSimState<Partial<BodeState>>()));

  return (
    <section aria-label="Explain and transfer" className="sutd-sim-panel">
      <section aria-label="Explain the mechanism" className="sutd-formula-card">
        <p className="meta-line">Explain</p>
        <h2>Connect the crossover shift to margin</h2>
        <p>
          Why can increasing loop gain make a feedback loop respond faster while also reducing
          its buffer against extra lag?
        </p>
        {evidence.ok ? (
          <p>
            Use the readout you just made: gain crossover was{" "}
            {evidence.value.gainCrossover === null
              ? "outside the scanned range"
              : `${fmt(evidence.value.gainCrossover.frequencyRadPerSec, 2)} rad/s`}
            , and phase margin was{" "}
            {evidence.value.phaseMarginDeg === null
              ? "not available"
              : `${fmt(evidence.value.phaseMarginDeg, 1)} deg`}
            . Explain the mechanism before making a design choice.
          </p>
        ) : null}
      </section>
      <section aria-label="Transfer challenge" className="sutd-formula-card">
        <p className="meta-line">Transfer</p>
        <h2>Choose the loop with enough buffer</h2>
      <p>
        For a drone altitude loop, the sensor filter adds 0.35 s of lag and the actuator lag is
        0.55 s. Choose a loop gain that keeps at least 30 deg of phase margin while still making
        the response faster than the conservative baseline.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another loop
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
      <h1>Bode Margin Reader</h1>
      <p>
        Predict how gain changes the phase margin before seeing the crossover readout. Then tune
        gain and lag to connect a Bode plot to feedback robustness.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Prepare Bode readout
      </button>
    </section>
  );
};

const BodeStabilityMarginSim = () => (
  <SimRuntime packageId={bodeStabilityMarginPackageId} spec={bodeStabilityMarginSpec}>
    <StageSurface />
  </SimRuntime>
);

export default BodeStabilityMarginSim;
