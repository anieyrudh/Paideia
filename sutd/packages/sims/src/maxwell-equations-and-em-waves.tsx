import type { TSimulationSpec } from "@paideia/content-schema";
import {
  electromagneticWaveModel,
  hertz,
  type ElectromagneticWaveModel,
  voltsPerMetre,
} from "@paideia/electromagnetism";
import { ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type MaxwellState = {
  readonly frequencyTeraHertz: number;
  readonly electricFieldVoltsPerMetre: number;
  readonly relativePermittivity: number;
  readonly relativePermeability: number;
};

type MaxwellEvidence = {
  readonly state: MaxwellState;
  readonly model: ElectromagneticWaveModel;
};

export const maxwellEquationsAndEmWavesPackageId =
  "sutd/10-017-technological-world-e-and-m/maxwell-equations-and-em-waves" as ConceptPackageId;

export const maxwellEquationsAndEmWavesSpec: TSimulationSpec = {
  id: "maxwell-equations-and-em-waves",
  title: "Maxwell Equations and EM Waves",
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
        id: "frequency",
        label: "Frequency",
        kind: "slider",
        kernel_binding: "state.frequencyTeraHertz",
        bounds: { min: 100, max: 900, step: 10 },
      },
      {
        id: "electric-field",
        label: "Electric field amplitude",
        kind: "slider",
        kernel_binding: "state.electricFieldVoltsPerMetre",
        bounds: { min: 1, max: 40, step: 1 },
      },
      {
        id: "relative-permittivity",
        label: "Relative permittivity",
        kind: "slider",
        kernel_binding: "state.relativePermittivity",
        bounds: { min: 1, max: 6, step: 0.25 },
      },
      {
        id: "relative-permeability",
        label: "Relative permeability",
        kind: "slider",
        kernel_binding: "state.relativePermeability",
        bounds: { min: 1, max: 3, step: 0.1 },
      },
    ],
  },
  predict: {
    prompt:
      "A changing electric field crosses empty space. What does Maxwell's correction predict next?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "It sustains a changing magnetic field, allowing a transverse electromagnetic wave to propagate.",
        "It needs a wire current, so no wave can travel in vacuum.",
        "It produces only a static electric field with no magnetic component.",
        "It travels faster in glass because the medium has larger permittivity.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "maxwell-wave-readout",
        module: "@paideia/sutd-sims/maxwell-equations-and-em-waves",
        symbol: "MaxwellEquationsAndEmWaves",
        props_binding:
          "Show coupled E/B fields, medium speed, wavelength, spectrum band, formula substitution, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Explain why Maxwell's displacement current term lets light propagate without a conduction current.",
    socratic: true,
    expected_misconceptions_surfaced: [
      "EM waves require a wire current everywhere.",
      "Electric and magnetic waves are separate waves.",
      "Higher permittivity makes the wave faster.",
    ],
  },
};

const defaults: MaxwellState = {
  electricFieldVoltsPerMetre: 12,
  frequencyTeraHertz: 600,
  relativePermeability: 1,
  relativePermittivity: 1,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<MaxwellState>): MaxwellState => ({
  electricFieldVoltsPerMetre: clamp(
    state.electricFieldVoltsPerMetre ?? defaults.electricFieldVoltsPerMetre,
    1,
    40,
  ),
  frequencyTeraHertz: clamp(state.frequencyTeraHertz ?? defaults.frequencyTeraHertz, 100, 900),
  relativePermeability: clamp(
    state.relativePermeability ?? defaults.relativePermeability,
    1,
    3,
  ),
  relativePermittivity: clamp(
    state.relativePermittivity ?? defaults.relativePermittivity,
    1,
    6,
  ),
});

const fmt = (value: number, places = 2): string => value.toFixed(places);
const scientific = (value: number, places = 2): string => value.toExponential(places);

export const maxwellEvidence = (state: MaxwellState): KernelResult<MaxwellEvidence> => {
  const model = electromagneticWaveModel({
    electricFieldAmplitudeVoltsPerMetre: voltsPerMetre(state.electricFieldVoltsPerMetre),
    frequencyHertz: hertz(state.frequencyTeraHertz * 1e12),
    relativePermeability: state.relativePermeability,
    relativePermittivity: state.relativePermittivity,
  });
  return model.ok ? ok({ model: model.value, state }) : model;
};

const WaveDiagram = ({ evidence }: { readonly evidence: MaxwellEvidence }) => {
  const wavelength = Math.max(80, Math.min(260, evidence.model.wavelengthMetres * 2.5e8));

  return (
    <svg role="img" aria-label="Coupled transverse electric and magnetic fields" viewBox="0 0 560 280">
      <rect x="18" y="18" width="524" height="244" rx="12" fill="#f8fafc" stroke="#cbd5e1" />
      <line x1="52" y1="140" x2="512" y2="140" stroke="#64748b" strokeWidth="3" strokeDasharray="6 6" />
      <path
        d={`M52 140 C ${52 + wavelength / 4} 42 ${52 + wavelength / 2} 42 ${52 + wavelength} 140 S ${52 + wavelength * 1.5} 238 ${52 + wavelength * 2} 140 S ${52 + wavelength * 2.5} 42 ${52 + wavelength * 3} 140`}
        fill="none"
        stroke="#2563eb"
        strokeWidth="7"
      />
      <path
        d={`M52 140 C ${52 + wavelength / 4} 238 ${52 + wavelength / 2} 238 ${52 + wavelength} 140 S ${52 + wavelength * 1.5} 42 ${52 + wavelength * 2} 140 S ${52 + wavelength * 2.5} 238 ${52 + wavelength * 3} 140`}
        fill="none"
        stroke="#dc2626"
        strokeWidth="7"
      />
      <path d="M430 76 l54 64 -54 64" fill="none" stroke="#0f172a" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <text x="58" y="68" fill="#2563eb" fontSize="18" fontWeight="700">E field</text>
      <text x="58" y="226" fill="#dc2626" fontSize="18" fontWeight="700">B field</text>
      <text x="392" y="54" fill="#0f172a" fontSize="16" fontWeight="700">propagation</text>
    </svg>
  );
};

const FormulaPanel = ({ evidence }: { readonly evidence: MaxwellEvidence }) => {
  const { state, model } = evidence;
  const frequencyHertz = state.frequencyTeraHertz * 1e12;

  return (
    <section aria-label="Formula used" className="sutd-formula-card">
      <p className="meta-line">Formula used</p>
      <h3>Maxwell coupling fixes the wave speed</h3>
      <pre className="formula-code" aria-label="Maxwell wave formula">
        <code>{String.raw`\color{#2563eb}{v} =
\frac{c}{\sqrt{\color{#7c3aed}{\epsilon_r}\color{#059669}{\mu_r}}}

\color{#f97316}{\lambda} = \frac{\color{#2563eb}{v}}{\color{#dc2626}{f}}

\color{#0f766e}{B_0} = \frac{\color{#1d4ed8}{E_0}}{\color{#2563eb}{v}}`}</code>
      </pre>
      <dl className="formula-legend" aria-label="Formula legend">
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> v</dt><dd>wave speed, metre per second</dd></div>
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> epsilon_r</dt><dd>relative permittivity</dd></div>
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> mu_r</dt><dd>relative permeability</dd></div>
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> lambda</dt><dd>wavelength, metre</dd></div>
      </dl>
      <pre className="formula-code" aria-label="Maxwell wave substitution">
        <code>{String.raw`v = \frac{2.998e8\ m/s}{\sqrt{(${fmt(state.relativePermittivity, 2)})(${fmt(state.relativePermeability, 2)})}}
= ${scientific(model.speedMetresPerSecond)}\ m/s

\lambda = \frac{${scientific(model.speedMetresPerSecond)}\ m/s}{${scientific(frequencyHertz)}\ Hz}
= ${scientific(model.wavelengthMetres)}\ m

B_0 = \frac{${fmt(state.electricFieldVoltsPerMetre, 1)}\ V/m}{${scientific(model.speedMetresPerSecond)}\ m/s}
= ${scientific(model.magneticFieldAmplitudeTesla)}\ T`}</code>
      </pre>
      <p>
        Result: band = {model.spectrumBand}, period = {scientific(model.periodSeconds)} s,
        intensity = {scientific(model.averageIntensityWattsPerSquareMetre)} W/m^2.
      </p>
      <p className="formula-note">Interpretation: {model.interpretation}</p>
    </section>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<MaxwellState>();
  const current = currentState(state);

  return (
    <section aria-label="Maxwell controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <ControlGroup legend="Wave and medium">
          <Slider label="Frequency" max={900} min={100} onChange={(value) => set("frequencyTeraHertz", value)} step={10} unit="THz" value={current.frequencyTeraHertz} />
          <Slider label="Electric field" max={40} min={1} onChange={(value) => set("electricFieldVoltsPerMetre", value)} step={1} unit="V/m" value={current.electricFieldVoltsPerMetre} />
          <Slider label="Relative permittivity" max={6} min={1} onChange={(value) => set("relativePermittivity", value)} step={0.25} value={current.relativePermittivity} />
          <Slider label="Relative permeability" max={3} min={1} onChange={(value) => set("relativePermeability", value)} step={0.1} value={current.relativePermeability} />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal wave model
        </button>
      </div>
      <section aria-label="Maxwell preview" className="sutd-formula-card">
        <p className="meta-line">Manipulate</p>
        <h2>Couple electric and magnetic fields</h2>
        <p>
          Drive at {fmt(current.frequencyTeraHertz, 0)} THz with E0 ={" "}
          {fmt(current.electricFieldVoltsPerMetre, 0)} V/m in a medium with
          epsilon_r = {fmt(current.relativePermittivity, 2)} and mu_r ={" "}
          {fmt(current.relativePermeability, 2)}.
        </p>
      </section>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = maxwellEvidence(currentState(useSimState<Partial<MaxwellState>>()));

  if (!evidence.ok) {
    return <section role="region" aria-label="Observation unlocked"><p role="alert">{evidence.error.message}</p></section>;
  }

  return (
    <section role="region" aria-label="Observation unlocked" className="sutd-sim-panel">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Electromagnetic wave evidence</h2>
        <WaveDiagram evidence={evidence.value} />
        <dl className="sutd-result-grid" aria-label="Maxwell readout">
          <div><dt>Wave speed</dt><dd>{scientific(evidence.value.model.speedMetresPerSecond)} m/s</dd></div>
          <div><dt>Wavelength</dt><dd>{scientific(evidence.value.model.wavelengthMetres)} m</dd></div>
          <div><dt>Magnetic field</dt><dd>{scientific(evidence.value.model.magneticFieldAmplitudeTesla)} T</dd></div>
          <div><dt>Spectrum band</dt><dd>{evidence.value.model.spectrumBand}</dd></div>
        </dl>
        <button type="button" onClick={() => stage.advance()}>
          Explain Maxwell coupling
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
      <section aria-label="Explain Maxwell coupling" className="sutd-formula-card">
        <p className="meta-line">Explain</p>
        <h2>Changing fields sustain each other</h2>
        <p>
          Maxwell added the displacement-current term so a changing electric
          field can source magnetic circulation even where no charge is flowing.
          The coupled fields propagate together as one transverse wave.
        </p>
      </section>
      <section aria-label="Transfer challenge" className="sutd-formula-card">
        <p className="meta-line">Transfer</p>
        <h2>Infer a medium from wavelength</h2>
        <p>
          A 500 THz wave has a shorter wavelength in glass than in vacuum. Use
          the wavelength change to infer the refractive index and wave speed.
        </p>
        <button type="button" onClick={() => stage.reset()}>
          Try another medium
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
      <h1>Maxwell Equations and EM Waves</h1>
      <p>
        Predict how Maxwell's correction links changing electric and magnetic
        fields before revealing the wave speed and wavelength.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Prepare Maxwell model
      </button>
    </section>
  );
};

const MaxwellEquationsAndEmWaves = () => (
  <SimRuntime packageId={maxwellEquationsAndEmWavesPackageId} spec={maxwellEquationsAndEmWavesSpec}>
    <StageSurface />
  </SimRuntime>
);

export default MaxwellEquationsAndEmWaves;
