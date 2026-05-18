import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const physicalQuantitiesPackageId = "physical-quantities-and-units";
export const measurementUncertaintySimId = "measurement-uncertainty-lab";

export const uncertaintyPredict: TPredictSpec = {
  prompt:
    "Two students measure the same card as 12.4 cm and 12.8 cm using a ruler with 0.1 cm divisions. Before the lab reveals the calculation, which source should set the uncertainty for the reported length?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "The reading spread between students",
      "The unit name written after the number",
      "Whether length is a scalar or vector",
      "The number of letters in centimetre",
    ],
    correct_index: 0,
  },
  rationale_required: true,
};

export interface MeasurementState {
  readonly firstReadingCm: number;
  readonly secondReadingCm: number;
  readonly rulerDivisionCm: number;
  readonly timeS: number;
}

export interface MeasurementModel {
  readonly meanLengthCm: number;
  readonly repeatUncertaintyCm: number;
  readonly instrumentUncertaintyCm: number;
  readonly absoluteUncertaintyCm: number;
  readonly percentageLengthUncertainty: number;
  readonly speedCmPerS: number;
  readonly speedMPerS: number;
  readonly percentageTimeUncertainty: number;
  readonly percentageSpeedUncertainty: number;
  readonly speedAbsoluteUncertaintyCmPerS: number;
}

const stopwatchUncertaintyS = 0.01;
const round = (value: number, places: number): number => {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
};
const formatFixed = (value: number, places: number): string => round(value, places).toFixed(places);

export const calculateMeasurementModel = (state: MeasurementState): MeasurementModel => {
  const meanLengthCm = (state.firstReadingCm + state.secondReadingCm) / 2;
  const repeatUncertaintyCm = Math.abs(state.secondReadingCm - state.firstReadingCm) / 2;
  const instrumentUncertaintyCm = state.rulerDivisionCm / 2;
  const absoluteUncertaintyCm = Math.max(repeatUncertaintyCm, instrumentUncertaintyCm);
  const percentageLengthUncertainty = (absoluteUncertaintyCm / meanLengthCm) * 100;
  const speedCmPerS = meanLengthCm / state.timeS;
  const speedMPerS = speedCmPerS / 100;
  const percentageTimeUncertainty = (stopwatchUncertaintyS / state.timeS) * 100;
  const percentageSpeedUncertainty = percentageLengthUncertainty + percentageTimeUncertainty;
  const speedAbsoluteUncertaintyCmPerS = speedCmPerS * (percentageSpeedUncertainty / 100);

  return {
    meanLengthCm,
    repeatUncertaintyCm,
    instrumentUncertaintyCm,
    absoluteUncertaintyCm,
    percentageLengthUncertainty,
    speedCmPerS,
    speedMPerS,
    percentageTimeUncertainty,
    percentageSpeedUncertainty,
    speedAbsoluteUncertaintyCmPerS,
  };
};

const presets = [
  {
    id: "card",
    label: "Card length",
    state: { firstReadingCm: 12.4, secondReadingCm: 12.8, rulerDivisionCm: 0.1, timeS: 2.5 },
  },
  {
    id: "track",
    label: "Toy car track",
    state: { firstReadingCm: 48.6, secondReadingCm: 49.0, rulerDivisionCm: 0.2, timeS: 3.8 },
  },
  {
    id: "pendulum",
    label: "Pendulum bob path",
    state: { firstReadingCm: 31.8, secondReadingCm: 32.4, rulerDivisionCm: 0.1, timeS: 1.7 },
  },
] as const;

const dimensionRows = [
  {
    equation: "speed = length ÷ time",
    reasoning: "cm ÷ s = cm s⁻¹, so the quantity is derived from base length and time.",
    valid: true,
  },
  {
    equation: "speed = length × time",
    reasoning: "cm × s gives cm s, not cm s⁻¹, so units reject the equation.",
    valid: false,
  },
  {
    equation: "two lengths can be averaged",
    reasoning: "Both readings are the same physical quantity in the same unit.",
    valid: true,
  },
] as const;

const MeasurementTape = ({ state, model }: { readonly state: MeasurementState; readonly model: MeasurementModel }) => {
  const scaleStart = 18;
  const scaleEnd = 282;
  const minReading = 10;
  const maxReading = 52;
  const position = (reading: number): number =>
    scaleStart + ((reading - minReading) / (maxReading - minReading)) * (scaleEnd - scaleStart);
  const firstX = position(state.firstReadingCm);
  const secondX = position(state.secondReadingCm);
  const meanX = position(model.meanLengthCm);

  return (
    <svg aria-label="Measurement ruler with two readings and mean" role="img" viewBox="0 0 320 150">
      <defs>
        <linearGradient id="measurement-ruler" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
      </defs>
      <rect fill="#f8fafc" height="150" width="320" />
      <rect fill="url(#measurement-ruler)" height="42" rx="12" width="264" x="18" y="58" />
      {Array.from({ length: 15 }, (_, index) => {
        const x = scaleStart + index * ((scaleEnd - scaleStart) / 14);
        const isMajor = index % 2 === 0;
        return (
          <line
            key={index}
            stroke="#334155"
            strokeWidth={isMajor ? 2 : 1}
            x1={x}
            x2={x}
            y1={isMajor ? 58 : 68}
            y2="100"
          />
        );
      })}
      <line stroke="#256b8f" strokeLinecap="round" strokeWidth="4" x1={firstX} x2={firstX} y1="32" y2="112" />
      <line stroke="#7657d8" strokeLinecap="round" strokeWidth="4" x1={secondX} x2={secondX} y1="38" y2="118" />
      <line stroke="#b42318" strokeLinecap="round" strokeWidth="5" x1={meanX} x2={meanX} y1="22" y2="128" />
      <text fill="#1f5f8b" fontSize="12" fontWeight="700" x={firstX - 28} y="24">
        reading 1
      </text>
      <text fill="#7657d8" fontSize="12" fontWeight="700" x={secondX - 28} y="136">
        reading 2
      </text>
      <text fill="#b42318" fontSize="12" fontWeight="900" x={meanX - 18} y="18">
        mean
      </text>
    </svg>
  );
};

export const MeasurementUncertaintyLab = () => {
  const [state, setState] = useState<MeasurementState>(presets[0].state);
  const model = useMemo(() => calculateMeasurementModel(state), [state]);

  const setNumber = (key: keyof MeasurementState) => (value: number) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  return (
    <PredictionGate
      packageId={physicalQuantitiesPackageId}
      predict={uncertaintyPredict}
      simId={measurementUncertaintySimId}
    >
      <section aria-label="Measurement and uncertainty lab" className="measurement-lab">
        <div className="measurement-controls" aria-label="Measurement controls">
          <div>
            <p className="lab-kicker">Measure first</p>
            <h3>Choose readings</h3>
            <p>
              Change the repeated measurements and see how the value, unit, uncertainty, and derived
              speed stay tied together.
            </p>
          </div>

          <div className="preset-strip" aria-label="Measurement presets">
            {presets.map((preset) => (
              <button key={preset.id} onClick={() => setState(preset.state)} type="button">
                {preset.label}
              </button>
            ))}
          </div>

          <ControlGroup legend="Length readings">
            <Slider
              label="Reading 1"
              max={52}
              min={10}
              onChange={setNumber("firstReadingCm")}
              step={0.1}
              unit="cm"
              value={state.firstReadingCm}
            />
            <Slider
              label="Reading 2"
              max={52}
              min={10}
              onChange={setNumber("secondReadingCm")}
              step={0.1}
              unit="cm"
              value={state.secondReadingCm}
            />
            <Slider
              label="Smallest ruler division"
              max={0.5}
              min={0.1}
              onChange={setNumber("rulerDivisionCm")}
              step={0.1}
              unit="cm"
              value={state.rulerDivisionCm}
            />
            <Slider
              label="Travel time"
              max={8}
              min={1}
              onChange={setNumber("timeS")}
              step={0.1}
              unit="s"
              value={state.timeS}
            />
          </ControlGroup>
        </div>

        <div className="measurement-stage">
          <MeasurementTape model={model} state={state} />
          <dl aria-label="Observation unlocked" className="result-readout result-readout--cards">
            <div>
              <dt>Quantity and unit</dt>
              <dd>length / cm</dd>
            </div>
            <div>
              <dt>Best estimate</dt>
              <dd>{formatFixed(model.meanLengthCm, 2)} cm</dd>
            </div>
            <div>
              <dt>Absolute uncertainty</dt>
              <dd>±{formatFixed(model.absoluteUncertaintyCm, 2)} cm</dd>
            </div>
          </dl>

          <section className="quantity-map" aria-label="Quantity classification">
            <article>
              <span>Base quantity</span>
              <strong>length</strong>
              <p>Measured directly here; scalar, because direction is not part of this reading.</p>
            </article>
            <article>
              <span>Derived quantity</span>
              <strong>speed</strong>
              <p>Length divided by time, with unit cm s⁻¹ or m s⁻¹.</p>
            </article>
            <article>
              <span>Unit is not the quantity</span>
              <strong>cm is a unit</strong>
              <p>The physical quantity is length; centimetre is the comparison standard.</p>
            </article>
          </section>
        </div>

        <section className="formula-panel formula-panel--product" aria-label="Formula and unit reasoning">
          <div>
            <p className="lab-kicker">Visible reasoning</p>
            <h3>Uncertainty and dimensional check</h3>
          </div>
          <p className="formula">
            L = ({formatFixed(state.firstReadingCm, 1)} + {formatFixed(state.secondReadingCm, 1)}) ÷ 2 = {formatFixed(model.meanLengthCm, 2)} cm
          </p>
          <p>
            repeat uncertainty = half range = ±{formatFixed(model.repeatUncertaintyCm, 2)} cm;
            instrument uncertainty = half smallest division = ±{formatFixed(model.instrumentUncertaintyCm, 2)} cm.
            Use the larger limit: <strong>±{formatFixed(model.absoluteUncertaintyCm, 2)} cm</strong>.
          </p>
          <p>
            speed = length ÷ time = {formatFixed(model.meanLengthCm, 2)} cm ÷ {formatFixed(state.timeS, 1)} s = {formatFixed(model.speedCmPerS, 2)} cm s⁻¹ = {formatFixed(model.speedMPerS, 4)} m s⁻¹.
          </p>
          <p className="formula-note">
            Percentage uncertainty for speed adds the fractional uncertainties in length and time:
            {" "}{formatFixed(model.percentageLengthUncertainty, 2)}% + {formatFixed(model.percentageTimeUncertainty, 2)}% = {formatFixed(model.percentageSpeedUncertainty, 2)}%, so speed is ±{formatFixed(model.speedAbsoluteUncertaintyCmPerS, 2)} cm s⁻¹.
          </p>
          <div className="dimension-checks" aria-label="Dimensional consistency checks">
            {dimensionRows.map((row) => (
              <article data-valid={row.valid} key={row.equation}>
                <strong>{row.valid ? "Allowed" : "Rejected"}</strong>
                <span>{row.equation}</span>
                <p>{row.reasoning}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </PredictionGate>
  );
};

export default MeasurementUncertaintyLab;
