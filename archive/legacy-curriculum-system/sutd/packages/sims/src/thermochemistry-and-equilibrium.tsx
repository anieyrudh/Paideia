import { equilibriumQuotient, molarity } from "@paideia/chemistry";
import type { TSimulationSpec } from "@paideia/content-schema";
import { kilograms, kelvins, ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { heatTransfer, joulesPerKilogramKelvin } from "@paideia/thermodynamics";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";

type ThermoState = {
  readonly finalTemperatureCelsius: number;
  readonly productConcentration: number;
  readonly reactantConcentration: number;
};

type ThermoEvidence = {
  readonly heatJoules: number;
  readonly heatKilojoules: number;
  readonly temperatureChangeKelvins: number;
  readonly direction: "heating" | "cooling" | "steady";
  readonly equilibriumQuotient: number;
  readonly equilibriumBias: "reactant-favoured" | "near-balanced" | "product-favoured";
};

export const thermochemistryPackageId =
  "sutd/10-016-science-for-a-sustainable-world/thermochemistry-and-equilibrium" as ConceptPackageId;

export const thermochemistrySpec: TSimulationSpec = {
  id: "thermochemistry-and-equilibrium",
  title: "Thermochemistry and Equilibrium Lab",
  interaction_type: "comparative-matrix",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate", "core/chemistry", "core/thermodynamics", "core/ui-sim"],
  manipulate: {
    controls: [
      {
        id: "final-temperature-celsius",
        label: "Final temperature",
        kind: "slider",
        kernel_binding: "state.finalTemperatureCelsius",
        bounds: { min: 20, max: 80, step: 1 },
      },
      {
        id: "product-concentration",
        label: "Product concentration",
        kind: "slider",
        kernel_binding: "state.productConcentration",
        bounds: { min: 0.1, max: 2, step: 0.1 },
      },
      {
        id: "reactant-concentration",
        label: "Reactant concentration",
        kind: "slider",
        kernel_binding: "state.reactantConcentration",
        bounds: { min: 0.1, max: 2, step: 0.1 },
      },
    ],
  },
  predict: {
    prompt: "A 100 g water sample warms from 25 C to 45 C. Is heat absorbed or released by the water sample?",
    commit_format: {
      kind: "multiple-choice",
      options: ["absorbed by the sample", "released by the sample", "no heat transfer", "cannot be related to temperature"],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "thermo-equilibrium-evidence",
        module: "@paideia/sutd-sims/thermochemistry-and-equilibrium",
        symbol: "ThermochemistryAndEquilibrium",
        props_binding: "Show heat-transfer calculation, equilibrium quotient, and particle-level interpretation.",
      },
    ],
  },
  explain: {
    prompt: "Explain why heat-flow direction and equilibrium composition answer different questions about the same reaction system.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Exothermic always means product-favoured.",
      "Equilibrium means equal reactant and product concentrations.",
    ],
  },
};

const defaults: ThermoState = {
  finalTemperatureCelsius: 45,
  productConcentration: 1.2,
  reactantConcentration: 0.4,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const currentState = (state: Partial<ThermoState>): ThermoState => ({
  finalTemperatureCelsius: clamp(state.finalTemperatureCelsius ?? defaults.finalTemperatureCelsius, 20, 80),
  productConcentration: clamp(state.productConcentration ?? defaults.productConcentration, 0.1, 2),
  reactantConcentration: clamp(state.reactantConcentration ?? defaults.reactantConcentration, 0.1, 2),
});

export const thermochemistryEvidence = (state: ThermoState): KernelResult<ThermoEvidence> => {
  const initialKelvins = 298.15;
  const finalKelvins = state.finalTemperatureCelsius + 273.15;
  const heat = heatTransfer({
    massKilograms: kilograms(0.1),
    specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(4184),
    initialTemperatureKelvins: kelvins(initialKelvins),
    finalTemperatureKelvins: kelvins(finalKelvins),
  });
  if (!heat.ok) return heat;

  const productConcentration = molarity(state.productConcentration);
  if (!productConcentration.ok) return productConcentration;
  const reactantConcentration = molarity(state.reactantConcentration);
  if (!reactantConcentration.ok) return reactantConcentration;

  const quotient = equilibriumQuotient({
    products: [{ species: "products", concentration: productConcentration.value, coefficient: 1 }],
    reactants: [{ species: "reactants", concentration: reactantConcentration.value, coefficient: 1 }],
  });
  if (!quotient.ok) return quotient;

  return ok({
    heatJoules: heat.value.energyTransferJoules,
    heatKilojoules: heat.value.energyTransferJoules / 1000,
    temperatureChangeKelvins: heat.value.temperatureChangeKelvins,
    direction: heat.value.direction,
    equilibriumQuotient: quotient.value,
    equilibriumBias:
      quotient.value > 1.2 ? "product-favoured" : quotient.value < 0.8 ? "reactant-favoured" : "near-balanced",
  });
};

const Control = ({
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
      {label}: <strong>{value.toFixed(step < 1 ? 1 : 0)} {suffix}</strong>
    </span>
    <input aria-label={label} max={max} min={min} onChange={(event) => onChange(Number(event.currentTarget.value))} step={step} type="range" value={value} />
  </label>
);

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<ThermoState>();
  const current = currentState(state);

  return (
    <section aria-label="Thermochemistry controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Adjust heat flow and composition</h2>
        <Control label="Final temperature" max={80} min={20} onChange={(value) => set("finalTemperatureCelsius", value)} step={1} suffix="C" value={current.finalTemperatureCelsius} />
        <Control label="Product concentration" max={2} min={0.1} onChange={(value) => set("productConcentration", value)} step={0.1} suffix="mol/L" value={current.productConcentration} />
        <Control label="Reactant concentration" max={2} min={0.1} onChange={(value) => set("reactantConcentration", value)} step={0.1} suffix="mol/L" value={current.reactantConcentration} />
        <button type="button" onClick={() => stage.advance()}>
          Reveal energy and equilibrium
        </button>
      </div>
      <section aria-label="Before reveal cue" className="sutd-formula-card">
        <p className="meta-line">Before reveal</p>
        <h3>Energy and equilibrium answer different questions</h3>
        <p>
          Temperature change tracks heat transferred to the sample. Concentration ratio tracks
          reaction mixture composition.
        </p>
      </section>
    </section>
  );
};

const EnergyDiagram = ({ evidence }: { readonly evidence: ThermoEvidence }) => (
  <svg aria-label="Thermochemistry equilibrium diagram" className="sutd-diagram" role="img" viewBox="0 0 280 150">
    <rect fill="#f8fafc" height="150" rx="12" width="280" />
    <line stroke="#64748b" strokeWidth="3" x1="35" x2="245" y1="108" y2="108" />
    <path d="M70 108 C100 52 130 52 160 82 S215 108 235 54" fill="none" stroke="#2563eb" strokeWidth="4" />
    <circle cx="70" cy="108" fill="#0f766e" r="8" />
    <circle cx="235" cy="54" fill="#d97706" r="8" />
    <text fill="#0f172a" fontSize="13" fontWeight="700" x="28" y="130">reactants</text>
    <text fill="#0f172a" fontSize="13" fontWeight="700" x="202" y="38">products</text>
    <text fill="#334155" fontSize="13" x="92" y="28">q = {evidence.heatKilojoules.toFixed(1)} kJ</text>
    <text fill="#334155" fontSize="13" x="92" y="48">Q = {evidence.equilibriumQuotient.toFixed(2)}</text>
  </svg>
);

const ObserveStage = () => {
  const state = currentState(useSimState<Partial<ThermoState>>());
  const evidence = thermochemistryEvidence(state);
  if (!evidence.ok) {
    return (
      <section aria-label="Observation unlocked" role="region">
        <p role="alert">Unable to compute thermochemistry evidence.</p>
      </section>
    );
  }
  const value = evidence.value;

  return (
    <section aria-label="Observation unlocked" className="sutd-sim-panel" role="region">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Energy and equilibrium evidence</h2>
        <EnergyDiagram evidence={value} />
        <dl aria-label="Thermochemistry readout" className="sutd-result-grid">
          <div>
            <dt>Heat transfer</dt>
            <dd>{value.heatKilojoules.toFixed(1)} kJ, {value.direction}</dd>
          </div>
          <div>
            <dt>Reaction quotient Q</dt>
            <dd>{value.equilibriumQuotient.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Mixture read</dt>
            <dd>{value.equilibriumBias}</dd>
          </div>
        </dl>
      </div>
      <section aria-label="Formula used" className="sutd-formula-card">
        <p className="meta-line">Formula used</p>
        <h3>Connect heat and composition</h3>
        <pre aria-label="LaTeX formula source" className="formula-code">
          <code>{String.raw`\color{#2563eb}{q} = \color{#0f766e}{m}\color{#d97706}{c}\color{#7c3aed}{\Delta T}
\qquad
\color{#2563eb}{Q_c} = \frac{\color{#d97706}{[products]}}{\color{#0f766e}{[reactants]}}`}</code>
        </pre>
        <dl aria-label="Formula legend" className="formula-legend">
          <div><dt><span className="legend-swatch legend-swatch--green" /> m and reactants</dt><dd>sample mass 0.100 kg; reactants {state.reactantConcentration.toFixed(1)} mol/L</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--orange" /> c and products</dt><dd>water heat capacity 4184 J kg^-1 K^-1; products {state.productConcentration.toFixed(1)} mol/L</dd></div>
          <div><dt><span className="legend-swatch legend-swatch--blue" /> q and Qc</dt><dd>heat in kJ and dimensionless reaction quotient</dd></div>
        </dl>
        <p>
          Substitution: q = (0.100 kg)(4184 J kg^-1 K^-1)({value.temperatureChangeKelvins.toFixed(0)} K) = {value.heatKilojoules.toFixed(1)} kJ.
        </p>
        <p>
          Substitution: Qc = ({state.productConcentration.toFixed(1)} mol/L) / ({state.reactantConcentration.toFixed(1)} mol/L) = {value.equilibriumQuotient.toFixed(2)}.
        </p>
        <p className="formula-note">
          Heat transfer says whether the sample warmed or cooled. The quotient compares composition,
          so an exothermic or endothermic heat sign does not by itself prove the equilibrium position.
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
      <h2>Separate heat evidence from equilibrium evidence</h2>
      <p>
        A hand warmer releases heat, but its reaction mixture still has an equilibrium composition.
        State what a temperature probe can tell you and what concentration data must tell you.
      </p>
      <button type="button" onClick={() => stage.reset()}>Try another mixture</button>
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
      <p className="meta-line">Prediction checkpoint</p>
      <h1>Thermochemistry and Equilibrium Lab</h1>
      <p>Predict heat direction, then compare heat transfer with equilibrium composition.</p>
      <button type="button" onClick={() => stage.advance()}>Set up reaction system</button>
    </section>
  );
};

const ThermochemistryAndEquilibriumSim = () => (
  <SimRuntime packageId={thermochemistryPackageId} spec={thermochemistrySpec}>
    <StageSurface />
  </SimRuntime>
);

export default ThermochemistryAndEquilibriumSim;
