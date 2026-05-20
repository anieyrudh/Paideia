import { useMemo } from "react";
import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import { evaluate } from "@paideia/function-eval";
import type { PredictionEvent } from "@paideia/prediction-gate";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import {
  degrees,
  err,
  hertz,
  metres,
  ok,
  radians,
  seconds,
  type ConceptPackageId,
  type Degrees,
  type Hertz,
  type KernelResult,
  type Metres,
  type Radians,
  type Seconds,
} from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const wavesPackageId = "waves" as ConceptPackageId;
export const wavesSimId = "wave-superposition-lab";
export type WavesPredictionEvent = PredictionEvent;

export interface WavesState {
  readonly amplitudeMetres: Metres;
  readonly wavelengthMetres: Metres;
  readonly periodSeconds: Seconds;
  readonly phaseDegrees: Degrees;
  readonly samplePositionMetres: Metres;
  readonly timeSeconds: Seconds;
}

export interface WaveTracePoint {
  readonly positionMetres: Metres;
  readonly waveA: Metres;
  readonly waveB: Metres;
  readonly resultant: Metres;
}

export interface WavesModel {
  readonly frequencyHertz: Hertz;
  readonly phaseRadians: Radians;
  readonly waveAAtSampleMetres: Metres;
  readonly waveBAtSampleMetres: Metres;
  readonly resultantAtSampleMetres: Metres;
  readonly envelopeAmplitudeMetres: Metres;
  readonly interference: "constructive" | "destructive" | "partial";
  readonly trace: readonly WaveTracePoint[];
}

export const wavesSpec: TSimulationSpec = {
  id: wavesSimId,
  title: "Wave Superposition Lab",
  interaction_type: "animation-playback",
  kernel_deps: [
    "core/sim-runtime",
    "core/content-schema",
    "core/function-eval",
    "core/charting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "Two identical waves meet in phase. Before revealing the lab, what happens to the displacement where their crests overlap?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "They cancel to zero",
        "They add to double the displacement",
        "The wavelength doubles",
        "The frequency halves",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "amplitude",
        label: "Amplitude",
        kind: "slider",
        kernel_binding: "state.amplitudeMetres",
        bounds: { min: 0.2, max: 3, step: 0.1 },
      },
      {
        id: "wavelength",
        label: "Wavelength",
        kind: "slider",
        kernel_binding: "state.wavelengthMetres",
        bounds: { min: 1, max: 8, step: 0.25 },
      },
      {
        id: "period",
        label: "Period",
        kind: "slider",
        kernel_binding: "state.periodSeconds",
        bounds: { min: 0.5, max: 6, step: 0.25 },
      },
      {
        id: "phase",
        label: "Phase difference",
        kind: "slider",
        kernel_binding: "state.phaseDegrees",
        bounds: { min: 0, max: 180, step: 15 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "wave-superposition-lab",
        module: "@paideia/a-level-physics-sims/waves",
        symbol: "WavesSim",
        props_binding:
          "Show two same-frequency waves, their resultant displacement, phase comparison, formula substitution, and interference condition.",
      },
    ],
  },
  explain: {
    prompt:
      "Why do identical waves reinforce when their displacements point the same way, and cancel when they point opposite ways?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Amplitude and wavelength are interchangeable.",
      "Constructive interference changes the frequency.",
      "Destructive interference destroys energy.",
    ],
  },
};

const defaultState: WavesState = {
  amplitudeMetres: metres(1.5),
  wavelengthMetres: metres(4),
  periodSeconds: seconds(2),
  phaseDegrees: degrees(0),
  samplePositionMetres: metres(1),
  timeSeconds: seconds(0),
};

const presets: readonly {
  readonly label: string;
  readonly state: WavesState;
}[] = [
  { label: "crest meets crest", state: defaultState },
  {
    label: "crest meets trough",
    state: { ...defaultState, phaseDegrees: degrees(180) },
  },
  {
    label: "part-way out of step",
    state: { ...defaultState, phaseDegrees: degrees(90) },
  },
  {
    label: "shorter wavelength",
    state: { ...defaultState, wavelengthMetres: metres(2.5), periodSeconds: seconds(1.25) },
  },
];

const waveExpression = "A * sin(tau * (x / lambda - t / T) + phi)";
const tau = Math.PI * 2;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<WavesState>): WavesState => ({
  amplitudeMetres: metres(clamp(state.amplitudeMetres ?? defaultState.amplitudeMetres, 0.2, 3)),
  wavelengthMetres: metres(clamp(state.wavelengthMetres ?? defaultState.wavelengthMetres, 1, 8)),
  periodSeconds: seconds(clamp(state.periodSeconds ?? defaultState.periodSeconds, 0.5, 6)),
  phaseDegrees: degrees(clamp(state.phaseDegrees ?? defaultState.phaseDegrees, 0, 180)),
  samplePositionMetres: metres(clamp(
    state.samplePositionMetres ?? defaultState.samplePositionMetres,
    0,
    8,
  )),
  timeSeconds: seconds(clamp(state.timeSeconds ?? defaultState.timeSeconds, 0, 6)),
});

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatSigned = (value: number, places = 2): string =>
  value >= 0 ? `+${formatNumber(value, places)}` : formatNumber(value, places);
const degreesToRadians = (value: Degrees): Radians => radians((value * Math.PI) / 180);

const evaluateWave = (
  state: WavesState,
  positionMetres: number,
  phaseRadians: number,
): KernelResult<Metres> => {
  const result = evaluate(waveExpression, {
    A: state.amplitudeMetres,
    tau,
    x: positionMetres,
    lambda: state.wavelengthMetres,
    t: state.timeSeconds,
    T: state.periodSeconds,
    phi: phaseRadians,
  });
  if (!result.ok) return result;
  return ok(metres(result.value));
};

const classifyInterference = (phaseDegrees: Degrees): WavesModel["interference"] => {
  if (phaseDegrees <= 30) return "constructive";
  if (phaseDegrees >= 150) return "destructive";
  return "partial";
};

export const wavesModel = (state: WavesState): KernelResult<WavesModel> => {
  if (state.wavelengthMetres <= 0) {
    return err("precondition-violated", "Wavelength must be positive.");
  }
  if (state.periodSeconds <= 0) {
    return err("precondition-violated", "Period must be positive.");
  }

  const phaseRadians = degreesToRadians(state.phaseDegrees);
  const waveAAtSample = evaluateWave(state, state.samplePositionMetres, 0);
  if (!waveAAtSample.ok) return waveAAtSample;
  const waveBAtSample = evaluateWave(state, state.samplePositionMetres, phaseRadians);
  if (!waveBAtSample.ok) return waveBAtSample;

  const trace: WaveTracePoint[] = [];
  const sampleCount = 48;
  const maxPosition = Math.max(1, state.wavelengthMetres * 2);
  for (let index = 0; index <= sampleCount; index += 1) {
    const position = (index / sampleCount) * maxPosition;
    const waveA = evaluateWave(state, position, 0);
    if (!waveA.ok) return waveA;
    const waveB = evaluateWave(state, position, phaseRadians);
    if (!waveB.ok) return waveB;
    trace.push({
      positionMetres: metres(position),
      waveA: waveA.value,
      waveB: waveB.value,
      resultant: metres(waveA.value + waveB.value),
    });
  }

  return ok({
    frequencyHertz: hertz(1 / state.periodSeconds),
    phaseRadians,
    waveAAtSampleMetres: waveAAtSample.value,
    waveBAtSampleMetres: waveBAtSample.value,
    resultantAtSampleMetres: metres(waveAAtSample.value + waveBAtSample.value),
    envelopeAmplitudeMetres: metres(Math.abs(2 * state.amplitudeMetres * Math.cos(phaseRadians / 2))),
    interference: classifyInterference(state.phaseDegrees),
    trace,
  });
};

export const WaveSuperpositionDiagram = ({
  state,
  model,
}: {
  readonly state: WavesState;
  readonly model: WavesModel;
}) => {
  const chartData = model.trace.flatMap((point) => [
    { x: point.positionMetres, y: point.waveA, series: "wave A" },
    { x: point.positionMetres, y: point.waveB, series: "wave B" },
    { x: point.positionMetres, y: point.resultant, series: "resultant" },
  ]);
  const yLimit = Math.max(1, state.amplitudeMetres * 2.2);

  return (
    <div className="energy-stage" aria-label="Wave superposition visual">
      <svg aria-label="Two waves meeting" role="img" viewBox="0 0 360 180">
        <rect fill="#f8fbff" height="180" rx="18" width="360" />
        <line stroke="#cbd5e1" strokeWidth="2" x1="24" x2="336" y1="90" y2="90" />
        <circle cx="86" cy="90" fill="#2563eb" r={16 + state.amplitudeMetres * 5} opacity="0.28" />
        <circle cx="224" cy="90" fill="#f97316" r={16 + state.amplitudeMetres * 5} opacity="0.28" />
        <path
          d="M72 90 C104 38, 136 38, 168 90 S232 142, 264 90"
          fill="none"
          stroke="#2563eb"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d={
            state.phaseDegrees > 120
              ? "M72 90 C104 142, 136 142, 168 90 S232 38, 264 90"
              : "M72 90 C104 48, 136 48, 168 90 S232 132, 264 90"
          }
          fill="none"
          stroke="#f97316"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d={
            model.interference === "destructive"
              ? "M72 90 C104 90, 136 90, 168 90 S232 90, 264 90"
              : "M72 90 C104 26, 136 26, 168 90 S232 154, 264 90"
          }
          fill="none"
          stroke="#059669"
          strokeDasharray="8 7"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <text fill="#10201a" fontSize="12" fontWeight="800" x="34" y="32">
          phase = {formatNumber(state.phaseDegrees, 0)} deg
        </text>
        <text fill="#10201a" fontSize="12" fontWeight="800" x="34" y="156">
          resultant amplitude = {formatNumber(model.envelopeAmplitudeMetres)} m
        </text>
      </svg>
      <LineChart
        data={chartData}
        x={{ domain: { min: 0, max: Math.max(1, state.wavelengthMetres * 2) } }}
        y={{ domain: { min: -yLimit, max: yLimit } }}
      />
    </div>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<WavesState>();
  const current = currentState(state);
  const model = useMemo(() => wavesModel(current), [current]);

  return (
    <section aria-label="Wave controls" className="vector-lab vector-lab--product">
      <div className="vector-controls vector-controls--product" aria-label="Wave superposition controls">
        <p className="lab-kicker">Tune the meeting waves</p>
        <ControlGroup legend="Wave controls">
          <Slider
            label="Amplitude"
            max={3}
            min={0.2}
            onChange={(value) => set("amplitudeMetres", metres(value))}
            step={0.1}
            unit="m"
            value={current.amplitudeMetres}
          />
          <Slider
            label="Wavelength"
            max={8}
            min={1}
            onChange={(value) => set("wavelengthMetres", metres(value))}
            step={0.25}
            unit="m"
            value={current.wavelengthMetres}
          />
          <Slider
            label="Period"
            max={6}
            min={0.5}
            onChange={(value) => set("periodSeconds", seconds(value))}
            step={0.25}
            unit="s"
            value={current.periodSeconds}
          />
          <Slider
            label="Phase difference"
            max={180}
            min={0}
            onChange={(value) => set("phaseDegrees", degrees(value))}
            step={15}
            unit="deg"
            value={current.phaseDegrees}
          />
        </ControlGroup>
        <div className="preset-strip" aria-label="Scenario presets">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                set("amplitudeMetres", preset.state.amplitudeMetres);
                set("wavelengthMetres", preset.state.wavelengthMetres);
                set("periodSeconds", preset.state.periodSeconds);
                set("phaseDegrees", preset.state.phaseDegrees);
                set("samplePositionMetres", preset.state.samplePositionMetres);
                set("timeSeconds", preset.state.timeSeconds);
              }}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => stage.advance()}>
          Reveal wave behaviour
        </button>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Before reveal cue">
        <p className="lab-kicker">Before reveal</p>
        <h3>Phase decides the pattern</h3>
        <p>
          Superposition adds displacement, not wavelength or frequency. Move the phase slider
          and predict whether the waves reinforce, cancel, or partially combine.
        </p>
        {model.ok ? (
          <p>
            Your current settings predict {model.value.interference} interference. Commit your
            prediction before the resultant trace is shown.
          </p>
        ) : (
          <p role="alert">The current wave settings need finite positive values.</p>
        )}
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const state = currentState(useSimState<Partial<WavesState>>());
  const model = wavesModel(state);

  if (!model.ok) {
    return <p role="alert">The current wave settings are outside the supported range.</p>;
  }

  return (
    <section aria-label="Observation unlocked" className="vector-lab vector-lab--product">
      <div className="vector-stage vector-stage--product">
        <WaveSuperpositionDiagram model={model.value} state={state} />
        <dl aria-label="Wave readout" className="result-readout result-readout--cards">
          <div>
            <dt>Frequency</dt>
            <dd>{formatNumber(model.value.frequencyHertz)} Hz</dd>
          </div>
          <div>
            <dt>Phase difference</dt>
            <dd>{formatNumber(model.value.phaseRadians)} rad</dd>
          </div>
          <div>
            <dt>Resultant at marker</dt>
            <dd>{formatSigned(model.value.resultantAtSampleMetres)} m</dd>
          </div>
        </dl>
      </div>
      <section className="formula-panel formula-panel--product" aria-label="Formula used">
        <p className="lab-kicker">Formula used</p>
        <h3>Displacements add at the same point</h3>
        <pre className="formula-code" aria-label="LaTeX formula source">
          <code>{String.raw`\begin{aligned}
y_1 &= A\sin\!\left(2\pi\left(\frac{x}{\lambda}-\frac{t}{T}\right)\right)\\
y_2 &= A\sin\!\left(2\pi\left(\frac{x}{\lambda}-\frac{t}{T}\right)+\phi\right)\\
y_{\text{resultant}} &= y_1 + y_2\\
f &= \frac{1}{T}
\end{aligned}`}</code>
        </pre>
        <dl className="formula-legend" aria-label="Formula legend">
          <div>
            <dt><span className="legend-swatch legend-swatch--blue" /> A</dt>
            <dd>amplitude, {formatNumber(state.amplitudeMetres)} m</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--orange" /> lambda</dt>
            <dd>wavelength, {formatNumber(state.wavelengthMetres)} m</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--green" /> phi</dt>
            <dd>phase difference, {formatNumber(model.value.phaseRadians)} rad</dd>
          </div>
        </dl>
        <p>
          Substitution at x = {formatNumber(state.samplePositionMetres)} m and t ={" "}
          {formatNumber(state.timeSeconds)} s gives y1 ={" "}
          {formatSigned(model.value.waveAAtSampleMetres)} m and y2 ={" "}
          {formatSigned(model.value.waveBAtSampleMetres)} m.
        </p>
        <p>
          Result: y_resultant = {formatSigned(model.value.waveAAtSampleMetres)} m +{" "}
          {formatSigned(model.value.waveBAtSampleMetres)} m ={" "}
          {formatSigned(model.value.resultantAtSampleMetres)} m.
        </p>
        <p>
          Frequency uses f = 1 / {formatNumber(state.periodSeconds)} s ={" "}
          {formatNumber(model.value.frequencyHertz)} Hz.
        </p>
        <p className="formula-note">
          This applies because linear waves superpose by adding displacement at the same place
          and time; the waves keep their wavelength and frequency while the resultant changes.
        </p>
        <button type="button" onClick={() => stage.advance()}>
          Explain the interference
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
      <h3>Noise-cancelling headphones</h3>
      <p>
        A headphone speaker sends a sound wave with nearly the same amplitude but opposite phase
        to the incoming noise. Decide which slider setting models that cancellation and why the
        sound frequency does not disappear.
      </p>
      <p className="formula-note">Use y_resultant = y1 + y2 to justify the comparison.</p>
      <button type="button" onClick={() => stage.reset()}>
        Try another wave meeting
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
      <h3>What happens when two waves meet?</h3>
      <p>
        Commit a prediction before the resultant trace appears. The reveal will connect amplitude,
        wavelength, period, phase, frequency, and displacement addition.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up wave behaviour
      </button>
    </section>
  );
};

export const WavesSim = () => (
  <SimRuntime spec={wavesSpec} packageId={wavesPackageId}>
    <StageSurface />
  </SimRuntime>
);

export default WavesSim;
