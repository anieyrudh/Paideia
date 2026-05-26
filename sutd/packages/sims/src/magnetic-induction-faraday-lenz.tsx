import type { TSimulationSpec } from "@paideia/content-schema";
import {
  degrees,
  ohms,
  seconds,
  squareMetres,
  teslas,
  uniformFluxInductionModel,
  type UniformFluxInductionModel,
} from "@paideia/electromagnetism";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ok, type ConceptPackageId, type KernelResult } from "@paideia/shared";
import { ControlGroup, Slider } from "@paideia/ui-sim";

type InductionState = {
  readonly turns: number;
  readonly loopAreaSquareCentimetres: number;
  readonly initialFieldMilliTeslas: number;
  readonly finalFieldMilliTeslas: number;
  readonly angleToNormalDegrees: number;
  readonly durationMilliseconds: number;
  readonly resistanceOhms: number;
};

type InductionEvidence = {
  readonly state: InductionState;
  readonly model: UniformFluxInductionModel;
  readonly interpretation: string;
};

export const magneticInductionFaradayLenzPackageId =
  "sutd/10-017-technological-world-e-and-m/magnetic-induction-faraday-lenz" as ConceptPackageId;

export const magneticInductionFaradayLenzSpec: TSimulationSpec = {
  id: "magnetic-induction-faraday-lenz",
  title: "Magnetic Induction: Faraday-Lenz",
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
        id: "turns",
        label: "Coil turns",
        kind: "slider",
        kernel_binding: "state.turns",
        bounds: { min: 1, max: 120, step: 1 },
      },
      {
        id: "loop-area",
        label: "Loop area",
        kind: "slider",
        kernel_binding: "state.loopAreaSquareCentimetres",
        bounds: { min: 20, max: 300, step: 5 },
      },
      {
        id: "initial-field",
        label: "Initial field",
        kind: "slider",
        kernel_binding: "state.initialFieldMilliTeslas",
        bounds: { min: -800, max: 800, step: 25 },
      },
      {
        id: "final-field",
        label: "Final field",
        kind: "slider",
        kernel_binding: "state.finalFieldMilliTeslas",
        bounds: { min: -800, max: 800, step: 25 },
      },
      {
        id: "angle",
        label: "Angle to normal",
        kind: "slider",
        kernel_binding: "state.angleToNormalDegrees",
        bounds: { min: 0, max: 90, step: 5 },
      },
      {
        id: "duration",
        label: "Change time",
        kind: "slider",
        kernel_binding: "state.durationMilliseconds",
        bounds: { min: 50, max: 2000, step: 50 },
      },
      {
        id: "resistance",
        label: "Circuit resistance",
        kind: "slider",
        kernel_binding: "state.resistanceOhms",
        bounds: { min: 1, max: 50, step: 1 },
      },
    ],
  },
  predict: {
    prompt:
      "A coil sees magnetic flux out of the page increasing. What direction should the induced field point?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "Into the page, because Lenz's law opposes the increase in outward flux.",
        "Out of the page, because the coil always reinforces the applied change.",
        "There is no induced field because the coil area is fixed.",
        "The direction cannot be predicted from flux change.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: "faraday-lenz-readout",
        module: "@paideia/sutd-sims/magnetic-induction-faraday-lenz",
        symbol: "MagneticInductionFaradayLenz",
        props_binding:
          "Show coil, changing flux, Lenz opposition direction, induced emf/current, formula substitution, units, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Why does the minus sign in Faraday's law describe opposition to flux change rather than opposition to magnetic field itself?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Lenz's law opposes the magnetic field rather than the change in flux.",
      "A fixed coil area means no induction can occur.",
      "More turns changes direction instead of magnitude.",
    ],
  },
};

const defaultState: InductionState = {
  angleToNormalDegrees: 0,
  durationMilliseconds: 300,
  finalFieldMilliTeslas: 500,
  initialFieldMilliTeslas: 100,
  loopAreaSquareCentimetres: 120,
  resistanceOhms: 8,
  turns: 40,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const currentState = (state: Partial<InductionState>): InductionState => ({
  angleToNormalDegrees: clamp(
    state.angleToNormalDegrees ?? defaultState.angleToNormalDegrees,
    0,
    90,
  ),
  durationMilliseconds: clamp(
    state.durationMilliseconds ?? defaultState.durationMilliseconds,
    50,
    2000,
  ),
  finalFieldMilliTeslas: clamp(
    state.finalFieldMilliTeslas ?? defaultState.finalFieldMilliTeslas,
    -800,
    800,
  ),
  initialFieldMilliTeslas: clamp(
    state.initialFieldMilliTeslas ?? defaultState.initialFieldMilliTeslas,
    -800,
    800,
  ),
  loopAreaSquareCentimetres: clamp(
    state.loopAreaSquareCentimetres ?? defaultState.loopAreaSquareCentimetres,
    20,
    300,
  ),
  resistanceOhms: clamp(state.resistanceOhms ?? defaultState.resistanceOhms, 1, 50),
  turns: Math.round(clamp(state.turns ?? defaultState.turns, 1, 120)),
});

const fmt = (value: number, places = 2): string => value.toFixed(places);
const fmtMilli = (value: number, places = 2): string => fmt(value * 1000, places);
const fmtMicro = (value: number, places = 2): string => fmt(value * 1_000_000, places);

export const inductionEvidence = (state: InductionState): KernelResult<InductionEvidence> => {
  const model = uniformFluxInductionModel({
    angleToNormalDegrees: degrees(state.angleToNormalDegrees),
    circuitResistanceOhms: ohms(state.resistanceOhms),
    durationSeconds: seconds(state.durationMilliseconds / 1000),
    finalFieldTeslas: teslas(state.finalFieldMilliTeslas / 1000),
    initialFieldTeslas: teslas(state.initialFieldMilliTeslas / 1000),
    loopAreaSquareMetres: squareMetres(state.loopAreaSquareCentimetres / 10000),
    turns: state.turns,
  });
  if (!model.ok) return model;
  const interpretation =
    model.value.lenzOpposition === "oppose-increase"
      ? "flux is increasing, so the induced field points against the positive flux direction"
      : model.value.lenzOpposition === "oppose-decrease"
        ? "flux is decreasing, so the induced field points with the original positive flux direction"
        : "flux is unchanged, so the induced emf is zero";
  return ok({ interpretation, model: model.value, state });
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<InductionState>();
  const current = currentState(state);

  return (
    <section aria-label="Faraday-Lenz controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <ControlGroup legend="Coil and flux change">
          <Slider label="Coil turns" max={120} min={1} onChange={(value) => set("turns", Math.round(value))} step={1} unit="turns" value={current.turns} />
          <Slider label="Loop area" max={300} min={20} onChange={(value) => set("loopAreaSquareCentimetres", value)} step={5} unit="cm^2" value={current.loopAreaSquareCentimetres} />
          <Slider label="Initial field" max={800} min={-800} onChange={(value) => set("initialFieldMilliTeslas", value)} step={25} unit="mT" value={current.initialFieldMilliTeslas} />
          <Slider label="Final field" max={800} min={-800} onChange={(value) => set("finalFieldMilliTeslas", value)} step={25} unit="mT" value={current.finalFieldMilliTeslas} />
          <Slider label="Angle to normal" max={90} min={0} onChange={(value) => set("angleToNormalDegrees", value)} step={5} unit="deg" value={current.angleToNormalDegrees} />
          <Slider label="Change time" max={2000} min={50} onChange={(value) => set("durationMilliseconds", value)} step={50} unit="ms" value={current.durationMilliseconds} />
          <Slider label="Circuit resistance" max={50} min={1} onChange={(value) => set("resistanceOhms", value)} step={1} unit="ohm" value={current.resistanceOhms} />
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal induced emf
        </button>
      </div>
      <section aria-label="Flux preview" className="sutd-formula-card">
        <p className="meta-line">Manipulate</p>
        <h2>Change the flux through the coil</h2>
        <p>
          {current.turns} turns, area {fmt(current.loopAreaSquareCentimetres, 0)} cm^2,
          field {fmt(current.initialFieldMilliTeslas, 0)} mT to{" "}
          {fmt(current.finalFieldMilliTeslas, 0)} mT in{" "}
          {fmt(current.durationMilliseconds, 0)} ms.
        </p>
      </section>
    </section>
  );
};

const CoilDiagram = ({ evidence }: { readonly evidence: InductionEvidence }) => {
  const increasing = evidence.model.lenzOpposition === "oppose-increase";
  const decreasing = evidence.model.lenzOpposition === "oppose-decrease";
  const fieldText = increasing ? "induced field into page" : decreasing ? "induced field out of page" : "no induced field";

  return (
    <svg role="img" aria-label="Coil with changing magnetic flux and induced field direction" viewBox="0 0 420 260">
      <rect x="24" y="22" width="372" height="210" rx="12" fill="#f8fafc" stroke="#cbd5e1" />
      <ellipse cx="180" cy="126" rx="96" ry="66" fill="#eff6ff" stroke="#2563eb" strokeWidth="8" />
      <ellipse cx="180" cy="126" rx="72" ry="48" fill="#ffffff" stroke="#93c5fd" strokeWidth="3" />
      {Array.from({ length: 18 }, (_, index) => (
        <text key={index} x={72 + (index % 6) * 42} y={72 + Math.floor(index / 6) * 52} fill="#64748b" fontSize="18">
          {evidence.state.finalFieldMilliTeslas >= evidence.state.initialFieldMilliTeslas ? "•" : "×"}
        </text>
      ))}
      {evidence.model.lenzOpposition !== "no-change" ? (
        <path
          d={increasing ? "M310 92 C348 112 348 152 310 172" : "M310 172 C348 152 348 112 310 92"}
          fill="none"
          stroke="#f97316"
          strokeWidth="6"
          markerEnd="url(#arrow)"
        />
      ) : null}
      <text x="286" y="208" fill="#9a3412" fontSize="16" fontWeight="700">{fieldText}</text>
      <text x="88" y="224" fill="#1e3a8a" fontSize="16">N = {evidence.state.turns} turns</text>
      <defs>
        <marker id="arrow" markerHeight="10" markerWidth="10" orient="auto" refX="5" refY="5">
          <path d="M0,0 L10,5 L0,10 Z" fill="#f97316" />
        </marker>
      </defs>
    </svg>
  );
};

const FormulaPanel = ({ evidence }: { readonly evidence: InductionEvidence }) => {
  const { state, model } = evidence;
  const area = state.loopAreaSquareCentimetres / 10000;
  const duration = state.durationMilliseconds / 1000;

  return (
    <section aria-label="Formula used" className="sutd-formula-card">
      <p className="meta-line">Formula used</p>
      <h3>Faraday's law reads the rate of flux change</h3>
      <pre className="formula-code" aria-label="Faraday-Lenz formula">
        <code>{String.raw`\color{#2563eb}{\Phi} =
\color{#7c3aed}{B}\color{#059669}{A}\cos(\color{#d97706}{\theta})

\color{#dc2626}{\mathcal{E}} =
-\color{#0f766e}{N}
\frac{\Delta\color{#2563eb}{\Phi}}{\Delta\color{#4f46e5}{t}}

\color{#f97316}{I}=
\frac{|\color{#dc2626}{\mathcal{E}}|}{\color{#64748b}{R}}`}</code>
      </pre>
      <dl className="formula-legend" aria-label="Formula legend">
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> Phi</dt><dd>magnetic flux through one turn, weber</dd></div>
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--purple" /> B</dt><dd>magnetic flux density, tesla</dd></div>
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> A</dt><dd>loop area, square metre</dd></div>
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--red" /> E</dt><dd>induced emf, volt</dd></div>
        <div><dt><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> I</dt><dd>induced current magnitude, ampere</dd></div>
      </dl>
      <pre className="formula-code" aria-label="Faraday-Lenz substitution">
        <code>{String.raw`\Phi_i = (${fmt(state.initialFieldMilliTeslas / 1000, 3)}\ T)(${fmt(area, 4)}\ m^2)\cos(${fmt(state.angleToNormalDegrees, 0)}^\circ)
= ${fmtMicro(model.initialFluxWebers, 2)}\ \mu Wb

\Phi_f = (${fmt(state.finalFieldMilliTeslas / 1000, 3)}\ T)(${fmt(area, 4)}\ m^2)\cos(${fmt(state.angleToNormalDegrees, 0)}^\circ)
= ${fmtMicro(model.finalFluxWebers, 2)}\ \mu Wb

\mathcal{E} = -(${state.turns})\frac{${fmtMicro(model.fluxChangeWebers, 2)}\ \mu Wb}{${fmt(duration, 2)}\ s}
= ${fmtMilli(model.inducedEmfVolts, 2)}\ mV

I = \frac{${fmtMilli(model.inducedEmfMagnitudeVolts, 2)}\ mV}{${fmt(state.resistanceOhms, 1)}\ \Omega}
= ${fmtMilli(model.inducedCurrentAmps, 2)}\ mA`}</code>
      </pre>
      <p>
        Result: induced emf magnitude is {fmtMilli(model.inducedEmfMagnitudeVolts, 2)} mV,
        current magnitude is {fmtMilli(model.inducedCurrentAmps, 2)} mA, and the Lenz response is to{" "}
        {model.lenzOpposition.replace("-", " ")}.
      </p>
      <p className="formula-note">Interpretation: {evidence.interpretation}.</p>
    </section>
  );
};

const ObserveStage = () => {
  const stage = useStage();
  const evidence = inductionEvidence(currentState(useSimState<Partial<InductionState>>()));

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
        <h2>Faraday-Lenz evidence</h2>
        <CoilDiagram evidence={evidence.value} />
        <dl className="sutd-result-grid" aria-label="Faraday-Lenz readout">
          <div><dt>Flux change</dt><dd>{fmtMicro(evidence.value.model.fluxChangeWebers, 2)} microWb</dd></div>
          <div><dt>Induced emf</dt><dd>{fmtMilli(evidence.value.model.inducedEmfMagnitudeVolts, 2)} mV</dd></div>
          <div><dt>Current</dt><dd>{fmtMilli(evidence.value.model.inducedCurrentAmps, 2)} mA</dd></div>
          <div><dt>Lenz response</dt><dd>{evidence.value.model.lenzOpposition.replace("-", " ")}</dd></div>
        </dl>
        <button type="button" onClick={() => stage.advance()}>
          Explain the minus sign
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
        <h2>The coil opposes the change, not every field</h2>
        <p>
          The negative sign means the induced emf drives a current whose magnetic effect resists
          the flux change. If flux increases, the coil pushes back. If flux decreases, the coil
          tries to preserve it.
        </p>
      </section>
      <section aria-label="Transfer challenge" className="sutd-formula-card">
        <p className="meta-line">Transfer</p>
        <h2>Design a pickup coil</h2>
        <p>
          Choose turns, area, and resistance so a field ramp from 50 mT to 450 mT in 0.25 s
          produces at least 100 mV without exceeding 25 mA. Explain which variable changes emf
          and which changes current.
        </p>
        <button type="button" onClick={() => stage.reset()}>
          Try another flux change
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
      <h1>Magnetic Induction: Faraday-Lenz</h1>
      <p>
        Predict the direction of the induced field before revealing the coil readout. Then change
        flux, turns, and resistance to connect Faraday's law to Lenz's law.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Prepare induction model
      </button>
    </section>
  );
};

const MagneticInductionFaradayLenz = () => (
  <SimRuntime packageId={magneticInductionFaradayLenzPackageId} spec={magneticInductionFaradayLenzSpec}>
    <StageSurface />
  </SimRuntime>
);

export default MagneticInductionFaradayLenz;
