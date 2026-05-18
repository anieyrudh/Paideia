import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { TPredictSpec } from "@paideia/content-schema";
import { PredictionGate } from "@paideia/prediction-gate";
import { metres, seconds, type Metres, type Seconds } from "@paideia/shared";

export const measurementUncertaintyPackageId = "physical-quantities-and-units";
export const measurementUncertaintySimId = "measurement-uncertainty-lab";

export const measurementUncertaintyPredict: TPredictSpec = {
  prompt:
    "A trolley travels 0.80 m in 2.0 s. Before seeing the lab's working, which unit must its average speed have?",
  commit_format: {
    kind: "multiple-choice",
    options: ["metre (m)", "second (s)", "m s^-1", "m s^-2"],
    correct_index: 2,
  },
  rationale_required: true,
};

export interface MeasurementState {
  readonly distanceCentimetres: number;
  readonly distanceUncertaintyMillimetres: number;
  readonly timeSeconds: number;
  readonly timeUncertaintySeconds: number;
}

export interface MeasurementModel {
  readonly distanceMetres: Metres;
  readonly distanceUncertaintyMetres: Metres;
  readonly timeSeconds: Seconds;
  readonly timeUncertaintySeconds: Seconds;
  readonly speedMetresPerSecond: number;
  readonly speedUncertaintyMetresPerSecond: number;
  readonly speedRelativeUncertaintyPercent: number;
  readonly distanceRelativeUncertaintyPercent: number;
  readonly timeRelativeUncertaintyPercent: number;
  readonly equationChecks: readonly EquationCheck[];
}

export interface EquationCheck {
  readonly equation: string;
  readonly leftDimension: string;
  readonly rightDimension: string;
  readonly valid: boolean;
  readonly reason: string;
}

export const defaultMeasurementState: MeasurementState = {
  distanceCentimetres: 80,
  distanceUncertaintyMillimetres: 5,
  timeSeconds: 2,
  timeUncertaintySeconds: 0.1,
};

const round = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const percent = (part: number, whole: number): number => (part / whole) * 100;

export const measurementModel = (state: MeasurementState): MeasurementModel => {
  const distanceMetres = metres(state.distanceCentimetres / 100);
  const distanceUncertaintyMetres = metres(state.distanceUncertaintyMillimetres / 1000);
  const measuredSeconds = seconds(state.timeSeconds);
  const timeUncertainty = seconds(state.timeUncertaintySeconds);
  const speed = distanceMetres / measuredSeconds;
  const distanceRelative = percent(distanceUncertaintyMetres, distanceMetres);
  const timeRelative = percent(timeUncertainty, measuredSeconds);
  const speedRelative = distanceRelative + timeRelative;
  const speedUncertainty = speed * (speedRelative / 100);

  return {
    distanceMetres,
    distanceUncertaintyMetres,
    timeSeconds: measuredSeconds,
    timeUncertaintySeconds: timeUncertainty,
    speedMetresPerSecond: speed,
    speedUncertaintyMetresPerSecond: speedUncertainty,
    speedRelativeUncertaintyPercent: speedRelative,
    distanceRelativeUncertaintyPercent: distanceRelative,
    timeRelativeUncertaintyPercent: timeRelative,
    equationChecks: [
      {
        equation: "average speed = distance / time",
        leftDimension: "L T^-1",
        rightDimension: "L / T = L T^-1",
        valid: true,
        reason: "Dividing a length by a time produces a derived quantity: speed.",
      },
      {
        equation: "distance + time",
        leftDimension: "L + T",
        rightDimension: "not defined",
        valid: false,
        reason: "A length and a time are different base dimensions, so they cannot be added.",
      },
      {
        equation: "uncertainty in speed uses fractional uncertainty in distance plus fractional uncertainty in time",
        leftDimension: "percentage",
        rightDimension: "percentage + percentage",
        valid: true,
        reason: "For multiplication or division, fractional uncertainties combine as dimensionless ratios.",
      },
    ],
  };
};

const formatNumber = (value: number, places: number): string => round(value, places).toFixed(places);

const panelStyle: CSSProperties = {
  background: "rgba(255, 255, 255, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.35)",
  borderRadius: "18px",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.10)",
  padding: "1rem",
};

const pillStyle: CSSProperties = {
  alignItems: "center",
  borderRadius: "999px",
  display: "inline-flex",
  fontSize: "0.78rem",
  fontWeight: 800,
  gap: "0.35rem",
  letterSpacing: "0.02em",
  padding: "0.35rem 0.65rem",
  textTransform: "uppercase",
};

const sliderId = (id: string): string => `measurement-${id}`;

interface SliderRowProps {
  readonly id: string;
  readonly label: string;
  readonly max: number;
  readonly min: number;
  readonly onChange: (value: number) => void;
  readonly step: number;
  readonly unit: string;
  readonly value: number;
}

const SliderRow = ({ id, label, max, min, onChange, step, unit, value }: SliderRowProps) => (
  <label
    htmlFor={sliderId(id)}
    style={{ display: "grid", gap: "0.45rem", fontWeight: 750, color: "#10201a" }}
  >
    <span style={{ alignItems: "center", display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <span>{label}</span>
      <strong style={{ color: "#0f766e" }}>
        {value.toFixed(step < 1 ? 1 : 0)} {unit}
      </strong>
    </span>
    <input
      id={sliderId(id)}
      max={max}
      min={min}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
      step={step}
      style={{ accentColor: "#0f766e", width: "100%" }}
      type="range"
      value={value}
    />
  </label>
);

export const MeasurementTrack = ({ state }: { readonly state: MeasurementState }) => {
  const distance = Math.max(12, Math.min(238, (state.distanceCentimetres / 160) * 238));
  const band = Math.max(4, state.distanceUncertaintyMillimetres * 1.5);

  return (
    <svg aria-label="Trolley measurement bench" role="img" viewBox="0 0 320 160">
      <defs>
        <linearGradient id="measurement-track-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#eefdf8" />
          <stop offset="100%" stopColor="#eef2ff" />
        </linearGradient>
      </defs>
      <rect fill="url(#measurement-track-bg)" height="160" rx="22" width="320" />
      <line stroke="#0f172a" strokeLinecap="round" strokeWidth="5" x1="42" x2="280" y1="104" y2="104" />
      <line stroke="#475569" strokeWidth="3" x1="42" x2="42" y1="82" y2="126" />
      <line stroke="#475569" strokeWidth="3" x1={42 + distance} x2={42 + distance} y1="82" y2="126" />
      <rect fill="#99f6e4" opacity="0.8" x={42 + distance - band / 2} y="78" width={band} height="52" />
      <rect fill="#f97316" height="22" rx="7" width="42" x={22 + distance} y="75" />
      <circle cx={32 + distance} cy="101" fill="#1e293b" r="5" />
      <circle cx={54 + distance} cy="101" fill="#1e293b" r="5" />
      <text fill="#0f172a" fontSize="12" fontWeight="800" x="42" y="58">
        start
      </text>
      <text fill="#0f172a" fontSize="12" fontWeight="800" textAnchor="middle" x={42 + distance} y="58">
        measured stop
      </text>
      <text fill="#0f766e" fontSize="13" fontWeight="900" textAnchor="middle" x={42 + distance / 2} y="137">
        {state.distanceCentimetres.toFixed(0)} cm ± {state.distanceUncertaintyMillimetres.toFixed(0)} mm
      </text>
    </svg>
  );
};

const EquationCard = ({ check }: { readonly check: EquationCheck }) => (
  <li
    style={{
      ...panelStyle,
      display: "grid",
      gap: "0.5rem",
      padding: "0.85rem",
    }}
  >
    <span
      style={{
        ...pillStyle,
        background: check.valid ? "#dcfce7" : "#fee2e2",
        color: check.valid ? "#166534" : "#991b1b",
        width: "fit-content",
      }}
    >
      {check.valid ? "consistent" : "blocked"}
    </span>
    <strong style={{ color: "#0f172a" }}>{check.equation}</strong>
    <span style={{ color: "#334155" }}>
      {check.leftDimension} → {check.rightDimension}
    </span>
    <span style={{ color: "#475569" }}>{check.reason}</span>
  </li>
);

export const MeasurementUncertaintySim = () => {
  const [state, setState] = useState<MeasurementState>(defaultMeasurementState);
  const model = useMemo(() => measurementModel(state), [state]);

  const update = (key: keyof MeasurementState) => (value: number) => {
    if (!Number.isFinite(value)) return;
    setState((current) => ({ ...current, [key]: value }));
  };

  return (
    <PredictionGate
      packageId={measurementUncertaintyPackageId}
      predict={measurementUncertaintyPredict}
      simId={measurementUncertaintySimId}
    >
      <section
        aria-label="Measurement and uncertainty lab"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #164e63 42%, #0f766e 100%)",
          borderRadius: "28px",
          color: "#10201a",
          display: "grid",
          gap: "1rem",
          padding: "1rem",
        }}
      >
        <header style={{ color: "white", display: "grid", gap: "0.45rem" }}>
          <span style={{ ...pillStyle, background: "rgba(255,255,255,0.16)", color: "#ccfbf1", width: "fit-content" }}>
            measurement bench
          </span>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.3rem)", lineHeight: 1.05, margin: 0 }}>
            Turn raw readings into a quantity that physics can trust.
          </h2>
          <p style={{ color: "#dffaf3", margin: 0, maxWidth: "68ch" }}>
            Adjust a trolley run, then watch the value, unit, dimension and uncertainty travel together.
          </p>
        </header>

        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
          <div style={panelStyle}>
            <MeasurementTrack state={state} />
            <div aria-label="Measurement controls" style={{ display: "grid", gap: "0.9rem", marginTop: "1rem" }}>
              <SliderRow
                id="distance"
                label="Measured distance"
                max={160}
                min={40}
                onChange={update("distanceCentimetres")}
                step={5}
                unit="cm"
                value={state.distanceCentimetres}
              />
              <SliderRow
                id="distance-uncertainty"
                label="Distance uncertainty"
                max={20}
                min={1}
                onChange={update("distanceUncertaintyMillimetres")}
                step={1}
                unit="mm"
                value={state.distanceUncertaintyMillimetres}
              />
              <SliderRow
                id="time"
                label="Measured time"
                max={6}
                min={1}
                onChange={update("timeSeconds")}
                step={0.1}
                unit="s"
                value={state.timeSeconds}
              />
              <SliderRow
                id="time-uncertainty"
                label="Time uncertainty"
                max={0.5}
                min={0.05}
                onChange={update("timeUncertaintySeconds")}
                step={0.05}
                unit="s"
                value={state.timeUncertaintySeconds}
              />
            </div>
          </div>

          <div aria-label="Observation unlocked" style={{ ...panelStyle, display: "grid", gap: "0.9rem" }}>
            <div>
              <span style={{ ...pillStyle, background: "#e0f2fe", color: "#075985" }}>derived scalar</span>
              <h3 style={{ fontSize: "1.45rem", margin: "0.45rem 0 0" }}>Average speed</h3>
            </div>
            <dl style={{ display: "grid", gap: "0.65rem", margin: 0 }}>
              <div>
                <dt style={{ color: "#64748b", fontWeight: 800 }}>quantity</dt>
                <dd style={{ margin: 0 }}>average speed, a derived scalar quantity</dd>
              </div>
              <div>
                <dt style={{ color: "#64748b", fontWeight: 800 }}>unit reasoning</dt>
                <dd style={{ margin: 0 }}>
                  m / s = <strong>m s^-1</strong>, so the unit is constrained by the equation.
                </dd>
              </div>
              <div>
                <dt style={{ color: "#64748b", fontWeight: 800 }}>converted readings</dt>
                <dd style={{ margin: 0 }}>
                  distance = {formatNumber(model.distanceMetres, 2)} m ± {formatNumber(model.distanceUncertaintyMetres, 3)} m; time ={" "}
                  {formatNumber(model.timeSeconds, 2)} s ± {formatNumber(model.timeUncertaintySeconds, 2)} s
                </dd>
              </div>
              <div>
                <dt style={{ color: "#64748b", fontWeight: 800 }}>calculated result</dt>
                <dd style={{ fontSize: "1.35rem", fontWeight: 900, margin: 0 }}>
                  v = {formatNumber(model.speedMetresPerSecond, 2)} ± {formatNumber(model.speedUncertaintyMetresPerSecond, 2)} m s^-1
                </dd>
              </div>
            </dl>

            <div aria-label="Formula used" style={{ background: "#f8fafc", borderRadius: "14px", padding: "0.85rem" }}>
              <strong>Formula used</strong>
              <p style={{ margin: "0.4rem 0 0" }}>
                v = d / t = {formatNumber(model.distanceMetres, 2)} m / {formatNumber(model.timeSeconds, 2)} s ={" "}
                {formatNumber(model.speedMetresPerSecond, 2)} m s^-1
              </p>
              <p style={{ margin: "0.4rem 0 0" }}>
                fractional uncertainty = {formatNumber(model.distanceRelativeUncertaintyPercent, 1)}% +{" "}
                {formatNumber(model.timeRelativeUncertaintyPercent, 1)}% ={" "}
                {formatNumber(model.speedRelativeUncertaintyPercent, 1)}%
              </p>
            </div>
          </div>
        </div>

        <section aria-label="Dimensional consistency checks" style={{ display: "grid", gap: "0.75rem" }}>
          <h3 style={{ color: "white", margin: 0 }}>Why units constrain equations</h3>
          <ul style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", listStyle: "none", margin: 0, padding: 0 }}>
            {model.equationChecks.map((check) => (
              <EquationCard check={check} key={check.equation} />
            ))}
          </ul>
        </section>
      </section>
    </PredictionGate>
  );
};

export default MeasurementUncertaintySim;
