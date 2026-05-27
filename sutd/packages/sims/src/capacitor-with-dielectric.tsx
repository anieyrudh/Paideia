import type { TSimulationSpec } from "@paideia/content-schema";
import {
  parallelPlateCapacitorModel,
  volts,
  type ParallelPlateCapacitorModel,
} from "@paideia/electromagnetism";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type DielectricState = {
  readonly dielectricConstant: number;
  readonly plateAreaSquareCentimetres: number;
  readonly plateSeparationMillimetres: number;
  readonly voltageVolts: number;
};

type DielectricEvidence = {
  readonly state: DielectricState;
  readonly model: ParallelPlateCapacitorModel;
  readonly airReferenceFarads: number;
  readonly multiplier: number;
  readonly interpretation: string;
};

export const capacitorWithDielectricPackageId =
  "sutd/10-017-technological-world-e-and-m/capacitor-with-dielectric" as ConceptPackageId;

export const capacitorWithDielectricSpec: TSimulationSpec = {
  id: "capacitor-with-dielectric",
  title: "Capacitor with Dielectric",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/shared",
    "core/content-schema",
    "core/sim-runtime",
    "core/electromagnetism",
    "core/prediction-gate",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "dielectric-constant",
        label: "Dielectric constant",
        kind: "slider",
        kernel_binding: "state.dielectricConstant",
        bounds: { min: 1, max: 8, step: 0.25 },
      },
      {
        id: "plate-area",
        label: "Plate area",
        kind: "slider",
        kernel_binding: "state.plateAreaSquareCentimetres",
        bounds: { min: 20, max: 160, step: 5 },
      },
      {
        id: "plate-gap",
        label: "Plate separation",
        kind: "slider",
        kernel_binding: "state.plateSeparationMillimetres",
        bounds: { min: 0.4, max: 3, step: 0.1 },
      },
      {
        id: "voltage",
        label: "Applied voltage",
        kind: "slider",
        kernel_binding: "state.voltageVolts",
        bounds: { min: 2, max: 24, step: 0.5 },
      },
    ],
  },
  predict: {
    prompt:
      "A dielectric slab is inserted fully between charged parallel plates while plate area, spacing, and voltage stay fixed. What should happen to capacitance and stored energy?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Both capacitance and stored energy increase in proportion to the dielectric constant.",
        "Capacitance increases, but stored energy stays fixed because voltage is fixed.",
        "Both decrease because the dielectric blocks the electric field.",
        "Only charge changes; capacitance is a property of the battery.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "dielectric-capacitor-readout",
        module: "@paideia/sutd-sims/capacitor-with-dielectric",
        symbol: "CapacitorWithDielectric",
        props_binding:
          "Show parallel plates, dielectric slab, field strength, capacitance, charge, energy, formula substitution, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Why does the dielectric increase charge storage at the same voltage without changing the plate spacing?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "A dielectric blocks all field lines.",
      "Capacitance is set by the battery rather than geometry and material.",
      "Energy cannot change if voltage stays fixed.",
    ],
  },
};

const defaultState: DielectricState = {
  dielectricConstant: 3,
  plateAreaSquareCentimetres: 80,
  plateSeparationMillimetres: 1,
  voltageVolts: 12,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<DielectricState>): DielectricState => ({
  dielectricConstant: clamp(state.dielectricConstant ?? defaultState.dielectricConstant, 1, 8),
  plateAreaSquareCentimetres: clamp(
    state.plateAreaSquareCentimetres ?? defaultState.plateAreaSquareCentimetres,
    20,
    160,
  ),
  plateSeparationMillimetres: clamp(
    state.plateSeparationMillimetres ?? defaultState.plateSeparationMillimetres,
    0.4,
    3,
  ),
  voltageVolts: clamp(state.voltageVolts ?? defaultState.voltageVolts, 2, 24),
});

const fmt = (value: number, places = 2): string => value.toFixed(places);
const formatPicoFarads = (value: number): string => `${fmt(value * 1e12, 1)} pF`;
const formatNanoCoulombs = (value: number): string => `${fmt(value * 1e9, 2)} nC`;
const formatNanoJoules = (value: number): string => `${fmt(value * 1e9, 2)} nJ`;
const formatField = (value: number): string => `${fmt(value / 1000, 2)} kV/m`;

export const dielectricCapacitorEvidence = (
  state: DielectricState,
): KernelResult<DielectricEvidence> => {
  const plateAreaSquareMetres = state.plateAreaSquareCentimetres / 10000;
  const plateSeparationMetres = state.plateSeparationMillimetres / 1000;
  const model = parallelPlateCapacitorModel({
    dielectricConstant: state.dielectricConstant,
    plateAreaSquareMetres,
    plateSeparationMetres,
    voltageVolts: volts(state.voltageVolts),
  });
  if (!model.ok) return model;
  const airReference = parallelPlateCapacitorModel({
    dielectricConstant: 1,
    plateAreaSquareMetres,
    plateSeparationMetres,
    voltageVolts: volts(state.voltageVolts),
  });
  if (!airReference.ok) return airReference;

  return ok({
    airReferenceFarads: airReference.value.capacitanceFarads,
    interpretation:
      state.dielectricConstant === 1
        ? "with air in the gap, capacitance is set only by plate area and separation"
        : "the polarised dielectric lowers the voltage needed per coulomb, so the same voltage stores more charge",
    model: model.value,
    multiplier: model.value.capacitanceFarads / airReference.value.capacitanceFarads,
    state,
  });
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<DielectricState>();
  const current = currentState(state);

  return (
    <section aria-label="Dielectric capacitor controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <ControlGroup legend="Capacitor geometry and material">
          <Slider
            label="Dielectric constant"
            max={8}
            min={1}
            onChange={(value) => set("dielectricConstant", value)}
            step={0.25}
            unit="kappa"
            value={current.dielectricConstant}
          />
          <Slider
            label="Plate area"
            max={160}
            min={20}
            onChange={(value) => set("plateAreaSquareCentimetres", value)}
            step={5}
            unit="cm^2"
            value={current.plateAreaSquareCentimetres}
          />
          <Slider
            label="Plate separation"
            max={3}
            min={0.4}
            onChange={(value) => set("plateSeparationMillimetres", value)}
            step={0.1}
            unit="mm"
            value={current.plateSeparationMillimetres}
          />
          <Slider
            label="Applied voltage"
            max={24}
            min={2}
            onChange={(value) => set("voltageVolts", value)}
            step={0.5}
            unit="V"
            value={current.voltageVolts}
          />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal dielectric readout
        </button>
      </div>
      <section aria-label="Capacitor preview" className="sutd-formula-card">
        <p className="meta-line">Manipulate</p>
        <h2>Set the material between the plates</h2>
        <p>
          kappa = {fmt(current.dielectricConstant, 2)}, area ={" "}
          {fmt(current.plateAreaSquareCentimetres, 0)} cm^2, gap ={" "}
          {fmt(current.plateSeparationMillimetres, 1)} mm, voltage ={" "}
          {fmt(current.voltageVolts, 1)} V.
        </p>
        <p>
          The reveal compares this dielectric to air with the same plate geometry and voltage.
        </p>
      </section>
    </section>
  );
};

const CapacitorDiagram = ({ evidence }: { readonly evidence: DielectricEvidence }) => {
  const fillWidth = 44 + evidence.state.dielectricConstant * 9;

  return (
    <svg role="img" aria-label="Parallel plate capacitor with dielectric slab" viewBox="0 0 360 220">
      <rect x="42" y="26" width="276" height="168" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <rect x="92" y="48" width="18" height="124" fill="#2563eb" />
      <rect x="250" y="48" width="18" height="124" fill="#dc2626" />
      <rect
        x={180 - fillWidth / 2}
        y="58"
        width={fillWidth}
        height="104"
        rx="6"
        fill="#f97316"
        opacity="0.42"
        stroke="#c2410c"
      />
      {Array.from({ length: 7 }, (_, index) => (
        <line
          key={index}
          x1="116"
          x2="244"
          y1={64 + index * 16}
          y2={64 + index * 16}
          stroke="#64748b"
          strokeDasharray="6 7"
          strokeWidth="2"
        />
      ))}
      <text x="82" y="35" fill="#2563eb" fontSize="14">
        negative plate
      </text>
      <text x="226" y="35" fill="#dc2626" fontSize="14">
        positive plate
      </text>
      <text x="132" y="188" fill="#92400e" fontSize="14">
        dielectric kappa = {fmt(evidence.state.dielectricConstant, 2)}
      </text>
    </svg>
  );
};

const FormulaPanel = ({ evidence }: { readonly evidence: DielectricEvidence }) => {
  const { state, model } = evidence;
  const areaSquareMetres = state.plateAreaSquareCentimetres / 10000;
  const separationMetres = state.plateSeparationMillimetres / 1000;

  return (
    <section className="sutd-formula-card" aria-label="Formula used">
      <p className="meta-line">Formula used</p>
      <h3>Dielectric changes the proportionality between charge and voltage</h3>
      <pre className="formula-code" aria-label="Dielectric capacitance formula">
        <code>{String.raw`\color{#f97316}{C}
=
\frac{\color{#7c3aed}{\kappa}\color{#0f766e}{\epsilon_0}\color{#2563eb}{A}}
{\color{#dc2626}{d}}

\color{#059669}{Q}=\color{#f97316}{C}\color{#4f46e5}{V}

\color{#0891b2}{U}
=\frac{1}{2}\color{#f97316}{C}\color{#4f46e5}{V}^{2}`}</code>
      </pre>
      <dl className="formula-legend" aria-label="Formula legend">
        <div>
          <dt><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> C</dt>
          <dd>capacitance, farad</dd>
        </div>
        <div>
          <dt><span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> kappa</dt>
          <dd>relative dielectric constant, unitless</dd>
        </div>
        <div>
          <dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> A</dt>
          <dd>overlap area of plates, square metre</dd>
        </div>
        <div>
          <dt><span aria-hidden="true" className="legend-swatch legend-swatch--red" /> d</dt>
          <dd>plate separation, metre</dd>
        </div>
        <div>
          <dt><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> Q</dt>
          <dd>stored charge magnitude, coulomb</dd>
        </div>
        <div>
          <dt><span aria-hidden="true" className="legend-swatch legend-swatch--cyan" /> U</dt>
          <dd>stored electric energy, joule</dd>
        </div>
      </dl>
      <pre className="formula-code" aria-label="Dielectric capacitance substitution">
        <code>{String.raw`C
=
\frac{(${fmt(state.dielectricConstant, 2)})(8.854\times10^{-12}\ F/m)(${fmt(areaSquareMetres, 4)}\ m^2)}
{${fmt(separationMetres, 4)}\ m}
= ${formatPicoFarads(model.capacitanceFarads)}

Q = (${formatPicoFarads(model.capacitanceFarads)})(${fmt(state.voltageVolts, 1)}\ V)
= ${formatNanoCoulombs(model.chargeCoulombs)}

U = \frac{1}{2}(${formatPicoFarads(model.capacitanceFarads)})(${fmt(state.voltageVolts, 1)}\ V)^2
= ${formatNanoJoules(model.energyJoules)}`}</code>
      </pre>
      <p>
        Result: capacitance is {formatPicoFarads(model.capacitanceFarads)}, which is{" "}
        {fmt(evidence.multiplier, 2)} times the same air-filled geometry. The field magnitude is{" "}
        {formatField(model.electricFieldVoltsPerMetre)}.
      </p>
      <p className="formula-note">Interpretation: {evidence.interpretation}.</p>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = dielectricCapacitorEvidence(currentState(useSimState<Partial<DielectricState>>()));

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
        <h2>Dielectric capacitor evidence</h2>
        <CapacitorDiagram evidence={evidence.value} />
        <dl className="sutd-result-grid" aria-label="Dielectric capacitor readout">
          <div>
            <dt>Capacitance</dt>
            <dd>{formatPicoFarads(evidence.value.model.capacitanceFarads)}</dd>
          </div>
          <div>
            <dt>Stored charge</dt>
            <dd>{formatNanoCoulombs(evidence.value.model.chargeCoulombs)}</dd>
          </div>
          <div>
            <dt>Stored energy</dt>
            <dd>{formatNanoJoules(evidence.value.model.energyJoules)}</dd>
          </div>
          <div>
            <dt>Field strength</dt>
            <dd>{formatField(evidence.value.model.electricFieldVoltsPerMetre)}</dd>
          </div>
        </dl>
        <button type="button" onClick={() => stage.advance()}>
          Explain dielectric storage
        </button>
      </div>
      <FormulaPanel evidence={evidence.value} />
    </section>
  );
};

const ExplainStage = () => {
  const stage = useStage();

  return (
    <section aria-label="Explain and transfer" className="sutd-sim-panel">
      <section aria-label="Explain the mechanism" className="sutd-formula-card">
        <p className="meta-line">Explain</p>
        <h2>Polarisation lets the capacitor store more at the same voltage</h2>
        <p>
          Bound charges inside the dielectric partially oppose the plate field. With a battery
          holding voltage fixed, extra free charge can move onto the plates before the same
          voltage is reached.
        </p>
      </section>
      <section aria-label="Transfer challenge" className="sutd-formula-card">
        <p className="meta-line">Transfer</p>
        <h2>Choose an insulating layer</h2>
        <p>
          A sensor pad needs at least 600 pF while staying below 20 kV/m. Adjust area, gap,
          voltage, and dielectric constant to meet both requirements, then justify which variable
          controls each limit.
        </p>
        <button type="button" onClick={() => stage.reset()}>
          Try another material
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
      <h1>Capacitor with Dielectric</h1>
      <p>
        Predict how a dielectric changes charge storage before seeing the plate model. Then tune
        geometry and voltage to compare material, area, and gap.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Prepare dielectric model
      </button>
    </section>
  );
};

const CapacitorWithDielectric = () => (
  <SimRuntime packageId={capacitorWithDielectricPackageId} spec={capacitorWithDielectricSpec}>
    <StageSurface />
  </SimRuntime>
);

export default CapacitorWithDielectric;
