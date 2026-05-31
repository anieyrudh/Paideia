import { useMemo } from "react";
import {
  coulombs,
  coulombsPerMetre,
  coulombsPerSquareMetre,
  gaussLawSymmetricFieldModel,
  squareMetres,
  type GaussLawSymmetricFieldModel,
} from "@paideia/electromagnetism";
import { VectorFieldPlot } from "@paideia/plotting";
import { SimRuntime, useManipulate, useSimState, useStage } from "@paideia/sim-runtime";
import { ok, type ConceptPackageId, type KernelResult, type VectorField2D } from "@paideia/shared";
import { ControlGroup, Selector, Slider } from "@paideia/ui-sim";

export const gaussLawPackageId =
  "sutd/10-017-technological-world-e-and-m/gauss-law-for-symmetric-distributions" as ConceptPackageId;
export const gaussLawSimId = "gauss-law-flux-surface-lab";

type SymmetryKind = "spherical" | "cylindrical" | "planar";

export interface GaussLawState {
  readonly symmetry: SymmetryKind;
  readonly enclosedChargeNanoCoulombs: number;
  readonly linearChargeDensityNanoCoulombsPerMetre: number;
  readonly surfaceChargeDensityNanoCoulombsPerSquareMetre: number;
  readonly radiusMetres: number;
  readonly lengthMetres: number;
  readonly faceAreaSquareMetres: number;
}

export interface GaussLawEvidence {
  readonly state: GaussLawState;
  readonly model: GaussLawSymmetricFieldModel;
  readonly areaFormula: string;
  readonly sourceDescription: string;
  readonly substitution: string;
  readonly visualDescription: string;
}

export const gaussLawSpec = {
  id: gaussLawSimId,
  title: "Gauss Law Flux Surface Lab",
  interaction_type: "diagram-builder",
  kernel_deps: [
    "core/sim-runtime",
    "core/electromagnetism",
    "core/plotting",
    "core/prediction-gate",
    "core/shared",
    "core/ui-sim",
  ],
  manipulate: {
    controls: [
      {
        id: "symmetry",
        label: "Symmetry",
        kind: "selector",
        kernel_binding: "state.symmetry",
      },
      {
        id: "enclosed-charge",
        label: "Enclosed charge",
        kind: "slider",
        kernel_binding: "state.enclosedChargeNanoCoulombs",
        bounds: { min: -8, max: 8, step: 0.5 },
      },
      {
        id: "line-charge-density",
        label: "Line charge density",
        kind: "slider",
        kernel_binding: "state.linearChargeDensityNanoCoulombsPerMetre",
        bounds: { min: -8, max: 8, step: 0.5 },
      },
      {
        id: "surface-charge-density",
        label: "Surface charge density",
        kind: "slider",
        kernel_binding: "state.surfaceChargeDensityNanoCoulombsPerSquareMetre",
        bounds: { min: -8, max: 8, step: 0.5 },
      },
      {
        id: "radius",
        label: "Gaussian radius",
        kind: "slider",
        kernel_binding: "state.radiusMetres",
        bounds: { min: 0.15, max: 1.2, step: 0.05 },
      },
      {
        id: "length",
        label: "Cylinder length",
        kind: "slider",
        kernel_binding: "state.lengthMetres",
        bounds: { min: 0.5, max: 3, step: 0.1 },
      },
      {
        id: "face-area",
        label: "Pillbox face area",
        kind: "slider",
        kernel_binding: "state.faceAreaSquareMetres",
        bounds: { min: 0.1, max: 1.5, step: 0.05 },
      },
    ],
  },
  predict: {
    prompt:
      "A point charge is centered inside a Gaussian sphere. If the sphere radius doubles while the enclosed charge stays fixed, what happens to the total electric flux through the sphere?",
    commit_format: {
      kind: "multiple-choice",
      options: [
        "The total flux stays the same because it depends only on enclosed charge.",
        "The total flux doubles because the surface area doubles.",
        "The total flux falls by a factor of four because the field weakens.",
        "The total flux becomes zero because the surface is closed.",
      ],
      correct_index: 0,
    },
    rationale_required: true,
  },
  observe: {
    renderers: [
      {
        id: gaussLawSimId,
        module: "@paideia/sutd-sims/gauss-law-for-symmetric-distributions",
        symbol: "GaussLawFluxSurfaceLab",
        props_binding:
          "Show Gaussian surface symmetry, flux arrows, field strength, formula substitution, units, legend, and interpretation.",
      },
    ],
  },
  explain: {
    prompt:
      "Why does Gauss law become easiest only when symmetry makes the field constant on the chosen surface?",
    socratic: true,
    expected_misconceptions_surfaced: [
      "Gauss law only works for spheres.",
      "Flux is the same as electric field strength.",
      "A larger Gaussian surface must always give larger flux.",
    ],
  },
} satisfies Parameters<typeof SimRuntime>[0]["spec"];

const defaultState: GaussLawState = {
  enclosedChargeNanoCoulombs: 3.2,
  faceAreaSquareMetres: 0.4,
  lengthMetres: 1.5,
  linearChargeDensityNanoCoulombsPerMetre: 2,
  radiusMetres: 0.45,
  surfaceChargeDensityNanoCoulombsPerSquareMetre: 1.8,
  symmetry: "spherical",
};

const symmetryOptions = [
  { label: "Spherical charge", value: "spherical" as const },
  { label: "Long charged line", value: "cylindrical" as const },
  { label: "Infinite charged plane", value: "planar" as const },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const isSymmetryKind = (value: unknown): value is SymmetryKind =>
  value === "spherical" || value === "cylindrical" || value === "planar";

const currentState = (state: Partial<GaussLawState>): GaussLawState => {
  const symmetry: SymmetryKind = isSymmetryKind(state.symmetry)
    ? state.symmetry
    : defaultState.symmetry;
  return {
    enclosedChargeNanoCoulombs: clamp(
      state.enclosedChargeNanoCoulombs ?? defaultState.enclosedChargeNanoCoulombs,
      -8,
      8,
    ),
    faceAreaSquareMetres: clamp(
      state.faceAreaSquareMetres ?? defaultState.faceAreaSquareMetres,
      0.1,
      1.5,
    ),
    lengthMetres: clamp(state.lengthMetres ?? defaultState.lengthMetres, 0.5, 3),
    linearChargeDensityNanoCoulombsPerMetre: clamp(
      state.linearChargeDensityNanoCoulombsPerMetre ??
        defaultState.linearChargeDensityNanoCoulombsPerMetre,
      -8,
      8,
    ),
    radiusMetres: clamp(state.radiusMetres ?? defaultState.radiusMetres, 0.15, 1.2),
    surfaceChargeDensityNanoCoulombsPerSquareMetre: clamp(
      state.surfaceChargeDensityNanoCoulombsPerSquareMetre ??
        defaultState.surfaceChargeDensityNanoCoulombsPerSquareMetre,
      -8,
      8,
    ),
    symmetry,
  };
};

const fmt = (value: number, places = 2): string => value.toFixed(places);

const scientific = (value: number, unit: string): string => {
  if (Math.abs(value) < 1e-18) return `0 ${unit}`;
  const [mantissa, exponent] = value.toExponential(2).split("e");
  return `${mantissa} x 10^${Number(exponent)} ${unit}`;
};

const fieldScientific = (value: number): string => scientific(value, "V/m");
const fluxScientific = (value: number): string => scientific(value, "V m");
const chargeScientific = (value: number): string => scientific(value, "C");
const areaScientific = (value: number): string => scientific(value, "m^2");

export const gaussLawEvidence = (state: GaussLawState): KernelResult<GaussLawEvidence> => {
  if (state.symmetry === "spherical") {
    const model = gaussLawSymmetricFieldModel({
      enclosedChargeCoulombs: coulombs(state.enclosedChargeNanoCoulombs * 1e-9),
      radiusMetres: state.radiusMetres,
      symmetry: "spherical",
    });
    if (!model.ok) return model;
    return ok({
      areaFormula: "A_G = 4 pi r^2",
      model: model.value,
      sourceDescription: `Q_enc = ${fmt(state.enclosedChargeNanoCoulombs, 2)} nC`,
      state,
      substitution: `E = (${chargeScientific(model.value.enclosedChargeCoulombs)}) / ((8.854 x 10^-12 F/m)(${areaScientific(model.value.gaussianAreaSquareMetres)}))`,
      visualDescription:
        "radial arrows cross a spherical Gaussian surface with the same normal direction everywhere",
    });
  }

  if (state.symmetry === "cylindrical") {
    const model = gaussLawSymmetricFieldModel({
      lengthMetres: state.lengthMetres,
      linearChargeDensityCoulombsPerMetre: coulombsPerMetre(
        state.linearChargeDensityNanoCoulombsPerMetre * 1e-9,
      ),
      radiusMetres: state.radiusMetres,
      symmetry: "cylindrical",
    });
    if (!model.ok) return model;
    return ok({
      areaFormula: "A_G = 2 pi r L",
      model: model.value,
      sourceDescription: `lambda = ${fmt(state.linearChargeDensityNanoCoulombsPerMetre, 2)} nC/m, L = ${fmt(state.lengthMetres, 2)} m`,
      state,
      substitution: `E = (${chargeScientific(model.value.enclosedChargeCoulombs)}) / ((8.854 x 10^-12 F/m)(${areaScientific(model.value.gaussianAreaSquareMetres)}))`,
      visualDescription:
        "radial arrows cross only the curved side of the Gaussian cylinder",
    });
  }

  const model = gaussLawSymmetricFieldModel({
    pillboxFaceAreaSquareMetres: squareMetres(state.faceAreaSquareMetres),
    surfaceChargeDensityCoulombsPerSquareMetre: coulombsPerSquareMetre(
      state.surfaceChargeDensityNanoCoulombsPerSquareMetre * 1e-9,
    ),
    symmetry: "planar",
  });
  if (!model.ok) return model;
  return ok({
    areaFormula: "A_G = 2 A_face",
    model: model.value,
    sourceDescription: `sigma = ${fmt(state.surfaceChargeDensityNanoCoulombsPerSquareMetre, 2)} nC/m^2, A_face = ${fmt(state.faceAreaSquareMetres, 2)} m^2`,
    state,
    substitution: `E = (${chargeScientific(model.value.enclosedChargeCoulombs)}) / ((8.854 x 10^-12 F/m)(${areaScientific(model.value.gaussianAreaSquareMetres)}))`,
    visualDescription:
      "opposite arrows leave the two faces of a thin Gaussian pillbox",
  });
};

const fieldForPlot = (evidence: GaussLawEvidence): VectorField2D => {
  const sign = evidence.model.electricFieldVoltsPerMetre >= 0 ? 1 : -1;
  if (evidence.state.symmetry === "planar") {
    return (x) => [sign * (x >= 0 ? 1 : -1), 0] as const;
  }
  return (x, y) => {
    const radius = Math.hypot(x, y);
    if (radius < 0.08) return [0, 0] as const;
    return [(sign * x) / radius, (sign * y) / radius] as const;
  };
};

const FluxModel = ({ evidence }: { readonly evidence: GaussLawEvidence }) => {
  const field = useMemo(() => fieldForPlot(evidence), [evidence]);
  const signLabel = evidence.model.electricFieldVoltsPerMetre >= 0 ? "outward" : "inward";

  return (
    <figure aria-label="Flux and symmetry model" className="plot-panel">
      <VectorFieldPlot
        density={9}
        field={field}
        normalize
        region={{ x: { min: -1.2, max: 1.2 }, y: { min: -1.2, max: 1.2 } }}
      />
      <svg aria-label="Gaussian surface overlay" role="img" viewBox="0 0 360 180">
        <rect fill="#f8fafc" height="180" rx="12" width="360" />
        {evidence.state.symmetry === "spherical" ? (
          <>
            <circle cx="180" cy="88" fill="none" r="58" stroke="#2563eb" strokeDasharray="8 6" strokeWidth="4" />
            <circle cx="180" cy="88" fill="#dc2626" r="12" />
            <text fill="#0f172a" fontSize="14" fontWeight="700" textAnchor="middle" x="180" y="165">
              Gaussian sphere, field normal at every point
            </text>
          </>
        ) : evidence.state.symmetry === "cylindrical" ? (
          <>
            <ellipse cx="128" cy="88" fill="none" rx="24" ry="56" stroke="#2563eb" strokeWidth="3" />
            <ellipse cx="232" cy="88" fill="none" rx="24" ry="56" stroke="#2563eb" strokeWidth="3" />
            <path d="M128 32 C164 18 196 18 232 32 M128 144 C164 158 196 158 232 144" fill="none" stroke="#2563eb" strokeDasharray="8 6" strokeWidth="4" />
            <line stroke="#dc2626" strokeLinecap="round" strokeWidth="7" x1="180" x2="180" y1="34" y2="142" />
            <text fill="#0f172a" fontSize="14" fontWeight="700" textAnchor="middle" x="180" y="165">
              Curved side contributes; end caps contribute zero
            </text>
          </>
        ) : (
          <>
            <rect x="126" y="54" width="108" height="68" fill="none" stroke="#2563eb" strokeDasharray="8 6" strokeWidth="4" />
            <line stroke="#dc2626" strokeLinecap="round" strokeWidth="6" x1="180" x2="180" y1="28" y2="150" />
            <text fill="#0f172a" fontSize="14" fontWeight="700" textAnchor="middle" x="180" y="165">
              Equal flux leaves the two pillbox faces
            </text>
          </>
        )}
      </svg>
      <figcaption className="formula-note">
        {evidence.visualDescription}; field direction is {signLabel} for the selected charge sign.
      </figcaption>
    </figure>
  );
};

const ManipulateStage = () => {
  const stage = useStage();
  const { state, set } = useManipulate<GaussLawState>();
  const current = currentState(state);

  return (
    <section aria-label="Gauss law controls" className="sutd-sim-panel">
      <div className="sutd-sim-controls">
        <ControlGroup legend="Symmetry and source">
          <Selector
            label="Symmetry"
            onChange={(value) => set("symmetry", value)}
            options={symmetryOptions}
            value={current.symmetry}
          />
          {current.symmetry === "spherical" ? (
            <Slider
              label="Enclosed charge"
              max={8}
              min={-8}
              onChange={(value) => set("enclosedChargeNanoCoulombs", value)}
              step={0.5}
              unit="nC"
              value={current.enclosedChargeNanoCoulombs}
            />
          ) : null}
          {current.symmetry === "cylindrical" ? (
            <Slider
              label="Line charge density"
              max={8}
              min={-8}
              onChange={(value) => set("linearChargeDensityNanoCoulombsPerMetre", value)}
              step={0.5}
              unit="nC/m"
              value={current.linearChargeDensityNanoCoulombsPerMetre}
            />
          ) : null}
          {current.symmetry === "planar" ? (
            <Slider
              label="Surface charge density"
              max={8}
              min={-8}
              onChange={(value) => set("surfaceChargeDensityNanoCoulombsPerSquareMetre", value)}
              step={0.5}
              unit="nC/m^2"
              value={current.surfaceChargeDensityNanoCoulombsPerSquareMetre}
            />
          ) : null}
        </ControlGroup>
        <ControlGroup legend="Gaussian surface">
          {current.symmetry === "planar" ? (
            <Slider
              label="Pillbox face area"
              max={1.5}
              min={0.1}
              onChange={(value) => set("faceAreaSquareMetres", value)}
              step={0.05}
              unit="m^2"
              value={current.faceAreaSquareMetres}
            />
          ) : (
            <Slider
              label="Gaussian radius"
              max={1.2}
              min={0.15}
              onChange={(value) => set("radiusMetres", value)}
              step={0.05}
              unit="m"
              value={current.radiusMetres}
            />
          )}
          {current.symmetry === "cylindrical" ? (
            <Slider
              label="Cylinder length"
              max={3}
              min={0.5}
              onChange={(value) => set("lengthMetres", value)}
              step={0.1}
              unit="m"
              value={current.lengthMetres}
            />
          ) : null}
        </ControlGroup>
        <button type="button" onClick={() => stage.advance()}>
          Reveal flux readout
        </button>
      </div>
      <section aria-label="Before reveal cue" className="sutd-formula-card">
        <p className="meta-line">Manipulate</p>
        <h2>Choose a surface that matches the charge symmetry</h2>
        <p>
          Current setup: {current.symmetry} symmetry, {current.symmetry === "spherical"
            ? `Q_enc = ${fmt(current.enclosedChargeNanoCoulombs, 2)} nC`
            : current.symmetry === "cylindrical"
              ? `lambda = ${fmt(current.linearChargeDensityNanoCoulombsPerMetre, 2)} nC/m`
              : `sigma = ${fmt(current.surfaceChargeDensityNanoCoulombsPerSquareMetre, 2)} nC/m^2`}
          .
        </p>
        <p>The reveal tests whether the chosen surface makes flux easy to count.</p>
      </section>
    </section>
  );
};

const Legend = () => (
  <>
    <p className="formula-note">Legend</p>
    <dl aria-label="Formula legend" className="formula-legend">
      <div>
        <dt><span aria-hidden="true" className="legend-swatch legend-swatch--green" /> Phi_E</dt>
        <dd>electric flux through the closed Gaussian surface, in V m.</dd>
      </div>
      <div>
        <dt><span aria-hidden="true" className="legend-swatch legend-swatch--red" /> Q_enc</dt>
        <dd>net charge enclosed by the Gaussian surface, in C.</dd>
      </div>
      <div>
        <dt><span aria-hidden="true" className="legend-swatch legend-swatch--blue" /> A_G</dt>
        <dd>effective area receiving flux, in m^2.</dd>
      </div>
      <div>
        <dt><span aria-hidden="true" className="legend-swatch legend-swatch--orange" /> E</dt>
        <dd>electric field magnitude on the useful surface, in V/m.</dd>
      </div>
    </dl>
  </>
);

const FormulaPanel = ({ evidence }: { readonly evidence: GaussLawEvidence }) => (
  <section aria-label="Formula used" className="sutd-formula-card">
    <p className="meta-line">Formula used</p>
    <h3>Flux counts enclosed charge; symmetry turns flux into field</h3>
    <pre aria-label="Gauss law formula" className="formula-code">
      <code>{String.raw`\color{#059669}{\Phi_E}
=
\frac{\color{#dc2626}{Q_{enc}}}{\epsilon_0}

\color{#059669}{\Phi_E}
=
\color{#f97316}{E}\color{#2563eb}{A_G}

\color{#f97316}{E}
=
\frac{\color{#dc2626}{Q_{enc}}}{\epsilon_0\color{#2563eb}{A_G}}`}</code>
    </pre>
    <Legend />
    <p className="formula-note">Substitution</p>
    <pre aria-label="Gauss law substitution" className="formula-code">
      <code>{`${evidence.sourceDescription}
${evidence.areaFormula} = ${areaScientific(evidence.model.gaussianAreaSquareMetres)}
Phi_E = ${chargeScientific(evidence.model.enclosedChargeCoulombs)} / (8.854 x 10^-12 F/m)
      = ${fluxScientific(evidence.model.electricFluxVoltsMetres)}
${evidence.substitution}
      = ${fieldScientific(evidence.model.electricFieldVoltsPerMetre)}`}</code>
    </pre>
    <p>
      Units: enclosed charge is in C, Gaussian area is in m^2, electric flux is
      in V m, and electric field is in V/m.
    </p>
    <p>
      Result: flux is {fluxScientific(evidence.model.electricFluxVoltsMetres)} and the
      matched-symmetry field is {fieldScientific(evidence.model.electricFieldVoltsPerMetre)}.
    </p>
    <p className="formula-note">Interpretation: {evidence.model.interpretation}.</p>
  </section>
);

const ObserveStage = () => {
  const stage = useStage();
  const evidence = gaussLawEvidence(currentState(useSimState<Partial<GaussLawState>>()));

  if (!evidence.ok) {
    return (
      <section aria-label="Observation unlocked" className="sutd-formula-card" role="region">
        <p role="alert">{evidence.error.message}</p>
      </section>
    );
  }

  return (
    <section aria-label="Observation unlocked" className="sutd-sim-panel" role="region">
      <div className="sutd-result-card">
        <p className="meta-line">Observe</p>
        <h2>Gauss law flux evidence</h2>
        <FluxModel evidence={evidence.value} />
        <dl aria-label="Gauss law readout" className="sutd-result-grid">
          <div>
            <dt>Enclosed charge</dt>
            <dd>{chargeScientific(evidence.value.model.enclosedChargeCoulombs)}</dd>
          </div>
          <div>
            <dt>Gaussian area</dt>
            <dd>{areaScientific(evidence.value.model.gaussianAreaSquareMetres)}</dd>
          </div>
          <div>
            <dt>Electric flux</dt>
            <dd>{fluxScientific(evidence.value.model.electricFluxVoltsMetres)}</dd>
          </div>
          <div>
            <dt>Field strength</dt>
            <dd>{fieldScientific(evidence.value.model.electricFieldVoltsPerMetre)}</dd>
          </div>
        </dl>
        <button type="button" onClick={() => stage.advance()}>
          Explain symmetry choice
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
      <section aria-label="Explain the symmetry argument" className="sutd-formula-card">
        <p className="meta-line">Explain</p>
        <h2>Gauss law is always true; useful surfaces add symmetry</h2>
        <p>
          The law gives total flux from enclosed charge. A sphere, cylinder, or pillbox is chosen
          because the field is either constant and normal on the useful surface, or perpendicular to
          a face that contributes no flux.
        </p>
      </section>
      <section aria-label="Transfer challenge" className="sutd-formula-card">
        <p className="meta-line">Transfer</p>
        <h2>Choose the surface before calculating</h2>
        <p>
          A charged coaxial cable insulation layer is tested at radius 0.8 m around a long inner
          conductor. Decide which Gaussian surface makes the field constant, then compute flux and
          field from the enclosed charge per metre.
        </p>
        <button type="button" onClick={() => stage.reset()}>
          Try another symmetry
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
      <p className="meta-line">Prediction checkpoint</p>
      <h1>Gauss Law for Symmetric Distributions</h1>
      <p>
        Predict what changes when a closed surface grows, then choose a Gaussian surface for
        spherical, cylindrical, or planar charge symmetry.
      </p>
      <button type="button" onClick={() => stage.advance()}>
        Choose Gaussian surface
      </button>
    </section>
  );
};

export const GaussLawFluxSurfaceLab = () => (
  <SimRuntime packageId={gaussLawPackageId} spec={gaussLawSpec}>
    <StageSurface />
  </SimRuntime>
);

export default GaussLawFluxSurfaceLab;
