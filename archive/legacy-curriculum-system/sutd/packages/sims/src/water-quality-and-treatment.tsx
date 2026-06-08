import { LineChart } from "@paideia/charting";
import { molarity, strongAcidPH, strongBasePH } from "@paideia/chemistry";
import type { TSimulationSpec } from "@paideia/content-schema";
import {
  darcyFrictionFactor,
  kilogramsPerCubicMetre,
  pascalSeconds,
  relativeRoughness,
  reynoldsNumber,
} from "@paideia/fluid-mechanics";
import {
  err,
  metres,
  metresPerSecond,
  ok,
  type ConceptPackageId,
  type KernelResult,
} from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type WaterQualityState = {
  readonly rawTurbidityNtu: number;
  readonly filterRemovalPercent: number;
  readonly pathogenLog10Count: number;
  readonly chlorineMgPerLitre: number;
  readonly contactMinutes: number;
  readonly pH: number;
  readonly filterVelocityMetresPerSecond: number;
};

type TreatmentEvidence = {
  readonly finishedTurbidityNtu: number;
  readonly ctMgMinutesPerLitre: number;
  readonly logInactivation: number;
  readonly remainingPathogenLog10: number;
  readonly pHStatus: "acidic" | "target" | "basic";
  readonly verifiedPH: number;
  readonly reynoldsNumber: number;
  readonly frictionFactor: number;
  readonly flowRegime: string;
  readonly meetsScreen: boolean;
};

export const waterQualityAndTreatmentPackageId =
  "sutd/10-016-science-for-a-sustainable-world/water-quality-and-treatment" as ConceptPackageId;

export const waterQualityAndTreatmentSpec: TSimulationSpec = {
  id: "water-quality-and-treatment",
  title: "Water Treatment Train",
  interaction_type: "systems-flow-diagram",
  kernel_deps: [
    "core/sim-runtime",
    "core/prediction-gate",
    "core/chemistry",
    "core/fluid-mechanics",
    "core/charting",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "raw-turbidity-ntu",
        label: "Raw turbidity",
        kind: "slider",
        kernel_binding: "state.rawTurbidityNtu",
        bounds: { min: 5, max: 150, step: 5 },
      },
      {
        id: "filter-removal-percent",
        label: "Coagulation and filtration removal",
        kind: "slider",
        kernel_binding: "state.filterRemovalPercent",
        bounds: { min: 40, max: 98, step: 1 },
      },
      {
        id: "chlorine-mg-per-litre",
        label: "Free chlorine dose",
        kind: "slider",
        kernel_binding: "state.chlorineMgPerLitre",
        bounds: { min: 0.1, max: 3, step: 0.1 },
      },
      {
        id: "contact-minutes",
        label: "Contact time",
        kind: "slider",
        kernel_binding: "state.contactMinutes",
        bounds: { min: 5, max: 90, step: 5 },
      },
      {
        id: "p-h",
        label: "pH",
        kind: "slider",
        kernel_binding: "state.pH",
        bounds: { min: 4.5, max: 10, step: 0.1 },
      },
      {
        id: "filter-velocity-metres-per-second",
        label: "Filter approach velocity",
        kind: "slider",
        kernel_binding: "state.filterVelocityMetresPerSecond",
        bounds: { min: 0.02, max: 0.3, step: 0.01 },
      },
    ],
  },
  predict: {
    prompt:
      "The water looks clear after filtration, but disinfection contact time is very low. What is the safest claim?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Clear water is automatically safe to drink",
        "Low turbidity helps, but pathogen risk still needs disinfection evidence",
        "Chlorine dose alone is enough even with zero contact time",
        "pH has no effect on water treatment decisions",
      ],
      correct_index: 1,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "water-treatment-readout",
        module: "@paideia/sutd-sims/water-quality-and-treatment",
        symbol: "WaterQualityAndTreatment",
        props_binding:
          "Show turbidity removal, CT disinfection, pH band, flow-regime evidence, and final screen verdict.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why a treatment train needs physical clarification, chemical disinfection, and pH checks rather than relying on visual clarity alone.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Clear water is always safe water",
      "More chemical dose can replace contact time",
    ],
  },
};

const defaults: WaterQualityState = {
  rawTurbidityNtu: 80,
  filterRemovalPercent: 90,
  pathogenLog10Count: 5,
  chlorineMgPerLitre: 1.2,
  contactMinutes: 30,
  pH: 7.2,
  filterVelocityMetresPerSecond: 0.08,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<WaterQualityState>): WaterQualityState => ({
  rawTurbidityNtu: clamp(state.rawTurbidityNtu ?? defaults.rawTurbidityNtu, 5, 150),
  filterRemovalPercent: clamp(
    state.filterRemovalPercent ?? defaults.filterRemovalPercent,
    40,
    98,
  ),
  pathogenLog10Count: clamp(state.pathogenLog10Count ?? defaults.pathogenLog10Count, 2, 7),
  chlorineMgPerLitre: clamp(state.chlorineMgPerLitre ?? defaults.chlorineMgPerLitre, 0.1, 3),
  contactMinutes: clamp(state.contactMinutes ?? defaults.contactMinutes, 5, 90),
  pH: clamp(state.pH ?? defaults.pH, 4.5, 10),
  filterVelocityMetresPerSecond: clamp(
    state.filterVelocityMetresPerSecond ?? defaults.filterVelocityMetresPerSecond,
    0.02,
    0.3,
  ),
});

const fmt = (value: number, digits = 2): string => {
  const rounded = Number(value.toFixed(digits));
  return Object.is(rounded, -0) ? "0" : rounded.toString();
};

const finiteRange = (
  value: number,
  label: string,
  min: number,
  max: number,
): KernelResult<number> => {
  if (!Number.isFinite(value) || value < min || value > max) {
    return err(
      "out-of-domain",
      `${label} must be finite and in [${min}, ${max}], got ${value}`,
    );
  }
  return ok(value);
};

const phFromConcentration = (pH: number): KernelResult<number> => {
  if (pH < 7) {
    const concentration = molarity(10 ** -pH);
    return concentration.ok ? strongAcidPH(concentration.value) : concentration;
  }
  if (pH > 7) {
    const concentration = molarity(10 ** -(14 - pH));
    return concentration.ok ? strongBasePH(concentration.value) : concentration;
  }
  return ok(7);
};

export const treatmentEvidence = (state: WaterQualityState): KernelResult<TreatmentEvidence> => {
  const rawTurbidityNtu = finiteRange(state.rawTurbidityNtu, "rawTurbidityNtu", 5, 150);
  if (!rawTurbidityNtu.ok) return rawTurbidityNtu;
  const filterRemovalPercent = finiteRange(
    state.filterRemovalPercent,
    "filterRemovalPercent",
    40,
    98,
  );
  if (!filterRemovalPercent.ok) return filterRemovalPercent;
  const pathogenLog10Count = finiteRange(
    state.pathogenLog10Count,
    "pathogenLog10Count",
    2,
    7,
  );
  if (!pathogenLog10Count.ok) return pathogenLog10Count;
  const chlorineMgPerLitre = finiteRange(
    state.chlorineMgPerLitre,
    "chlorineMgPerLitre",
    0.1,
    3,
  );
  if (!chlorineMgPerLitre.ok) return chlorineMgPerLitre;
  const contactMinutes = finiteRange(state.contactMinutes, "contactMinutes", 5, 90);
  if (!contactMinutes.ok) return contactMinutes;
  const pH = finiteRange(state.pH, "pH", 4.5, 10);
  if (!pH.ok) return pH;
  const filterVelocityMetresPerSecond = finiteRange(
    state.filterVelocityMetresPerSecond,
    "filterVelocityMetresPerSecond",
    0.02,
    0.3,
  );
  if (!filterVelocityMetresPerSecond.ok) return filterVelocityMetresPerSecond;

  const verifiedPH = phFromConcentration(pH.value);
  if (!verifiedPH.ok) return verifiedPH;

  const re = reynoldsNumber({
    densityKilogramsPerCubicMetre: kilogramsPerCubicMetre(998),
    velocityMetresPerSecond: metresPerSecond(filterVelocityMetresPerSecond.value),
    characteristicLengthMetres: metres(0.0008),
    dynamicViscosityPascalSeconds: pascalSeconds(0.001),
  });
  if (!re.ok) return re;
  const roughness = relativeRoughness(0.02);
  if (!roughness.ok) return roughness;
  const friction = darcyFrictionFactor({
    reynoldsNumber: re.value,
    relativeRoughness: roughness.value,
  });
  if (!friction.ok) return friction;

  const finishedTurbidityNtu =
    rawTurbidityNtu.value * (1 - filterRemovalPercent.value / 100);
  const ctMgMinutesPerLitre = chlorineMgPerLitre.value * contactMinutes.value;
  const logInactivation = Math.min(pathogenLog10Count.value, ctMgMinutesPerLitre / 30);
  const remainingPathogenLog10 = Math.max(0, pathogenLog10Count.value - logInactivation);
  const pHStatus =
    verifiedPH.value < 6.5 ? "acidic" : verifiedPH.value > 8.5 ? "basic" : "target";

  return ok({
    finishedTurbidityNtu,
    ctMgMinutesPerLitre,
    logInactivation,
    remainingPathogenLog10,
    pHStatus,
    verifiedPH: verifiedPH.value,
    reynoldsNumber: re.value,
    frictionFactor: friction.value.frictionFactor,
    flowRegime: friction.value.regime,
    meetsScreen:
      finishedTurbidityNtu <= 5 && remainingPathogenLog10 <= 1 && pHStatus === "target",
  });
};

const stageData = (state: WaterQualityState, evidence: TreatmentEvidence) => [
  { x: 0, y: state.rawTurbidityNtu, series: "Turbidity NTU" },
  { x: 1, y: state.rawTurbidityNtu * 0.65, series: "Turbidity NTU" },
  { x: 2, y: evidence.finishedTurbidityNtu, series: "Turbidity NTU" },
  { x: 3, y: evidence.finishedTurbidityNtu, series: "Turbidity NTU" },
];

const TrainDiagram = ({
  evidence,
}: {
  readonly evidence: TreatmentEvidence;
}) => {
  const colour = evidence.meetsScreen ? "#1b7f5f" : "#b45309";
  return (
    <svg
      viewBox="0 0 620 220"
      role="img"
      aria-label="Treatment train from raw water to screened finished water"
    >
      <rect x="20" y="36" width="580" height="148" rx="14" fill="#f8fafc" stroke="#d8dee9" />
      {["Raw", "Clarify", "Filter", "Disinfect"].map((label, index) => (
        <g key={label}>
          <rect
            x={54 + index * 138}
            y="82"
            width="96"
            height="58"
            rx="8"
            fill={index === 3 ? "#eef6ff" : "#ffffff"}
            stroke={index === 3 ? colour : "#476582"}
            strokeWidth="2"
          />
          <text x={102 + index * 138} y="116" textAnchor="middle" fontSize="15" fill="#172033">
            {label}
          </text>
          {index < 3 ? (
            <path
              d={`M${154 + index * 138} 111h34`}
              stroke="#476582"
              strokeWidth="4"
              markerEnd="url(#arrow)"
            />
          ) : null}
        </g>
      ))}
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#476582" />
        </marker>
      </defs>
      <text x="52" y="62" fontSize="15" fill="#2f3a48">
        Final screen: {evidence.meetsScreen ? "passes this teaching screen" : "needs adjustment"}
      </text>
      <text x="52" y="168" fontSize="14" fill="#2f3a48">
        Flow regime in filter pore model: {evidence.flowRegime}; friction factor {fmt(evidence.frictionFactor, 3)}
      </text>
    </svg>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<WaterQualityState>();
  const current = currentState(state);

  return (
    <section aria-label="Water treatment controls" role="region" className="paideia-sim paideia-sim--water">
      <header>
        <p className="eyebrow">SUTD 10.016 · Science for a Sustainable World</p>
        <h2>Water Treatment Train</h2>
        <p>
          Tune clarification, filtration, disinfection, pH, and flow to see why visual clarity is
          only one part of water safety.
        </p>
      </header>
      <ControlGroup legend="Treatment controls">
        <Slider label="Raw turbidity" min={5} max={150} step={5} value={current.rawTurbidityNtu} unit="NTU" onChange={(value) => set("rawTurbidityNtu", value)} />
        <Slider label="Coagulation and filtration removal" min={40} max={98} step={1} value={current.filterRemovalPercent} unit="%" onChange={(value) => set("filterRemovalPercent", value)} />
        <Slider label="Free chlorine dose" min={0.1} max={3} step={0.1} value={current.chlorineMgPerLitre} unit="mg/L" onChange={(value) => set("chlorineMgPerLitre", value)} />
        <Slider label="Contact time" min={5} max={90} step={5} value={current.contactMinutes} unit="min" onChange={(value) => set("contactMinutes", value)} />
        <Slider label="pH" min={4.5} max={10} step={0.1} value={current.pH} onChange={(value) => set("pH", value)} />
        <Slider label="Filter approach velocity" min={0.02} max={0.3} step={0.01} value={current.filterVelocityMetresPerSecond} unit="m/s" onChange={(value) => set("filterVelocityMetresPerSecond", value)} />
      </ControlGroup>
      <button type="button" onClick={() => stage.advance()}>
        Reveal treatment evidence
      </button>
    </section>
  );
};

const ObserveStage = () => {
  const state = currentState(useSimState<Partial<WaterQualityState>>());
  const evidence = treatmentEvidence(state);
  if (!evidence.ok) {
    return <p role="alert">This treatment setup cannot be evaluated.</p>;
  }

  return (
    <section aria-label="Observation unlocked" role="region" className="observation-panel">
      <h3>Treatment evidence</h3>
      <TrainDiagram evidence={evidence.value} />
      <LineChart
        ariaLabel="Turbidity reduction across treatment stages"
        data={stageData(state, evidence.value)}
        x={{ label: "Treatment stage" }}
        y={{ label: "Turbidity (NTU)", domain: { min: 0, max: Math.max(10, state.rawTurbidityNtu) } }}
      />
      <dl className="readout-grid">
        <div>
          <dt>Finished turbidity</dt>
          <dd>{fmt(evidence.value.finishedTurbidityNtu)} NTU</dd>
        </div>
        <div>
          <dt>CT</dt>
          <dd>{fmt(evidence.value.ctMgMinutesPerLitre)} mg min/L</dd>
        </div>
        <div>
          <dt>Remaining pathogen load</dt>
          <dd>{fmt(evidence.value.remainingPathogenLog10)} log10 units</dd>
        </div>
        <div>
          <dt>pH band</dt>
          <dd>{evidence.value.pHStatus}</dd>
        </div>
      </dl>
      <section aria-label="Formula panel" className="formula-panel">
        <h3>Formula panel</h3>
        <p aria-label="LaTeX formula source">
          {"C_{out}=C_{in}(1-r);\\quad CT=C_{chlorine}t;\\quad pH=-\\log_{10}[H^+]"}
        </p>
        <p aria-label="Formula legend">
          C_in is raw turbidity, r is removal fraction, C_chlorine is free chlorine dose, and t is
          contact time.
        </p>
        <p aria-label="Formula substitution">
          C_out = {fmt(state.rawTurbidityNtu)} NTU x (1 - {fmt(state.filterRemovalPercent / 100)}) ={" "}
          {fmt(evidence.value.finishedTurbidityNtu)} NTU; CT = {fmt(state.chlorineMgPerLitre)} mg/L x{" "}
          {fmt(state.contactMinutes, 0)} min = {fmt(evidence.value.ctMgMinutesPerLitre)} mg min/L.
        </p>
        <p>
          Interpretation: {evidence.value.meetsScreen
            ? "the train clears this teaching screen because turbidity, disinfection, and pH are all in range."
            : "the train needs adjustment because at least one of turbidity, disinfection, or pH is still out of range."}
        </p>
      </section>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "manipulate") return <ManipulateStage />;
  if (stage.current === "observe") return <ObserveStage />;
  if (stage.current === "explain") {
    return (
      <section aria-label="Transfer prompt" role="region" className="paideia-sim paideia-sim--water">
        <h2>Explain the treatment decision</h2>
        <p>
          Decide which control should change first when water is visually clear but pathogen risk
          remains too high.
        </p>
        <button type="button" onClick={() => stage.reset()}>
          Try another treatment train
        </button>
      </section>
    );
  }

  return (
    <section aria-label="Prediction setup" role="region" className="paideia-sim paideia-sim--water">
      <h2>Predict before inspecting the treatment train</h2>
      <p>
        The reveal checks physical clarification, chemical disinfection, pH, and flow evidence
        together.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up treatment check
      </button>
    </section>
  );
};

const WaterQualityAndTreatment = () => (
  <SimRuntime packageId={waterQualityAndTreatmentPackageId} spec={waterQualityAndTreatmentSpec}>
    <StageSurface />
  </SimRuntime>
);

export default WaterQualityAndTreatment;
