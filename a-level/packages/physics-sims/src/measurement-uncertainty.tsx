import { useMemo, useState } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";
import { err, metres, ok, seconds, type KernelResult, type Metres, type Seconds } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const physicalQuantitiesPackageId = "physical-quantities-and-units";
export const measurementUncertaintySimId = "measurement-uncertainty-lab";

export const measurementPredict: TPredictSpec = {
  prompt:
    "A cart travels 2.00 m in 0.80 s. Before opening the lab notebook, which speed record is complete enough for physics?",
  commit_format: {
    kind: "multiple-choice",
    options: ["2.5", "2.5 m", "2.50 m s^-1 ± 0.09 m s^-1", "2.50 m s^-2"],
    correct_index: 2,
  },
  rationale_required: true,
};

export interface MeasurementState {
  readonly distanceMetres: Metres;
  readonly distanceUncertaintyMetres: Metres;
  readonly timeSeconds: Seconds;
  readonly timeUncertaintySeconds: Seconds;
}

export interface MeasurementModel {
  readonly speedMetresPerSecond: number;
  readonly speedUncertaintyMetresPerSecond: number;
  readonly distanceRelativeUncertainty: number;
  readonly timeRelativeUncertainty: number;
  readonly combinedRelativeUncertainty: number;
  readonly validEquationUnit: "m s^-1";
  readonly invalidEquationUnit: "m + s";
}

const roundTo = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const positiveFinite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value) && value > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite and positive; got ${value}`);

export const measurementModel = (state: MeasurementState): KernelResult<MeasurementModel> => {
  const validDistance = positiveFinite(state.distanceMetres, "distanceMetres");
  if (!validDistance.ok) return validDistance;
  const validTime = positiveFinite(state.timeSeconds, "timeSeconds");
  if (!validTime.ok) return validTime;

  const distance = state.distanceMetres;
  const time = state.timeSeconds;
  const distanceUncertainty = Math.max(0, state.distanceUncertaintyMetres);
  const timeUncertainty = Math.max(0, state.timeUncertaintySeconds);
  const speed = distance / time;
  const distanceRelative = distanceUncertainty / distance;
  const timeRelative = timeUncertainty / time;
  const combinedRelative = distanceRelative + timeRelative;

  return ok({
    speedMetresPerSecond: speed,
    speedUncertaintyMetresPerSecond: speed * combinedRelative,
    distanceRelativeUncertainty: distanceRelative,
    timeRelativeUncertainty: timeRelative,
    combinedRelativeUncertainty: combinedRelative,
    validEquationUnit: "m s^-1",
    invalidEquationUnit: "m + s",
  });
};

const formatNumber = (value: number, places = 2): string => roundTo(value, places).toFixed(places);
const formatPercent = (value: number): string => `${formatNumber(value * 100, 1)}%`;

export const MeasurementNotebook = ({ state }: { readonly state: MeasurementState }) => {
  const modelResult = measurementModel(state);
  if (!modelResult.ok) {
    return <p role="alert">The current measurement settings are outside the supported range.</p>;
  }

  const model = modelResult.value;
  const barWidth = Math.min(100, model.combinedRelativeUncertainty * 600);

  return (
    <section aria-label="Measurement notebook" className="measurement-notebook">
      <div className="notebook-hero">
        <p className="eyebrow">Observed record</p>
        <h2>
          v = {formatNumber(model.speedMetresPerSecond)} ±{" "}
          {formatNumber(model.speedUncertaintyMetresPerSecond)} m s^-1
        </h2>
        <p>
          The answer is a derived scalar quantity: a numerical value, a unit, and an
          uncertainty travel together.
        </p>
      </div>

      <div className="quantity-cards" aria-label="Quantity classification">
        <article>
          <h3>Distance</h3>
          <p>{formatNumber(state.distanceMetres)} ± {formatNumber(state.distanceUncertaintyMetres)} m</p>
          <small>base quantity: length · scalar · SI base unit m</small>
        </article>
        <article>
          <h3>Time</h3>
          <p>{formatNumber(state.timeSeconds)} ± {formatNumber(state.timeUncertaintySeconds)} s</p>
          <small>base quantity: time · scalar · SI base unit s</small>
        </article>
        <article>
          <h3>Speed</h3>
          <p>{formatNumber(model.speedMetresPerSecond)} m s^-1</p>
          <small>derived quantity · scalar · dimension L T^-1</small>
        </article>
      </div>

      <section aria-label="Formula and unit reasoning" className="formula-panel">
        <h3>Formula and unit reasoning</h3>
        <p className="formula">
          speed = distance ÷ time = {formatNumber(state.distanceMetres)} m ÷{" "}
          {formatNumber(state.timeSeconds)} s = {formatNumber(model.speedMetresPerSecond)} m s^-1
        </p>
        <p>
          Unit check: m ÷ s becomes <strong>{model.validEquationUnit}</strong>, so the
          equation is dimensionally consistent for speed.
        </p>
        <p>
          Impossible operation caught: distance + time would produce {model.invalidEquationUnit},
          not a physical speed unit.
        </p>
        <p>
          A unit check can reject an impossible equation. Passing the unit check only
          means the equation is possible; the physics still has to match the situation.
        </p>
      </section>

      <section aria-label="Uncertainty reasoning" className="uncertainty-panel">
        <h3>Uncertainty reasoning</h3>
        <p>
          For a division, percentage uncertainties add: {formatPercent(model.distanceRelativeUncertainty)} +{" "}
          {formatPercent(model.timeRelativeUncertainty)} = {formatPercent(model.combinedRelativeUncertainty)}.
        </p>
        <p>
          If repeated readings and instrument resolution are both available, use the
          larger uncertainty source before converting it into a percentage.
        </p>
        <div className="uncertainty-meter" aria-label="Combined percentage uncertainty">
          <span style={{ width: `${barWidth}%` }} />
        </div>
        <p>
          Absolute uncertainty in speed = {formatNumber(model.speedMetresPerSecond)} ×{" "}
          {formatPercent(model.combinedRelativeUncertainty)} ={" "}
          {formatNumber(model.speedUncertaintyMetresPerSecond)} m s^-1.
        </p>
      </section>
    </section>
  );
};

export const MeasurementUncertaintyLab = () => {
  const [state, setState] = useState<MeasurementState>({
    distanceMetres: metres(2),
    distanceUncertaintyMetres: metres(0.02),
    timeSeconds: seconds(0.8),
    timeUncertaintySeconds: seconds(0.02),
  });

  const model = useMemo(() => measurementModel(state), [state]);
  const set = (key: keyof MeasurementState) => (value: number) => {
    setState((current) => ({
      ...current,
      [key]: key.includes("Metres") ? metres(value) : seconds(value),
    }));
  };

  return (
    <PredictionGate
      packageId={physicalQuantitiesPackageId}
      predict={measurementPredict}
      simId={measurementUncertaintySimId}
    >
      <section aria-label="Measurement and uncertainty lab" className="measurement-lab">
        <header className="lab-header">
          <p className="eyebrow">Measurement and uncertainty lab</p>
          <h1>Build a complete speed record</h1>
          <p>
            Tune the raw measurements, then inspect how value, unit, quantity type, and
            uncertainty constrain the final statement.
          </p>
        </header>

        <div className="lab-grid">
          <ControlGroup legend="Raw measurements">
            <Slider
              label="Distance travelled"
              max={5}
              min={0.5}
              onChange={set("distanceMetres")}
              step={0.05}
              unit="m"
              value={state.distanceMetres}
            />
            <Slider
              label="Distance uncertainty"
              max={0.1}
              min={0.005}
              onChange={set("distanceUncertaintyMetres")}
              step={0.005}
              unit="m"
              value={state.distanceUncertaintyMetres}
            />
            <Slider
              label="Time measured"
              max={3}
              min={0.2}
              onChange={set("timeSeconds")}
              step={0.05}
              unit="s"
              value={state.timeSeconds}
            />
            <Slider
              label="Time uncertainty"
              max={0.2}
              min={0.005}
              onChange={set("timeUncertaintySeconds")}
              step={0.005}
              unit="s"
              value={state.timeUncertaintySeconds}
            />
          </ControlGroup>

          <aside aria-label="Live measurement preview" className="measurement-preview">
            <h2>Before the reveal: what changes?</h2>
            <p>
              Larger uncertainty makes the final speed less precise. Changing distance or time
              changes the numerical value, but not the unit logic: speed remains m s^-1.
            </p>
            <strong>
              {model.ok ? formatNumber(model.value.speedMetresPerSecond) : "outside range"} m s^-1
            </strong>
            <small>calculated from the current raw measurements</small>
          </aside>
        </div>

        <div aria-label="Observation unlocked">
          <MeasurementNotebook state={state} />
        </div>
      </section>
    </PredictionGate>
  );
};

export default MeasurementUncertaintyLab;
