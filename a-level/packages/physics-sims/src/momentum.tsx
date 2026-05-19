import { useMemo } from "react";
import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import { averagePower, kineticEnergy, workDone, workEnergyTransfer } from "@paideia/mechanics";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  degrees,
  kilograms,
  metres,
  metresPerSecond,
  newtons,
  ok,
  radians,
  seconds,
  type ConceptPackageId,
  type Degrees,
  type Joules,
  type KernelResult,
  type Kilograms,
  type Metres,
  type MetresPerSecond,
  type Newtons,
  type Seconds,
  type Watts,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const momentumPackageId = "momentum" as ConceptPackageId;
export const momentumSimId = "momentum-collision-lab";
export type MomentumPredictionEvent = PredictionEvent;

export interface MomentumState {
  readonly forceNewtons: Newtons;
  readonly displacementMetres: Metres;
  readonly angleDegrees: Degrees;
  readonly elapsedSeconds: Seconds;
  readonly massKilograms: Kilograms;
  readonly initialSpeedMetresPerSecond: MetresPerSecond;
}

export interface EnergyTracePoint {
  readonly displacementMetres: Metres;
  readonly kineticEnergyJoules: Joules;
  readonly workDoneJoules: Joules;
}

export interface MomentumModel {
  readonly workJoules: Joules;
  readonly initialKineticEnergyJoules: Joules;
  readonly finalKineticEnergyJoules: Joules;
  readonly averagePowerWatts: Watts;
  readonly energyChangeJoules: Joules;
  readonly trace: readonly EnergyTracePoint[];
  readonly signDecision: "positive" | "zero" | "negative";
  readonly transferLabel: string;
}

export const momentumSpec: TSimulationSpec = {
  id: momentumSimId,
  title: "Energy Transfer Lab",
  interaction_type: "animation-playback",
  kernel_deps: [
    "core/sim-runtime",
    "core/content-schema",
    "core/mechanics",
    "core/charting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A 10 N pull moves a trolley 3.0 m in the same direction as the motion in 2.0 s. Before revealing the lab, which work and average power statement is correct?",
    commit_format: {
      kind: "multiple-choice",
      options: ["0 J and 0 W", "30 J and 15 W", "30 J and 30 W", "60 J and 15 W"],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "force",
        label: "Applied force",
        kind: "slider",
        kernel_binding: "state.forceNewtons",
        bounds: { min: 0, max: 20, step: 1 },
      },
      {
        id: "displacement",
        label: "Displacement",
        kind: "slider",
        kernel_binding: "state.displacementMetres",
        bounds: { min: 0, max: 6, step: 0.5 },
      },
      {
        id: "angle",
        label: "Force angle",
        kind: "slider",
        kernel_binding: "state.angleDegrees",
        bounds: { min: 0, max: 180, step: 15 },
      },
      {
        id: "elapsed-time",
        label: "Elapsed time",
        kind: "slider",
        kernel_binding: "state.elapsedSeconds",
        bounds: { min: 0.5, max: 8, step: 0.5 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "momentum-collision-lab",
        module: "@paideia/a-level-physics-sims/momentum",
        symbol: "MomentumSim",
        props_binding:
          "Show work sign, energy-store transfer, average power, formula substitution, and an energy trace from force, displacement, angle, time, mass, and starting speed.",
      },
    ],
  },
  explain: {
    prompt:
      "Why does only the force component along the displacement transfer energy, and what changes when the same work is done in less time?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Energy is lost rather than transferred.",
      "Work equals force regardless of displacement direction.",
      "Power is the same thing as energy.",
    ],
  },
};

const defaultState: MomentumState = {
  forceNewtons: newtons(10),
  displacementMetres: metres(3),
  angleDegrees: degrees(0),
  elapsedSeconds: seconds(2),
  massKilograms: kilograms(4),
  initialSpeedMetresPerSecond: metresPerSecond(1),
};

const presets: readonly {
  readonly label: string;
  readonly state: MomentumState;
}[] = [
  { label: "pull with motion", state: defaultState },
  {
    label: "sideways pull",
    state: {
      ...defaultState,
      forceNewtons: newtons(12),
      angleDegrees: degrees(90),
      elapsedSeconds: seconds(3),
    },
  },
  {
    label: "braking force",
    state: {
      forceNewtons: newtons(5),
      displacementMetres: metres(2),
      angleDegrees: degrees(180),
      elapsedSeconds: seconds(2.5),
      massKilograms: kilograms(3),
      initialSpeedMetresPerSecond: metresPerSecond(3),
    },
  },
  {
    label: "same work, slower",
    state: { ...defaultState, elapsedSeconds: seconds(6) },
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<MomentumState>): MomentumState => ({
  forceNewtons: newtons(clamp(state.forceNewtons ?? defaultState.forceNewtons, 0, 20)),
  displacementMetres: metres(clamp(state.displacementMetres ?? defaultState.displacementMetres, 0, 6)),
  angleDegrees: degrees(clamp(state.angleDegrees ?? defaultState.angleDegrees, 0, 180)),
  elapsedSeconds: seconds(clamp(state.elapsedSeconds ?? defaultState.elapsedSeconds, 0.5, 8)),
  massKilograms: kilograms(clamp(state.massKilograms ?? defaultState.massKilograms, 1, 10)),
  initialSpeedMetresPerSecond: metresPerSecond(clamp(
    state.initialSpeedMetresPerSecond ?? defaultState.initialSpeedMetresPerSecond,
    0,
    8,
  )),
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatSigned = (value: number, places = 2): string =>
  value >= 0 ? `+${formatNumber(value, places)}` : formatNumber(value, places);
const degToRad = (value: Degrees): number => (value * Math.PI) / 180;

const signOfWork = (workJoules: number): MomentumModel["signDecision"] => {
  if (Math.abs(workJoules) < 1e-9) return "zero";
  return workJoules > 0 ? "positive" : "negative";
};

const transferLabel = (sign: MomentumModel["signDecision"]): string => {
  if (sign === "positive") return "Energy is transferred into the kinetic store.";
  if (sign === "negative") return "Energy is transferred out of the kinetic store.";
  return "No work is done because the force has no component along the displacement.";
};

export const momentumModel = (
  state: MomentumState,
): KernelResult<MomentumModel> => {
  const angle = radians(degToRad(state.angleDegrees));
  const work = workDone(state.forceNewtons, state.displacementMetres, angle);
  if (!work.ok) return work;

  const initialKineticEnergy = kineticEnergy(
    state.massKilograms,
    state.initialSpeedMetresPerSecond,
  );
  if (!initialKineticEnergy.ok) return initialKineticEnergy;

  const transfer = workEnergyTransfer(initialKineticEnergy.value, work.value);
  if (!transfer.ok) return transfer;
  const power = averagePower(work.value, state.elapsedSeconds);
  if (!power.ok) return power;

  const trace: EnergyTracePoint[] = [];
  const sampleCount = 24;
  for (let index = 0; index <= sampleCount; index += 1) {
    const fraction = index / sampleCount;
    const displacement = state.displacementMetres * fraction;
    const partialWork = workDone(state.forceNewtons, metres(displacement), angle);
    if (!partialWork.ok) return partialWork;
    const partialTransfer = workEnergyTransfer(initialKineticEnergy.value, partialWork.value);
    if (!partialTransfer.ok) return partialTransfer;
    trace.push({
      displacementMetres: metres(displacement),
      kineticEnergyJoules: partialTransfer.value.finalKineticEnergyJoules,
      workDoneJoules: partialWork.value,
    });
  }

  const signDecision = signOfWork(work.value);
  return ok({
    workJoules: work.value,
    initialKineticEnergyJoules: initialKineticEnergy.value,
    finalKineticEnergyJoules: transfer.value.finalKineticEnergyJoules,
    averagePowerWatts: power.value,
    energyChangeJoules: transfer.value.kineticEnergyChangeJoules,
    trace,
    signDecision,
    transferLabel: transferLabel(signDecision),
  });
};

export const EnergyTransferDiagram = ({
  state,
  model,
}: {
  readonly state: MomentumState;
  readonly model: MomentumModel;
}) => {
  const arrowLength = 90;
  const angleRadians = degToRad(state.angleDegrees);
  const arrowEndX = 160 + Math.cos(angleRadians) * arrowLength;
  const arrowEndY = 86 - Math.sin(angleRadians) * arrowLength;
  const kineticPercent = Math.min(100, Math.max(4, model.finalKineticEnergyJoules * 5));
  const chartData = model.trace.flatMap((point) => [
    { x: point.displacementMetres, y: point.kineticEnergyJoules, series: "kinetic energy" },
    { x: point.displacementMetres, y: point.workDoneJoules, series: "work done" },
  ]);

  return (
    <div className="energy-stage" aria-label="Energy transfer visual">
      <svg aria-label="Force and displacement diagram" role="img" viewBox="0 0 360 180">
        <defs>
          <marker id="work-energy-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 Z" fill="#1f5f8b" />
          </marker>
        </defs>
        <rect fill="#f8fbff" height="180" rx="18" width="360" />
        <line stroke="#cbd5e1" strokeWidth="3" x1="48" x2="312" y1="132" y2="132" />
        <line
          markerEnd="url(#work-energy-arrow)"
          stroke="#027a48"
          strokeLinecap="round"
          strokeWidth="6"
          x1="72"
          x2="280"
          y1="132"
          y2="132"
        />
        <rect fill="#f0b429" height="36" rx="7" width="64" x="128" y="96" />
        <circle cx="142" cy="135" fill="#10201a" r="6" />
        <circle cx="178" cy="135" fill="#10201a" r="6" />
        <line
          markerEnd="url(#work-energy-arrow)"
          stroke="#1f5f8b"
          strokeLinecap="round"
          strokeWidth="5"
          x1="160"
          x2={arrowEndX}
          y1="96"
          y2={arrowEndY}
        />
        <text fill="#10201a" fontSize="12" fontWeight="800" x="56" y="156">
          displacement = {formatNumber(state.displacementMetres, 1)} m
        </text>
        <text fill="#10201a" fontSize="12" fontWeight="800" x="198" y="82">
          force angle = {formatNumber(state.angleDegrees, 0)} deg
        </text>
      </svg>
      <div className="energy-bars" aria-label="Energy-store bars">
        <span>Kinetic store now</span>
        <div className="energy-bar">
          <span style={{ width: `${kineticPercent}%` }} />
        </div>
        <strong>{formatNumber(model.finalKineticEnergyJoules)} J</strong>
      </div>
      <LineChart
        data={chartData}
        x={{ domain: { min: 0, max: Math.max(1, state.displacementMetres) } }}
        y={{ domain: { min: Math.min(0, model.workJoules), max: Math.max(1, model.finalKineticEnergyJoules) } }}
      />
    </div>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<MomentumState>();
  const current = currentState(state);
  const model = useMemo(() => momentumModel(current), [current]);

  return (
    <section aria-label="Energy controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product" aria-label="Work-energy controls">
        <p className="lab-kicker">Tune the transfer</p>
        <ControlGroup legend="Work, energy, and power controls">
          <Slider
            label="Applied force"
            max={20}
            min={0}
            onChange={(value) => set("forceNewtons", newtons(value))}
            step={1}
            unit="N"
            value={current.forceNewtons}
          />
          <Slider
            label="Displacement"
            max={6}
            min={0}
            onChange={(value) => set("displacementMetres", metres(value))}
            step={0.5}
            unit="m"
            value={current.displacementMetres}
          />
          <Slider
            label="Force angle"
            max={180}
            min={0}
            onChange={(value) => set("angleDegrees", degrees(value))}
            step={15}
            unit="deg"
            value={current.angleDegrees}
          />
          <Slider
            label="Elapsed time"
            max={8}
            min={0.5}
            onChange={(value) => set("elapsedSeconds", seconds(value))}
            step={0.5}
            unit="s"
            value={current.elapsedSeconds}
          />
          <Slider
            label="Mass"
            max={10}
            min={1}
            onChange={(value) => set("massKilograms", kilograms(value))}
            step={0.5}
            unit="kg"
            value={current.massKilograms}
          />
          <Slider
            label="Starting speed"
            max={8}
            min={0}
            onChange={(value) => set("initialSpeedMetresPerSecond", metresPerSecond(value))}
            step={0.5}
            unit="m s^-1"
            value={current.initialSpeedMetresPerSecond}
          />
        </ControlGroup>
        <div className="preset-strip" aria-label="Scenario presets">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                set("forceNewtons", preset.state.forceNewtons);
                set("displacementMetres", preset.state.displacementMetres);
                set("angleDegrees", preset.state.angleDegrees);
                set("elapsedSeconds", preset.state.elapsedSeconds);
                set("massKilograms", preset.state.massKilograms);
                set("initialSpeedMetresPerSecond", preset.state.initialSpeedMetresPerSecond);
              }}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Reveal energy transfer
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Watch the direction</h3>
        <p>
          Work depends on the component of force along displacement. If the force is sideways,
          the displacement can be large while the work is zero.
        </p>
        {model.ok ? (
          <p>
            Your current settings predict {model.value.signDecision} work. Commit your prediction
            before the readout and trace are shown.
          </p>
        ) : (
          <p role="alert">The current settings need finite values.</p>
        )}
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<MomentumState>>());
  const model = momentumModel(state);

  if (!model.ok) {
    return <p role="alert">The current energy settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <EnergyTransferDiagram model={model.value} state={state} />
        <dl aria-label="Energy readout" className="result-readout result-readout--cards">
          <div>
            <dt>Work done</dt>
            <dd>{formatSigned(model.value.workJoules)} J</dd>
          </div>
          <div>
            <dt>Average power</dt>
            <dd>{formatSigned(model.value.averagePowerWatts)} W</dd>
          </div>
          <div>
            <dt>Kinetic store change</dt>
            <dd>{formatSigned(model.value.energyChangeJoules)} J</dd>
          </div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Work is force along the path</h3>
        <p className="formula">W = F s cos(theta), P = W / t, E_k = 1/2 mv^2</p>
        <p>
          W = ({formatNumber(state.forceNewtons, 1)} N)({formatNumber(state.displacementMetres, 1)} m)
          cos({formatNumber(state.angleDegrees, 0)} deg) = {formatSigned(model.value.workJoules)} J.
        </p>
        <p>
          P = {formatSigned(model.value.workJoules)} J / {formatNumber(state.elapsedSeconds, 1)} s ={" "}
          {formatSigned(model.value.averagePowerWatts)} W.
        </p>
        <p>
          Starting E_k = 1/2({formatNumber(state.massKilograms, 1)} kg)(
          {formatNumber(state.initialSpeedMetresPerSecond, 1)} m s^-1)^2 ={" "}
          {formatNumber(model.value.initialKineticEnergyJoules)} J. The final kinetic store is{" "}
          {formatNumber(model.value.finalKineticEnergyJoules)} J.
        </p>
        <p className="formula-note">{model.value.transferLabel}</p>
        <button type="button" onClick={() => stage.advance()}>
          Explain the transfer
        </button>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Transfer</p>
      <h3>Motor transfer challenge</h3>
      <p>
        Two motors lift the same load through the same height. Before changing the preset, decide:
        what should stay the same, and what should change when the time becomes shorter?
      </p>
      <p className="formula-note">Use P = W / t to justify the comparison after you try it.</p>
      <button type="button" onClick={() => stage.reset()}>
        Try another energy transfer
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
    <section aria-label="Prediction setup" className="formula-panel formula-panel--product">
      <p className="lab-kicker">Predict first</p>
      <h3>Which part of the force counts?</h3>
      <p>
        Commit a prediction before the energy trace appears. The reveal will connect force angle,
        displacement, work done, kinetic energy change, and power.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up energy transfer
      </button>
    </section>
  );
};

export const MomentumSim = () => (
  <SimRuntime spec={momentumSpec} packageId={momentumPackageId}>
    <StageSurface />
  </SimRuntime>
);

export default MomentumSim;
