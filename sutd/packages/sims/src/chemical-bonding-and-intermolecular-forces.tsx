import {
  elementSymbol,
  molecularFormula,
  moleculeAtomId,
  validateMolecule,
  validateValence,
  type MoleculeGraph,
} from "@paideia/molecule";
import type { TSimulationSpec } from "@paideia/content-schema";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { err, ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";

type ScenarioId = "sodium-chloride" | "water" | "carbon-dioxide";

type BondingState = {
  readonly scenario: ScenarioId;
};

type Scenario = {
  readonly id: ScenarioId;
  readonly label: string;
  readonly electronegativityA: number;
  readonly electronegativityB: number;
  readonly atomA: string;
  readonly atomB: string;
  readonly formula: string;
  readonly structure: MoleculeGraph;
  readonly valenceLimits: Readonly<Record<string, number>>;
  readonly intermolecularForce: string;
  readonly interpretation: string;
};

type BondingEvidence = {
  readonly scenario: Scenario;
  readonly electronegativityDifference: number;
  readonly bondClass: "mostly ionic" | "polar covalent" | "nonpolar covalent";
  readonly valenceIssueCount: number;
  readonly formula: string;
};

export const chemicalBondingPackageId =
  "sutd/10-016-science-for-a-sustainable-world/chemical-bonding-and-intermolecular-forces" as ConceptPackageId;

const atom = (id: string, element: string, x: number, y: number) => {
  const atomId = moleculeAtomId(id);
  const symbol = elementSymbol(element);
  if (!atomId.ok) throw new Error(atomId.error.message);
  if (!symbol.ok) throw new Error(symbol.error.message);
  return { id: atomId.value, element: symbol.value, position2d: { x, y } };
};

const atomId = (id: string) => {
  const result = moleculeAtomId(id);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const scenarios: readonly Scenario[] = [
  {
    id: "sodium-chloride",
    label: "Sodium chloride",
    atomA: "Na",
    atomB: "Cl",
    electronegativityA: 0.93,
    electronegativityB: 3.16,
    formula: "NaCl",
    structure: {
      atoms: [atom("na", "Na", 0, 0), atom("cl", "Cl", 1, 0)],
      bonds: [{ from: atomId("na"), to: atomId("cl"), order: 1 }],
    },
    valenceLimits: { Na: 1, Cl: 1 },
    intermolecularForce: "ion-ion attraction in an ionic lattice",
    interpretation: "Large electronegativity difference supports electron transfer and ionic bonding.",
  },
  {
    id: "water",
    label: "Water",
    atomA: "O",
    atomB: "H",
    electronegativityA: 3.44,
    electronegativityB: 2.2,
    formula: "H2O",
    structure: {
      atoms: [atom("o", "O", 0, 0), atom("h1", "H", -1, 0.7), atom("h2", "H", 1, 0.7)],
      bonds: [
        { from: atomId("o"), to: atomId("h1"), order: 1 },
        { from: atomId("o"), to: atomId("h2"), order: 1 },
      ],
    },
    valenceLimits: { O: 2, H: 1 },
    intermolecularForce: "hydrogen bonding between polar molecules",
    interpretation: "O-H bonds are polar and water's shape makes a molecular dipole.",
  },
  {
    id: "carbon-dioxide",
    label: "Carbon dioxide",
    atomA: "C",
    atomB: "O",
    electronegativityA: 2.55,
    electronegativityB: 3.44,
    formula: "CO2",
    structure: {
      atoms: [atom("c", "C", 0, 0), atom("o1", "O", -1, 0), atom("o2", "O", 1, 0)],
      bonds: [
        { from: atomId("c"), to: atomId("o1"), order: 2 },
        { from: atomId("c"), to: atomId("o2"), order: 2 },
      ],
    },
    valenceLimits: { C: 4, O: 2 },
    intermolecularForce: "London dispersion forces for a nonpolar molecule",
    interpretation: "Each C=O bond is polar, but the linear molecule cancels the dipoles.",
  },
];

export const chemicalBondingSpec: TSimulationSpec = {
  id: "chemical-bonding-and-intermolecular-forces",
  title: "Chemical Bonding and Intermolecular Forces Lab",
  interaction_type: "comparative-matrix",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate", "core/molecule", "core/ui-sim"],
  manipulate: {
    controls: [
      {
        id: "scenario",
        label: "Bonding case",
        kind: "selector",
        kernel_binding: "state.scenario",
      },
    ],
  },
  predict: {
    prompt: "Na has electronegativity 0.93 and Cl has 3.16. What bond class should dominate in sodium chloride?",
    commit_format: {
      kind: "multiple-choice",
      options: ["mostly ionic", "nonpolar covalent", "hydrogen bond inside one molecule", "metallic only"],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "bonding-evidence",
        module: "@paideia/sutd-sims/chemical-bonding-and-intermolecular-forces",
        symbol: "ChemicalBondingAndIntermolecularForces",
        props_binding: "Show electronegativity difference, molecule graph evidence, and intermolecular force interpretation.",
      },
    ],
  },
  explain: {
    prompt: "Explain how electronegativity difference and molecular polarity connect bond type to intermolecular forces.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Intermolecular forces are the same as bonds inside a molecule.",
      "A polar bond always makes the whole molecule polar.",
    ],
  },
};

const currentState = (state: Partial<BondingState>): BondingState => ({
  scenario: scenarios.some((scenario) => scenario.id === state.scenario)
    ? (state.scenario as ScenarioId)
    : "sodium-chloride",
});

const defaultScenario = scenarios[0];
if (defaultScenario === undefined) {
  throw new Error("At least one bonding scenario is required.");
}

const scenarioFor = (id: ScenarioId): Scenario =>
  scenarios.find((scenario) => scenario.id === id) ?? defaultScenario;

export const bondingEvidence = (state: BondingState): KernelResult<BondingEvidence> => {
  const scenario = scenarioFor(state.scenario);
  const checked = validateMolecule(scenario.structure);
  if (!checked.ok) return checked;
  const formula = molecularFormula(checked.value);
  if (!formula.ok) return formula;
  const valence = validateValence(checked.value, scenario.valenceLimits);
  if (!valence.ok) return valence;
  const electronegativityDifference = Math.abs(
    scenario.electronegativityA - scenario.electronegativityB,
  );
  const bondClass =
    electronegativityDifference >= 1.7
      ? "mostly ionic"
      : electronegativityDifference >= 0.4
        ? "polar covalent"
        : "nonpolar covalent";
  if (!Number.isFinite(electronegativityDifference)) {
    return err("precondition-violated", "electronegativity values must be finite");
  }
  return ok({
    scenario,
    electronegativityDifference,
    bondClass,
    valenceIssueCount: valence.value.length,
    formula: formula.value.hill,
  });
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<BondingState>();
  const current = currentState(state);

  return (
    <section aria-label="Bonding controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Choose a bonding case</h2>
        <label className="sutd-control">
          <span>Bonding case</span>
          <select
            aria-label="Bonding case"
            onChange={(event) => set("scenario", event.currentTarget.value as ScenarioId)}
            value={current.scenario}
          >
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => stage.advance()}>
          Reveal bonding evidence
        </button>
      </div>
      <section aria-label="Before reveal cue" className="sutd-formula-card">
        <p className="meta-line">Before reveal</p>
        <h3>Separate bonds from attractions between particles</h3>
        <p>
          First classify the bond using electronegativity difference. Then ask whether the particle
          is ionic, polar, or nonpolar to identify the main attraction between particles.
        </p>
      </section>
    </section>
  );
};

const BondDiagram = ({ scenario }: { readonly scenario: Scenario }) => (
  <svg aria-label="Bonding particle diagram" className="sutd-diagram" role="img" viewBox="0 0 260 150">
    <rect fill="#f8fafc" height="150" rx="12" width="260" />
    {scenario.structure.bonds.map((bond, index) => {
      const from = scenario.structure.atoms.find((atomNode) => atomNode.id === bond.from);
      const to = scenario.structure.atoms.find((atomNode) => atomNode.id === bond.to);
      if (!from?.position2d || !to?.position2d) return null;
      return (
        <line
          key={`${bond.from}-${bond.to}-${index}`}
          stroke={bond.order === 2 ? "#2563eb" : "#64748b"}
          strokeWidth={bond.order === 2 ? 7 : 4}
          x1={130 + from.position2d.x * 58}
          x2={130 + to.position2d.x * 58}
          y1={75 + from.position2d.y * 45}
          y2={75 + to.position2d.y * 45}
        />
      );
    })}
    {scenario.structure.atoms.map((atomNode) => (
      <g key={atomNode.id}>
        <circle
          cx={130 + (atomNode.position2d?.x ?? 0) * 58}
          cy={75 + (atomNode.position2d?.y ?? 0) * 45}
          fill="#ffffff"
          r="22"
          stroke="#0f766e"
          strokeWidth="3"
        />
        <text
          fill="#0f172a"
          fontSize="15"
          fontWeight="700"
          textAnchor="middle"
          x={130 + (atomNode.position2d?.x ?? 0) * 58}
          y={80 + (atomNode.position2d?.y ?? 0) * 45}
        >
          {atomNode.element}
        </text>
      </g>
    ))}
  </svg>
);

const ObserveStage = () => {
  const state = currentState(useSimState<Partial<BondingState>>());
  const evidence = bondingEvidence(state);
  if (!evidence.ok) {
    return (
      <section aria-label="Observation unlocked" role="region">
        <p role="alert">Unable to compute bonding evidence.</p>
      </section>
    );
  }
  const { scenario, electronegativityDifference, bondClass } = evidence.value;

  return (
    <section aria-label="Observation unlocked" className="sutd-sim-panel" role="region">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Bonding and intermolecular-force evidence</h2>
        <BondDiagram scenario={scenario} />
        <dl aria-label="Bonding readout" className="sutd-result-grid">
          <div>
            <dt>Formula</dt>
            <dd>{evidence.value.formula}</dd>
          </div>
          <div>
            <dt>Bond class</dt>
            <dd>{bondClass}</dd>
          </div>
          <div>
            <dt>Main attraction between particles</dt>
            <dd>{scenario.intermolecularForce}</dd>
          </div>
        </dl>
      </div>
      <section aria-label="Formula used" className="sutd-formula-card">
        <p className="meta-line">Formula used</p>
        <h3>Compare electronegativity values</h3>
        <pre aria-label="LaTeX formula source" className="formula-code">
          <code>{String.raw`\color{#2563eb}{\Delta EN} = |\color{#0f766e}{EN_A} - \color{#d97706}{EN_B}|`}</code>
        </pre>
        <dl aria-label="Formula legend" className="formula-legend">
          <div>
            <dt><span className="legend-swatch legend-swatch--blue" /> Delta EN</dt>
            <dd>electronegativity difference, unitless</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--green" /> EN_A</dt>
            <dd>{scenario.atomA} electronegativity, {scenario.electronegativityA}</dd>
          </div>
          <div>
            <dt><span className="legend-swatch legend-swatch--orange" /> EN_B</dt>
            <dd>{scenario.atomB} electronegativity, {scenario.electronegativityB}</dd>
          </div>
        </dl>
        <p>
          Substitution: Delta EN = |{scenario.electronegativityA.toFixed(2)} -{" "}
          {scenario.electronegativityB.toFixed(2)}| = {electronegativityDifference.toFixed(2)}.
        </p>
        <p>Result: {bondClass}; {scenario.interpretation}</p>
        <p className="formula-note">
          This applies because electronegativity difference estimates how unevenly bonded atoms
          share electrons. Molecular shape and particle type then determine the strongest
          attraction between particles.
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
      <h2>Use bonding evidence for boiling-point reasoning</h2>
      <p>
        Compare water and carbon dioxide. Explain why polar bonds alone are not enough: the whole
        particle and its strongest attraction between particles must be considered.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another bonding case
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
    <section aria-label="Prediction setup" className="sutd-formula-card">
      <p className="meta-line">Predict first</p>
      <h1>Chemical Bonding and Intermolecular Forces Lab</h1>
      <p>
        Predict sodium chloride's bond class, then compare ionic, polar covalent, and nonpolar
        molecular cases using electronegativity and particle-level attractions.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up bonding comparison
      </button>
    </section>
  );
};

const ChemicalBondingAndIntermolecularForcesSim = () => (
  <SimRuntime packageId={chemicalBondingPackageId} spec={chemicalBondingSpec}>
    <StageSurface />
  </SimRuntime>
);

export default ChemicalBondingAndIntermolecularForcesSim;
