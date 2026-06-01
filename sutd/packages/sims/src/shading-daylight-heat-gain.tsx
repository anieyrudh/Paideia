import { LineChart } from "@paideia/charting";
import type { TSimulationSpec } from "@paideia/content-schema";
import { dot2, normalize2, vector2 } from "@paideia/linear-algebra";
import {
  degrees,
  err,
  metres,
  ok,
  watts,
  type Brand,
  type ConceptPackageId,
  type Degrees,
  type KernelResult,
  type Metres,
  type Watts,
} from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";

type FacadeOrientation = "east" | "south" | "west";
export type GlazingRatio = Brand<number, "GlazingRatio">;
type SquareMetres = Brand<number, "SquareMetres">;

export interface ShadingState {
  readonly overhangDepthM: Metres;
  readonly glazingRatio: GlazingRatio;
  readonly solarAltitudeDeg: Degrees;
  readonly facadeOrientation: FacadeOrientation;
}

interface OrientationProfile {
  readonly label: string;
  readonly exposureFactor: number;
  readonly daylightBias: number;
}

export interface ShadingEvidence {
  readonly state: ShadingState;
  readonly glassAreaM2: SquareMetres;
  readonly shadowReachM: Metres;
  readonly shadedFraction: number;
  readonly daylightScore: number;
  readonly heatGainW: Watts;
  readonly exposureFactor: number;
  readonly incidenceFactor: number;
  readonly interpretation: "balanced" | "too-hot" | "too-dim";
}

export const shadingDaylightHeatGainPackageId =
  "sutd/asd/shading-daylight-heat-gain" as ConceptPackageId;

export const shadingDaylightHeatGainSpec: TSimulationSpec = {
  id: "shading-daylight-heat-gain",
  title: "Shading, Daylight, and Heat Gain",
  interaction_type: "systems-flow-diagram",
  kernel_deps: [
    "core/sim-runtime",
    "core/linear-algebra",
    "core/charting",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "overhang-depth",
        label: "Overhang depth",
        kind: "slider",
        kernel_binding: "state.overhangDepthM",
        bounds: { min: 0.2, max: 1.8, step: 0.1 },
      },
      {
        id: "glazing-ratio",
        label: "Glazing ratio",
        kind: "slider",
        kernel_binding: "state.glazingRatio",
        bounds: { min: 0.3, max: 0.9, step: 0.05 },
      },
      {
        id: "solar-altitude",
        label: "Solar altitude",
        kind: "slider",
        kernel_binding: "state.solarAltitudeDeg",
        bounds: { min: 20, max: 75, step: 5 },
      },
      {
        id: "facade-orientation",
        label: "Facade orientation",
        kind: "selector",
        kernel_binding: "state.facadeOrientation",
      },
    ],
  },
  predict: {
    prompt:
      "A studio facade gets deeper horizontal shading while the glazing area stays fixed. What is the most likely tradeoff?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Daylight and heat gain both increase.",
        "Heat gain falls, but useful daylight can also fall if the shade is too deep.",
        "Only daylight changes; heat gain is controlled only by wall insulation.",
        "A deeper shade always improves every performance metric.",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "shading-daylight-readout",
        module: "@paideia/sutd-sims/shading-daylight-heat-gain",
        symbol: "ShadingDaylightHeatGain",
        props_binding:
          "Show facade shading geometry, daylight proxy, heat-gain proxy, formula trail, and tradeoff curve.",
      },
    ],
  },
  explain: {
    prompt:
      "Which input changed the shaded fraction most, and how did that same fraction affect daylight and heat gain differently?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "More glass always improves daylight quality",
      "Shading only reduces light and never heat",
    ],
  },
};

const orientations: Record<FacadeOrientation, OrientationProfile> = {
  east: { label: "East", exposureFactor: 0.82, daylightBias: 0.92 },
  south: { label: "South", exposureFactor: 1, daylightBias: 1 },
  west: { label: "West", exposureFactor: 0.9, daylightBias: 0.88 },
};

const orientationOptions: readonly { readonly value: FacadeOrientation; readonly label: string }[] = [
  { value: "east", label: "East" },
  { value: "south", label: "South" },
  { value: "west", label: "West" },
];

const wallAreaM2 = 18;
const windowHeightM = 2.4;
const solarIrradianceKwPerM2 = 0.78;
const solarHeatGainCoefficient = 0.42;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const glazingRatio = (value: number): GlazingRatio =>
  clamp(value, 0.3, 0.9) as GlazingRatio;

const defaults: ShadingState = {
  overhangDepthM: metres(0.8),
  glazingRatio: glazingRatio(0.6),
  solarAltitudeDeg: degrees(45),
  facadeOrientation: "south",
};

const currentState = (state: Partial<ShadingState>): ShadingState => ({
  overhangDepthM: metres(clamp(state.overhangDepthM ?? defaults.overhangDepthM, 0.2, 1.8)),
  glazingRatio: glazingRatio(state.glazingRatio ?? defaults.glazingRatio),
  solarAltitudeDeg: degrees(clamp(state.solarAltitudeDeg ?? defaults.solarAltitudeDeg, 20, 75)),
  facadeOrientation: state.facadeOrientation ?? defaults.facadeOrientation,
});

const squareMetres = (value: number): SquareMetres => value as SquareMetres;
const kilowatts = (value: Watts): number => value / 1_000;

const fmt = (value: number, places = 1): string => {
  const rounded = Number(value.toFixed(places));
  return Object.is(rounded, -0) ? "0" : rounded.toFixed(places);
};

export const shadingDaylightHeatGainModel = (
  state: ShadingState,
): KernelResult<ShadingEvidence> => {
  const altitudeRadians = (state.solarAltitudeDeg * Math.PI) / 180;
  const sunVector = vector2(Math.cos(altitudeRadians), -Math.sin(altitudeRadians));
  if (!sunVector.ok) return sunVector;
  const unitSun = normalize2(sunVector.value);
  if (!unitSun.ok) return unitSun;
  const facadeNormal = vector2(1, 0);
  if (!facadeNormal.ok) return facadeNormal;
  const incidence = dot2(unitSun.value, facadeNormal.value);
  if (!incidence.ok) return incidence;

  const profile = orientations[state.facadeOrientation];
  if (profile === undefined) {
    return err("precondition-violated", `Unknown facade orientation: ${state.facadeOrientation}`);
  }

  const shadowReachM = state.overhangDepthM * Math.tan(altitudeRadians);
  const shadedFraction = clamp(shadowReachM / windowHeightM, 0, 1);
  const glassAreaM2 = wallAreaM2 * state.glazingRatio;
  const exposureFactor = Math.max(0.15, incidence.value) * profile.exposureFactor;
  const daylightScore = clamp(
    100 * state.glazingRatio * profile.daylightBias * (1 - 0.38 * shadedFraction),
    0,
    100,
  );
  const heatGainKw =
    glassAreaM2 *
    solarIrradianceKwPerM2 *
    solarHeatGainCoefficient *
    exposureFactor *
    (1 - 0.82 * shadedFraction);
  const heatGainW = watts(heatGainKw * 1_000);
  const interpretation =
    heatGainKw > 2.2
      ? "too-hot"
      : daylightScore < 42
        ? "too-dim"
        : "balanced";

  return ok({
    state: { ...state },
    glassAreaM2: squareMetres(glassAreaM2),
    shadowReachM: metres(shadowReachM),
    shadedFraction,
    daylightScore,
    heatGainW,
    exposureFactor,
    incidenceFactor: Math.max(0.15, incidence.value),
    interpretation,
  });
};

const chartData = (state: ShadingState) =>
  [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8].flatMap((depth) => {
    const evidence = shadingDaylightHeatGainModel({ ...state, overhangDepthM: metres(depth) });
    if (!evidence.ok) return [];
    return [
      { x: depth, y: evidence.value.daylightScore, series: "Daylight score" },
      { x: depth, y: kilowatts(evidence.value.heatGainW), series: "Heat gain (kW)" },
    ];
  });

const presets = [
  {
    label: "balanced studio",
    state: {
      overhangDepthM: metres(0.9),
      glazingRatio: glazingRatio(0.6),
      solarAltitudeDeg: degrees(50),
      facadeOrientation: "south",
    },
  },
  {
    label: "hot glass",
    state: {
      overhangDepthM: metres(0.3),
      glazingRatio: glazingRatio(0.85),
      solarAltitudeDeg: degrees(35),
      facadeOrientation: "west",
    },
  },
  {
    label: "over-shaded",
    state: {
      overhangDepthM: metres(1.7),
      glazingRatio: glazingRatio(0.45),
      solarAltitudeDeg: degrees(70),
      facadeOrientation: "south",
    },
  },
] as const satisfies readonly {
  readonly label: string;
  readonly state: ShadingState;
}[];

const Metric = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

const FacadeDiagram = ({ evidence }: { readonly evidence: ShadingEvidence }) => {
  const glassWidth = 98 * evidence.state.glazingRatio;
  const glassX = 110 - glassWidth / 2;
  const shadeY = 58 + 58 * evidence.shadedFraction;
  const overhangPx = 24 + evidence.state.overhangDepthM * 28;

  return (
    <svg aria-label="Shaded facade section" role="img" viewBox="0 0 260 190">
      <rect fill="#f8fbff" height="190" width="260" />
      <rect fill="#e4e7ec" height="132" width="150" x="55" y="32" />
      <rect fill="#9fd5ef" height="92" opacity="0.76" width={glassWidth} x={glassX} y="58" />
      <rect fill="#f7c948" height={Math.max(4, shadeY - 58)} opacity="0.5" width={glassWidth} x={glassX} y="58" />
      <line stroke="#344054" strokeLinecap="round" strokeWidth="9" x1="54" x2={54 + overhangPx} y1="43" y2="43" />
      <line stroke="#b54708" strokeLinecap="round" strokeWidth="4" x1="224" x2="174" y1="28" y2="72" />
      <line stroke="#b54708" strokeLinecap="round" strokeWidth="4" x1="232" x2="182" y1="50" y2="94" />
      <path d={`M ${54 + overhangPx} 43 L ${glassX + glassWidth} ${shadeY}`} fill="none" stroke="#7a5b00" strokeDasharray="5 5" strokeWidth="2" />
      <text fill="#26332b" fontSize="10" x="61" y="25">
        overhang
      </text>
      <text fill="#26332b" fontSize="10" x="75" y="178">
        shaded fraction {fmt(evidence.shadedFraction * 100, 0)}%
      </text>
      <text fill="#7a271a" fontSize="10" x="178" y="22">
        sun angle
      </text>
    </svg>
  );
};

const FormulaPanel = ({ evidence }: { readonly evidence: ShadingEvidence }) => {
  const state = evidence.state;

  return (
    <section aria-label="Formula used" className="sutd-formula-card">
      <p className="meta-line">Formula trail</p>
      <h3>Shade, daylight, and heat gain</h3>
      <pre aria-label="Shading daylight heat gain formula" className="formula-code">
        <code>{`shaded fraction = min(1, d tan(alpha) / h)
daylight score = 100 g b (1 - 0.38 shaded fraction)
heat gain = A I SHGC e (1 - 0.82 shaded fraction)`}</code>
      </pre>
      <p className="meta-line">Legend</p>
      <dl aria-label="Formula legend" className="formula-legend">
        <div>
          <dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> d</dt>
          <dd>overhang depth, m</dd>
        </div>
        <div>
          <dt><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> alpha</dt>
          <dd>solar altitude, degrees</dd>
        </div>
        <div>
          <dt><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> g</dt>
          <dd>glazing ratio, unitless</dd>
        </div>
        <div>
          <dt><span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> e</dt>
          <dd>orientation and incidence factor, unitless</dd>
        </div>
        <div>
          <dt>A</dt>
          <dd>exposed glass area, m2</dd>
        </div>
        <div>
          <dt>h</dt>
          <dd>window height, m</dd>
        </div>
        <div>
          <dt>I</dt>
          <dd>solar irradiance, kW/m2</dd>
        </div>
        <div>
          <dt>b</dt>
          <dd>orientation daylight bias, unitless</dd>
        </div>
        <div>
          <dt>SHGC</dt>
          <dd>solar heat-gain coefficient, unitless</dd>
        </div>
      </dl>
      <p className="meta-line">Substitution</p>
      <p>
        Substitute shade: min(1, {fmt(state.overhangDepthM)} m × tan({fmt(state.solarAltitudeDeg, 0)} deg) / {fmt(windowHeightM)} m)
        = {fmt(evidence.shadedFraction, 2)}.
      </p>
      <p>
        Substitute daylight: 100 × {fmt(state.glazingRatio, 2)} × {fmt(orientations[state.facadeOrientation].daylightBias, 2)}
        × (1 - 0.38 × {fmt(evidence.shadedFraction, 2)}) = {fmt(evidence.daylightScore)} / 100.
      </p>
      <p>
        Substitute heat: {fmt(evidence.glassAreaM2)} m² × {fmt(solarIrradianceKwPerM2, 2)} kW/m² × {fmt(solarHeatGainCoefficient, 2)}
        × {fmt(evidence.exposureFactor, 2)} × (1 - 0.82 × {fmt(evidence.shadedFraction, 2)})
        = {fmt(kilowatts(evidence.heatGainW), 2)} kW.
      </p>
      <p>
        Units: overhang depth and window height in m, glass area in m², irradiance in kW/m², heat
        gain in kW; shaded fraction and daylight score are unitless. Result: shaded fraction{" "}
        {fmt(evidence.shadedFraction, 2)}, daylight {fmt(evidence.daylightScore)} / 100, heat gain{" "}
        {fmt(kilowatts(evidence.heatGainW), 2)} kW.
      </p>
      <p className="formula-note">
        This formula applies because a horizontal shade blocks a vertical slice of sunlit glass;
        the same shaded fraction then reduces useful daylight and direct solar heat gain by
        different amounts.
      </p>
    </section>
  );
};

const ManipulateStage = () => {
  const { state, set } = useManipulate<ShadingState>();
  const current = currentState(state);
  const evidence = shadingDaylightHeatGainModel(current);

  return (
    <section aria-label="Facade controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <ControlGroup legend="Facade settings">
          <Selector
            label="Facade orientation"
            onChange={(value) => set("facadeOrientation", value)}
            options={orientationOptions}
            value={current.facadeOrientation}
          />
          <Slider
            label="Overhang depth"
            max={1.8}
            min={0.2}
            onChange={(value) => set("overhangDepthM", metres(value))}
            step={0.1}
            unit="m"
            value={current.overhangDepthM}
          />
          <Slider
            label="Glazing ratio"
            max={0.9}
            min={0.3}
            onChange={(value) => set("glazingRatio", glazingRatio(value))}
            step={0.05}
            value={current.glazingRatio}
          />
          <Slider
            label="Solar altitude"
            max={75}
            min={20}
            onChange={(value) => set("solarAltitudeDeg", degrees(value))}
            step={5}
            unit="deg"
            value={current.solarAltitudeDeg}
          />
        </ControlGroup>
        <div aria-label="Scenario presets" className="preset-strip">
          {presets.map((preset) => (
            <button key={preset.label} onClick={() => {
              set("overhangDepthM", preset.state.overhangDepthM);
              set("glazingRatio", preset.state.glazingRatio);
              set("solarAltitudeDeg", preset.state.solarAltitudeDeg);
              set("facadeOrientation", preset.state.facadeOrientation);
            }} type="button">
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <section aria-label="Facade preview" className="sutd-formula-card">
        <p className="meta-line">Manipulate</p>
        <h2>Shape the facade section</h2>
        {evidence.ok ? <FacadeDiagram evidence={evidence.value} /> : <p role="alert">Preview unavailable.</p>}
        <p>
          Current setup: {orientations[current.facadeOrientation].label.toLowerCase()} facade,
          {` ${fmt(current.overhangDepthM)} m`} shade, {fmt(current.glazingRatio * 100, 0)}%
          glazing, {fmt(current.solarAltitudeDeg, 0)} degree sun.
        </p>
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = shadingDaylightHeatGainModel(currentState(useSimState<Partial<ShadingState>>()));

  if (!evidence.ok) {
    return <p role="alert">This facade cannot be evaluated with the selected values.</p>;
  }

  const value = evidence.value;

  return (
    <section aria-label="Observation unlocked" role="region" style={{ display: "grid", gap: "1rem" }}>
      <h2>Shading, daylight, and heat evidence</h2>
      <div className="sutd-sim-panel">
        <section className="sutd-formula-card" aria-label="Facade section readout">
          <FacadeDiagram evidence={value} />
        </section>
        <dl className="sutd-result-grid" aria-label="Performance readout">
          <Metric label="Shaded glass" value={`${fmt(value.shadedFraction * 100, 0)}%`} />
          <Metric label="Daylight score" value={`${fmt(value.daylightScore)} / 100`} />
          <Metric label="Solar heat gain" value={`${fmt(kilowatts(value.heatGainW), 2)} kW`} />
          <Metric label="Glass area" value={`${fmt(value.glassAreaM2)} m²`} />
        </dl>
      </div>
      <FormulaPanel evidence={value} />
      <section aria-label="Depth tradeoff chart" className="sutd-formula-card">
        <p className="meta-line">Tradeoff curve</p>
        <h3>What deeper shade changes</h3>
        <LineChart
          ariaLabel="Daylight score and heat gain in kilowatts against overhang depth"
          data={chartData(value.state)}
          x={{ label: "Overhang depth", domain: { min: 0.2, max: 1.8 } }}
          y={{ label: "Daylight score / heat gain kW", domain: { min: 0, max: 100 } }}
        />
        <dl aria-label="Tradeoff chart legend" className="formula-legend">
          <div>
            <dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> Daylight score</dt>
            <dd>larger is brighter, from 0 to 100</dd>
          </div>
          <div>
            <dt><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> Heat gain (kW)</dt>
            <dd>larger means more direct solar heat through glass</dd>
          </div>
        </dl>
        <p>
          Interpretation:{" "}
          {value.interpretation === "balanced"
            ? "this facade keeps useful daylight while cutting direct heat gain."
            : value.interpretation === "too-hot"
              ? "direct heat gain is still high, so shading or glazing strategy needs adjustment."
              : "the shade is controlling heat, but the useful daylight proxy is too low."}
        </p>
      </section>
      <button type="button" onClick={() => stage.advance()}>
        Explain transfer
      </button>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Transfer prompt" role="region" className="sutd-formula-card">
      <p className="meta-line">Transfer</p>
      <h2>Apply the same tradeoff</h2>
      <p>
        An atrium rooflight overheats at noon. The design team can add horizontal fins above the
        glass, reduce the rooflight area, or combine both moves. Which input would change the
        shaded fraction, which input would change glass area, and how would you keep daylight
        usable while reducing heat gain?
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another facade
      </button>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "explain") return <ExplainStage />;
  if (stage.current === "observe") return <ObserveStage />;
  return (
    <>
      <ManipulateStage />
      <ObserveStage />
    </>
  );
};

export default function ShadingDaylightHeatGain() {
  return (
    <SimRuntime spec={shadingDaylightHeatGainSpec} packageId={shadingDaylightHeatGainPackageId}>
      <StageSurface />
    </SimRuntime>
  );
}
