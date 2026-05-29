import { electronConfiguration } from "@paideia/chemistry";
import type { TSimulationSpec } from "@paideia/content-schema";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import type { ConceptPackageId } from "@paideia/shared";

type AtomicState = {
  readonly atomicNumber: number;
};

const elementNames = [
  "hydrogen",
  "helium",
  "lithium",
  "beryllium",
  "boron",
  "carbon",
  "nitrogen",
  "oxygen",
  "fluorine",
  "neon",
  "sodium",
  "magnesium",
  "aluminium",
  "silicon",
  "phosphorus",
  "sulfur",
  "chlorine",
  "argon",
  "potassium",
  "calcium",
] as const;

export const atomicStructurePackageId =
  "sutd/10-016-science-for-a-sustainable-world/atomic-structure-and-electron-configuration" as ConceptPackageId;

export const atomicStructureSpec: TSimulationSpec = {
  id: "atomic-structure-and-electron-configuration",
  title: "Atomic Structure and Electron Configuration Lab",
  interaction_type: "diagram-builder",
  kernel_deps: ["core/sim-runtime", "core/prediction-gate", "core/chemistry", "core/ui-sim"],
  manipulate: {
    controls: [
      {
        id: "atomic-number",
        label: "Atomic number Z",
        kind: "slider",
        kernel_binding: "state.atomicNumber",
        bounds: { min: 1, max: 20, step: 1 },
      },
    ],
  },
  predict: {
    prompt: "Carbon has atomic number 6. Before reveal, which shell distribution is neutral carbon?",
    commit_format: {
      kind: "multiple-choice",
      options: ["2, 4", "2, 8, 6", "6 in the first shell", "1s2 2s2 2p6"],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "configuration-diagram",
        module: "@paideia/sutd-sims/atomic-structure-and-electron-configuration",
        symbol: "AtomicStructureAndElectronConfiguration",
        props_binding: "Show shell filling, subshell notation, and valence-electron interpretation.",
      },
    ],
  },
  explain: {
    prompt: "Explain how atomic number fixes electron count in a neutral atom and how shell filling predicts valence electrons.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Atomic mass determines electron count.",
      "All electrons occupy the first shell until it is full.",
    ],
  },
};

const currentState = (state: Partial<AtomicState>): AtomicState => ({
  atomicNumber: Math.min(20, Math.max(1, Math.round(state.atomicNumber ?? 6))),
});

const elementLabel = (atomicNumber: number): string =>
  elementNames[atomicNumber - 1] ?? `element ${atomicNumber}`;

const ShellDiagram = ({ atomicNumber }: { readonly atomicNumber: number }) => {
  const configuration = electronConfiguration(atomicNumber);
  if (!configuration.ok) return null;
  const shells = configuration.value.shells;
  const centre = 92;

  return (
    <svg
      aria-label="Electron shell diagram"
      className="sutd-diagram"
      role="img"
      viewBox="0 0 184 184"
    >
      <circle cx={centre} cy={centre} fill="#f8fafc" r="18" stroke="#334155" strokeWidth="2" />
      <text fill="#0f172a" fontSize="12" fontWeight="700" textAnchor="middle" x={centre} y="96">
        Z={atomicNumber}
      </text>
      {shells.map((shell, shellIndex) => {
        const radius = 28 + shellIndex * 20;
        const electrons = Array.from({ length: shell.electrons }, (_, index) => {
          const angle = (2 * Math.PI * index) / shell.electrons - Math.PI / 2;
          return {
            x: centre + radius * Math.cos(angle),
            y: centre + radius * Math.sin(angle),
          };
        });
        return (
          <g key={shell.shell}>
            <circle
              cx={centre}
              cy={centre}
              fill="none"
              r={radius}
              stroke={shell.shell === shells.length ? "#2563eb" : "#94a3b8"}
              strokeDasharray={shell.shell === shells.length ? "0" : "3 4"}
              strokeWidth="1.5"
            />
            {electrons.map((electron, index) => (
              <circle
                cx={electron.x}
                cy={electron.y}
                fill={shell.shell === shells.length ? "#2563eb" : "#0f766e"}
                key={`${shell.shell}-${index}`}
                r="4"
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<AtomicState>();
  const current = currentState(state);

  return (
    <section aria-label="Atomic structure controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <p className="meta-line">Manipulate</p>
        <h2>Choose a neutral atom</h2>
        <label className="sutd-control">
          <span>
            Atomic number Z: <strong>{current.atomicNumber}</strong> ({elementLabel(current.atomicNumber)})
          </span>
          <input
            aria-label="Atomic number Z"
            max={20}
            min={1}
            onChange={(event) => set("atomicNumber", Number(event.currentTarget.value))}
            step={1}
            type="range"
            value={current.atomicNumber}
          />
        </label>
        <button type="button" onClick={() => stage.advance()}>
          Reveal electron arrangement
        </button>
      </div>
      <section aria-label="Before reveal cue" className="sutd-formula-card">
        <p className="meta-line">Before reveal</p>
        <h3>Predict the shell count first</h3>
        <p>
          A neutral atom has one electron for each proton. The first shell can hold 2 electrons,
          then the second shell begins filling.
        </p>
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const state = currentState(useSimState<Partial<AtomicState>>());
  const configuration = electronConfiguration(state.atomicNumber);
  if (!configuration.ok) {
    return (
      <section aria-label="Observation unlocked" role="region">
        <p role="alert">Unable to compute the electron configuration.</p>
      </section>
    );
  }
  const shellText = configuration.value.shells
    .map((shell) => `${shell.electrons} in shell ${shell.shell}`)
    .join(", ");

  return (
    <section aria-label="Observation unlocked" className="sutd-sim-panel" role="region">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Electron configuration evidence</h2>
        <ShellDiagram atomicNumber={state.atomicNumber} />
        <dl aria-label="Configuration readout" className="sutd-result-grid">
          <div>
            <dt>Element</dt>
            <dd>{elementLabel(state.atomicNumber)}</dd>
          </div>
          <div>
            <dt>Subshell notation</dt>
            <dd>{configuration.value.notation}</dd>
          </div>
          <div>
            <dt>Valence electrons</dt>
            <dd>{configuration.value.valenceElectrons}</dd>
          </div>
        </dl>
      </div>
      <section aria-label="Formula used" className="sutd-formula-card">
        <p className="meta-line">Formula used</p>
        <h3>Neutral atoms match protons and electrons</h3>
        <pre aria-label="LaTeX formula source" className="formula-code">
          <code>{String.raw`\color{#2563eb}{e^-_\text{total}} = \color{#0f766e}{Z}`}</code>
        </pre>
        <dl aria-label="Formula legend" className="formula-legend">
          <div>
            <dt>
              <span className="legend-swatch legend-swatch--blue" /> e-total
            </dt>
            <dd>total electrons in a neutral atom, unit: electrons</dd>
          </div>
          <div>
            <dt>
              <span className="legend-swatch legend-swatch--green" /> Z
            </dt>
            <dd>atomic number, unit: protons</dd>
          </div>
        </dl>
        <p>
          Substitution: e-total = Z = {state.atomicNumber}, so this neutral {elementLabel(state.atomicNumber)} atom has{" "}
          {configuration.value.totalElectrons} electrons.
        </p>
        <p>Result: {shellText}; subshell notation {configuration.value.notation}.</p>
        <p className="formula-note">
          This applies because atomic number counts protons. In a neutral atom, electron count
          balances that positive nuclear charge, and the lowest-energy shells fill first.
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
      <h2>Use valence electrons to compare bonding tendencies</h2>
      <p>
        Compare sodium and chlorine. Explain why sodium tends to lose one outer electron while
        chlorine tends to gain one electron to complete its outer shell.
      </p>
      <button type="button" onClick={() => stage.reset()}>
        Try another atom
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
      <p className="meta-line">Prediction checkpoint</p>
      <h1>Atomic Structure and Electron Configuration Lab</h1>
      <p>
        Predict carbon's shell arrangement, then manipulate atomic number to connect proton count,
        electron count, shell filling, and valence electrons.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Set up atom model
      </button>
    </section>
  );
};

const AtomicStructureAndElectronConfigurationSim = () => (
  <SimRuntime packageId={atomicStructurePackageId} spec={atomicStructureSpec}>
    <StageSurface />
  </SimRuntime>
);

export default AtomicStructureAndElectronConfigurationSim;
