import { useMemo, useState } from "react";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  conductionHeatRate,
  convectionHeatRate,
  emissivity,
  radiationHeatRate,
  squareMetres,
  wattsPerMetreKelvin,
  wattsPerSquareMetreKelvin,
} from "@paideia/heat-transfer";
import { type ConceptPackageId, metres, ok, type KernelResult } from "@paideia/shared";
import { celsius, kelvinFromCelsius } from "@paideia/thermodynamics";
import { PredictionGate } from "@paideia/prediction-gate";
import { ControlGroup, Slider } from "@paideia/ui-sim";

export const heatTransferModesPackageId =
  "sutd/10-023-designing-energy-systems/heat-transfer-modes" as ConceptPackageId;
export const heatTransferModesSimId = "heat-flow-comparison-lab";

export const heatTransferModesPredict: TSimulationSpec["predict"] = {
  prompt:
    "A hot panel loses heat to cooler surroundings. If the temperature difference doubles while geometry stays fixed, what happens to conduction and convection heat rates?",
  commit_format: {
    kind: "multiple-choice",
    options: [
      "They approximately double because both are proportional to Delta T.",
      "They stay unchanged because only material choice matters.",
      "They become zero because heat and temperature are the same quantity.",
      "They halve because the heat has farther to travel.",
    ],
    correct_index: 0,
  },
  rationale_required: true,
};

export const heatTransferModesSpec: TSimulationSpec = {
  id: heatTransferModesSimId,
  title: "Heat Flow Comparison Lab",
  interaction_type: "systems-flow-diagram",
  kernel_deps: [
    "core/content-schema",
    "core/heat-transfer",
    "core/prediction-gate",
    "core/shared",
    "core/thermodynamics",
    "core/ui-sim",
  ],
  predict: heatTransferModesPredict,
  manipulate: {
    controls: [
      {
        id: "hot-temperature",
        label: "Hot surface temperature",
        kind: "slider",
        kernel_binding: "state.hotTemperatureCelsius",
        bounds: { min: 30, max: 120, step: 1 },
      },
      {
        id: "cold-temperature",
        label: "Ambient temperature",
        kind: "slider",
        kernel_binding: "state.coldTemperatureCelsius",
        bounds: { min: 0, max: 35, step: 1 },
      },
      {
        id: "panel-thickness",
        label: "Wall thickness",
        kind: "slider",
        kernel_binding: "state.thicknessMetres",
        bounds: { min: 0.04, max: 0.4, step: 0.01 },
      },
      {
        id: "convection-coefficient",
        label: "Convection coefficient",
        kind: "slider",
        kernel_binding: "state.convectionCoefficientWattsPerSquareMetreKelvin",
        bounds: { min: 4, max: 35, step: 1 },
      },
      {
        id: "emissivity",
        label: "Surface emissivity",
        kind: "slider",
        kernel_binding: "state.emissivity",
        bounds: { min: 0.1, max: 0.95, step: 0.05 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: heatTransferModesSimId,
        module: "@paideia/sutd-sims/heat-transfer-modes",
        symbol: "HeatTransferModes",
        props_binding:
          "Compare conduction, convection, and radiation heat-flow rates with formula substitution and visual bars.",
      },
    ],
  },
  explain: {
    prompt:
      "Which mode is controlled by material thickness, which by fluid motion, and which by absolute temperature?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Heat and temperature are the same quantity.",
      "Radiation needs air or a contact path.",
      "Conduction depends only on area and not on thickness.",
    ],
  },
};

export interface HeatTransferModesState {
  readonly hotTemperatureCelsius: number;
  readonly coldTemperatureCelsius: number;
  readonly areaSquareMetres: number;
  readonly thicknessMetres: number;
  readonly conductivityWattsPerMetreKelvin: number;
  readonly convectionCoefficientWattsPerSquareMetreKelvin: number;
  readonly emissivity: number;
}

export interface HeatTransferModesModel {
  readonly hotTemperatureKelvins: number;
  readonly coldTemperatureKelvins: number;
  readonly deltaTemperatureKelvins: number;
  readonly conductionWatts: number;
  readonly convectionWatts: number;
  readonly radiationWatts: number;
  readonly maxHeatRateWatts: number;
  readonly dominantMode: "conduction" | "convection" | "radiation";
}

const defaultState: HeatTransferModesState = {
  hotTemperatureCelsius: 75,
  coldTemperatureCelsius: 25,
  areaSquareMetres: 2,
  thicknessMetres: 0.16,
  conductivityWattsPerMetreKelvin: 0.8,
  convectionCoefficientWattsPerSquareMetreKelvin: 12,
  emissivity: 0.8,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<HeatTransferModesState>): HeatTransferModesState => {
  const hot = clamp(state.hotTemperatureCelsius ?? defaultState.hotTemperatureCelsius, 30, 120);
  const cold = clamp(state.coldTemperatureCelsius ?? defaultState.coldTemperatureCelsius, 0, 35);
  return {
    hotTemperatureCelsius: Math.max(hot, cold + 1),
    coldTemperatureCelsius: cold,
    areaSquareMetres: clamp(state.areaSquareMetres ?? defaultState.areaSquareMetres, 0.5, 5),
    thicknessMetres: clamp(state.thicknessMetres ?? defaultState.thicknessMetres, 0.04, 0.4),
    conductivityWattsPerMetreKelvin: 0.8,
    convectionCoefficientWattsPerSquareMetreKelvin: clamp(
      state.convectionCoefficientWattsPerSquareMetreKelvin ??
        defaultState.convectionCoefficientWattsPerSquareMetreKelvin,
      4,
      35,
    ),
    emissivity: clamp(state.emissivity ?? defaultState.emissivity, 0.1, 0.95),
  };
};

export const heatTransferModesModel = (
  rawState: Partial<HeatTransferModesState>,
): KernelResult<HeatTransferModesModel> => {
  const state = currentState(rawState);
  const hotKelvins = kelvinFromCelsius(celsius(state.hotTemperatureCelsius));
  if (!hotKelvins.ok) return hotKelvins;
  const coldKelvins = kelvinFromCelsius(celsius(state.coldTemperatureCelsius));
  if (!coldKelvins.ok) return coldKelvins;
  const validEmissivity = emissivity(state.emissivity);
  if (!validEmissivity.ok) return validEmissivity;

  const conduction = conductionHeatRate({
    thermalConductivityWattsPerMetreKelvin: wattsPerMetreKelvin(
      state.conductivityWattsPerMetreKelvin,
    ),
    areaSquareMetres: squareMetres(state.areaSquareMetres),
    thicknessMetres: metres(state.thicknessMetres),
    hotTemperatureKelvins: hotKelvins.value,
    coldTemperatureKelvins: coldKelvins.value,
  });
  if (!conduction.ok) return conduction;

  const convection = convectionHeatRate({
    heatTransferCoefficientWattsPerSquareMetreKelvin: wattsPerSquareMetreKelvin(
      state.convectionCoefficientWattsPerSquareMetreKelvin,
    ),
    areaSquareMetres: squareMetres(state.areaSquareMetres),
    surfaceTemperatureKelvins: hotKelvins.value,
    fluidTemperatureKelvins: coldKelvins.value,
  });
  if (!convection.ok) return convection;

  const radiation = radiationHeatRate({
    emissivity: validEmissivity.value,
    areaSquareMetres: squareMetres(state.areaSquareMetres),
    hotTemperatureKelvins: hotKelvins.value,
    coldTemperatureKelvins: coldKelvins.value,
  });
  if (!radiation.ok) return radiation;

  const maxHeatRateWatts = Math.max(conduction.value, convection.value, radiation.value);
  const dominantMode =
    maxHeatRateWatts === conduction.value
      ? "conduction"
      : maxHeatRateWatts === convection.value
        ? "convection"
        : "radiation";

  return ok({
    hotTemperatureKelvins: hotKelvins.value,
    coldTemperatureKelvins: coldKelvins.value,
    deltaTemperatureKelvins: hotKelvins.value - coldKelvins.value,
    conductionWatts: conduction.value,
    convectionWatts: convection.value,
    radiationWatts: radiation.value,
    maxHeatRateWatts,
    dominantMode,
  });
};

const fmt = (value: number, places = 1): string => value.toFixed(places);

const ModeBar = ({
  color,
  label,
  max,
  value,
}: {
  readonly color: string;
  readonly label: string;
  readonly max: number;
  readonly value: number;
}) => {
  const width = max > 0 ? Math.max(8, (value / max) * 100) : 0;
  return (
    <div className="sutd-result-card">
      <dt>{label}</dt>
      <dd>{fmt(value, 0)} W</dd>
      <div aria-hidden="true" className="bar-track">
        <span className="bar-fill" style={{ background: color, width: `${width}%` }} />
      </div>
    </div>
  );
};

const HeatFlowDiagram = ({ model }: { readonly model: HeatTransferModesModel }) => (
  <svg aria-label="Heat transfer mode diagram" role="img" viewBox="0 0 620 280">
    <rect fill="#f8fafc" height="280" rx="18" width="620" />
    <rect fill="#fef2f2" height="170" rx="16" width="140" x="40" y="58" />
    <rect fill="#eff6ff" height="170" rx="16" width="140" x="440" y="58" />
    <text fill="#991b1b" fontSize="18" fontWeight="800" x="70" y="94">
      hot surface
    </text>
    <text fill="#1d4ed8" fontSize="18" fontWeight="800" x="470" y="94">
      cool sink
    </text>
    <text fill="#7f1d1d" fontSize="16" fontWeight="700" x="76" y="134">
      {fmt(model.hotTemperatureKelvins, 1)} K
    </text>
    <text fill="#1e3a8a" fontSize="16" fontWeight="700" x="476" y="134">
      {fmt(model.coldTemperatureKelvins, 1)} K
    </text>
    <path d="M190 116 H428" markerEnd="url(#arrow)" stroke="#c2410c" strokeWidth="8" />
    <path d="M190 160 H428" markerEnd="url(#arrow)" stroke="#0891b2" strokeWidth="8" />
    <path d="M190 204 H428" markerEnd="url(#arrow)" stroke="#7c3aed" strokeWidth="8" />
    <text fill="#7c2d12" fontSize="14" fontWeight="700" x="232" y="106">
      conduction through material
    </text>
    <text fill="#155e75" fontSize="14" fontWeight="700" x="232" y="150">
      convection to moving fluid
    </text>
    <text fill="#5b21b6" fontSize="14" fontWeight="700" x="232" y="194">
      radiation by emission
    </text>
    <defs>
      <marker id="arrow" markerHeight="12" markerWidth="12" orient="auto" refX="10" refY="6">
        <path d="M0,0 L0,12 L12,6 z" fill="currentColor" />
      </marker>
    </defs>
  </svg>
);

export const HeatTransferModes = () => {
  const [state, setState] = useState<HeatTransferModesState>(defaultState);
  const current = currentState(state);
  const model = useMemo(() => heatTransferModesModel(current), [current]);

  return (
    <PredictionGate
      packageId={heatTransferModesPackageId}
      predict={heatTransferModesPredict}
      simId={heatTransferModesSimId}
    >
      <section aria-label="Heat transfer modes lab" className="sutd-sim-panel">
        <div className="sutd-sim-controls" aria-label="Heat transfer controls">
          <p className="meta-line">Manipulate</p>
          <h2>Compare three heat-transfer modes</h2>
          <ControlGroup legend="Thermal boundary">
            <Slider
              label="Hot surface temperature"
              max={120}
              min={30}
              onChange={(value) => setState((now) => currentState({ ...now, hotTemperatureCelsius: value }))}
              step={1}
              unit="deg C"
              value={current.hotTemperatureCelsius}
            />
            <Slider
              label="Ambient temperature"
              max={35}
              min={0}
              onChange={(value) => setState((now) => currentState({ ...now, coldTemperatureCelsius: value }))}
              step={1}
              unit="deg C"
              value={current.coldTemperatureCelsius}
            />
            <Slider
              label="Wall thickness"
              max={0.4}
              min={0.04}
              onChange={(value) => setState((now) => currentState({ ...now, thicknessMetres: value }))}
              step={0.01}
              unit="m"
              value={current.thicknessMetres}
            />
            <Slider
              label="Convection coefficient"
              max={35}
              min={4}
              onChange={(value) =>
                setState((now) =>
                  currentState({
                    ...now,
                    convectionCoefficientWattsPerSquareMetreKelvin: value,
                  }),
                )
              }
              step={1}
              unit="W m^-2 K^-1"
              value={current.convectionCoefficientWattsPerSquareMetreKelvin}
            />
            <Slider
              label="Surface emissivity"
              max={0.95}
              min={0.1}
              onChange={(value) => setState((now) => currentState({ ...now, emissivity: value }))}
              step={0.05}
              unit=""
              value={current.emissivity}
            />
          </ControlGroup>
        </div>

        {model.ok ? (
          <>
            <section className="sutd-result-card" aria-label="Observation unlocked">
              <p className="meta-line">Observe</p>
              <HeatFlowDiagram model={model.value} />
              <dl className="sutd-result-grid" aria-label="Heat-transfer readout">
                <ModeBar
                  color="#c2410c"
                  label="Conduction"
                  max={model.value.maxHeatRateWatts}
                  value={model.value.conductionWatts}
                />
                <ModeBar
                  color="#0891b2"
                  label="Convection"
                  max={model.value.maxHeatRateWatts}
                  value={model.value.convectionWatts}
                />
                <ModeBar
                  color="#7c3aed"
                  label="Radiation"
                  max={model.value.maxHeatRateWatts}
                  value={model.value.radiationWatts}
                />
              </dl>
              <p>
                Dominant mode for this setup: <strong>{model.value.dominantMode}</strong>.
              </p>
            </section>

            <section className="sutd-formula-card" aria-label="Formula used">
              <p className="meta-line">Formula used</p>
              <h3>Same temperature difference, different pathway</h3>
              <pre className="formula-code" aria-label="Heat-transfer formulas">
                <code>{String.raw`q_cond = k A Delta T / L
q_conv = h A Delta T
q_rad = epsilon sigma A (T_hot^4 - T_cold^4)`}</code>
              </pre>
              <dl className="formula-legend" aria-label="Formula legend">
                <div>
                  <dt><span className="legend-swatch legend-swatch--orange" /> k, L</dt>
                  <dd>material conductivity {fmt(current.conductivityWattsPerMetreKelvin)} W m^-1 K^-1 and thickness {fmt(current.thicknessMetres, 2)} m</dd>
                </div>
                <div>
                  <dt><span className="legend-swatch legend-swatch--blue" /> h</dt>
                  <dd>convection coefficient {fmt(current.convectionCoefficientWattsPerSquareMetreKelvin, 0)} W m^-2 K^-1</dd>
                </div>
                <div>
                  <dt><span className="legend-swatch legend-swatch--purple" /> epsilon, sigma</dt>
                  <dd>emissivity {fmt(current.emissivity, 2)} and Stefan-Boltzmann constant</dd>
                </div>
              </dl>
              <p>
                Substitution: Delta T = {fmt(model.value.deltaTemperatureKelvins, 1)} K and A ={" "}
                {fmt(current.areaSquareMetres, 1)} m^2.
              </p>
              <p>
                Result: q_cond = {fmt(model.value.conductionWatts, 0)} W, q_conv ={" "}
                {fmt(model.value.convectionWatts, 0)} W, q_rad ={" "}
                {fmt(model.value.radiationWatts, 0)} W.
              </p>
              <p className="formula-note">
                Heat is energy transfer rate in watts. Temperature is the state variable that drives
                the transfer; the mode decides which coefficient and geometry matter.
              </p>
            </section>
          </>
        ) : (
          <p role="alert">The current heat-transfer inputs are outside the supported range.</p>
        )}
      </section>
    </PredictionGate>
  );
};

export default HeatTransferModes;
