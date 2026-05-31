import {
  BODY_TEMPERATURE_KELVIN,
  concentration,
  goldmanVoltage,
  ionCharge,
  nernstPotential,
  permeability,
  type MonovalentIon,
} from "@paideia/membrane-transport";
import {
  diffusionCoefficient,
  diffusionTimeEstimate,
  length,
  sphere,
} from "@paideia/cell-geometry";
import type { TSimulationSpec } from "@paideia/content-schema";
import { err, ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";

type MembraneState = {
  readonly permeabilityK: number;
  readonly permeabilityNa: number;
  readonly permeabilityCl: number;
  readonly outsideK: number;
  readonly radiusMicrometres: number;
};

type DominantIon = "K" | "Na" | "Cl" | "balanced";

type MembraneEvidence = {
  readonly restingVoltageMillivolts: number;
  readonly potassiumNernstMillivolts: number;
  readonly sodiumNernstMillivolts: number;
  readonly chlorideNernstMillivolts: number;
  readonly dominantIon: DominantIon;
  readonly surfaceToVolumeRatioPerMetre: number;
  readonly surfaceAreaSquareMetres: number;
  readonly volumeCubicMetres: number;
  readonly diffusionTimeMilliseconds: number;
};

export const cellStructureAndTheMembranePackageId =
  "sutd/10-019-science-and-technology-for-healthcare/cell-structure-and-the-membrane" as ConceptPackageId;

export const cellStructureAndTheMembraneSpec: TSimulationSpec = {
  id: "cell-structure-and-the-membrane",
  title: "Membrane Transport Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/membrane-transport",
    "core/cell-geometry",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  predict: {
    prompt:
      "A cell sits in a bath where [K+] outside is much lower than [K+] inside. The membrane is far more permeable to K+ than to Na+ or Cl-. Before adjusting the model, what best describes the resting membrane potential?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Strongly negative inside, close to the K+ Nernst potential",
        "Strongly positive inside, close to the Na+ Nernst potential",
        "Exactly zero, because the membrane is impermeable to most ions",
        "Random, because resting potential depends only on cell volume",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  manipulate: {
    controls: [
      {
        id: "potassium-permeability",
        label: "K+ relative permeability",
        kind: "slider",
        kernel_binding: "state.permeabilityK",
        bounds: { min: 0, max: 1, step: 0.05 },
      },
      {
        id: "sodium-permeability",
        label: "Na+ relative permeability",
        kind: "slider",
        kernel_binding: "state.permeabilityNa",
        bounds: { min: 0, max: 1, step: 0.05 },
      },
      {
        id: "chloride-permeability",
        label: "Cl- relative permeability",
        kind: "slider",
        kernel_binding: "state.permeabilityCl",
        bounds: { min: 0, max: 1, step: 0.05 },
      },
      {
        id: "outside-potassium",
        label: "[K+] outside (mM)",
        kind: "slider",
        kernel_binding: "state.outsideK",
        bounds: { min: 1, max: 20, step: 0.5 },
      },
      {
        id: "cell-radius",
        label: "Cell radius (micrometres)",
        kind: "slider",
        kernel_binding: "state.radiusMicrometres",
        bounds: { min: 1, max: 20, step: 0.5 },
      },
    ],
  },
  observe: {
    renderers: [
      {
        id: "membrane-transport-readout",
        module: "@paideia/sutd-sims/cell-structure-and-the-membrane",
        symbol: "CellStructureAndTheMembrane",
        props_binding:
          "Show membrane diagram with per-ion channel sizes, GHK resting voltage, per-ion Nernst potentials, surface-area-to-volume ratio, and an estimated equilibration time.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why a permeability change (not a concentration change) is what flips the resting voltage from near the K+ Nernst potential toward zero or positive.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "The membrane is only a passive barrier",
      "Resting voltage depends on cell volume",
    ],
  },
};

const defaults: MembraneState = {
  permeabilityK: 1,
  permeabilityNa: 0.04,
  permeabilityCl: 0.45,
  outsideK: 4,
  radiusMicrometres: 5,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<MembraneState>): MembraneState => ({
  permeabilityK: clamp(state.permeabilityK ?? defaults.permeabilityK, 0, 1),
  permeabilityNa: clamp(state.permeabilityNa ?? defaults.permeabilityNa, 0, 1),
  permeabilityCl: clamp(state.permeabilityCl ?? defaults.permeabilityCl, 0, 1),
  outsideK: clamp(state.outsideK ?? defaults.outsideK, 1, 20),
  radiusMicrometres: clamp(state.radiusMicrometres ?? defaults.radiusMicrometres, 1, 20),
});

const INSIDE_K = 140;
const OUTSIDE_NA = 145;
const INSIDE_NA = 12;
const OUTSIDE_CL = 110;
const INSIDE_CL = 10;
const DIFFUSION_COEFFICIENT_SMALL_IONS = 1e-9; // m^2/s, water diffusion of K+/Na+ scale

const pickDominantIon = (
  pK: number,
  pNa: number,
  pCl: number,
): DominantIon => {
  if (pK <= 0 && pNa <= 0 && pCl <= 0) return "balanced";
  if (pK >= pNa && pK >= pCl) return "K";
  if (pNa >= pK && pNa >= pCl) return "Na";
  return "Cl";
};

export const membraneEvidence = (
  raw: MembraneState,
): KernelResult<MembraneEvidence> => {
  if (
    !Number.isFinite(raw.permeabilityK) ||
    !Number.isFinite(raw.permeabilityNa) ||
    !Number.isFinite(raw.permeabilityCl) ||
    !Number.isFinite(raw.outsideK) ||
    !Number.isFinite(raw.radiusMicrometres)
  ) {
    return err(
      "precondition-violated",
      "Membrane state must contain only finite numbers.",
    );
  }
  if (raw.permeabilityK <= 0 && raw.permeabilityNa <= 0 && raw.permeabilityCl <= 0) {
    return err(
      "out-of-domain",
      "At least one ion must have positive permeability for a resting voltage to exist.",
    );
  }
  if (raw.outsideK <= 0 || raw.radiusMicrometres <= 0) {
    return err(
      "out-of-domain",
      "Bath potassium and cell radius must be strictly positive.",
    );
  }

  const radiusMetres = length(raw.radiusMicrometres * 1e-6);
  if (!radiusMetres.ok) return radiusMetres;
  const shape = sphere({ radius: radiusMetres.value });
  if (!shape.ok) return shape;
  const diff = diffusionCoefficient(DIFFUSION_COEFFICIENT_SMALL_IONS);
  if (!diff.ok) return diff;
  const diffusionTime = diffusionTimeEstimate({
    characteristicLength: radiusMetres.value,
    diffusionCoefficient: diff.value,
  });
  if (!diffusionTime.ok) return diffusionTime;

  const pK = permeability(Math.max(0, raw.permeabilityK));
  if (!pK.ok) return pK;
  const pNa = permeability(Math.max(0, raw.permeabilityNa));
  if (!pNa.ok) return pNa;
  const pCl = permeability(Math.max(0, raw.permeabilityCl));
  if (!pCl.ok) return pCl;
  const outK = concentration(raw.outsideK);
  if (!outK.ok) return outK;
  const inK = concentration(INSIDE_K);
  if (!inK.ok) return inK;
  const outNa = concentration(OUTSIDE_NA);
  if (!outNa.ok) return outNa;
  const inNa = concentration(INSIDE_NA);
  if (!inNa.ok) return inNa;
  const outCl = concentration(OUTSIDE_CL);
  if (!outCl.ok) return outCl;
  const inCl = concentration(INSIDE_CL);
  if (!inCl.ok) return inCl;
  const chargePos = ionCharge(1);
  if (!chargePos.ok) return chargePos;
  const chargeNeg = ionCharge(-1);
  if (!chargeNeg.ok) return chargeNeg;

  const ions: ReadonlyArray<MonovalentIon> = [
    {
      name: "K",
      charge: 1,
      permeability: pK.value,
      concentrationOutside: outK.value,
      concentrationInside: inK.value,
    },
    {
      name: "Na",
      charge: 1,
      permeability: pNa.value,
      concentrationOutside: outNa.value,
      concentrationInside: inNa.value,
    },
    {
      name: "Cl",
      charge: -1,
      permeability: pCl.value,
      concentrationOutside: outCl.value,
      concentrationInside: inCl.value,
    },
  ];

  const restingVoltage = goldmanVoltage({
    temperatureKelvin: BODY_TEMPERATURE_KELVIN,
    ions,
  });
  if (!restingVoltage.ok) return restingVoltage;

  const eK = nernstPotential({
    temperatureKelvin: BODY_TEMPERATURE_KELVIN,
    charge: chargePos.value,
    concentrationOutside: outK.value,
    concentrationInside: inK.value,
  });
  if (!eK.ok) return eK;
  const eNa = nernstPotential({
    temperatureKelvin: BODY_TEMPERATURE_KELVIN,
    charge: chargePos.value,
    concentrationOutside: outNa.value,
    concentrationInside: inNa.value,
  });
  if (!eNa.ok) return eNa;
  const eCl = nernstPotential({
    temperatureKelvin: BODY_TEMPERATURE_KELVIN,
    charge: chargeNeg.value,
    concentrationOutside: outCl.value,
    concentrationInside: inCl.value,
  });
  if (!eCl.ok) return eCl;

  return ok({
    restingVoltageMillivolts: Number(restingVoltage.value) * 1000,
    potassiumNernstMillivolts: Number(eK.value) * 1000,
    sodiumNernstMillivolts: Number(eNa.value) * 1000,
    chlorideNernstMillivolts: Number(eCl.value) * 1000,
    dominantIon: pickDominantIon(
      raw.permeabilityK,
      raw.permeabilityNa,
      raw.permeabilityCl,
    ),
    surfaceToVolumeRatioPerMetre: Number(shape.value.surfaceToVolumeRatio),
    surfaceAreaSquareMetres: Number(shape.value.surfaceArea),
    volumeCubicMetres: Number(shape.value.volume),
    diffusionTimeMilliseconds: Number(diffusionTime.value) * 1000,
  });
};

const Slider = ({
  label,
  max,
  min,
  onChange,
  step,
  suffix,
  value,
}: {
  readonly label: string;
  readonly max: number;
  readonly min: number;
  readonly onChange: (value: number) => void;
  readonly step: number;
  readonly suffix: string;
  readonly value: number;
}) => (
  <label className="sutd-control">
    <span>
      {label}: <strong>{value.toFixed(step < 1 ? 2 : 0)} {suffix}</strong>
    </span>
    <input
      aria-label={label}
      max={max}
      min={min}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
      step={step}
      type="range"
      value={value}
    />
  </label>
);

const ManipulateStage = () => {
  const { state, set } = useManipulate<MembraneState>();
  const current = currentState(state);
  return (
    <section aria-label="Membrane controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Set the membrane and bath</h2>
        <Slider
          label="K+ relative permeability"
          max={1}
          min={0}
          onChange={(value) => set("permeabilityK", value)}
          step={0.05}
          suffix=""
          value={current.permeabilityK}
        />
        <Slider
          label="Na+ relative permeability"
          max={1}
          min={0}
          onChange={(value) => set("permeabilityNa", value)}
          step={0.05}
          suffix=""
          value={current.permeabilityNa}
        />
        <Slider
          label="Cl- relative permeability"
          max={1}
          min={0}
          onChange={(value) => set("permeabilityCl", value)}
          step={0.05}
          suffix=""
          value={current.permeabilityCl}
        />
        <Slider
          label="[K+] outside"
          max={20}
          min={1}
          onChange={(value) => set("outsideK", value)}
          step={0.5}
          suffix="mM"
          value={current.outsideK}
        />
        <Slider
          label="Cell radius"
          max={20}
          min={1}
          onChange={(value) => set("radiusMicrometres", value)}
          step={0.5}
          suffix="micrometres"
          value={current.radiusMicrometres}
        />
      </div>
      <section aria-label="Model setup" className="sutd-formula-card">
        <p className="meta-line">Manipulate</p>
        <h3>Permeability picks the resting voltage</h3>
        <p>Use the checkpoint to save your expectation, then watch how channel sizes and bath potassium move the cell's resting voltage between the K+ and Na+ Nernst potentials.</p>
      </section>
    </section>
  );
};

const MembraneDiagram = ({
  evidence,
  state,
}: {
  readonly evidence: MembraneEvidence;
  readonly state: MembraneState;
}) => {
  const kRadius = 6 + 24 * Math.min(1, Math.max(0, state.permeabilityK));
  const naRadius = 6 + 24 * Math.min(1, Math.max(0, state.permeabilityNa));
  const clRadius = 6 + 24 * Math.min(1, Math.max(0, state.permeabilityCl));
  const voltageBarWidth = Math.min(
    220,
    Math.max(8, ((evidence.restingVoltageMillivolts + 100) / 200) * 220),
  );
  const voltageColour =
    evidence.restingVoltageMillivolts > 0 ? "#dc2626" : "#2563eb";
  return (
    <svg
      aria-label="Membrane diagram and resting voltage"
      className="sutd-diagram"
      role="img"
      viewBox="0 0 360 220"
    >
      <rect width="360" height="220" fill="#f8fafc" rx="12" />
      <text x="20" y="22" fill="#475569" fontFamily="Arial, sans-serif" fontSize="12">outside</text>
      <text x="20" y="160" fill="#475569" fontFamily="Arial, sans-serif" fontSize="12">inside</text>
      <rect x="20" y="80" width="320" height="40" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
      <circle cx="80" cy="100" r={kRadius} fill="#2563eb" />
      <text x="80" y="105" fill="#fff" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" textAnchor="middle">K+</text>
      <circle cx="180" cy="100" r={naRadius} fill="#f59e0b" />
      <text x="180" y="105" fill="#fff" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" textAnchor="middle">Na+</text>
      <circle cx="280" cy="100" r={clRadius} fill="#059669" />
      <text x="280" y="105" fill="#fff" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" textAnchor="middle">Cl-</text>
      <text x="20" y="195" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="700">V_m readout</text>
      <rect x="100" y="180" width="220" height="14" fill="#e2e8f0" rx="4" />
      <rect x="100" y="180" width={voltageBarWidth} height="14" fill={voltageColour} rx="4" />
      <text x="328" y="192" fill="#0f172a" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700">
        {evidence.restingVoltageMillivolts.toFixed(1)} mV
      </text>
    </svg>
  );
};

const dominantIonLabel = (kind: DominantIon): string => {
  switch (kind) {
    case "K":
      return "K+ dominant; voltage near E_K";
    case "Na":
      return "Na+ dominant; voltage near E_Na";
    case "Cl":
      return "Cl- dominant; voltage near E_Cl";
    case "balanced":
      return "balanced; no single ion dominates";
  }
};

const ObserveStage = () => {
  const state = currentState(useSimState<Partial<MembraneState>>());
  const evidence = membraneEvidence(state);
  if (!evidence.ok) {
    return (
      <section className="sutd-formula-card" role="region" aria-label="Observation">
        <p role="alert">{evidence.error.message}</p>
      </section>
    );
  }
  const value = evidence.value;
  return (
    <section aria-label="Observation" className="sutd-sim-panel" role="region">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Resting voltage from selective permeability</h2>
        <MembraneDiagram evidence={value} state={state} />
        <dl aria-label="Membrane readout" className="sutd-result-grid">
          <div><dt>Resting voltage V_m</dt><dd>{value.restingVoltageMillivolts.toFixed(1)} mV</dd></div>
          <div><dt>E_K (Nernst)</dt><dd>{value.potassiumNernstMillivolts.toFixed(1)} mV</dd></div>
          <div><dt>E_Na (Nernst)</dt><dd>{value.sodiumNernstMillivolts.toFixed(1)} mV</dd></div>
          <div><dt>E_Cl (Nernst)</dt><dd>{value.chlorideNernstMillivolts.toFixed(1)} mV</dd></div>
          <div><dt>Dominant ion</dt><dd>{dominantIonLabel(value.dominantIon)}</dd></div>
          <div><dt>Surface-area-to-volume</dt><dd>{(value.surfaceToVolumeRatioPerMetre / 1e6).toFixed(2)} /micrometre</dd></div>
          <div><dt>Equilibration estimate</dt><dd>{value.diffusionTimeMilliseconds.toFixed(2)} ms (cell-radius scale)</dd></div>
        </dl>
      </div>
      <section aria-label="Formula used" className="sutd-formula-card">
        <p className="meta-line">Formula used</p>
        <h3>Goldman-Hodgkin-Katz resting voltage</h3>
        <pre aria-label="LaTeX formula source" className="formula-code">
          <code>{String.raw`\color{#2563eb}{V_m}
= \frac{RT}{F}\ln\!\left(
    \frac{\color{#2563eb}{P_K}[\text{K}^+]_o + \color{#f59e0b}{P_{Na}}[\text{Na}^+]_o + \color{#059669}{P_{Cl}}[\text{Cl}^-]_i}
         {\color{#2563eb}{P_K}[\text{K}^+]_i + \color{#f59e0b}{P_{Na}}[\text{Na}^+]_i + \color{#059669}{P_{Cl}}[\text{Cl}^-]_o}
  \right)`}</code>
        </pre>
        <p className="formula-note">Legend</p>
        <dl aria-label="Formula legend" className="formula-legend">
          <div><dt><span className="legend-swatch legend-swatch--blue" /> P_K</dt><dd>K+ relative permeability {state.permeabilityK.toFixed(2)}</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--orange" /> P_Na</dt><dd>Na+ relative permeability {state.permeabilityNa.toFixed(2)}</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--green" /> P_Cl</dt><dd>Cl- relative permeability {state.permeabilityCl.toFixed(2)}</dd></div>
          <div><dt>V_m</dt><dd>resting voltage at body temperature, mV</dd></div>
        </dl>
        <p>
          Substitution at T = 310.15 K with [K+]_o = {state.outsideK.toFixed(1)} mM, [K+]_i = {INSIDE_K} mM, [Na+]_o = {OUTSIDE_NA} mM, [Na+]_i = {INSIDE_NA} mM, [Cl-]_o = {OUTSIDE_CL} mM, [Cl-]_i = {INSIDE_CL} mM gives V_m = {value.restingVoltageMillivolts.toFixed(1)} mV.
        </p>
        <p>
          Units: ion concentrations are millimolar, voltage is millivolts, surface-area-to-volume is per micrometre, and equilibration time is milliseconds.
        </p>
        <p>
          Result: V_m = {value.restingVoltageMillivolts.toFixed(1)} mV, with {dominantIonLabel(value.dominantIon)}.
        </p>
        <p className="formula-note">
          The permeability bars in the diagram reflect P_K, P_Na, and P_Cl directly: bigger circle = more open channel.
        </p>
      </section>
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();
  return (
    <section aria-label="Transfer prompt" className="sutd-formula-card">
      <p className="meta-line">Transfer</p>
      <h2>Tonicity and selective permeability</h2>
      <p>
        Walk through how a red blood cell with surface area 140 micrometres squared and radius 4 micrometres sits at its resting voltage. Use the Nernst potentials of K+, Na+, and Cl- to argue why permeability (not radius) sets V_m, and use the surface-area-to-volume ratio to argue how fast the bath equilibrates.
      </p>
      <button type="button" onClick={() => stage.reset()}>Try another membrane</button>
    </section>
  );
};

const StageSurface = () => {
  const stage = useStage();
  if (stage.current === "explain") return <ExplainStage />;
  return (
    <>
      <ManipulateStage />
      <ObserveStage />
    </>
  );
};

const CellStructureAndTheMembraneSim = () => (
  <SimRuntime packageId={cellStructureAndTheMembranePackageId} spec={cellStructureAndTheMembraneSpec}>
    <StageSurface />
  </SimRuntime>
);

export default CellStructureAndTheMembraneSim;
export { CellStructureAndTheMembraneSim as CellStructureAndTheMembrane };
